import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardPreview, getCardAtlasCandidateUrls, registerCardAtlasSource, registerCardPreviewRenderer } from '../CardPreview';
import type { SpriteAtlasConfig } from '../../../../engine/primitives/spriteAtlas';
import { getCardAtlasSource, getLazyRegistration, registerLazyCardAtlasSource } from '../cardAtlasRegistry';
import { clearGameAssetBaseOverrides, markImageLoaded, setAssetsBaseUrl, setGameAssetBaseOverride } from '../../../../core';

const TEST_UNIFORM_ATLAS: SpriteAtlasConfig = {
    imageW: 100,
    imageH: 200,
    cols: 1,
    rows: 1,
    colStarts: [0],
    colWidths: [100],
    rowStarts: [0],
    rowHeights: [200],
};

describe('CardPreview i18n atlas path', () => {
    beforeEach(() => {
        setAssetsBaseUrl('/assets');
        clearGameAssetBaseOverrides();
    });

    it('atlas 预览在未传 locale 时默认使用 zh-CN 路径', () => {
        const atlasId = 'test:card-preview:atlas-default-locale';
        registerCardAtlasSource(atlasId, {
            image: 'smashup/cards/cards1',
            config: TEST_UNIFORM_ATLAS,
        });
        const img = new Image();
        Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true });
        Object.defineProperty(img, 'naturalHeight', { value: 200, configurable: true });
        markImageLoaded('smashup/cards/cards1', 'zh-CN', img);

        const html = renderToStaticMarkup(
            <CardPreview previewRef={{ type: 'atlas', atlasId, index: 0 }} />
        );

        // buildLocalizedImageSet 只使用 webp 格式（不再使用 image-set/avif）
        expect(html).toContain('/assets/i18n/zh-CN/smashup/cards/compressed/cards1.webp');
    });

    it('renderer 预览在未传 locale 时默认收到 zh-CN', () => {
        const rendererId = 'test:card-preview:renderer-default-locale';
        let receivedLocale: string | undefined;

        registerCardPreviewRenderer(rendererId, ({ locale }) => {
            receivedLocale = locale;
            return <span>ok</span>;
        });

        renderToStaticMarkup(
            <CardPreview previewRef={{ type: 'renderer', rendererId }} />
        );

        expect(receivedLocale).toBe('zh-CN');
    });

    it('懒注册图集在图片未预加载时应保持 undefined，交给 AtlasCard fallback 加载', () => {
        const atlasId = 'test:card-preview:lazy-atlas-unresolved';
        registerLazyCardAtlasSource(atlasId, {
            image: 'smashup/taitan/taitan1',
            grid: { rows: 7, cols: 3 },
        });

        expect(getCardAtlasSource(atlasId, 'zh-CN')).toBeUndefined();
        expect(getLazyRegistration(atlasId)).toBeDefined();
    });

    it('atlas 候选 URL 应包含本地 /assets 降级路径', () => {
        const candidates = getCardAtlasCandidateUrls('smashup/taitan/taitan1', 'zh-CN');

        expect(candidates.some((url) => url.endsWith('/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp'))).toBe(true);
        expect(candidates).toContain('/assets/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp');
    });

    it('远程资源模式下 atlas 候选 URL 应先尝试远端，再回退本地 /assets', () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');

        const candidates = getCardAtlasCandidateUrls('smashup/taitan/taitan1', 'zh-CN');
        const remotePrimary = 'https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp';
        const localPrimary = '/assets/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp';

        expect(candidates[0]).toBe(remotePrimary);
        expect(candidates).toContain(localPrimary);
        expect(candidates.indexOf(localPrimary)).toBeGreaterThan(candidates.indexOf(remotePrimary));
    });

    it('游戏包 override 生效时 atlas 候选 URL 仍应保留远端 CDN 回退', () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');
        setGameAssetBaseOverride('smashup', '/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/smashup/current/assets');

        const candidates = getCardAtlasCandidateUrls('smashup/cards/tts_atlas_8789f47742', 'en');

        expect(candidates[0]).toBe('/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/smashup/current/assets/i18n/en/smashup/cards/compressed/tts_atlas_8789f47742.webp');
        expect(candidates).toContain('https://assets.easyboardgame.top/official/i18n/en/smashup/cards/compressed/tts_atlas_8789f47742.webp');
        expect(candidates).toContain('/assets/i18n/en/smashup/cards/compressed/tts_atlas_8789f47742.webp');
    });

    it('懒注册图集不应把 1x1 占位图当成有效 atlas', () => {
        const atlasId = 'test:card-preview:lazy-atlas-placeholder';
        registerLazyCardAtlasSource(atlasId, {
            image: 'smashup/taitan/taitan1',
            grid: { rows: 7, cols: 3 },
        });

        const img = new Image();
        Object.defineProperty(img, 'naturalWidth', { value: 1, configurable: true });
        Object.defineProperty(img, 'naturalHeight', { value: 1, configurable: true });
        markImageLoaded('smashup/taitan/taitan1', 'zh-CN', img);

        expect(getCardAtlasSource(atlasId, 'zh-CN')).toBeUndefined();
        expect(getLazyRegistration(atlasId)).toBeDefined();
    });
});
