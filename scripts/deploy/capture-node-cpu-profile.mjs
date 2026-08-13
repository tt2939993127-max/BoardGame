#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_INSPECTOR_PORT = 9229;
const REQUEST_TIMEOUT_MS = 5_000;

function readOption(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function readPositiveInteger(name, fallback) {
    const rawValue = readOption(name);
    if (rawValue === undefined) return fallback;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

function withTimeout(task, label, timeoutMs = REQUEST_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        task.then(
            (value) => {
                clearTimeout(timeout);
                resolve(value);
            },
            (error) => {
                clearTimeout(timeout);
                reject(error);
            },
        );
    });
}

async function fetchInspectorTarget(inspectorPort) {
    const endpoint = `http://127.0.0.1:${inspectorPort}/json/list`;
    const response = await withTimeout(fetch(endpoint), 'Inspector endpoint');
    if (!response.ok) {
        throw new Error(`Inspector endpoint returned HTTP ${response.status}`);
    }
    const targets = await response.json();
    const target = Array.isArray(targets) ? targets.find((item) => typeof item?.webSocketDebuggerUrl === 'string') : null;
    if (!target) {
        throw new Error('Inspector endpoint did not provide a WebSocket target');
    }
    return target.webSocketDebuggerUrl;
}

function connectInspector(webSocketUrl) {
    return withTimeout(new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketUrl);
        socket.addEventListener('open', () => resolve(socket), { once: true });
        socket.addEventListener('error', () => reject(new Error('Inspector WebSocket connection failed')), { once: true });
    }), 'Inspector WebSocket connection');
}

function createRpc(socket) {
    let nextId = 1;
    const pending = new Map();

    socket.addEventListener('message', (event) => {
        let message;
        try {
            message = JSON.parse(String(event.data));
        } catch {
            return;
        }
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        if (message.error) {
            request.reject(new Error(`Inspector ${request.method} failed: ${message.error.message ?? JSON.stringify(message.error)}`));
            return;
        }
        request.resolve(message.result ?? {});
    });

    socket.addEventListener('close', () => {
        for (const request of pending.values()) {
            request.reject(new Error(`Inspector connection closed while waiting for ${request.method}`));
        }
        pending.clear();
    });

    return (method, params) => withTimeout(new Promise((resolve, reject) => {
        const id = nextId;
        nextId += 1;
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, ...(params ? { params } : {}) }));
    }), `Inspector ${method}`);
}

async function main() {
    const outputPath = readOption('--output');
    if (!outputPath) {
        throw new Error('Missing required --output path');
    }

    const durationMs = readPositiveInteger('--duration-ms', 8_000);
    const inspectorPort = readPositiveInteger('--inspector-port', DEFAULT_INSPECTOR_PORT);
    const webSocketUrl = await fetchInspectorTarget(inspectorPort);
    const socket = await connectInspector(webSocketUrl);
    const request = createRpc(socket);

    try {
        await request('Profiler.enable');
        await request('Profiler.start');
        await new Promise((resolve) => setTimeout(resolve, durationMs));
        const { profile } = await request('Profiler.stop');
        if (!profile || !Array.isArray(profile.nodes)) {
            throw new Error('Inspector returned an invalid CPU profile');
        }
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(profile));
        console.log(`CPU profile written: ${outputPath}`);
    } finally {
        socket.close();
    }
}

main().catch((error) => {
    console.error(`[capture-node-cpu-profile] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
