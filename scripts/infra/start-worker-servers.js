/**
 * 为指定 worker 启动一组隔离的 E2E 服务。
 *
 * 用法：
 *   node scripts/infra/start-worker-servers.js <workerId>
 */

import path from 'node:path';
import { allocateAvailablePorts, loadWorkerPorts, saveWorkerPorts, isPortInUse } from './port-allocator.js';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';
import { registerExitGuard, spawnBundleRunner, spawnNodeScript } from './e2e-server-launcher.js';

const workerId = Number.parseInt(process.argv[2] ?? '', 10);
if (Number.isNaN(workerId)) {
  console.error('用法: node scripts/infra/start-worker-servers.js <workerId>');
  process.exit(1);
}

await assertChildProcessSupport(`Worker ${workerId} E2E 服务启动`, { probeEsbuild: true });

const ports = loadWorkerPorts(workerId) ?? await allocateAvailablePorts(workerId);
console.log(`\n🚀 启动 Worker ${workerId} 的 E2E 服务...`);
console.log(`  前端: http://localhost:${ports.frontend}`);
console.log(`  游戏服务: http://localhost:${ports.gameServer}`);
console.log(`  API 服务: http://localhost:${ports.apiServer}\n`);

const busyPorts = Object.entries(ports)
  .filter(([, port]) => isPortInUse(port))
  .map(([name, port]) => `${name}(${port})`);

if (busyPorts.length > 0) {
  console.error(`以下端口已被占用: ${busyPorts.join(', ')}`);
  console.error(`请先运行: node scripts/infra/port-allocator.js ${workerId}`);
  process.exit(1);
}

saveWorkerPorts(workerId, ports);

const frontend = spawnNodeScript('scripts/infra/vite-with-logging.js', {
  ...process.env,
  E2E_PROXY_QUIET: 'true',
  VITE_DEV_PORT: String(ports.frontend),
  GAME_SERVER_PORT: String(ports.gameServer),
  API_SERVER_PORT: String(ports.apiServer),
});

const gameServer = spawnBundleRunner({
  label: `e2e-game-worker-${workerId}`,
  entry: 'server.ts',
  outfile: path.join('temp', 'dev-bundles', `e2e-worker-${workerId}`, 'game', 'server.mjs'),
  tsconfig: 'tsconfig.server.json',
  env: {
  ...process.env,
  NODE_ENV: 'test',
  GAME_SERVER_PORT: String(ports.gameServer),
  USE_PERSISTENT_STORAGE: 'false',
  },
});

const apiServer = spawnBundleRunner({
  label: `e2e-api-worker-${workerId}`,
  entry: 'apps/api/src/main.ts',
  outfile: path.join('temp', 'dev-bundles', `e2e-worker-${workerId}`, 'api', 'main.mjs'),
  tsconfig: 'apps/api/tsconfig.json',
  env: {
  ...process.env,
  API_SERVER_PORT: String(ports.apiServer),
  },
});

const cleanup = () => {
  console.log(`\n🛑 停止 Worker ${workerId} 的 E2E 服务...`);
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

console.log(`✅ Worker ${workerId} 服务已启动`);
console.log('   按 Ctrl+C 停止所有服务\n');
