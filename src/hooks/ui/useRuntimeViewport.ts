import { useLayoutEffect, useState } from 'react';
import {
    resolveStableViewportSize,
    type RuntimeViewportSize,
} from '../../games/mobileSupport';

export interface RuntimeSafeAreaInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface RuntimeViewportMetrics extends RuntimeViewportSize {
    safeArea: RuntimeSafeAreaInsets;
}

const EMPTY_SAFE_AREA: RuntimeSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const EMPTY_VIEWPORT: RuntimeViewportMetrics = { width: 0, height: 0, safeArea: EMPTY_SAFE_AREA };
const DEFAULT_ROOT_DESIGN_WIDTH = 1280;
const BOARD_SHELL_DESIGN_WIDTH_MAP: Record<string, number> = {
    dicethrone: 940,
    smashup: 1160,
    summonerwars: 1280,
    cardia: 1280,
};

const parseCssPixels = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const readCssPixelVar = (root: HTMLElement, key: string, fallback: number) => {
    const value = window.getComputedStyle(root).getPropertyValue(key);
    const parsed = parseCssPixels(value);
    return parsed > 0 ? parsed : fallback;
};

export interface LayoutEngineCapabilities {
    chromiumMajorVersion?: number;
    layoutMode?: 'legacy' | 'modern' | string;
    supportsCalcDivision?: boolean;
    supportsDynamicViewportUnits?: boolean;
    requiresJsScaleFallback?: boolean;
    requiresLegacyViewportFallback?: boolean;
}

interface ApplyRuntimeViewportOptions {
    layoutEngineCapabilities?: LayoutEngineCapabilities;
}

export const resolveRuntimeKeyboardInsetBottom = (args: {
    visualViewportHeight: number;
    visualViewportOffsetTop: number;
    innerHeight: number;
    documentClientHeight: number;
    hasFocusedTextEntry: boolean;
}): number => {
    if (!args.hasFocusedTextEntry) {
        return 0;
    }
    const baseHeight = Math.max(args.innerHeight, args.documentClientHeight);
    const visualHeight = Math.max(0, args.visualViewportHeight + args.visualViewportOffsetTop);
    const inset = baseHeight - visualHeight;
    return Math.max(0, Math.round(inset));
};

export const readRuntimeSafeAreaInsets = (): RuntimeSafeAreaInsets => {
    if (typeof window === 'undefined') {
        return EMPTY_SAFE_AREA;
    }

    const rootStyles = window.getComputedStyle(document.documentElement);
    return {
        top: parseCssPixels(rootStyles.getPropertyValue('--safe-area-top')),
        right: parseCssPixels(rootStyles.getPropertyValue('--safe-area-right')),
        bottom: parseCssPixels(rootStyles.getPropertyValue('--safe-area-bottom')),
        left: parseCssPixels(rootStyles.getPropertyValue('--safe-area-left')),
    };
};

export const readRuntimeViewportMetrics = (
    previous: RuntimeViewportMetrics = EMPTY_VIEWPORT,
): RuntimeViewportMetrics => {
    if (typeof window === 'undefined') {
        return previous;
    }

    const visualViewport = window.visualViewport;
    const viewport = resolveStableViewportSize(
        previous,
        visualViewport ? { width: visualViewport.width, height: visualViewport.height } : undefined,
        { width: window.innerWidth, height: window.innerHeight },
        {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
        },
    );

    return {
        ...viewport,
        safeArea: readRuntimeSafeAreaInsets(),
    };
};

