import { spawn } from 'child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { withWindowsHide } from './windows-hide.js';

export function spawnNodeScript(scriptPath, env, args = []) {
  return spawn(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env,
    ...withWindowsHide({}, env),
  });
}

export function spawnBundleRunner({ label, entry, outfile, tsconfig, env, watch = true }) {
  const runnerArgs = [
    '--label', label,
    '--entry', entry,
    '--outfile', outfile,
    '--tsconfig', tsconfig,
  ];
  if (!watch) {
    runnerArgs.push('--once', 'true');
  }

  return spawnNodeScript('scripts/infra/dev-bundle-runner.mjs', env, [
    ...runnerArgs,
  ]);
}

export function spawnTsxEntry({ entry, tsconfig, env }) {
  return spawn(process.execPath, [
    'node_modules/tsx/dist/cli.mjs',
    '--tsconfig',
    tsconfig,
    entry,
  ], {
    stdio: 'inherit',
    env,
    ...withWindowsHide({}, env),
  });
}

export function spawnTsLoaderEntry({ entry, env, tsconfig }) {
  const loaderUrl = pathToFileURL(path.resolve('scripts/infra/ts-runtime-loader.mjs')).href;
  return spawn(process.execPath, [
    '--loader',
    loaderUrl,
    entry,
  ], {
    stdio: 'inherit',
    env: {
      ...env,
      ...(tsconfig ? { TS_RUNTIME_TSCONFIG: path.resolve(tsconfig) } : {}),
    },
    ...withWindowsHide({}, env),
  });
}

export function spawnNpxCommand(args, env) {
  return spawn(process.execPath, ['node_modules/npm/bin/npm-cli.js', 'exec', '--yes', '--', ...args], {
    stdio: 'inherit',
    env,
    ...withWindowsHide({}, env),
  });
}

export function registerExitGuard(child, label, onFailure, options = {}) {
  const bootstrapLogFile = options.bootstrapLogFile?.trim();

  child.on('error', error => {
    const detailParts = [
      `${label}进程启动失败`,
      `pid=${child.pid ?? 'unknown'}`,
      `error=${error instanceof Error ? error.message : String(error)}`,
    ];

    if (bootstrapLogFile) {
      detailParts.push(`bootstrapLog=${bootstrapLogFile}`);
    }

    const detail = detailParts.join(', ');
    console.error(detail);
    onFailure(detail);
  });

  child.on('exit', (code, signal) => {
    const stoppedByParent = code === null && (signal === 'SIGINT' || signal === 'SIGTERM');
    if (code === 0 || stoppedByParent) {
      return;
    }

    const detailParts = [
      `${label}异常退出`,
      `pid=${child.pid ?? 'unknown'}`,
    ];

    if (code !== null) {
      detailParts.push(`code=${code}`);
    }

    if (signal) {
      detailParts.push(`signal=${signal}`);
    }

    if (bootstrapLogFile) {
      detailParts.push(`bootstrapLog=${bootstrapLogFile}`);
    }

    const detail = detailParts.join(', ');
    console.error(detail);
    onFailure(detail);
  });
}
