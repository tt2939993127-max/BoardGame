/**
 * Slow socket handshakes on production links should not immediately cascade into reconnect storms.
 * Keep the connect timeout relaxed, but default production traffic to websocket-only.
 */
export const SOCKET_CONNECT_TIMEOUT_MS = 30_000;

const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const isDev = metaEnv.DEV === true;
const mode = typeof metaEnv.MODE === 'string' ? metaEnv.MODE : '';
const allowPollingOverride = metaEnv.VITE_SOCKET_ALLOW_POLLING === 'true';

/**
 * Cloudflare + long polling introduces noticeably higher latency than pure websocket on production.
 * Keep polling for local development / tests, but ship websocket-only by default online.
 */
export const SOCKET_IO_TRANSPORTS = (
    isDev || mode === 'test' || allowPollingOverride
        ? ['websocket', 'polling']
        : ['websocket']
) as const;