export const applyRuntimeViewportCssVars = (
    viewport: RuntimeViewportSize,
    options: ApplyRuntimeViewportOptions = {},
) => {
    if (typeof document === 'undefined') return;
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const root = document.documentElement;
    root.style.setProperty('--runtime-viewport-width', `${viewport.width}px`);
    root.style.setProperty('--runtime-viewport-height', `${viewport.height}px`);

    const { layoutEngineCapabilities } = options;
    if (layoutEngineCapabilities?.layoutMode) {
        root.dataset.mobileLayoutEngine = layoutEngineCapabilities.layoutMode;
    } else {
        delete root.dataset.mobileLayoutEngine;
    }

    if (!layoutEngineCapabilities?.requiresLegacyViewportFallback) {
        return;
    }

    const rootDesignWidth = readCssPixelVar(root, '--mobile-root-design-width', DEFAULT_ROOT_DESIGN_WIDTH);
    const rootScale = rootDesignWidth > 0 ? viewport.width / rootDesignWidth : 1;
    const safeRootScale = Number.isFinite(rootScale) && rootScale > 0 ? rootScale : 1;
    root.style.setProperty('--mobile-root-scale', safeRootScale.toFixed(6));
    root.style.setProperty('--mobile-root-inverse-scale', (1 / safeRootScale).toFixed(6));

    const layoutPreset = root.getAttribute('data-mobile-layout-preset');
    const mobileProfile = root.getAttribute('data-mobile-profile');
    if (layoutPreset !== 'board-shell' || mobileProfile !== 'landscape-adapted') {
        return;
    }

    const gameId = root.getAttribute('data-game-id') ?? '';
    const mappedDesignWidth = BOARD_SHELL_DESIGN_WIDTH_MAP[gameId];
    const boardShellDesignWidth = mappedDesignWidth
        ?? readCssPixelVar(root, '--mobile-board-shell-design-width', rootDesignWidth);
    const boardScale = boardShellDesignWidth > 0 ? viewport.width / boardShellDesignWidth : 1;
    const safeBoardScale = Number.isFinite(boardScale) && boardScale > 0 ? boardScale : 1;
    const inverseBoardScale = 1 / safeBoardScale;
    const logicalHeight = viewport.height / safeBoardScale;
    const inlineUnit = boardShellDesignWidth / 100;
    const blockUnit = logicalHeight / 100;

    root.style.setProperty('--mobile-board-shell-design-width', `${boardShellDesignWidth}px`);
    root.style.setProperty('--mobile-board-shell-scale', safeBoardScale.toFixed(6));
    root.style.setProperty('--mobile-board-shell-inverse-scale', inverseBoardScale.toFixed(6));
    root.style.setProperty('--mobile-board-shell-logical-height', `${logicalHeight.toFixed(3)}px`);
    root.style.setProperty('--mobile-board-shell-inline-unit', `${inlineUnit.toFixed(4)}px`);
    root.style.setProperty('--mobile-board-shell-block-unit', `${blockUnit.toFixed(4)}px`);
    root.style.setProperty('--mobile-layout-inline-unit', `${inlineUnit.toFixed(4)}px`);
    root.style.setProperty('--mobile-layout-block-unit', `${blockUnit.toFixed(4)}px`);
};

interface UseRuntimeViewportOptions {
    syncCssVars?: boolean;
}

export const useRuntimeViewport = (
    options: UseRuntimeViewportOptions = {},
): RuntimeViewportMetrics => {
    const { syncCssVars = true } = options;
    const [viewport, setViewport] = useState<RuntimeViewportMetrics>(() => readRuntimeViewportMetrics());

    useLayoutEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const visualViewport = window.visualViewport;
        const updateViewport = () => {
            setViewport((previous) => {
                const next = readRuntimeViewportMetrics(previous);
                if (syncCssVars) {
                    applyRuntimeViewportCssVars(next);
                }

                if (
                    next.width === previous.width
                    && next.height === previous.height
                    && next.safeArea.top === previous.safeArea.top
                    && next.safeArea.right === previous.safeArea.right
                    && next.safeArea.bottom === previous.safeArea.bottom
                    && next.safeArea.left === previous.safeArea.left
                ) {
                    return previous;
                }

                return next;
            });
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);
        visualViewport?.addEventListener('resize', updateViewport);

        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
            visualViewport?.removeEventListener('resize', updateViewport);
        };
    }, [syncCssVars]);

    return viewport;
};
