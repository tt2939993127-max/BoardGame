import type { GameManifestMobileDelivery } from '../../games/manifest.types';

export type GamePackageProgressMode = 'determinate' | 'indeterminate';

export type GamePackageInstallStatus =
    | 'not-installed'
    | 'queued'
    | 'manifest'
    | 'downloading'
    | 'verifying'
    | 'installed'
    | 'failed';

export interface ResolvedGamePackageManifest {
    gameId: string;
    runtimeChannel: string;
    modulePackId?: string;
    assetPackId?: string;
    sharedAudioPackId?: string;
    modulePackVersion?: string;
    assetPackVersion?: string;
    sharedAudioPackVersion?: string;
    modulePackUrl?: string;
    assetPackUrl?: string;
    sharedAudioPackUrl?: string;
    modulePackChecksum?: string;
    assetPackChecksum?: string;
    sharedAudioPackChecksum?: string;
    modulePackBytes?: number;
    assetPackBytes?: number;
    sharedAudioPackBytes?: number;
    modulePackFileCount?: number;
    assetPackFileCount?: number;
    sharedAudioPackFileCount?: number;
    source: 'fallback' | 'remote';
}

export interface StoredGamePackageState {
    gameId: string;
    runtimeChannel: string;
    status: GamePackageInstallStatus;
    progressPercent?: number;
    progressMode?: GamePackageProgressMode;
    modulePackId?: string;
    assetPackId?: string;
    modulePackBytes?: number;
    assetPackBytes?: number;
    installedVersion?: string;
    localAssetBaseUrl?: string;
    errorMessage?: string;
    updatedAt: number;
}

export type GamePackageCardState = Omit<StoredGamePackageState, 'gameId' | 'runtimeChannel' | 'updatedAt'> & {
    previewResolved?: boolean;
    manifestSource?: ResolvedGamePackageManifest['source'];
    modulePackUrl?: string;
    assetPackUrl?: string;
};

export interface PendingGamePackageInstall extends ResolvedGamePackageManifest {
    gameName: string;
}

export interface GamePackageInstallHandle {
    cancel: () => void;
    finished: Promise<StoredGamePackageState>;
}

const INVALID_INSTALLED_VERSION_PLACEHOLDERS = new Set([
    'mock-installed',
]);

const normalizeOptionalNumber = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;

export const hasUsableInstalledGamePackageVersion = (value?: string) => {
    if (typeof value !== 'string') {
        return false;
    }

    const normalized = value.trim();
    if (!normalized) {
        return false;
    }

    return !INVALID_INSTALLED_VERSION_PLACEHOLDERS.has(normalized.toLowerCase());
};

export const createDefaultGamePackageState = (
    gameId: string,
    delivery?: GameManifestMobileDelivery,
): StoredGamePackageState => ({
    gameId,
    runtimeChannel: delivery?.runtimeChannel?.trim() || 'stable',
    status: 'not-installed',
    modulePackId: delivery?.modulePackId?.trim(),
    assetPackId: delivery?.assetPackId?.trim(),
    modulePackBytes: normalizeOptionalNumber(delivery?.modulePackBytes),
    assetPackBytes: normalizeOptionalNumber(delivery?.assetPackBytes),
    updatedAt: Date.now(),
});

export const mergeGamePackageState = (
    baseState: StoredGamePackageState,
    override?: Partial<StoredGamePackageState>,
): StoredGamePackageState => ({
    ...baseState,
    ...override,
    gameId: override?.gameId || baseState.gameId,
    runtimeChannel: override?.runtimeChannel || baseState.runtimeChannel,
    modulePackId: override?.modulePackId || baseState.modulePackId,
    assetPackId: override?.assetPackId || baseState.assetPackId,
    modulePackBytes: normalizeOptionalNumber(override?.modulePackBytes) ?? normalizeOptionalNumber(baseState.modulePackBytes),
    assetPackBytes: normalizeOptionalNumber(override?.assetPackBytes) ?? normalizeOptionalNumber(baseState.assetPackBytes),
    updatedAt: override?.updatedAt ?? Date.now(),
});

export const toGamePackageCardState = (state: StoredGamePackageState): GamePackageCardState => ({
    status: state.status,
    progressPercent: state.progressPercent,
    progressMode: state.progressMode,
    modulePackId: state.modulePackId,
    assetPackId: state.assetPackId,
    previewResolved: undefined,
    manifestSource: undefined,
    modulePackUrl: undefined,
    assetPackUrl: undefined,
    modulePackBytes: state.modulePackBytes,
    assetPackBytes: state.assetPackBytes,
    installedVersion: state.installedVersion,
    errorMessage: state.errorMessage,
});
