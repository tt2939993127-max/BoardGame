/**
 * 清理 E2E 测试遗留的端口占用。
 *
 * 默认只清理单 worker E2E 端口，避免误杀本地开发环境。
 */

import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS, toPortArray } from './e2e-port-config.js';
import { cleanupPorts } from './port-allocator.js';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';
import {
  formatRuntimeSummary,
  listRuntimes,
  pruneStaleRuntimes,
  removeRuntimeById,
  stopRuntime,
} from './e2e-runtime-registry.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readOptionValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) {
    return '';
  }

  return args[index + 1]?.trim() ?? '';
}

export async function cleanupTestConnections(args = process.argv.slice(2)) {
  await assertChildProcessSupport('E2E 测试端口清理');

  const DEV_PORTS = toPortArray(DEV_SERVER_PORTS);
  const E2E_PORTS = toPortArray(E2E_SINGLE_WORKER_PORTS);

  const cleanDev = args.includes('--dev');
  const sharedCleanupAllowed = args.includes('--shared') || process.env.BG_E2E_ALLOW_SHARED_CLEANUP === '1';
  const explicitE2E = args.includes('--e2e');
  const cleanE2E = explicitE2E && sharedCleanupAllowed;
  const runtimeId = readOptionValue(args, '--runtime');

  console.log('🧹 清理端口占用...\n');

  const { stale } = pruneStaleRuntimes(process.cwd(), { killOrphans: true, logger: console });
  if (stale.length > 0) {
    console.log(`已回收 ${stale.length} 个失联/stale E2E runtime。\n`);
  }

  if (runtimeId) {
    const runtimes = listRuntimes();
    const runtime = runtimes.find(entry => entry.runtimeId === runtimeId);
    if (!runtime) {
      console.error(`未找到 runtimeId=${runtimeId} 的活跃 E2E runtime。`);
      process.exit(1);
    }

    console.log(`精准停止 runtime: ${formatRuntimeSummary(runtime)}`);
    stopRuntime(runtime, { logger: console });
    removeRuntimeById(runtime.runtimeId);
    console.log('✅ 指定 runtime 已停止并从共享 registry 移除。\n');
  }

  if (cleanDev) {
    console.log(`清理开发环境端口 (${DEV_PORTS.join(', ')})...`);
    cleanupPorts(DEV_PORTS, 'Dev');
  }

  if (explicitE2E && !sharedCleanupAllowed) {
    console.log(`⚠️ 已拒绝清理共享 single-worker E2E 端口 (${E2E_PORTS.join(', ')})。`);
    console.log('   原因：这些端口可能正被其他 BoardGame AI / worktree / guarded task 使用。');
    console.log('   如已确认可安全清理，请显式传入 --shared，或设置 BG_E2E_ALLOW_SHARED_CLEANUP=1。\n');
  }

  if (!cleanDev && !explicitE2E) {
    console.log('ℹ️ 默认安全模式下，不再自动清理共享 single-worker E2E 端口。');
    console.log('   - 仅清理开发端口：npm run test:e2e:cleanup -- --dev');
    console.log('   - 显式清理共享 E2E 端口：npm run test:e2e:cleanup -- --e2e --shared\n');
  }

  if (cleanE2E) {
    console.log(`清理共享 E2E 测试环境端口 (${E2E_PORTS.join(', ')})...`);
    cleanupPorts(E2E_PORTS, 'E2E');
  }

  const activeRuntimes = listRuntimes();
  if (activeRuntimes.length > 0) {
    console.log('\n当前仍在运行的 E2E runtime:');
    for (const runtime of activeRuntimes) {
      console.log(`  - ${formatRuntimeSummary(runtime)}`);
    }
  }

  console.log('✅ 清理完成！');
  console.log('\n💡 使用方式：');
  console.log('  npm run test:e2e:cleanup                           # 安全模式：仅清理 stale runtime，不清共享端口');
  console.log('  npm run test:e2e:cleanup -- --runtime <runtimeId>  # 精准停止指定 E2E runtime');
  console.log('  npm run test:e2e:cleanup -- --dev                  # 清理开发环境');
  console.log('  npm run test:e2e:cleanup -- --e2e --shared         # 显式清理共享 E2E 端口');
  console.log('  BG_E2E_ALLOW_SHARED_CLEANUP=1 npm run test:e2e:cleanup -- --e2e');
}

const isDirectExecution = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectExecution) {
  await cleanupTestConnections();
}
