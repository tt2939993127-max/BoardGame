const normalizeUrl = (url: string) => url.replace(/\/$/, '');

// In dev we run game-server on a different port and rely on Vite proxy for same-origin calls.
// Use a relative base URL so socket.io-client / boardgame.io use the current origin.
const FALLBACK_GAME_SERVER_URL = import.meta.env.DEV ? '' : window.location.origin;

export const GAME_SERVER_URL = normalizeUrl(
    import.meta.env.VITE_GAME_SERVER_URL || FALLBACK_GAME_SERVER_URL
);

const FALLBACK_AUTH_API_URL = import.meta.env.DEV
    ? '/auth'
    : '/auth';

export const AUTH_API_URL = normalizeUrl(
    import.meta.env.VITE_AUTH_API_URL || FALLBACK_AUTH_API_URL
);
