export const SPA_FALLBACK_EXCLUDE_RE = /^\/(assets|auth|health|social-socket|games|default|lobby-socket|socket\.io|admin|ugc|layout|feedback|review|invite|message|friend|user-settings|sponsors|notifications|game-changelogs)(\/|$)/;
export const NO_CACHE_HEADER = 'no-cache, no-store, must-revalidate';
export const LONG_CACHE_MAX_AGE = '1y';

const normalizeFsPath = (value: string) => value.replace(/\\/g, '/');

export const isNoCacheSpaEntryPath = (path: string): boolean => /^\/admin\/changelogs\/?$/.test(path);
export const isNoCacheStaticFilePath = (filePath: string): boolean => {
    const normalized = normalizeFsPath(filePath);
    return normalized.endsWith('.html') || normalized.endsWith('/summonerwars.layout.json');
};

export const shouldServeSpaFallback = (path: string): boolean => {
    if (isNoCacheSpaEntryPath(path)) {
        return true;
    }

    return !SPA_FALLBACK_EXCLUDE_RE.test(path);
};
