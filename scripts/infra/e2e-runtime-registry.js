import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_TTL_MS = 15000;
const SHARED_RUNTIME_DIR = 'boardgame-e2e';
const SHARED_RUNTIME_REGISTRY = 'runtime-registry.json';

function nowIso() {
  return new Date().toISOString();
}

function runGit(command, cwd = process.cwd()) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function normalizeScope(scope) {
  const normalized = String(scope ?? 'default').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return normalized || 'default';
}

function normalizePids(values) {
  const list = Array.isArray(values) ? values : [values];
  return [...new Set(list.map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0))];
}

function normalizePorts(ports) {
  if (Array.isArray(ports)) {
    return ports.map(Number).filter(Number.isFinite);
  }

  if (ports && typeof ports === 'object') {
    return Object.fromEntries(
      Object.entries(ports)
        .map(([key, value]) => [key, Number(value)])
        .filter(([, value]) => Number.isFinite(value)),
    );
  }

  return ports ?? {};
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).filter(value => typeof value === 'string' && value.trim()))];
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readRegistryFile(filePath) {
  return readJson(filePath, { runtimes: [], updatedAt: null });
}

function writeRegistryFile(filePath, runtimes) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify({
    runtimes,
    updatedAt: nowIso(),
  }, null, 2));
}

export function getWorktreeRoot(cwd = process.cwd()) {
  const raw = runGit('git rev-parse --show-toplevel', cwd);
  return raw ? path.resolve(cwd, raw) : path.resolve(cwd);
}

export function getGitCommonDir(cwd = process.cwd()) {
  const worktreeRoot = getWorktreeRoot(cwd);
  const raw = runGit('git rev-parse --git-common-dir', cwd);
  return raw ? path.resolve(worktreeRoot, raw) : path.join(worktreeRoot, '.git');
}

function getSharedRuntimeDir(cwd = process.cwd()) {
  return path.join(getGitCommonDir(cwd), SHARED_RUNTIME_DIR);
}

export function getRegistryFilePath(cwd = process.cwd()) {
  return path.join(cwd, '.tmp', 'e2e-runtime-registry.json');
}

export function getSharedRegistryFilePath(cwd = process.cwd()) {
  return path.join(getSharedRuntimeDir(cwd), SHARED_RUNTIME_REGISTRY);
}

function getRuntimeId(scope, cwd = process.cwd(), worktreeRoot = getWorktreeRoot(cwd)) {
  return `${worktreeRoot}::${normalizeScope(scope)}`;
}

function inspectRuntime(runtime) {
  const ownerPids = normalizePids(runtime.ownerPids ?? runtime.ownerPid);
  const servicePids = normalizePids(runtime.servicePids);
  const trackedPids = normalizePids(runtime.pids ?? [...ownerPids, ...servicePids]);
  const aliveOwnerPids = ownerPids.filter(isPidAlive);
  const aliveServicePids = servicePids.filter(isPidAlive);
  const aliveTrackedPids = trackedPids.filter(isPidAlive);
  const leaseExpiresAt = Date.parse(runtime.leaseExpiresAt ?? '');
  const heartbeatFresh = Number.isFinite(leaseExpiresAt) ? leaseExpiresAt > Date.now() : false;

  let status = 'stopped';
  if (aliveOwnerPids.length > 0) {
    status = heartbeatFresh ? 'active' : 'active-unhealthy';
  } else if (aliveServicePids.length > 0 || aliveTrackedPids.length > 0) {
    status = 'orphaned';
  }

  return {
    ownerAlive: aliveOwnerPids.length > 0,
    aliveOwnerPids,
    aliveServicePids,
    aliveTrackedPids,
    heartbeatFresh,
    status,
    stale: status === 'orphaned' || status === 'stopped',
    killPids: normalizePids([...ownerPids, ...servicePids, ...trackedPids]),
  };
}

