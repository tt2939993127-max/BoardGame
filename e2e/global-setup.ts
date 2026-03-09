import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { allocateAvailablePorts, cleanupAllWorkerPortFiles, cleanupWorkerPorts, saveWorkerPorts } from '../scripts/infra/port-allocator.js';

interface WorkerRuntimeRecord {
    workerId: number;
    pid: number;
    ports: {
        frontend: number;
        gameServer: number;
        apiServer: number;
    };
}

const TMP_DIR = path.join(process.cwd(), '.tmp');
const PROCESS_FILE = path.join(TMP_DIR, 'playwright-worker-runtime.json');
const SERVICE_READY_TIMEOUT_MS = Number.parseInt(process.env.PW_SERVICE_READY_TIMEOUT_MS || '240000', 10);

async function waitForUrl(url: string, timeoutMs = SERVICE_READY_TIMEOUT_MS): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url, { redirect: 'manual' });
            if (response.ok) {
                return;
            }
        } catch {
            // 服务尚未启动，继续轮询
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`等待服务就绪超时: ${url}`);
}

export default async function globalSetup() {
    const workers = parseInt(process.env.PW_WORKERS || '1', 10);

    if (workers <= 1) {
        return;
    }

    fs.mkdirSync(TMP_DIR, { recursive: true });
    cleanupAllWorkerPortFiles();

    const runtimes: WorkerRuntimeRecord[] = [];
    console.log(`\n🚀 启动 ${workers} 个并行 worker 的隔离服务...\n`);

    for (let i = 0; i < workers; i++) {
        cleanupWorkerPorts(i);

        const ports = await allocateAvailablePorts(i);
        saveWorkerPorts(i, ports);

        const child = spawn(process.execPath, ['scripts/infra/start-worker-servers.js', String(i)], {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            stdio: 'ignore',
        });

        if (!child.pid) {
            throw new Error(`启动 Worker ${i} 服务失败：未获取到进程 PID`);
        }

        child.unref();
        runtimes.push({ workerId: i, pid: child.pid, ports });
        console.log(`Worker ${i}: Frontend=${ports.frontend}, GameServer=${ports.gameServer}, API=${ports.apiServer}, PID=${child.pid}`);
    }

    fs.writeFileSync(PROCESS_FILE, JSON.stringify(runtimes, null, 2));

    await Promise.all(runtimes.map(async ({ workerId, ports }) => {
        await waitForUrl(`http://127.0.0.1:${ports.gameServer}/games`);
        await waitForUrl(`http://127.0.0.1:${ports.apiServer}/health`);
        await waitForUrl(`http://127.0.0.1:${ports.frontend}/__ready`);
        console.log(`✅ Worker ${workerId} 服务已就绪`);
    }));
}
