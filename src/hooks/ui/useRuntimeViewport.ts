import { useLayoutEffect, useState } from 'react';
import {
    resolveStableViewportSize,
    type RuntimeViewportSize,
} from '../../games/mobileSupport';
import { isTextEntryElement } from '../../lib/textEntry';

export interface RuntimeSafeAreaInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface RuntimeViewportMetrics extends RuntimeViewportSize {
    safeArea: RuntimeSafeAreaInsets;
    keyboardInsetBottom: number;
}

const EMPTY_SAFE_AREA: RuntimeSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const EMPTY_VIEWPORT: RuntimeViewportMetrics = { width: 0, height: 0, safeArea: EMPTY_SAFE_AREA, keyboardInsetBottom: 0 };
const MIN_KEYBOARD_INSET_PX = 72;

const parseCssPixels = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

interface RuntimeKeyboardInsetInput {
    visualViewportHeight?: number | null;
    visualViewportOffsetTop?: number | null;
    innerHeight?: number | null;
    documentClientHeight?: number | null;
    hasFocusedTextEntry?: boolean;
}

export const resolveRuntimeKeyboardInsetBottom = ({
    visualViewportHeight,
    visualViewportOffsetTop,
    innerHeight,
    documentClientHeight,
    hasFocusedTextEntry = false,
}: RuntimeKeyboardInsetInput): number => {
    if (!hasFocusedTextEntry) {
        return 0;
    }

    const resolvedVisualViewportHeight = typeof visualViewportHeight === 'number' && Number.isFinite(visualViewportHeight)
        ? visualViewportHeight
        : 0;
    const resolvedLayoutViewportHeight = Math.max(
        typeof innerHeight === 'number' && Number.isFinite(innerHeight) ? innerHeight : 0,
        typeof documentClientHeight === 'number' && Number.isFinite(documentClientHeight) ? documentClientHeight : 0,
    );
    if (resolvedVisualViewportHeight <= 0 || resolvedLayoutViewportHeight <= 0) {
        return 0;
    }

    const offsetTop = typeof visualViewportOffsetTop === 'number' && Number.isFinite(visualViewportOffsetTop)
        ? Math.max(0, visualViewportOffsetTop)
        : 0;
    const inset = Math.round(resolvedLayoutViewportHeight - (resolvedVisualViewportHeight + offsetTop));
    return inset >= MIN_KEYBOARD_INSET_PX ? inset : 0;
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
    const keyboardInsetBottom = resolveRuntimeKeyboardInsetBottom({
        visualViewportHeight: visualViewport?.height,
        visualViewportOffsetTop: visualViewport?.offsetTop,
        innerHeight: window.innerHeight,
        documentClientHeight: document.documentElement.clientHeight,
        hasFocusedTextEntry: isTextEntryElement(document.activeElement),
    });

    return {
        ...viewport,
        safeArea: readRuntimeSafeAreaInsets(),
        keyboardInsetBottom,
    };
};

export const applyRuntimeViewportCssVars = (viewport: RuntimeViewportSize | RuntimeViewportMetrics) => {
    if (typeof document === 'undefined') return;
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const root = document.documentElement;
    const keyboardInsetBottom = 'keyboardInsetBottom' in viewport
        ? Math.max(0, viewport.keyboardInsetBottom)
        : 0;
    root.style.setProperty('--runtime-viewport-width', `${viewport.width}px`);
    root.style.setProperty('--runtime-viewport-height', `${viewport.height}px`);
    root.style.setProperty('--keyboard-inset-height', `${keyboardInsetBottom}px`);
    root.dataset.keyboardVisible = keyboardInsetBottom > 0 ? 'true' : 'false';
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
                    && next.keyboardInsetBottom === previous.keyboardInsetBottom
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
