import type { GameManifestMobileDelivery } from '../../games/manifest.types';
import { resolveAssetsBaseUrlFromEnv } from '../../core/AssetLoader';
import type { ResolvedGamePackageManifest } from './types';

const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

const REMOTE_MANIFEST_BASE_URL = typeof metaEnv.VITE_MOBILE_PACKAGE_MANIFEST_URL === 'string'
    ? normalizeUrl(metaEnv.VITE_MOBILE_PACKAGE_MANIFEST_URL)
    : `${normalizeUrl(resolveAssetsBaseUrlFromEnv(metaEnv))}/mobile-packages/android`;

export const hasRemoteGamePackageManifestEndpoint = Boolean(REMOTE_MANIFEST_BASE_URL);

interface RemotePackInfo {
    id?: string | null;
    version?: string | null;
    url?: string | null;
    checksum?: string | null;
    bytes?: number | null;
    fileCount?: number | null;
}

interface RemoteGamePackageManifest {
    gameId?: string;
    runtimeChannel?: string;
    modulePack?: RemotePackInfo | null;
    assetPack?: RemotePackInfo | null;
}

interface RemoteGamePackageManifestResponse {
    manifest?: RemoteGamePackageManifest;
    game?: RemoteGamePackageManifest;
}

const normalizeOptionalNumber = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
const normalizeOptionalRemoteNumber = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
const normalizeOptionalString = (value: string | null | undefined) =>
    typeof value === 'string' && value.trim()
        ? value.trim()
        : undefined;
const normalizeOptionalHttpUrl = (value: string | null | undefined) => {
    const normalized = normalizeOptionalString(value);
    return normalized && /^https?:\/\//i.test(normalized) ? normalized : undefined;
};

const applyRemotePack = (
    fallback: Pick<
        ResolvedGamePackageManifest,
        | 'modulePackId'
        | 'assetPackId'
        | 'modulePackVersion'
        | 'assetPackVersion'
        | 'modulePackUrl'
        | 'assetPackUrl'
        | 'modulePackChecksum'
        | 'assetPackChecksum'
        | 'modulePackBytes'
        | 'assetPackBytes'
        | 'modulePackFileCount'
        | 'assetPackFileCount'
    >,
    type: 'module' | 'asset',
    remotePack?: RemotePackInfo | null,
) => {
    const fallbackId = type === 'module' ? fallback.modulePackId : fallback.assetPackId;
    const fallbackVersion = type === 'module' ? fallback.modulePackVersion : fallback.assetPackVersion;
    const fallbackUrl = type === 'module' ? fallback.modulePackUrl : fallback.assetPackUrl;
    const fallbackChecksum = type === 'module' ? fallback.modulePackChecksum : fallback.assetPackChecksum;
    const fallbackBytes = type === 'module' ? fallback.modulePackBytes : fallback.assetPackBytes;
    const fallbackFileCount = type === 'module' ? fallback.modulePackFileCount : fallback.assetPackFileCount;

    if (remotePack === null) {
        return {
            id: undefined,
            version: undefined,
            url: undefined,
            checksum: undefined,
            bytes: undefined,
            fileCount: undefined,
        };
    }

    return {
        id: normalizeOptionalString(remotePack?.id) ?? fallbackId,
        version: normalizeOptionalString(remotePack?.version) ?? fallbackVersion,
        url: normalizeOptionalHttpUrl(remotePack?.url) ?? fallbackUrl,
        checksum: normalizeOptionalString(remotePack?.checksum) ?? fallbackChecksum,
        bytes: normalizeOptionalRemoteNumber(remotePack?.bytes) ?? fallbackBytes,
        fileCount: normalizeOptionalRemoteNumber(remotePack?.fileCount) ?? fallbackFileCount,
    };
};

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

    const modulePack = applyRemotePack(fallbackManifest, 'module', remoteManifest.modulePack);
    const assetPack = applyRemotePack(fallbackManifest, 'asset', remoteManifest.assetPack);

    return {
        gameId,
        runtimeChannel: remoteManifest.runtimeChannel?.trim() || fallbackManifest.runtimeChannel,
        modulePackId: modulePack.id,
        assetPackId: assetPack.id,
        modulePackVersion: modulePack.version,
        assetPackVersion: assetPack.version,
        modulePackUrl: modulePack.url,
        assetPackUrl: assetPack.url,
        modulePackChecksum: modulePack.checksum,
        assetPackChecksum: assetPack.checksum,
        modulePackBytes: modulePack.bytes,
        assetPackBytes: assetPack.bytes,
        modulePackFileCount: modulePack.fileCount,
        assetPackFileCount: assetPack.fileCount,
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

    const url = `${REMOTE_MANIFEST_BASE_URL}/${encodeURIComponent(fallbackManifest.runtimeChannel)}/games/${encodeURIComponent(gameId)}.json`;

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
