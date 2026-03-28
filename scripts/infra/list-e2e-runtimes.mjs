import {
  formatRuntimeSummary,
  getRegistryFilePath,
  getSharedRegistryFilePath,
  listRuntimes,
} from './e2e-runtime-registry.js';

const runtimes = listRuntimes();
console.log(`Local E2E runtime registry: ${getRegistryFilePath()}`);
console.log(`Shared E2E runtime registry: ${getSharedRegistryFilePath()}`);
if (runtimes.length === 0) {
  console.log('No active E2E runtimes registered.');
  process.exit(0);
}

for (const runtime of runtimes) {
  console.log('---');
  console.log(`runtimeId: ${runtime.runtimeId}`);
  console.log(`worktree: ${runtime.worktreeRoot}`);
  console.log(`scope: ${runtime.scope}`);
  console.log(`status: ${runtime.status}`);
  console.log(`mode: ${runtime.mode}`);
  console.log(`workers: ${runtime.workers}`);
  console.log(`ports: ${JSON.stringify(runtime.ports)}`);
  console.log(`target: ${runtime.target || '<unknown>'}`);
  console.log(`ownerPids: ${JSON.stringify(runtime.ownerPids ?? [])}`);
  console.log(`servicePids: ${JSON.stringify(runtime.servicePids ?? [])}`);
  console.log(`createdAt: ${runtime.createdAt}`);
  console.log(`lastHeartbeatAt: ${runtime.lastHeartbeatAt ?? '<unknown>'}`);
  console.log(`updatedAt: ${runtime.updatedAt}`);
  console.log(`summary: ${formatRuntimeSummary(runtime)}`);
}
