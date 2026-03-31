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
    modulePackBytes?: number;
    assetPackBytes?: number;
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
    errorMessage?: string;
    updatedAt: number;
}

export type GamePackageCardState = Omit<StoredGamePackageState, 'gameId' | 'runtimeChannel' | 'updatedAt'>;

export interface PendingGamePackageInstall extends ResolvedGamePackageManifest {
    gameName: string;
}

export interface GamePackageInstallHandle {
    cancel: () => void;
    finished: Promise<StoredGamePackageState>;
}

const normalizeOptionalNumber = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;

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
    modulePackBytes: state.modulePackBytes,
    assetPackBytes: state.assetPackBytes,
    errorMessage: state.errorMessage,
});
