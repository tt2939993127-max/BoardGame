interface ImportMetaEnv {
    readonly VITE_AUTH_API_URL?: string;
    readonly VITE_GAME_SERVER_URL?: string;
    readonly VITE_ASSETS_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
