/**
 * 启动单 worker E2E 所需的前端 / 游戏 / API 三个服务。
 */

import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS } from './e2e-port-config.js';
import { isPortInUse } from './port-allocator.js';
import { registerExitGuard, spawnNodeScript, spawnPackageScript, spawnTsxScript } from './e2e-server-launcher.js';

const useDevServers = process.env.PW_USE_DEV_SERVERS === 'true';
const ports = useDevServers ? DEV_SERVER_PORTS : E2E_SINGLE_WORKER_PORTS;

console.log('\n🚀 启动单 worker E2E 服务...');
console.log(`  前端: http://localhost:${ports.frontend}`);
console.log(`  游戏服务: http://localhost:${ports.gameServer}`);
console.log(`  API 服务: http://localhost:${ports.apiServer}\n`);

const busyPorts = Object.entries(ports)
  .filter(([, port]) => isPortInUse(port))
  .map(([name, port]) => `${name}(${port})`);

if (busyPorts.length > 0) {
  console.error(`以下端口已被占用: ${busyPorts.join(', ')}`);
  process.exit(1);
}

const frontend = spawnNodeScript('scripts/infra/vite-with-logging.js', {
  ...process.env,
  E2E_PROXY_QUIET: 'true',
  VITE_DEV_PORT: String(ports.frontend),
  GAME_SERVER_PORT: String(ports.gameServer),
  API_SERVER_PORT: String(ports.apiServer),
});

const gameServer = spawnTsxScript(['server.ts'], {
  ...process.env,
  GAME_SERVER_PORT: String(ports.gameServer),
  USE_PERSISTENT_STORAGE: 'false',
});

const apiServer = spawnPackageScript('dev:api', {
  ...process.env,
  API_SERVER_PORT: String(ports.apiServer),
});

const cleanup = () => {
  console.log('\n🛑 停止单 worker E2E 服务...');
  frontend.kill();
  gameServer.kill();
  apiServer.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

registerExitGuard(frontend, '前端服务', cleanup);
registerExitGuard(gameServer, '游戏服务', cleanup);
registerExitGuard(apiServer, 'API 服务', cleanup);

console.log('✅ 单 worker E2E 服务已启动');
console.log('   按 Ctrl+C 停止所有服务\n');
