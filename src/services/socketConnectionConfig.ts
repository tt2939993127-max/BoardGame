/**
 * 生产环境当前 socket 建连抖动明显，10 秒超时会把慢握手直接放大成重连风暴。
 * 统一放宽到 30 秒，避免 Lobby/Match/Social 在高抖动时过早判失败。
 */
export const SOCKET_CONNECT_TIMEOUT_MS = 30_000;
