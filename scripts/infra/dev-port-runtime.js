import fs from 'node:fs';
import path from 'node:path';

const DEV_RUNTIME_PORTS_FILE = path.join(process.cwd(), '.tmp', 'dev-runtime-ports.json');

function normalizePort(value) {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : null;
}

function normalizePortsRecord(ports) {
  if (!ports || typeof ports !== 'object') {
    return null;
  }

  const frontend = normalizePort(ports.frontend);
  const gameServer = normalizePort(ports.gameServer);
  const apiServer = normalizePort(ports.apiServer);
  if (!frontend || !gameServer || !apiServer) {
    return null;
  }

  return { frontend, gameServer, apiServer };
}

export function saveDevRuntimePorts(ports) {
  const normalized = normalizePortsRecord(ports);
  if (!normalized) {
    throw new Error('开发端口记录无效，无法写入运行时文件');
  }

  fs.mkdirSync(path.dirname(DEV_RUNTIME_PORTS_FILE), { recursive: true });
  fs.writeFileSync(
    DEV_RUNTIME_PORTS_FILE,
    JSON.stringify(
      {
        ports: normalized,
        ownerPid: process.pid,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return normalized;
}

export function loadDevRuntimePorts() {
  try {
    const raw = fs.readFileSync(DEV_RUNTIME_PORTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return normalizePortsRecord(parsed?.ports);
  } catch {
    return null;
  }
}

export function removeDevRuntimePorts() {
  if (!fs.existsSync(DEV_RUNTIME_PORTS_FILE)) {
    return;
  }

  try {
    fs.unlinkSync(DEV_RUNTIME_PORTS_FILE);
  } catch {
    // ignore
  }
}
