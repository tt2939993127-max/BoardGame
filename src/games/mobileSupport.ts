import type {
    GameMobileBattlefieldZoom,
    GameManifestMobileDelivery,
    GameManifestEntry,
    GameMobileLayoutPreset,
    GameMobileProfile,
    GameOrientationPreference,
    GameShellTarget,
} from './manifest.types';

export const MOBILE_MAX_VIEWPORT_WIDTH = 1023;

export type GameMobileBannerKind =
    | 'rotate-to-landscape'
    | 'rotate-to-portrait'
    | 'tablet-only'
    | 'not-supported';

export interface ResolvedGameMobileSupport {
    mobileProfile: GameMobileProfile;
    preferredOrientation?: GameOrientationPreference;
    mobileLayoutPreset?: GameMobileLayoutPreset;
    mobileBattlefieldZoom: GameMobileBattlefieldZoom;
    shellTargets: GameShellTarget[];
    mobileDelivery: GameManifestMobileDelivery;
}

export interface RuntimeViewportSize {
    width: number;
    height: number;
}

export interface RuntimeLayoutScaleMetrics {
    designWidth: number;
    scale: number;
    inverseScale: number;
    logicalHeight: number;
    inlineUnit: number;
    blockUnit: number;
}

const GAME_PAGE_DOCUMENT_ATTRIBUTE_KEYS = [
    'data-game-page',
    'data-game-id',
    'data-mobile-profile',
    'data-preferred-orientation',
    'data-mobile-layout-preset',
    'data-mobile-battlefield-zoom',
    'data-shell-targets',
] as const;

type GamePageDocumentAttributeKey = typeof GAME_PAGE_DOCUMENT_ATTRIBUTE_KEYS[number];

const DEFAULT_SHELL_TARGETS: GameShellTarget[] = ['pwa'];
const DEFAULT_RUNTIME_CHANNEL = 'stable';

const isUsableViewportDimension = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isMobileViewport = (width: number) => width <= MOBILE_MAX_VIEWPORT_WIDTH;

export const isPortraitViewport = (width: number, height: number) => height > width;

export const extractGameIdFromPlayPath = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'play') return undefined;
    return segments[1];
};

export const resolveGameMobileSupport = (
    entry?: Pick<
        GameManifestEntry,
        'mobileProfile' | 'preferredOrientation' | 'mobileLayoutPreset' | 'mobileBattlefieldZoom' | 'shellTargets' | 'mobileDelivery'
    > | null,
): ResolvedGameMobileSupport => {
    const mobileProfile = entry?.mobileProfile ?? 'none';
    const preferredOrientation = entry?.preferredOrientation
        ?? (mobileProfile === 'landscape-adapted'
            ? 'landscape'
            : mobileProfile === 'portrait-adapted'
                ? 'portrait'
                : undefined);
    const mobileLayoutPreset = entry?.mobileLayoutPreset
        ?? (mobileProfile === 'landscape-adapted'
            ? 'board-shell'
            : mobileProfile === 'portrait-adapted'
                ? 'portrait-simple'
                : undefined);
    const mobileBattlefieldZoom = entry?.mobileBattlefieldZoom ?? 'none';
    const shellTargets = entry?.shellTargets?.length
        ? [...entry.shellTargets]
        : [...DEFAULT_SHELL_TARGETS];
    const canUsePackageManagedDelivery = shellTargets.includes('app-webview');
    const requestedDeliveryMode = entry?.mobileDelivery?.mode ?? 'builtin';
    const deliveryMode = requestedDeliveryMode === 'package-managed' && canUsePackageManagedDelivery
        ? 'package-managed'
        : 'builtin';
    const requiredAppVersion = entry?.mobileDelivery?.requiredAppVersion?.trim();
    const mobileDelivery = deliveryMode === 'package-managed'
        ? {
            mode: 'package-managed' as const,
            runtimeChannel: entry?.mobileDelivery?.runtimeChannel?.trim() || DEFAULT_RUNTIME_CHANNEL,
            modulePackId: entry?.mobileDelivery?.modulePackId?.trim(),
            assetPackId: entry?.mobileDelivery?.assetPackId?.trim(),
            ...(entry?.mobileDelivery?.requiresAppUpdate === true ? { requiresAppUpdate: true } : {}),
            ...(requiredAppVersion ? { requiredAppVersion } : {}),
        }
        : {
            mode: 'builtin' as const,
        };

    return {
        mobileProfile,
        preferredOrientation,
        mobileLayoutPreset,
        mobileBattlefieldZoom,
        shellTargets,
        mobileDelivery,
    };
};

export const resolveGameManifestEntry = <T extends GameManifestEntry>(entry: T): T => {
    const support = resolveGameMobileSupport(entry);
    return {
        ...entry,
        ...support,
    };
};

