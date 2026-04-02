import { describe, expect, it } from 'vitest';
import { LONG_CACHE_MAX_AGE, NO_CACHE_HEADER, isNoCacheSpaEntryPath, isNoCacheStaticFilePath, shouldServeSpaFallback } from '../src/spa-fallback';

describe('SPA fallback guards', () => {
    it('should keep /assets requests out of SPA fallback', () => {
        expect(shouldServeSpaFallback('/assets')).toBe(false);
        expect(shouldServeSpaFallback('/assets/manifest-abc123.js')).toBe(false);
        expect(shouldServeSpaFallback('/assets/images/card.webp')).toBe(false);
    });

    it('should keep API-style routes out of SPA fallback', () => {
        expect(shouldServeSpaFallback('/auth/login')).toBe(false);
        expect(shouldServeSpaFallback('/games/list')).toBe(false);
        expect(shouldServeSpaFallback('/feedback')).toBe(false);
    });

    it('should still allow normal SPA routes to fall back to index.html', () => {
        expect(shouldServeSpaFallback('/')).toBe(true);
        expect(shouldServeSpaFallback('/ranked')).toBe(true);
        expect(shouldServeSpaFallback('/room/abc123')).toBe(true);
    });

    it('should preserve the explicit no-cache SPA entry for admin changelogs', () => {
        expect(isNoCacheSpaEntryPath('/admin/changelogs')).toBe(true);
        expect(isNoCacheSpaEntryPath('/admin/changelogs/')).toBe(true);
        expect(shouldServeSpaFallback('/admin/changelogs')).toBe(true);
        expect(shouldServeSpaFallback('/admin/changelogs/')).toBe(true);
    });

    it('should keep html and editable layout files on no-cache policy', () => {
        expect(isNoCacheStaticFilePath('D:/repo/dist/index.html')).toBe(true);
        expect(isNoCacheStaticFilePath('D:\\repo\\dist\\game-data\\summonerwars.layout.json')).toBe(true);
        expect(NO_CACHE_HEADER).toBe('no-cache, no-store, must-revalidate');
    });

    it('should allow hashed public static directories to use long cache', () => {
        expect(isNoCacheStaticFilePath('D:/repo/dist/fonts/inter-400-latin.woff2')).toBe(false);
        expect(isNoCacheStaticFilePath('D:/repo/dist/logos/logo_1_grid.svg')).toBe(false);
        expect(isNoCacheStaticFilePath('D:/repo/dist/game-data/dicethrone/monk/dice-sprite.png')).toBe(false);
        expect(LONG_CACHE_MAX_AGE).toBe('1y');
    });
});
