import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { cleanupAllWorkerPortFiles, cleanupWorkerPorts } from '../scripts/infra/port-allocator.js';

interface WorkerRuntimeRecord {
    workerId: number;
    pid: number;
}

const PROCESS_FILE = path.join(process.cwd(), '.tmp', 'playwright-worker-runtime.json');

function killProcessTree(pid: number): void {
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
            return;
        }

        process.kill(-pid, 'SIGTERM');
    } catch {
        // 进程可能已经退出，交给端口清理兜底
    }
}

export default async function globalTeardown() {
    const workers = parseInt(process.env.PW_WORKERS || '1', 10);

    if (workers <= 1) {
        return;
    }

    console.log('\n🧹 清理多 worker 隔离服务...\n');

    if (fs.existsSync(PROCESS_FILE)) {
        const runtimes = JSON.parse(fs.readFileSync(PROCESS_FILE, 'utf-8')) as WorkerRuntimeRecord[];
        for (const runtime of runtimes) {
            killProcessTree(runtime.pid);
        }
        fs.unlinkSync(PROCESS_FILE);
    }

    for (let i = 0; i < workers; i++) {
        cleanupWorkerPorts(i);
    }

    cleanupAllWorkerPortFiles();
}