export const getGamePageDataAttributes = (
    gameId?: string,
    entry?: Pick<
        GameManifestEntry,
        'mobileProfile' | 'preferredOrientation' | 'mobileLayoutPreset' | 'mobileBattlefieldZoom' | 'shellTargets' | 'mobileDelivery'
    > | null,
) => {
    const attributes: Record<string, string> = {
        'data-game-page': 'true',
    };

    if (gameId) {
        attributes['data-game-id'] = gameId;
    }
    if (!entry) {
        return attributes;
    }

    const support = resolveGameMobileSupport(entry);
    attributes['data-mobile-profile'] = support.mobileProfile;
    attributes['data-mobile-battlefield-zoom'] = support.mobileBattlefieldZoom;
    attributes['data-shell-targets'] = support.shellTargets.join(',');
    if (support.preferredOrientation) {
        attributes['data-preferred-orientation'] = support.preferredOrientation;
    }
    if (support.mobileLayoutPreset) {
        attributes['data-mobile-layout-preset'] = support.mobileLayoutPreset;
    }

    return attributes;
};

export const syncGamePageDocumentAttributes = (
    attributes: Partial<Record<GamePageDocumentAttributeKey, string>>,
) => {
    if (typeof document === 'undefined') {
        return () => {};
    }

    const targets = [document.documentElement, document.body];
    const snapshots = targets.map((target) =>
        Object.fromEntries(
            GAME_PAGE_DOCUMENT_ATTRIBUTE_KEYS.map((key) => [key, target.getAttribute(key)]),
        ) as Record<GamePageDocumentAttributeKey, string | null>,
    );

    targets.forEach((target) => {
        GAME_PAGE_DOCUMENT_ATTRIBUTE_KEYS.forEach((key) => {
            const value = attributes[key];
            if (value) {
                target.setAttribute(key, value);
                return;
            }

            target.removeAttribute(key);
        });
    });

    return () => {
        targets.forEach((target, index) => {
            const snapshot = snapshots[index];
            GAME_PAGE_DOCUMENT_ATTRIBUTE_KEYS.forEach((key) => {
                const value = snapshot[key];
                if (value === null) {
                    target.removeAttribute(key);
                    return;
                }

                target.setAttribute(key, value);
            });
        });
    };
};

export const getGameMobileBannerKind = (
    entry?: Pick<
        GameManifestEntry,
        'mobileProfile' | 'preferredOrientation' | 'mobileLayoutPreset' | 'mobileBattlefieldZoom' | 'shellTargets'
        | 'mobileDelivery'
    > | null,
    width = 0,
    height = 0,
): GameMobileBannerKind | null => {
    if (!entry) return null;
    if (!isMobileViewport(width)) return null;

    const support = resolveGameMobileSupport(entry);
    const isPortrait = isPortraitViewport(width, height);

    if (support.mobileProfile === 'tablet-only') return 'tablet-only';
    if (support.mobileProfile === 'none') return 'not-supported';

    if (support.preferredOrientation === 'landscape' && isPortrait) {
        return 'rotate-to-landscape';
    }
    if (support.preferredOrientation === 'portrait' && !isPortrait) {
        return 'rotate-to-portrait';
    }

    return null;
};

export const shouldUseBoardShellScale = (
    entry?: Pick<
        GameManifestEntry,
        'mobileProfile' | 'preferredOrientation' | 'mobileLayoutPreset' | 'mobileBattlefieldZoom' | 'shellTargets' | 'mobileDelivery'
    > | null,
    width = 0,
    height = 0,
) => {
    const support = resolveGameMobileSupport(entry);
    return isMobileViewport(width)
        && !isPortraitViewport(width, height)
        && support.mobileProfile === 'landscape-adapted'
        && support.mobileLayoutPreset === 'board-shell';
};

export const resolveStableViewportSize = (
    previous: RuntimeViewportSize,
    ...candidates: Array<Partial<RuntimeViewportSize> | null | undefined>
): RuntimeViewportSize => {
    const pickDimension = (key: keyof RuntimeViewportSize) => {
        for (const candidate of candidates) {
            const value = candidate?.[key];
            if (isUsableViewportDimension(value)) {
                return value;
            }
        }
        return previous[key];
    };

    return {
        width: pickDimension('width'),
        height: pickDimension('height'),
    };
};

export const resolveRuntimeLayoutScaleMetrics = (
    viewport: RuntimeViewportSize,
    designWidth: number,
): RuntimeLayoutScaleMetrics => {
    const resolvedDesignWidth = isUsableViewportDimension(designWidth)
        ? designWidth
        : isUsableViewportDimension(viewport.width)
            ? viewport.width
            : 1;
    const safeViewportWidth = isUsableViewportDimension(viewport.width) ? viewport.width : resolvedDesignWidth;
    const safeViewportHeight = isUsableViewportDimension(viewport.height) ? viewport.height : 0;
    const scale = resolvedDesignWidth > 0 ? safeViewportWidth / resolvedDesignWidth : 1;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const inverseScale = 1 / safeScale;
    const logicalHeight = safeViewportHeight > 0 ? safeViewportHeight / safeScale : 0;
    const inlineUnit = resolvedDesignWidth / 100;
    const blockUnit = logicalHeight / 100;

    return {
        designWidth: resolvedDesignWidth,
        scale: safeScale,
        inverseScale,
        logicalHeight,
        inlineUnit,
        blockUnit,
    };
};
