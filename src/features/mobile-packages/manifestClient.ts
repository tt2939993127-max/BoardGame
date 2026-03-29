import type { GameManifestMobileDelivery } from '../../games/manifest.types';
import type { ResolvedGamePackageManifest } from './types';

const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

const REMOTE_MANIFEST_URL = typeof metaEnv.VITE_MOBILE_PACKAGE_MANIFEST_URL === 'string'
    ? normalizeUrl(metaEnv.VITE_MOBILE_PACKAGE_MANIFEST_URL)
    : '';

export const hasRemoteGamePackageManifestEndpoint = Boolean(REMOTE_MANIFEST_URL);

interface RemotePackInfo {
    id?: string;
    bytes?: number;
}

interface RemoteGamePackageManifest {
    gameId?: string;
    runtimeChannel?: string;
    modulePack?: RemotePackInfo;
    assetPack?: RemotePackInfo;
}

interface RemoteGamePackageManifestResponse {
    manifest?: RemoteGamePackageManifest;
    game?: RemoteGamePackageManifest;
}

const normalizeOptionalNumber = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;

export const buildFallbackGamePackageManifest = (
    gameId: string,
    delivery?: GameManifestMobileDelivery,
): ResolvedGamePackageManifest => ({
    gameId,
    runtimeChannel: delivery?.runtimeChannel?.trim() || 'stable',
    modulePackId: delivery?.modulePackId?.trim(),
    assetPackId: delivery?.assetPackId?.trim(),
    modulePackBytes: normalizeOptionalNumber(delivery?.modulePackBytes),
    assetPackBytes: normalizeOptionalNumber(delivery?.assetPackBytes),
    source: 'fallback',
});

const mapRemoteManifest = (
    gameId: string,
    fallbackManifest: ResolvedGamePackageManifest,
    remoteManifest?: RemoteGamePackageManifest | null,
): ResolvedGamePackageManifest => {
    if (!remoteManifest) {
        return fallbackManifest;
    }

    return {
        gameId,
        runtimeChannel: remoteManifest.runtimeChannel?.trim() || fallbackManifest.runtimeChannel,
        modulePackId: remoteManifest.modulePack?.id?.trim() || fallbackManifest.modulePackId,
        assetPackId: remoteManifest.assetPack?.id?.trim() || fallbackManifest.assetPackId,
        modulePackBytes: normalizeOptionalNumber(remoteManifest.modulePack?.bytes) ?? fallbackManifest.modulePackBytes,
        assetPackBytes: normalizeOptionalNumber(remoteManifest.assetPack?.bytes) ?? fallbackManifest.assetPackBytes,
        source: 'remote',
    };
};

export const resolveGamePackageManifest = async (
    gameId: string,
    delivery?: GameManifestMobileDelivery,
): Promise<ResolvedGamePackageManifest> => {
    const fallbackManifest = buildFallbackGamePackageManifest(gameId, delivery);
    if (!hasRemoteGamePackageManifestEndpoint || !delivery || delivery.mode !== 'package-managed') {
        return fallbackManifest;
    }

    const url = `${REMOTE_MANIFEST_URL}/games/${encodeURIComponent(gameId)}?channel=${encodeURIComponent(fallbackManifest.runtimeChannel)}`;

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
        });
        if (!response.ok) {
            return fallbackManifest;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            return fallbackManifest;
        }

        const data = await response.json() as RemoteGamePackageManifestResponse;
        return mapRemoteManifest(gameId, fallbackManifest, data.manifest ?? data.game ?? null);
    } catch {
        return fallbackManifest;
    }
};
