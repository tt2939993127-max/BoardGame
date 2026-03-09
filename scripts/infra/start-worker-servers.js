/**
 * 为指定 worker 启动一组独立的 E2E 服务。
 *
 * 用法：
 *   node scripts/infra/start-worker-servers.js <workerId>
 */

import { spawn } from 'child_process';
import { allocateAvailablePorts, loadWorkerPorts, saveWorkerPorts, isPortInUse } from './port-allocator.js';

const isWindows = process.platform === 'win32';
const cmdCommand = isWindows ? 'cmd.exe' : undefined;

function spawnNode(scriptPath, env) {
  return spawn(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env,
  });
}

function spawnNpx(args, env) {
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

const workerId = Number.parseInt(process.argv[2] ?? '', 10);
if (Number.isNaN(workerId)) {
  console.error('用法: node scripts/infra/start-worker-servers.js <workerId>');
  process.exit(1);
}

const ports = loadWorkerPorts(workerId) ?? await allocateAvailablePorts(workerId);
console.log(`\n🚀 启动 Worker ${workerId} 的服务器...`);
console.log(`  前端: http://localhost:${ports.frontend}`);
console.log(`  游戏服务器: http://localhost:${ports.gameServer}`);
console.log(`  API 服务器: http://localhost:${ports.apiServer}\n`);

const busyPorts = Object.entries(ports)
  .filter(([, port]) => isPortInUse(port))
  .map(([name, port]) => `${name}(${port})`);

if (busyPorts.length > 0) {
  console.error(`以下端口已被占用: ${busyPorts.join(', ')}`);
  console.error(`请先运行: node scripts/infra/port-allocator.js ${workerId}`);
  process.exit(1);
}

saveWorkerPorts(workerId, ports);

const frontend = spawnNode('scripts/infra/vite-with-logging.js', {
  ...process.env,
  E2E_PROXY_QUIET: 'true',
  VITE_DEV_PORT: String(ports.frontend),
  GAME_SERVER_PORT: String(ports.gameServer),
  API_SERVER_PORT: String(ports.apiServer),
});

const gameServer = spawnNpx(['tsx', 'server.ts'], {
  ...process.env,
  GAME_SERVER_PORT: String(ports.gameServer),
  USE_PERSISTENT_STORAGE: 'false',
});

const apiServer = spawnNpx(['tsx', '--tsconfig', 'apps/api/tsconfig.json', 'apps/api/src/main.ts'], {
  ...process.env,
  API_SERVER_PORT: String(ports.apiServer),
});

const cleanup = () => {
  console.log(`\n🛑 停止 Worker ${workerId} 的服务器...`);
  frontend.kill();
  gameServer.kill();
  apiServer.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

frontend.on('exit', code => {
  if (code !== 0 && code !== null) {
    console.error(`前端服务器异常退出 (code ${code})`);
    cleanup();
  }
});

gameServer.on('exit', code => {
  if (code !== 0 && code !== null) {
    console.error(`游戏服务器异常退出 (code ${code})`);
    cleanup();
  }
});

apiServer.on('exit', code => {
  if (code !== 0 && code !== null) {
    console.error(`API 服务器异常退出 (code ${code})`);
    cleanup();
  }
});

console.log(`✅ Worker ${workerId} 服务器已启动`);
console.log('   按 Ctrl+C 停止所有服务\n');
