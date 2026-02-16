import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardPreview, registerCardAtlasSource, registerCardPreviewRenderer } from '../CardPreview';
import type { SpriteAtlasConfig } from '../../../../engine/primitives/spriteAtlas';

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
    it('atlas 预览在未传 locale 时默认使用 zh-CN 路径', () => {
        const atlasId = 'test:card-preview:atlas-default-locale';
        registerCardAtlasSource(atlasId, {
            image: 'smashup/cards/cards1',
            config: TEST_UNIFORM_ATLAS,
        });

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
});
