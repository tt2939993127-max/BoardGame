import { spawn } from 'child_process';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const cmdCommand = isWindows ? 'cmd.exe' : undefined;

export function spawnNodeScript(scriptPath, env) {
  return spawn(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env,
  });
}

export function spawnNpxCommand(args, env) {
  if (isWindows) {
    return spawn(cmdCommand, ['/c', 'npx', ...args], {
      stdio: 'inherit',
      env,
    });
  }

  return spawn('npx', args, {
    stdio: 'inherit',
    env,
  });
}

export function spawnTsxScript(args, env) {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return spawn(process.execPath, [tsxCliPath, ...args], {
    stdio: 'inherit',
    env,
  });
}

export function spawnPackageScript(scriptName, env) {
  if (isWindows) {
    return spawn('powershell.exe', ['-Command', `npm run ${scriptName}`], {
      stdio: 'inherit',
      env,
    });
  }

  return spawn('npm', ['run', scriptName], {
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