function normalizeRuntimeRecord(record, cwd = process.cwd(), existing = null) {
  const scope = normalizeScope(record.scope ?? existing?.scope);
  const worktreeRoot = path.resolve(record.worktreeRoot ?? existing?.worktreeRoot ?? getWorktreeRoot(cwd));
  const ownerPids = normalizePids([
    ...(existing?.ownerPids ?? []),
    existing?.ownerPid,
    ...(Array.isArray(record.ownerPids) ? record.ownerPids : [record.ownerPids]),
    record.ownerPid,
    record.pid,
  ]);
  const ownerPid = ownerPids[0] ?? null;
  const servicePids = normalizePids([...(existing?.servicePids ?? []), ...(record.servicePids ?? [])]);
  const explicitPids = normalizePids([...(existing?.pids ?? []), ...(record.pids ?? [])]);
  const createdAt = existing?.createdAt ?? record.createdAt ?? nowIso();
  const lastHeartbeatAt = record.lastHeartbeatAt ?? nowIso();
  const ports = normalizePorts(record.ports ?? existing?.ports ?? {});
  const runtimeId = record.runtimeId ?? existing?.runtimeId ?? getRuntimeId(scope, cwd, worktreeRoot);
  const bootstrapLogFiles = uniqueStrings(record.bootstrapLogFiles ?? existing?.bootstrapLogFiles ?? record.logFile ?? existing?.logFile ?? []);

  return {
    ...existing,
    ...record,
    runtimeId,
    scope,
    worktreeRoot,
    worktreeName: path.basename(worktreeRoot),
    ownerPids,
    ownerPid,
    servicePids,
    pids: normalizePids([...ownerPids, ...servicePids, ...explicitPids]),
    ports,
    bootstrapLogFiles,
    active: record.active ?? existing?.active ?? true,
    createdAt,
    updatedAt: nowIso(),
    lastHeartbeatAt,
    leaseExpiresAt: new Date(Date.now() + HEARTBEAT_TTL_MS).toISOString(),
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    heartbeatTtlMs: HEARTBEAT_TTL_MS,
  };
}

function readSharedRegistry(cwd = process.cwd()) {
  return readRegistryFile(getSharedRegistryFilePath(cwd));
}

function writeSharedRegistry(runtimes, cwd = process.cwd()) {
  writeRegistryFile(getSharedRegistryFilePath(cwd), runtimes);
}

function syncLocalRegistry(cwd = process.cwd()) {
  const worktreeRoot = getWorktreeRoot(cwd);
  const registry = readSharedRegistry(cwd);
  const runtimes = Array.isArray(registry.runtimes) ? registry.runtimes.filter(runtime => runtime.worktreeRoot === worktreeRoot) : [];
  writeRegistryFile(getRegistryFilePath(cwd), runtimes);
}

export function readRuntimeRegistry(cwd = process.cwd()) {
  return readRegistryFile(getRegistryFilePath(cwd));
}

export function readSharedRuntimeRegistry(cwd = process.cwd()) {
  return readSharedRegistry(cwd);
}

export function upsertRuntime(record, cwd = process.cwd()) {
  const runtimeId = getRuntimeId(record.scope, cwd, record.worktreeRoot ? path.resolve(record.worktreeRoot) : undefined);
  const registry = readSharedRegistry(cwd);
  const runtimes = Array.isArray(registry.runtimes) ? registry.runtimes : [];
  const existing = runtimes.find(runtime => runtime.runtimeId === runtimeId) ?? null;
  const nextRecord = normalizeRuntimeRecord({ ...record, runtimeId }, cwd, existing);
  const next = runtimes.filter(runtime => runtime.runtimeId !== runtimeId);
  next.push(nextRecord);
  writeSharedRegistry(next, cwd);
  syncLocalRegistry(cwd);
  return nextRecord;
}

export function touchRuntime(scope, patch = {}, cwd = process.cwd()) {
  return upsertRuntime({ scope, ...patch }, cwd);
}

export function removeRuntime(scope, cwd = process.cwd()) {
  return removeRuntimeById(getRuntimeId(scope, cwd), cwd);
}

export function removeRuntimeById(runtimeId, cwd = process.cwd()) {
  const registry = readSharedRegistry(cwd);
  const runtimes = Array.isArray(registry.runtimes) ? registry.runtimes.filter(runtime => runtime.runtimeId !== runtimeId) : [];
  writeSharedRegistry(runtimes, cwd);
  syncLocalRegistry(cwd);
}

export function listRuntimes(cwd = process.cwd(), options = {}) {
  const includeStopped = options.includeStopped === true;
  const registry = readSharedRegistry(cwd);
  const runtimes = Array.isArray(registry.runtimes) ? registry.runtimes : [];

  return runtimes
    .map(runtime => ({ ...runtime, ...inspectRuntime(runtime) }))
    .filter(runtime => includeStopped || runtime.status !== 'stopped');
}

export function listActiveRuntimes(cwd = process.cwd()) {
  return listRuntimes(cwd).filter(runtime => runtime.status === 'active' || runtime.status === 'active-unhealthy');
}

