import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { acquireGlobalHeavyBudget } from './global-heavy-budget.mjs';
import { acquireTaskGuard } from './heavy-task-guard.mjs';

const repoRoot = process.cwd();
const modeInput = (process.argv[2] || process.env.QUALITY_GATE_MODE || 'local').trim().toLowerCase();
const mode = modeInput === 'prepush' ? 'pre-push' : modeInput;
const isPrePushMode = mode === 'pre-push';
const CACHE_SCHEMA_VERSION = 2;

// pre-push changed test runs touch a large cross-section of suites and can emit
// huge log payloads. `threads` has been unstable on Windows here because worker
// result serialization can fail with DataCloneError / OOM before assertions do.
// `forks` is slower but materially more reliable for the local gate.
const GAME_VITEST_ARGS = ['--config', 'vitest.config.core.ts', '--pool', 'forks', '--no-file-parallelism', '--maxWorkers', '1'];
const FAST_VITEST_ARGS = ['--pool', 'forks', '--no-file-parallelism', '--maxWorkers', '1'];
const KNOWN_GAME_IDS = new Set(['smashup', 'dicethrone', 'summonerwars', 'tictactoe', 'cardia']);
const PRE_PUSH_CORE_TARGET_GROUPS = [
  {
    label: 'Core tests (engine)',
    reason: '核心源码改动，回归 core/engine/shared/hooks/lib 完整测试集',
    targets: ['src/core', 'src/engine', 'src/shared', 'src/hooks', 'src/lib'],
  },
  {
    label: 'Core tests (ui)',
    reason: '核心源码改动，回归 components/pages 完整测试集',
    targets: ['src/components', 'src/pages'],
  },
];
const VITEST_SAFE_ENTRY = ['scripts/infra/vitest-cli-safe.mjs'];

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const TEXT_LIKE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.css', '.scss', '.html',
  '.yml', '.yaml', '.xml', '.gradle', '.properties',
  '.java', '.kt', '.ps1', '.bat', '.txt',
]);
const CACHE_DIR = path.join(repoRoot, 'temp', 'quality-gate-cache');
const PRE_PUSH_CACHE_FILE = path.join(CACHE_DIR, 'pre-push.json');
const COMMAND_CACHE_FILE = path.join(CACHE_DIR, 'command-results.json');
const QUALITY_GATE_TYPECHECK_BUILD_INFO = path.join('temp', 'quality-gate-cache', 'typecheck.tsbuildinfo');
const STABLE_VITEST_NODE_OPTIONS = '--max-old-space-size=8192';

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    if (options.allowFailure) return '';
    throw error;
  }
}

function readGitFile(ref, file) {
  return runGit(['show', `${ref}:${file}`], { allowFailure: true });
}

