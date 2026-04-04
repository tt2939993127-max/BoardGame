/* @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import { getAllGames, getGameById } from '../../config/games.config';
import {
    buildRuntimeBlockUnitValue,
    buildRuntimeInlineUnitValue,
    detectMobileLayoutEngineCapabilities,
    getGameMobileBannerKind,
    getGamePageDataAttributes,
    parseChromiumMajorVersion,
    resolveRuntimeLayoutScaleMetrics,
    resolveStableViewportSize,
    resolveGameMobileSupport,
    shouldUseBoardShellScale,
    syncGamePageDocumentAttributes,
} from '../mobileSupport';

describe('mobile support manifest contract', () => {
    it('all enabled entries expose explicit mobileProfile and shellTargets', () => {
        const games = getAllGames();

        expect(games.length).toBeGreaterThan(0);
        for (const game of games) {
            expect(game.mobileProfile).toBeDefined();
            expect(game.shellTargets?.length ?? 0).toBeGreaterThan(0);
            expect(game.mobileDelivery?.mode).toBeDefined();
        }
    });

    it('dicethrone declares landscape board-shell support, container targets and package delivery metadata', () => {
        const game = getGameById('dicethrone');

        expect(game?.mobileProfile).toBe('landscape-adapted');
        expect(game?.preferredOrientation).toBe('landscape');
        expect(game?.mobileLayoutPreset).toBe('board-shell');
        expect(game?.shellTargets).toEqual(
            expect.arrayContaining(['pwa', 'app-webview', 'mini-program-webview']),
        );
        expect(game?.mobileDelivery).toEqual({
            mode: 'package-managed',
            runtimeChannel: 'stable',
            modulePackId: 'dicethrone',
            assetPackId: 'dicethrone',
        });
    });

    it('cardia declares landscape board-shell support', () => {
        const game = getGameById('cardia');

        expect(game?.mobileProfile).toBe('landscape-adapted');
        expect(game?.preferredOrientation).toBe('landscape');
        expect(game?.mobileLayoutPreset).toBe('board-shell');
        expect(
            getGameMobileBannerKind(
                {
                    mobileProfile: game?.mobileProfile,
                    preferredOrientation: game?.preferredOrientation,
                    mobileLayoutPreset: game?.mobileLayoutPreset,
                },
                375,
                667,
            ),
        ).toBe('rotate-to-landscape');
    });

    it('summonerwars declares landscape board-shell support with board-shell scaling', () => {
        const game = getGameById('summonerwars');

        expect(game?.mobileProfile).toBe('landscape-adapted');
        expect(game?.preferredOrientation).toBe('landscape');
        expect(game?.mobileLayoutPreset).toBe('board-shell');
        expect(
            shouldUseBoardShellScale(
                {
                    mobileProfile: game?.mobileProfile,
                    preferredOrientation: game?.preferredOrientation,
                    mobileLayoutPreset: game?.mobileLayoutPreset,
                },
                900,
                500,
            ),
        ).toBe(true);
    });
});

describe('mobile support helpers', () => {
    it('fills default orientation, layout preset and shell target', () => {
        expect(resolveGameMobileSupport({ mobileProfile: 'landscape-adapted' })).toEqual({
            mobileProfile: 'landscape-adapted',
            preferredOrientation: 'landscape',
            mobileLayoutPreset: 'board-shell',
            shellTargets: ['pwa'],
            mobileDelivery: {
                mode: 'builtin',
            },
        });
    });

    it('does not infer package-managed delivery for entries outside app-webview targets', () => {
        expect(
            resolveGameMobileSupport({
                mobileProfile: 'landscape-adapted',
                shellTargets: ['pwa'],
                mobileDelivery: {
                    mode: 'package-managed',
                    runtimeChannel: 'beta',
                    modulePackId: 'demo',
                    assetPackId: 'demo',
                },
            }).mobileDelivery,
        ).toEqual({
            mode: 'builtin',
        });
    });

    it('保留 package-managed 的必须更新 App 元数据', () => {
        expect(
            resolveGameMobileSupport({
                mobileProfile: 'landscape-adapted',
                shellTargets: ['pwa', 'app-webview'],
                mobileDelivery: {
                    mode: 'package-managed',
                    runtimeChannel: 'stable',
                    modulePackId: 'demo',
                    assetPackId: 'demo',
                    requiresAppUpdate: true,
                    requiredAppVersion: '0.6.0',
                },
            }).mobileDelivery,
        ).toEqual({
            mode: 'package-managed',
            runtimeChannel: 'stable',
            modulePackId: 'demo',
            assetPackId: 'demo',
            requiresAppUpdate: true,
            requiredAppVersion: '0.6.0',
        });
    });

    it('builds banner state from profile and viewport', () => {
        expect(
            getGameMobileBannerKind(
                { mobileProfile: 'landscape-adapted', preferredOrientation: 'landscape' },
                800,
                1200,
            ),
        ).toBe('rotate-to-landscape');

        expect(
            getGameMobileBannerKind(
                { mobileProfile: 'portrait-adapted', preferredOrientation: 'portrait' },
                900,
                800,
            ),
        ).toBe('rotate-to-portrait');

        expect(getGameMobileBannerKind({ mobileProfile: 'tablet-only' }, 800, 1200)).toBe('tablet-only');
        expect(getGameMobileBannerKind({ mobileProfile: 'none' }, 800, 1200)).toBe('not-supported');
    });

    it('does not infer unsupported state before manifest metadata is ready', () => {
        expect(getGameMobileBannerKind(undefined, 800, 1200)).toBeNull();
        expect(getGamePageDataAttributes('dicethrone')).toEqual({
            'data-game-page': 'true',
            'data-game-id': 'dicethrone',
        });
    });

    it('builds data attributes for game pages', () => {
        const attrs = getGamePageDataAttributes('dicethrone', {
            mobileProfile: 'landscape-adapted',
            preferredOrientation: 'landscape',
            mobileLayoutPreset: 'board-shell',
            shellTargets: ['pwa', 'app-webview'],
        });

        expect(attrs['data-game-page']).toBe('true');
        expect(attrs['data-game-id']).toBe('dicethrone');
        expect(attrs['data-mobile-profile']).toBe('landscape-adapted');
        expect(attrs['data-preferred-orientation']).toBe('landscape');
        expect(attrs['data-mobile-layout-preset']).toBe('board-shell');
        expect(attrs['data-shell-targets']).toBe('pwa,app-webview');
    });

    it('mirrors game page attributes to html and body while the page is mounted', () => {
        document.documentElement.setAttribute('data-game-id', 'previous-root');
        document.body.setAttribute('data-mobile-profile', 'previous-body-profile');

        const cleanup = syncGamePageDocumentAttributes({
            'data-game-page': 'true',
            'data-game-id': 'dicethrone',
            'data-mobile-profile': 'landscape-adapted',
            'data-mobile-layout-preset': 'board-shell',
        });

        expect(document.documentElement.getAttribute('data-game-page')).toBe('true');
        expect(document.documentElement.getAttribute('data-game-id')).toBe('dicethrone');
        expect(document.body.getAttribute('data-mobile-profile')).toBe('landscape-adapted');
        expect(document.body.getAttribute('data-mobile-layout-preset')).toBe('board-shell');

        cleanup();

        expect(document.documentElement.getAttribute('data-game-page')).toBeNull();
        expect(document.documentElement.getAttribute('data-game-id')).toBe('previous-root');
        expect(document.body.getAttribute('data-mobile-profile')).toBe('previous-body-profile');
        expect(document.body.getAttribute('data-mobile-layout-preset')).toBeNull();
    });

    it('only landscape board-shell games enable legacy scale fallback', () => {
        expect(
            shouldUseBoardShellScale(
                { mobileProfile: 'landscape-adapted', mobileLayoutPreset: 'board-shell' },
                900,
                500,
            ),
        ).toBe(true);

        expect(
            shouldUseBoardShellScale(
                { mobileProfile: 'portrait-adapted', mobileLayoutPreset: 'portrait-simple' },
                900,
                500,
            ),
        ).toBe(false);
    });

    it('keeps the last stable viewport when orientation switching reports zero height', () => {
        expect(
            resolveStableViewportSize(
                { width: 375, height: 812 },
                { width: 812, height: 0 },
                { width: 0, height: 0 },
            ),
        ).toEqual({ width: 812, height: 812 });
    });

    it('prefers the first usable viewport candidate and falls back per dimension', () => {
        expect(
            resolveStableViewportSize(
                { width: 375, height: 812 },
                { width: 844, height: 390 },
                { width: 812, height: 375 },
                { width: 0, height: 0 },
            ),
        ).toEqual({ width: 844, height: 390 });

        expect(
            resolveStableViewportSize(
                { width: 375, height: 812 },
                { width: undefined, height: 390 },
                { width: 844, height: undefined },
            ),
        ).toEqual({ width: 844, height: 390 });
    });

    it('can parse Chromium major version from user agent', () => {
        expect(parseChromiumMajorVersion('Mozilla/5.0 Chrome/91.0.4472.114 Mobile Safari/537.36')).toBe(91);
        expect(parseChromiumMajorVersion('Mozilla/5.0 AppleWebKit/537.36')).toBeNull();
    });

    it('detects legacy mobile layout engines from capability probe', () => {
        expect(
            detectMobileLayoutEngineCapabilities({
                userAgent: 'Mozilla/5.0 Chrome/91.0.4472.114 Mobile Safari/537.36',
                cssSupports: () => false,
            }),
        ).toEqual({
            chromiumMajorVersion: 91,
            layoutMode: 'legacy',
            supportsCalcDivision: false,
            supportsDynamicViewportUnits: false,
            requiresJsScaleFallback: true,
            requiresLegacyViewportFallback: true,
        });

        expect(
            detectMobileLayoutEngineCapabilities({
                userAgent: 'Mozilla/5.0 Chrome/146.0.7680.164 Mobile Safari/537.36',
                cssSupports: () => true,
            }).layoutMode,
        ).toBe('modern');
    });

    it('builds stable pixel scale metrics for runtime layout fallbacks', () => {
        expect(resolveRuntimeLayoutScaleMetrics({ width: 802, height: 393 }, 940)).toEqual({
            designWidth: 940,
            scale: 802 / 940,
            inverseScale: 940 / 802,
            logicalHeight: 393 * (940 / 802),
            inlineUnit: 9.4,
            blockUnit: (393 * (940 / 802)) / 100,
        });
    });

    it('builds runtime inline and block css unit expressions', () => {
        expect(buildRuntimeInlineUnitValue(18)).toBe('calc(var(--mobile-layout-inline-unit, 1vw) * 18)');
        expect(buildRuntimeInlineUnitValue(0.55)).toBe('calc(var(--mobile-layout-inline-unit, 1vw) * 0.55)');
        expect(buildRuntimeBlockUnitValue(8)).toBe('calc(var(--mobile-layout-block-unit, 1vh) * 8)');
        expect(buildRuntimeBlockUnitValue(12.34567)).toBe('calc(var(--mobile-layout-block-unit, 1vh) * 12.3457)');
    });
});
