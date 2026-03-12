/**
 * 清理 E2E 测试遗留的端口占用。
 *
 * 默认只清理单 worker E2E 端口，避免误杀本地开发环境。
 */

import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS, toPortArray } from './e2e-port-config.js';
import { cleanupPorts } from './port-allocator.js';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';

await assertChildProcessSupport('E2E 测试端口清理');

const DEV_PORTS = toPortArray(DEV_SERVER_PORTS);
const E2E_PORTS = toPortArray(E2E_SINGLE_WORKER_PORTS);

const args = process.argv.slice(2);
const cleanDev = args.includes('--dev');
const cleanE2E = args.includes('--e2e') || args.length === 0;

console.log('🧹 清理端口占用...\n');

if (cleanDev) {
  console.log(`清理开发环境端口 (${DEV_PORTS.join(', ')})...`);
  cleanupPorts(DEV_PORTS, 'Dev');
}

if (cleanE2E) {
  console.log(`清理 E2E 测试环境端口 (${E2E_PORTS.join(', ')})...`);
  cleanupPorts(E2E_PORTS, 'E2E');
}

console.log('\n✅ 清理完成！');
console.log('\n💡 使用方式：');
console.log('  npm run test:e2e:cleanup                  # 清理测试环境（默认）');
console.log('  npm run test:e2e:cleanup -- --dev         # 清理开发环境');
console.log('  npm run test:e2e:cleanup -- --e2e --dev   # 清理两个环境');