function normalizeFile(file) {
  return file.replace(/\\/g, '/').replace(/^\.?\//, '');
}

function hasAny(files, predicate) {
  return files.some(predicate);
}

function dedupeValues(values) {
  return [...new Set(values)];
}

function splitFilesForCommand(baseArgs, files, maxCommandLength = 7000) {
  if (files.length === 0) return [];

  const chunks = [];
  let currentChunk = [];
  let currentLength = commandToLine('npx', [...baseArgs]).length;

  for (const file of files) {
    const nextLength = currentLength + 1 + quoteArg(file).length;
    if (currentChunk.length > 0 && nextLength > maxCommandLength) {
      chunks.push(currentChunk);
      currentChunk = [file];
      currentLength = commandToLine('npx', [...baseArgs, file]).length;
      continue;
    }
    currentChunk.push(file);
    currentLength = nextLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function isSourceCodeFile(file) {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);
}

function isTsFamilyFile(file) {
  return /\.(ts|tsx|mts|cts)$/.test(file);
}

function isTestFile(file) {
  return /(^|\/)__tests__\//.test(file) || /\.(test|spec)\.[^/]+$/.test(file);
}

function isDocOnly(file) {
  return file.endsWith('.md') || file.startsWith('evidence/');
}

function isLintTarget(file) {
  return isSourceCodeFile(file)
    && !file.startsWith('temp/')
    && !file.startsWith('dist/')
    && !file.startsWith('test-results/');
}

function isEncodingTarget(file) {
  return TEXT_LIKE_EXTENSIONS.has(path.extname(file).toLowerCase())
    || file === 'AGENTS.md'
    || file === 'package.json'
    || file.startsWith('.github/');
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3
    && buffer[0] === UTF8_BOM[0]
    && buffer[1] === UTF8_BOM[1]
    && buffer[2] === UTF8_BOM[2];
}

function runEncodingGuard(files) {
  const targets = files.filter(isEncodingTarget);
  if (targets.length === 0) return;

  const failures = [];
  for (const file of targets) {
    const absolutePath = path.resolve(repoRoot, file);
    if (!existsSync(absolutePath)) continue;
    const buffer = readFileSync(absolutePath);

    if (hasUtf8Bom(buffer)) {
      failures.push(`${file}: contains UTF-8 BOM`);
      continue;
    }
    try {
      UTF8_DECODER.decode(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${file}: invalid UTF-8 (${message})`);
    }
  }

  console.log('\n[changed-quality-gate] Encoding');
  console.log(`[changed-quality-gate] checked files: ${targets.length}`);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[changed-quality-gate] ${failure}`);
    }
    process.exit(1);
  }
}

function resolveRemoteSameBranchBase() {
  const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { allowFailure: true });
  if (!currentBranch || currentBranch === 'HEAD') return '';

  // 优先使用已存在的远端跟踪分支（无需额外网络请求）
  const trackingRef = `refs/remotes/origin/${currentBranch}`;
  const tracked = runGit(['rev-parse', '--verify', trackingRef], { allowFailure: true });
  if (tracked) return trackingRef;

  // 兼容 remote.fetch 仅拉 main 的仓库：直接查询远端同名分支提交
  const remoteHead = runGit(['ls-remote', '--heads', 'origin', currentBranch], { allowFailure: true });
  if (!remoteHead) return '';

  const firstLine = remoteHead.split(/\r?\n/).find(Boolean) || '';
  const [sha] = firstLine.trim().split(/\s+/);
  return sha || '';
}

function resolveBaseRef() {
  const envBase = process.env.QUALITY_GATE_BASE?.trim();
  if (envBase) return envBase;

  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { allowFailure: true });
  if (upstream) return upstream;

  const sameBranchRemote = resolveRemoteSameBranchBase();
  if (sameBranchRemote) return sameBranchRemote;

  for (const candidate of ['origin/main', 'origin/master', 'main', 'master', 'HEAD~1']) {
    const exists = runGit(['rev-parse', '--verify', candidate], { allowFailure: true });
    if (exists) return candidate;
  }

  throw new Error('[changed-quality-gate] 无法解析对比基线');
}

