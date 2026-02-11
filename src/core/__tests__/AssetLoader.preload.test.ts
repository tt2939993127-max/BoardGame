import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    registerGameAssets,
    preloadCriticalImages,
    setAssetsBaseUrl,
} from '../AssetLoader';
import { registerCriticalImageResolver } from '../CriticalImageResolverRegistry';

// Mock Image constructor
class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    get src() { return this._src; }
    set src(value: string) {
        this._src = value;
        // Default: resolve immediately
        setTimeout(() => this.onload?.(), 0);
    }
}

beforeEach(() => {
    setAssetsBaseUrl('/assets');
    vi.stubGlobal('Image', MockImage);
});

describe('preloadCriticalImages', () => {
    it('无注册资产时立即返回空暖列表', async () => {
        const warm = await preloadCriticalImages('nonexistent-game');
        expect(warm).toEqual([]);
    });

    it('仅使用静态 criticalImages（无解析器）', async () => {
        registerGameAssets('test-static', {
            criticalImages: ['test/img1.png', 'test/img2.png'],
            warmImages: ['test/warm1.png'],
        });
        const warm = await preloadCriticalImages('test-static');
        expect(warm).toEqual(['test/warm1.png']);
    });

    it('合并静态列表与动态解析器输出（去重）', async () => {
        registerGameAssets('test-merge', {
            criticalImages: ['shared/img.png'],
            warmImages: ['static/warm.png'],
        });
        registerCriticalImageResolver('test-merge', () => ({
            critical: ['shared/img.png', 'dynamic/img.png'],
            warm: ['dynamic/warm.png', 'static/warm.png'],
        }));
        const warm = await preloadCriticalImages('test-merge', {});
        // critical 去重：shared/img.png 只出现一次
        // warm 去重：static/warm.png 只出现一次
        expect(warm).toContain('static/warm.png');
        expect(warm).toContain('dynamic/warm.png');
        // 验证去重
        expect(new Set(warm).size).toBe(warm.length);
    });

    it('解析器抛出异常时回退到静态列表', async () => {
        registerGameAssets('test-error', {
            criticalImages: ['fallback.png'],
        });
        registerCriticalImageResolver('test-error', () => {
            throw new Error('resolver boom');
        });
        // Should not throw, and should still preload static images
        const warm = await preloadCriticalImages('test-error', {});
        expect(warm).toEqual([]);
    });

    it('单张图片加载失败不阻塞整体', async () => {
        // Override Image to fail for specific src
        vi.stubGlobal('Image', class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            private _src = '';
            get src() { return this._src; }
            set src(value: string) {
                this._src = value;
                if (value.includes('fail')) {
                    setTimeout(() => this.onerror?.(), 0);
                } else {
                    setTimeout(() => this.onload?.(), 0);
                }
            }
        });

        registerGameAssets('test-fail', {
            criticalImages: ['ok.png', 'fail.png'],
        });

        // Should resolve without throwing
        const warm = await preloadCriticalImages('test-fail');
        expect(warm).toEqual([]);
    });

    it('10s 超时后放行（不无限等待）', async () => {
        vi.useFakeTimers();

        // Image that never resolves
        vi.stubGlobal('Image', class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            private _src = '';
            get src() { return this._src; }
            set src(value: string) { this._src = value; /* never fires */ }
        });

        registerGameAssets('test-timeout', {
            criticalImages: ['slow.png'],
        });

        const promise = preloadCriticalImages('test-timeout');

        // Advance past the 10s timeout
        await vi.advanceTimersByTimeAsync(10_001);

        const warm = await promise;
        expect(warm).toEqual([]);

        vi.useRealTimers();
    });
});
