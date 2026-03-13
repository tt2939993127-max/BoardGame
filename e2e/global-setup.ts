import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS, toPortArray } from '../scripts/infra/e2e-port-config.js';
import {
    allocateAvailablePorts,
    cleanupAllWorkerPortFiles,
    cleanupPorts,
    cleanupWorkerPorts,
    saveWorkerPorts,
    waitForPortsFree,
} from '../scripts/infra/port-allocator.js';

interface RuntimeRecord {
    workerId: number;
    pid: number;
    ports: {
        frontend: number;
        gameServer: number;
        apiServer: number;
    };
    logPath?: string;
}

const TMP_DIR = path.join(process.cwd(), '.tmp');
const LOG_DIR = path.join(TMP_DIR, 'playwright-service-logs');
const PROCESS_FILE = path.join(TMP_DIR, 'playwright-worker-runtime.json');
const SERVICE_READY_TIMEOUT_MS = Number.parseInt(process.env.PW_SERVICE_READY_TIMEOUT_MS || '240000', 10);
const PORT_CLEANUP_TIMEOUT_MS = Number.parseInt(process.env.PW_PORT_CLEANUP_TIMEOUT_MS || '10000', 10);
const useDevServers = process.env.PW_USE_DEV_SERVERS === 'true';
const forceStartServers = process.env.PW_START_SERVERS === 'true';
const shouldStartServers = forceStartServers || !useDevServers;
const shouldReuseExistingServers = process.env.PW_REUSE_EXISTING_SERVERS === 'true';
const singleWorkerPorts = useDevServers ? DEV_SERVER_PORTS : E2E_SINGLE_WORKER_PORTS;

async function isUrlReady(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { redirect: 'manual' });
        return response.ok;
    } catch {
        return false;
    }
}

async function waitForUrl(url: string, timeoutMs = SERVICE_READY_TIMEOUT_MS): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isUrlReady(url)) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`等待服务就绪超时: ${url}`);
}

async function cleanupSingleWorkerPorts(): Promise<void> {
    cleanupPorts(singleWorkerPorts, 'Single Worker');

    const released = await waitForPortsFree(toPortArray(singleWorkerPorts), PORT_CLEANUP_TIMEOUT_MS);
    if (!released) {
        throw new Error(
            `单 worker E2E 端口释放超时: ${toPortArray(singleWorkerPorts).join(', ')}`
        );
    }
}

function spawnDetachedServer(script: string, args: string[] = []): RuntimeRecord {
    fs.mkdirSync(LOG_DIR, { recursive: true });

    const logFileName = [
        path.basename(script, path.extname(script)),
        args.length > 0 ? args.join('-') : 'single',
    ].join('-');
    const logPath = path.join(LOG_DIR, `${logFileName}.log`);
    const logFd = fs.openSync(logPath, 'a');

    const child = spawn(process.execPath, [script, ...args], {
        cwd: process.cwd(),
        env: process.env,
        detached: true,
        stdio: ['ignore', logFd, logFd],
        windowsHide: true,
    });
    fs.closeSync(logFd);

    if (!child.pid) {
        throw new Error(`启动服务失败，未获取到进程 PID: ${script}`);
    }

    child.unref();

    return {
        workerId: args[0] ? Number.parseInt(args[0], 10) : 0,
        pid: child.pid,
        ports: singleWorkerPorts,
        logPath,
    };
}

function readLogTail(logPath?: string, maxChars = 6000): string {
    if (!logPath || !fs.existsSync(logPath)) {
        return '（无可用日志）';
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    return content.length <= maxChars ? content : content.slice(-maxChars);
}

export default async function globalSetup() {
    const workers = Number.parseInt(process.env.PW_WORKERS || '1', 10);

    if (!shouldStartServers) {
        return;
    }

    fs.mkdirSync(TMP_DIR, { recursive: true });

    if (workers <= 1) {
        const urls = [
            `http://127.0.0.1:${singleWorkerPorts.gameServer}/games`,
            `http://127.0.0.1:${singleWorkerPorts.apiServer}/health`,
            `http://127.0.0.1:${singleWorkerPorts.frontend}/__ready`,
        ];

        if (shouldReuseExistingServers) {
            const ready = await Promise.all(urls.map(isUrlReady));
            if (ready.every(Boolean)) {
                console.log('\n♻️ 复用现有单 worker E2E 服务\n');
                return;
            }
        }

        await cleanupSingleWorkerPorts();

        const runtime = spawnDetachedServer('scripts/infra/start-single-worker-servers.js');
        fs.writeFileSync(PROCESS_FILE, JSON.stringify([runtime], null, 2));

        try {
            await Promise.all(urls.map(url => waitForUrl(url)));
        } catch (error) {
            const logTail = readLogTail(runtime.logPath);
            throw new Error(
                `${(error as Error).message}\n\n[服务日志尾部: ${runtime.logPath}]\n${logTail}`
            );
        }
        console.log('\n✅ 单 worker E2E 服务已就绪\n');
        return;
    }

    cleanupAllWorkerPortFiles();

    const runtimes: RuntimeRecord[] = [];
    console.log(`\n🚀 启动 ${workers} 个并行 worker 的隔离服务...\n`);

    for (let workerId = 0; workerId < workers; workerId++) {
        cleanupWorkerPorts(workerId);

        const ports = await allocateAvailablePorts(workerId);
        saveWorkerPorts(workerId, ports);

        const runtime = spawnDetachedServer('scripts/infra/start-worker-servers.js', [String(workerId)]);
        runtimes.push({
            ...runtime,
            workerId,
            ports,
        });

        console.log(
            `Worker ${workerId}: Frontend=${ports.frontend}, GameServer=${ports.gameServer}, API=${ports.apiServer}, PID=${runtime.pid}`
        );
    }

    fs.writeFileSync(PROCESS_FILE, JSON.stringify(runtimes, null, 2));

    await Promise.all(runtimes.map(async ({ workerId, ports, logPath }) => {
        try {
            await waitForUrl(`http://127.0.0.1:${ports.gameServer}/games`);
            await waitForUrl(`http://127.0.0.1:${ports.apiServer}/health`);
            await waitForUrl(`http://127.0.0.1:${ports.frontend}/__ready`);
            console.log(`✅ Worker ${workerId} 服务已就绪`);
        } catch (error) {
            const logTail = readLogTail(logPath);
            throw new Error(
                `${(error as Error).message}\n\n[Worker ${workerId} 服务日志尾部: ${logPath}]\n${logTail}`
            );
        }
    }));
}
