interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly VITE_AUTH_API_URL?: string;
    readonly VITE_GAME_SERVER_URL?: string;
    readonly VITE_ASSETS_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/** 构建时注入的 locale JSON content hash 映射（由 vite-locale-hash 插件生成） */
declare const __LOCALE_HASHES__: Record<string, string>;
