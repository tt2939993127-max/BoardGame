import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CriticalImageGate } from '../CriticalImageGate';

const { preloadCriticalImages, preloadWarmImages, areAllCriticalImagesCached, signalCriticalImagesReady, getCriticalImagesEpoch, createWarmPreloadScheduler, resolveCriticalImages } = vi.hoisted(() => ({
    preloadCriticalImages: vi.fn().mockResolvedValue([]),
    preloadWarmImages: vi.fn(),
    areAllCriticalImagesCached: vi.fn().mockReturnValue(false),
    signalCriticalImagesReady: vi.fn(),
    getCriticalImagesEpoch: vi.fn().mockReturnValue(1),
    createWarmPreloadScheduler: vi.fn().mockReturnValue({
        pause: vi.fn(),
        resume: vi.fn(),
        enqueue: vi.fn(),
    }),
    resolveCriticalImages: vi.fn().mockReturnValue({ critical: [], warm: [] }),
}));

vi.mock('../../../../core', () => ({
    preloadCriticalImages,
    preloadWarmImages,
    areAllCriticalImagesCached,
    signalCriticalImagesReady,
    getCriticalImagesEpoch,
    createWarmPreloadScheduler,
}));

vi.mock('../../../../core/CriticalImageResolverRegistry', () => ({
    resolveCriticalImages,
}));

vi.mock('../../../system/LoadingScreen', () => ({
    LoadingScreen: ({ description }: { description?: string }) => (
        <div data-loading="true">{description ?? 'loading'}</div>
    ),
    default: ({ description }: { description?: string }) => (
        <div data-loading="true">{description ?? 'loading'}</div>
    ),
}));

describe('CriticalImageGate', () => {
    it('enabled=false 时直接渲染子内容', () => {
        const html = renderToStaticMarkup(
            <CriticalImageGate enabled={false}>
                <div>子内容</div>
            </CriticalImageGate>
        );

        expect(html).toContain('子内容');
        expect(html).not.toContain('data-loading="true"');
    });

    it('enabled=true 时显示加载屏', () => {
        const html = renderToStaticMarkup(
            <CriticalImageGate
                enabled={true}
                gameId="smashup"
                gameState={{}}
                loadingDescription="加载中"
            >
                <div>子内容</div>
            </CriticalImageGate>
        );

        expect(html).toContain('加载中');
        expect(html).not.toContain('子内容');
    });

    it('空 critical 阶段会快速放行，不会卡在加载页', async () => {
        resolveCriticalImages.mockReturnValue({ critical: [], warm: [], phaseKey: 'tutorial-setup' });

        render(
            <CriticalImageGate
                enabled={true}
                gameId="cardia"
                gameState={{ sys: { tutorial: { active: true, stepIndex: 0 } } }}
                loadingDescription="加载中"
            >
                <div>子内容</div>
            </CriticalImageGate>
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.getByText('子内容')).toBeTruthy();
        expect(screen.queryByText('加载中')).toBeNull();
        expect(preloadCriticalImages).not.toHaveBeenCalled();
        expect(signalCriticalImagesReady).not.toHaveBeenCalled();
    });
});