function resolveChangeContext() {
  const baseRef = resolveBaseRef();
  const mergeBase = runGit(['merge-base', 'HEAD', baseRef], { allowFailure: true }) || baseRef;
  const headSha = runGit(['rev-parse', 'HEAD']);
  const output = runGit(['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`], { allowFailure: true });
  const files = output.split(/\r?\n/).map(normalizeFile).filter(Boolean);
  return { baseRef, mergeBase, headSha, files };
}

function buildPackageJsonTypecheckFingerprint(content) {
  if (!content) return '__missing__';
  try {
    const parsed = JSON.parse(content);
    const relevant = {
      type: parsed.type,
      packageManager: parsed.packageManager,
      engines: parsed.engines,
      dependencies: parsed.dependencies,
      devDependencies: parsed.devDependencies,
      peerDependencies: parsed.peerDependencies,
      optionalDependencies: parsed.optionalDependencies,
      overrides: parsed.overrides,
      resolutions: parsed.resolutions,
    };
    return JSON.stringify(relevant);
  } catch {
    return '__parse_error__';
  }
}

function packageJsonAffectsTypecheck(baseRef, headSha) {
  const baseFingerprint = buildPackageJsonTypecheckFingerprint(readGitFile(baseRef, 'package.json'));
  const headFingerprint = buildPackageJsonTypecheckFingerprint(readGitFile(headSha, 'package.json'));
  return baseFingerprint !== headFingerprint;
}

function createTypecheckPredicate(baseRef, headSha) {
  const packageJsonRelevant = packageJsonAffectsTypecheck(baseRef, headSha);
  return (file) => {
    if (file === 'package.json') return packageJsonRelevant;
    if (file.startsWith('tsconfig') || file === 'vite.config.ts' || file === 'eslint.config.js') return true;
    return isTsFamilyFile(file) && !isDocOnly(file);
  };
}

function affectsBuild(file) {
  if (file === 'index.html' || file === 'package.json' || file === 'vite.config.ts' || file === 'postcss.config.js' || file === 'tailwind.config.js') return true;
  return file.startsWith('src/')
    || file.startsWith('public/')
    || file.startsWith('apps/')
    || file === 'server.ts'
    || file.startsWith('scripts/game/')
    || file.startsWith('scripts/audio/');
}

function affectsDiceThroneStyleContract(file) {
  return file === 'src/index.css'
    || file === 'vite.config.ts'
    || file === 'postcss.config.js'
    || file === 'postcss-tailwind-legacy-structure.js'
    || file === 'postcss-tailwind-legacy-colors.js'
    || file === 'postcss-tailwind-legacy-translate.js'
    || file === 'package.json'
    || file === 'playwright.config.ts'
    || file.startsWith('src/games/dicethrone/ui/')
    || file === 'src/components/game/framework/presets.tsx'
    || file === 'scripts/verify/dicethrone-style-contract.mjs'
    || file === 'e2e/dicethrone-simple-start.e2e.ts';
}

function affectsI18n(file) {
  return file.startsWith('src/')
    || file.startsWith('apps/api/')
    || file.startsWith('public/locales/')
    || file === 'scripts/verify/i18n-check.ts';
}

function affectsCoreArea(file) {
  return file.startsWith('src/core/')
    || file.startsWith('src/engine/')
    || file.startsWith('src/shared/')
    || file.startsWith('src/hooks/')
    || file.startsWith('src/components/game/')
    || file.startsWith('src/pages/')
    || file.startsWith('src/lib/')
    || file.startsWith('src/server/')
    || file.startsWith('src/api/')
    || file.startsWith('vite-plugins/')
    || file === 'vitest.config.core.ts'
    || file === 'vitest.config.ts';
}

function isGameFile(file) {
  return file.startsWith('src/games/');
}

function isGameSourceFile(file) {
  return isGameFile(file) && !isTestFile(file);
}

function isCoreSourceFile(file) {
  return affectsCoreArea(file) && !isTestFile(file);
}

function affectsPrePushGlobalVitest(file) {
  if (isTestFile(file)) return false;
  if (file.startsWith('src/lib/i18n/')) return false;
  return file.startsWith('src/core/')
    || file.startsWith('src/engine/')
    || file.startsWith('src/shared/')
    || file.startsWith('src/hooks/')
    || file.startsWith('src/components/game/')
    || file.startsWith('src/lib/')
    || file === 'vitest.config.core.ts'
    || file === 'vitest.config.ts';
}

function isNonGameTestFile(file) {
  return isTestFile(file) && !isGameFile(file);
}

function collectGameIds(files, { sourceOnly = false } = {}) {
  const ids = new Set();
  for (const file of files) {
    if (sourceOnly && !isGameSourceFile(file)) continue;
    const match = file.match(/^src\/games\/([^/]+)\//);
    if (match && KNOWN_GAME_IDS.has(match[1])) ids.add(match[1]);
  }
  return [...ids];
}

function hasChangesForTargetGroup(files, targets) {
  return hasAny(files, (file) => targets.some((target) => file.startsWith(`${target}/`) || file === target));
}

function collectScopedVitestTargets(files, targets) {
  return dedupeValues(
    files
      .filter((file) => targets.some((target) => file.startsWith(`${target}/`) || file === target))
      .map((file) => (isTestFile(file) ? file : path.posix.dirname(file))),
  );
}

function collectCommands(files, baseRef, affectsTypecheck) {
  const commands = [];
  const lintFiles = files.filter(isLintTarget);
  const coreSourceChanged = hasAny(
    files,
    isPrePushMode ? affectsPrePushGlobalVitest : isCoreSourceFile,
  );
  const coreTestFiles = files.filter(isNonGameTestFile);
  const gameSourceIds = collectGameIds(files, { sourceOnly: true });
  const gameTestFiles = files.filter((file) => isGameFile(file) && isTestFile(file));

  if (hasAny(files, affectsTypecheck)) {
    commands.push({
      label: 'Typecheck',
      reason: '存在 TypeScript 或配置改动',
      command: 'npx',
      args: ['tsc', '--noEmit', '--incremental', '--tsBuildInfoFile', QUALITY_GATE_TYPECHECK_BUILD_INFO],
    });
  }

  if (lintFiles.length > 0) {
    const eslintBaseArgs = ['eslint', '--max-warnings', '999'];
    const lintChunks = splitFilesForCommand(eslintBaseArgs, lintFiles);
    lintChunks.forEach((chunk, index) => {
      commands.push({
        label: lintChunks.length === 1 ? 'ESLint' : `ESLint (${index + 1}/${lintChunks.length})`,
        reason: lintChunks.length === 1
          ? '存在可 lint 的源码改动'
          : '存在可 lint 的源码改动，按批次切分以避免 Windows 命令行过长',
        command: 'npx',
        args: [...eslintBaseArgs, ...chunk],
      });
    });
  }

  if (hasAny(files, affectsBuild) && !isPrePushMode) {
    commands.push({
      label: 'Build',
      reason: 'local 模式下存在前端/构建输入改动',
      command: 'npm',
      args: ['run', 'build'],
    });
    if (hasAny(files, affectsDiceThroneStyleContract)) {
      commands.push({
        label: 'DiceThrone style contract',
        reason: '涉及 DiceThrone HUD / Tailwind 兼容链改动，需验证构建产物关键样式合同',
        command: 'npm',
        args: ['run', 'verify:dicethrone:style-contract'],
      });
    }
  } else if (hasAny(files, affectsBuild) && isPrePushMode) {
    console.log('[changed-quality-gate] pre-push 模式：跳过 build，交给 CI 全量构建兜底。');
  }

  if (hasAny(files, affectsI18n)) {
    commands.push({
      label: 'i18n',
      reason: '存在 i18n 相关改动',
      command: 'npm',
      args: ['run', 'i18n:check'],
    });
  }

  if (hasAny(files, (file) => file.startsWith('apps/api/'))) {
    commands.push({
      label: 'API tests',
      reason: 'apps/api 有改动',
      command: 'npm',
      args: ['run', 'test:api'],
    });
  }

  if (hasAny(files, (file) => file.startsWith('src/server/') || file.startsWith('src/api/'))) {
    commands.push({
      label: 'Server tests',
      reason: '服务端目录有改动',
      command: 'npm',
      args: ['run', 'test:server'],
    });
  }

  if (hasAny(files, (file) => file.startsWith('src/ugc/'))) {
    commands.push({
      label: 'UGC tests',
      reason: 'UGC 目录有改动',
      command: 'npm',
      args: ['run', 'test:ugc'],
    });
  }

  if (isPrePushMode) {
    if (coreSourceChanged) {
      PRE_PUSH_CORE_TARGET_GROUPS
        .filter((group) => hasChangesForTargetGroup(files, group.targets))
        .forEach((group) => {
          const scopedTargets = collectScopedVitestTargets(files, group.targets);
          scopedTargets.forEach((target, index) => {
            commands.push({
              label: scopedTargets.length === 1 ? group.label : `${group.label} (${index + 1}/${scopedTargets.length})`,
              reason: `${group.reason}（限定到 ${target}）`,
              command: process.execPath,
              args: [...VITEST_SAFE_ENTRY, 'run', target, ...FAST_VITEST_ARGS],
            });
          });
        });

      const targetGameIds = gameSourceIds.length > 0
        ? gameSourceIds
        : [...KNOWN_GAME_IDS];

      targetGameIds.forEach((gameId) => {
        commands.push({
          label: `${gameId} tests`,
          reason: gameSourceIds.length > 0
            ? `${gameId} 源码改动，单独跑该游戏完整测试集`
            : '核心源码改动，需要逐游戏回归完整测试集',
          command: process.execPath,
          args: [...VITEST_SAFE_ENTRY, 'run', `src/games/${gameId}`, ...GAME_VITEST_ARGS],
        });
      });
    } else {
      if (coreTestFiles.length > 0) {
        commands.push({
          label: 'Changed core test files',
          reason: '仅改动核心测试文件，按文件精确运行',
          command: process.execPath,
          args: [...VITEST_SAFE_ENTRY, 'run', ...dedupeValues(coreTestFiles), ...FAST_VITEST_ARGS],
        });
      }
      if (gameSourceIds.length > 0) {
        gameSourceIds.forEach((gameId) => {
          commands.push({
            label: `${gameId} tests`,
            reason: `${gameId} 源码改动，跑该游戏完整测试集`,
            command: process.execPath,
            args: [...VITEST_SAFE_ENTRY, 'run', `src/games/${gameId}`, ...GAME_VITEST_ARGS],
          });
        });
      } else if (gameTestFiles.length > 0) {
        commands.push({
          label: 'Changed game test files',
          reason: '仅改动游戏测试文件，按文件精确运行',
          command: process.execPath,
          args: [...VITEST_SAFE_ENTRY, 'run', ...dedupeValues(gameTestFiles), ...GAME_VITEST_ARGS],
        });
      }
    }
  } else {
    if (hasAny(files, affectsCoreArea)) {
      commands.push({
        label: 'Core tests',
        reason: '核心框架/引擎区域改动',
        command: 'npm',
        args: ['run', 'test:core'],
      });
      commands.push({
        label: 'Games core tests',
        reason: '核心框架改动可能影响所有游戏',
        command: process.execPath,
        args: [...VITEST_SAFE_ENTRY, 'run', 'src/games', ...GAME_VITEST_ARGS],
      });
    } else {
      for (const gameId of collectGameIds(files)) {
        commands.push({
          label: `${gameId} tests`,
          reason: `${gameId} 目录有改动`,
          command: process.execPath,
          args: [...VITEST_SAFE_ENTRY, 'run', `src/games/${gameId}`, ...GAME_VITEST_ARGS],
        });
      }
    }
  }

  return dedupeCommands(commands);
}

function dedupeCommands(commands) {
  const seen = new Set();
  return commands.filter((item) => {
    const key = `${item.command} ${item.args.join(' ')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createCommandCacheKey(context, command) {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: CACHE_SCHEMA_VERSION,
    mode,
    baseRef: context.baseRef,
    mergeBase: context.mergeBase,
    headSha: context.headSha,
    files: context.files,
    command: command.command,
    args: command.args,
  })).digest('hex');
}

function readCommandCache() {
  if (!existsSync(COMMAND_CACHE_FILE)) {
    return { version: CACHE_SCHEMA_VERSION, entries: {} };
  }
  try {
    const content = readFileSync(COMMAND_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed?.version !== CACHE_SCHEMA_VERSION || typeof parsed?.entries !== 'object' || parsed.entries === null) {
      return { version: CACHE_SCHEMA_VERSION, entries: {} };
    }
    return parsed;
  } catch {
    return { version: CACHE_SCHEMA_VERSION, entries: {} };
  }
}

function writeCommandCache(cache) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(COMMAND_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function trimCommandCache(cache, maxEntries = 200) {
  const entries = Object.entries(cache.entries ?? {});
  if (entries.length <= maxEntries) return cache;

  entries.sort(([, left], [, right]) => {
    const leftAt = typeof left?.completedAt === 'string' ? Date.parse(left.completedAt) : 0;
    const rightAt = typeof right?.completedAt === 'string' ? Date.parse(right.completedAt) : 0;
    return rightAt - leftAt;
  });

  return {
    version: CACHE_SCHEMA_VERSION,
    entries: Object.fromEntries(entries.slice(0, maxEntries)),
  };
}

function quoteArg(value) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function commandToLine(command, args) {
  return [command, ...args].map(quoteArg).join(' ');
}

function mergeNodeOptions(extraOption, existingValue = process.env.NODE_OPTIONS) {
  const trimmedExtra = extraOption?.trim();
  const trimmedExisting = existingValue?.trim();
  if (!trimmedExtra) return trimmedExisting;
  if (!trimmedExisting) return trimmedExtra;
  return trimmedExisting.includes(trimmedExtra)
    ? trimmedExisting
    : `${trimmedExisting} ${trimmedExtra}`;
}

function createVitestEnv() {
  return {
    ...process.env,
    NODE_OPTIONS: mergeNodeOptions(STABLE_VITEST_NODE_OPTIONS),
  };
}

function shouldUseStableVitestEnv(command, args) {
  if (command.includes('vitest-cli-safe') || args.includes('scripts/infra/vitest-cli-safe.mjs')) {
    return true;
  }

  return command.trim().toLowerCase() === 'npm'
    && args[0] === 'run'
    && typeof args[1] === 'string'
    && args[1].startsWith('test');
}

function shouldDirectSpawnOnWindows(command) {
  if (process.platform !== 'win32') return true;
  const normalized = command.trim().toLowerCase();
  return path.isAbsolute(command)
    || normalized.endsWith('.exe')
    || normalized.endsWith('.com');
}

function runCommand({ label, reason, command, args }) {
  console.log(`\n[changed-quality-gate] ${label}`);
  console.log(`[changed-quality-gate] 原因: ${reason}`);
  console.log(`[changed-quality-gate] 命令: ${commandToLine(command, args)}`);

  const startAt = Date.now();
  const env = shouldUseStableVitestEnv(command, args)
    ? createVitestEnv()
    : process.env;
  const result = shouldDirectSpawnOnWindows(command)
    ? spawnSync(command, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
        env,
      })
    : spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandToLine(command, args)], {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
        env,
      });
  const durationMs = Date.now() - startAt;

  if (result.error) {
    console.error(`[changed-quality-gate] 命令启动失败: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return durationMs;
}

function createCacheKey(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function readPrePushCache() {
  if (!existsSync(PRE_PUSH_CACHE_FILE)) return null;
  try {
    const content = readFileSync(PRE_PUSH_CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function writePrePushCache(cache) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(PRE_PUSH_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function shouldUsePrePushCache() {
  return isPrePushMode && process.env.QUALITY_GATE_NO_CACHE !== '1';
}

const { baseRef, mergeBase, headSha, files } = resolveChangeContext();
const affectsTypecheck = createTypecheckPredicate(baseRef, headSha);
console.log(`[changed-quality-gate] 模式: ${mode}`);
console.log(`[changed-quality-gate] 基线: ${baseRef}`);
console.log(`[changed-quality-gate] merge-base: ${mergeBase}`);
console.log(`[changed-quality-gate] head: ${headSha}`);

if (files.length === 0) {
  console.log('[changed-quality-gate] 未检测到已提交改动，跳过。');
  process.exit(0);
}

console.log('[changed-quality-gate] 改动文件:');
for (const file of files) {
  console.log(`- ${file}`);
}

const taskGuard = acquireTaskGuard({
  name: 'quality-gate',
  conflicts: ['e2e-run'],
  command: process.argv.join(' '),
  metadata: {
    mode,
    baseRef,
    fileCount: files.length,
  },
});

try {
  const globalBudgetHandle = await acquireGlobalHeavyBudget({
    group: 'quality-gate',
    command: process.argv.join(' '),
    metadata: {
      mode,
      baseRef,
      fileCount: files.length,
    },
  });

  try {
  mkdirSync(CACHE_DIR, { recursive: true });
  runEncodingGuard(files);

  const commands = collectCommands(files, baseRef, affectsTypecheck);
  if (commands.length === 0) {
    console.log('[changed-quality-gate] 当前改动仅涉及文档/证据，跳过代码校验。');
    process.exit(0);
  }

  const cachePayload = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    mode,
    baseRef,
    mergeBase,
    headSha,
    files,
    commands: commands.map((item) => ({ command: item.command, args: item.args })),
  };
  const cacheKey = createCacheKey(cachePayload);

  if (shouldUsePrePushCache()) {
    const cache = readPrePushCache();
    if (cache?.key === cacheKey) {
      console.log('[changed-quality-gate] 命中 pre-push 缓存，本次跳过重复校验。');
      process.exit(0);
    }
  }

  const startedAt = Date.now();
  const durations = [];
  const commandCache = shouldUsePrePushCache()
    ? readCommandCache()
    : { version: CACHE_SCHEMA_VERSION, entries: {} };
  for (const command of commands) {
    const commandCacheKey = createCommandCacheKey({ baseRef, mergeBase, headSha, files }, command);
    const cachedResult = shouldUsePrePushCache()
      ? commandCache.entries?.[commandCacheKey]
      : null;

    if (cachedResult?.status === 'passed') {
      console.log(`\n[changed-quality-gate] ${command.label}`);
      console.log('[changed-quality-gate] 命中步骤缓存，跳过重复校验。');
      durations.push({
        label: `${command.label} (cached)`,
        durationMs: cachedResult.durationMs ?? 0,
      });
      continue;
    }

    const durationMs = runCommand(command);
    durations.push({ label: command.label, durationMs });
    if (shouldUsePrePushCache()) {
      commandCache.entries[commandCacheKey] = {
        status: 'passed',
        label: command.label,
        durationMs,
        completedAt: new Date().toISOString(),
        headSha,
        baseRef,
        mergeBase,
      };
      writeCommandCache(trimCommandCache(commandCache));
    }
  }

  const totalMs = Date.now() - startedAt;
  console.log('\n[changed-quality-gate] 执行耗时:');
  for (const item of durations) {
    console.log(`- ${item.label}: ${(item.durationMs / 1000).toFixed(1)}s`);
  }
  console.log(`[changed-quality-gate] 总耗时: ${(totalMs / 1000).toFixed(1)}s`);
  console.log('[changed-quality-gate] 全部增量校验完成。');

  if (shouldUsePrePushCache()) {
    writePrePushCache({
      key: cacheKey,
      mode,
      baseRef,
      mergeBase,
      headSha,
      generatedAt: new Date().toISOString(),
    });
  }
  } finally {
    globalBudgetHandle.release();
  }
} finally {
  taskGuard.release();
}
