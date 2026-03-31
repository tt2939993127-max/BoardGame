import type { StoredGamePackageState } from './types';
import { mergeGamePackageState } from './types';

const STORAGE_PREFIX = 'mobile-package-state:';

const getStorage = () => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return null;
    }

    return window.localStorage;
};

const getStorageKey = (gameId: string) => `${STORAGE_PREFIX}${gameId}`;

const isValidStatus = (value: unknown): value is StoredGamePackageState['status'] =>
    value === 'not-installed'
    || value === 'queued'
    || value === 'manifest'
    || value === 'downloading'
    || value === 'verifying'
    || value === 'installed'
    || value === 'failed';

const isValidProgressMode = (value: unknown): value is StoredGamePackageState['progressMode'] =>
    value === undefined || value === 'determinate' || value === 'indeterminate';

const sanitizeStoredState = (
    gameId: string,
    raw: unknown,
): Partial<StoredGamePackageState> | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.gameId === 'string' && candidate.gameId !== gameId) {
        return null;
    }

    if (!isValidStatus(candidate.status) || !isValidProgressMode(candidate.progressMode)) {
        return null;
    }

    return {
        gameId,
        runtimeChannel: typeof candidate.runtimeChannel === 'string' && candidate.runtimeChannel.trim()
            ? candidate.runtimeChannel.trim()
            : undefined,
        status: candidate.status,
        progressPercent: typeof candidate.progressPercent === 'number' && Number.isFinite(candidate.progressPercent)
            ? candidate.progressPercent
            : undefined,
        progressMode: candidate.progressMode,
        modulePackId: typeof candidate.modulePackId === 'string' && candidate.modulePackId.trim()
            ? candidate.modulePackId.trim()
            : undefined,
        assetPackId: typeof candidate.assetPackId === 'string' && candidate.assetPackId.trim()
            ? candidate.assetPackId.trim()
            : undefined,
        modulePackBytes: typeof candidate.modulePackBytes === 'number' && Number.isFinite(candidate.modulePackBytes)
            ? candidate.modulePackBytes
            : undefined,
        assetPackBytes: typeof candidate.assetPackBytes === 'number' && Number.isFinite(candidate.assetPackBytes)
            ? candidate.assetPackBytes
            : undefined,
        errorMessage: typeof candidate.errorMessage === 'string' && candidate.errorMessage.trim()
            ? candidate.errorMessage
            : undefined,
        updatedAt: typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
            ? candidate.updatedAt
            : undefined,
    };
};

export const readStoredGamePackageState = (
    gameId: string,
    fallbackState: StoredGamePackageState,
): StoredGamePackageState => {
    const storage = getStorage();
    if (!storage) {
        return fallbackState;
    }

    try {
        const raw = storage.getItem(getStorageKey(gameId));
        if (!raw) {
            return fallbackState;
        }

        const parsed = sanitizeStoredState(gameId, JSON.parse(raw));
        if (!parsed) {
            return fallbackState;
        }

        return mergeGamePackageState(fallbackState, parsed);
    } catch {
        return fallbackState;
    }
};

export const writeStoredGamePackageState = (state: StoredGamePackageState) => {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(getStorageKey(state.gameId), JSON.stringify(state));
    } catch {
        // 忽略 localStorage 不可用或空间不足
    }
};

export const clearStoredGamePackageState = (gameId: string) => {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    try {
        storage.removeItem(getStorageKey(gameId));
    } catch {
        // 忽略 localStorage 不可用
    }
};