export function findRuntimesByPorts(ports, cwd = process.cwd(), options = {}) {
  const targetPorts = new Set(
    (Array.isArray(ports) ? ports : Object.values(ports ?? {}))
      .map(Number)
      .filter(Number.isFinite),
  );

  return listRuntimes(cwd, options).filter(runtime => {
    const runtimePorts = Array.isArray(runtime.ports) ? runtime.ports : Object.values(runtime.ports ?? {});
    return runtimePorts.some(port => targetPorts.has(Number(port)));
  });
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

export function stopRuntime(runtime, options = {}) {
  const logger = options.logger ?? console;
  const targets = inspectRuntime(runtime).killPids;

  for (const pid of targets) {
    const ok = killPid(pid);
    logger.log?.(`  - PID ${pid}: ${ok ? '已终止' : '终止失败/已退出'}`);
  }
}

export function pruneStaleRuntimes(cwd = process.cwd(), options = {}) {
  const logger = options.logger ?? null;
  const killOrphans = options.killOrphans === true;
  const runtimes = listRuntimes(cwd, { includeStopped: true });
  const stale = runtimes.filter(runtime => runtime.stale);
  const active = runtimes.filter(runtime => !runtime.stale);

  if (killOrphans) {
    for (const runtime of stale.filter(entry => entry.status === 'orphaned')) {
      logger?.log?.(`🧹 清理失联 E2E runtime: ${formatRuntimeSummary(runtime)}`);
      stopRuntime(runtime, { logger: logger ?? console });
    }
  }

  writeSharedRegistry(active.map(({ ownerAlive, aliveServicePids, aliveTrackedPids, heartbeatFresh, status, stale: _stale, killPids, ...runtime }) => runtime), cwd);
  syncLocalRegistry(cwd);

  return {
    stale,
    active,
  };
}

export function startRuntimeHeartbeat(scope, getPatch, cwd = process.cwd()) {
  const run = () => {
    const patch = typeof getPatch === 'function' ? getPatch() : getPatch;
    touchRuntime(scope, patch ?? {}, cwd);
  };

  run();

  const timer = setInterval(() => {
    try {
      run();
    } catch {
      // 心跳失败不应影响服务主循环；下一次 list/cleanup 会继续做健康检查。
    }
  }, HEARTBEAT_INTERVAL_MS);

  timer.unref?.();
  return () => clearInterval(timer);
}

export function formatRuntimeSummary(runtime) {
  const ports = Array.isArray(runtime.ports)
    ? runtime.ports.join(', ')
    : Object.entries(runtime.ports ?? {}).map(([name, port]) => `${name}=${port}`).join(', ');
  const target = runtime.target?.trim() || '<unknown>';
  return [
    `[${runtime.worktreeName ?? path.basename(runtime.worktreeRoot ?? '<unknown>')}]`,
    `status=${runtime.status ?? 'unknown'}`,
    `scope=${runtime.scope ?? 'default'}`,
    `ownerPid=${runtime.ownerPid ?? 'n/a'}`,
    `target=${target}`,
    ports ? `ports=${ports}` : '',
    runtime.createdAt ? `createdAt=${runtime.createdAt}` : '',
  ].filter(Boolean).join(' ');
}

export function describeRuntimeConflict(runtimes, cwd = process.cwd()) {
  const currentWorktree = getWorktreeRoot(cwd);
  const currentWorktreeName = path.basename(currentWorktree);
  const foreign = runtimes.filter(runtime => runtime.worktreeRoot !== currentWorktree);
  const local = runtimes.filter(runtime => runtime.worktreeRoot === currentWorktree);

  const lines = ['检测到 BoardGame E2E 端口已被占用。'];

  if (foreign.length > 0) {
    lines.push(`当前 worktree: ${currentWorktreeName}`);
    lines.push('以下 runtime 属于其他 worktree，已拒绝自动复用/清理：');
    for (const runtime of foreign) {
      lines.push(`- ${formatRuntimeSummary(runtime)}`);
    }
  }

  if (local.length > 0) {
    lines.push('同 worktree 的现有 runtime：');
    for (const runtime of local) {
      lines.push(`- ${formatRuntimeSummary(runtime)}`);
    }
  }

  lines.push('请改用 isolated 端口、先结束对应 runtime，或显式检查 `npm run test:e2e:list`。');
  return lines.join('\n');
}
