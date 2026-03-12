import { spawn } from 'child_process';
export function spawnNodeScript(scriptPath, env, args = []) {
  return spawn(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env,
  });
}

export function spawnBundleRunner({ label, entry, outfile, tsconfig, env }) {
  return spawnNodeScript('scripts/infra/dev-bundle-runner.mjs', env, [
    '--label', label,
    '--entry', entry,
    '--outfile', outfile,
    '--tsconfig', tsconfig,
  ]);
}

export function spawnNpxCommand(args, env) {
  return spawn(process.execPath, ['node_modules/npm/bin/npm-cli.js', 'exec', '--yes', '--', ...args], {
    stdio: 'inherit',
    env,
  });
}

export function registerExitGuard(child, label, onFailure) {
  child.on('exit', code => {
    if (code !== 0 && code !== null) {
      console.error(`${label}异常退出 (code ${code})`);
      onFailure();
    }
  });
}
