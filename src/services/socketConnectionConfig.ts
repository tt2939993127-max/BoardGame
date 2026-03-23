/**
 * Slow socket handshakes on production links should not immediately cascade into reconnect storms.
 * Keep the connect timeout relaxed, but default production traffic to websocket-only.
 */
export const SOCKET_CONNECT_TIMEOUT_MS = 30_000;
export const SOCKET_COMPATIBILITY_MODE_STORAGE_KEY = 'boardgame.socketCompatibilityMode';

export type SocketIoTransport = 'websocket' | 'polling';

const SOCKET_IO_TRANSPORTS_DEFAULT: SocketIoTransport[] = ['websocket'];
const SOCKET_IO_TRANSPORTS_COMPATIBILITY: SocketIoTransport[] = ['websocket', 'polling'];

const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const isDev = metaEnv.DEV === true;
const mode = typeof metaEnv.MODE === 'string' ? metaEnv.MODE : '';
const allowPollingOverride = metaEnv.VITE_SOCKET_ALLOW_POLLING === 'true';
const allowPollingByEnvironment = isDev || mode === 'test' || allowPollingOverride;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Dev/test and explicit env overrides should always allow polling for debugging.
 * Production users can toggle compatibility mode locally when pure websocket is blocked.
 */
export const canToggleSocketCompatibilityMode = () => !allowPollingByEnvironment;

export const isSocketCompatibilityModeEnabled = (): boolean => {
    if (allowPollingByEnvironment) {
        return true;
    }
    if (!canUseStorage()) {
        return false;
    }
    return window.localStorage.getItem(SOCKET_COMPATIBILITY_MODE_STORAGE_KEY) === 'true';
};

export const setSocketCompatibilityModeEnabled = (enabled: boolean): void => {
    if (!canUseStorage() || allowPollingByEnvironment) {
        return;
    }

    if (enabled) {
        window.localStorage.setItem(SOCKET_COMPATIBILITY_MODE_STORAGE_KEY, 'true');
        return;
    }

    window.localStorage.removeItem(SOCKET_COMPATIBILITY_MODE_STORAGE_KEY);
};

export const getSocketIoTransports = (): SocketIoTransport[] => (
    isSocketCompatibilityModeEnabled()
        ? [...SOCKET_IO_TRANSPORTS_COMPATIBILITY]
        : [...SOCKET_IO_TRANSPORTS_DEFAULT]
);
