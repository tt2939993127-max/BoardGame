import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS, toPortArray } from '../scripts/infra/e2e-port-config.js';
import {
    cleanupAllWorkerPortFiles,
    cleanupPorts,
    cleanupWorkerPorts,
    waitForPortsFree,
} from '../scripts/infra/port-allocator.js';

interface RuntimeRecord {
    workerId: number;
    pid: number;
}

const PROCESS_FILE = path.join(process.cwd(), '.tmp', 'playwright-worker-runtime.json');
const PORT_CLEANUP_TIMEOUT_MS = Number.parseInt(process.env.PW_PORT_CLEANUP_TIMEOUT_MS || '10000', 10);

function killProcessTree(pid: number): void {
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
            return;
        }

        process.kill(-pid, 'SIGTERM');
    } catch {
        // 进程可能已经退出，后续端口清理会兜底。
    }
}

export default async function globalTeardown() {
    const workers = Number.parseInt(process.env.PW_WORKERS || '1', 10);
    const useDevServers = process.env.PW_USE_DEV_SERVERS === 'true';
    const forceStartServers = process.env.PW_START_SERVERS === 'true';
    const shouldStartServers = forceStartServers || !useDevServers;
    const singleWorkerPorts = useDevServers ? DEV_SERVER_PORTS : E2E_SINGLE_WORKER_PORTS;

    if (!shouldStartServers) {
        return;
    }

    console.log(`\n🧹 清理${workers > 1 ? '多 worker 隔离' : '单 worker'} E2E 服务...\n`);

    if (fs.existsSync(PROCESS_FILE)) {
        const runtimes = JSON.parse(fs.readFileSync(PROCESS_FILE, 'utf-8')) as RuntimeRecord[];
        for (const runtime of runtimes) {
            killProcessTree(runtime.pid);
        }
        fs.unlinkSync(PROCESS_FILE);
    }

    if (workers <= 1) {
        cleanupPorts(singleWorkerPorts, 'Single Worker');
        await waitForPortsFree(toPortArray(singleWorkerPorts), PORT_CLEANUP_TIMEOUT_MS);
        cleanupAllWorkerPortFiles();
        return;
    }

    for (let workerIndex = 0; workerIndex < workers; workerIndex++) {
        cleanupWorkerPorts(workerIndex);
    }

    cleanupAllWorkerPortFiles();
}
