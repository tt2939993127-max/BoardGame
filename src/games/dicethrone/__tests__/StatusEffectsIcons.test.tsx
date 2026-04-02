import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, waitFor } from '@testing-library/react';

import { DICETHRONE_STATUS_ATLAS_IDS } from '../domain/ids';
import { registerDiceDefinition } from '../domain/diceRegistry';
import { moonElfDiceDefinition } from '../heroes/moon_elf/diceConfig';
import { Dice3D } from '../ui/Dice3D';
import {
    buildSpriteBackgroundImage,
    DICE_BG_SIZE,
    getDiceSpriteAssetPath,
    getDiceSpritePosition,
    getDiceSpriteUrls,
} from '../ui/assets';
import { getStatusEffectIconNode, loadStatusAtlases, type StatusIconAtlasConfig } from '../ui/statusEffects';
import { getAssetsBaseUrl, setAssetsBaseUrl } from '../../../core';

registerDiceDefinition(moonElfDiceDefinition);

describe('StatusEffectsIcons', () => {
    beforeEach(() => {
        setAssetsBaseUrl('/assets');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('渲染状态图集时应指向压缩后的 atlas 资源', () => {
        const atlas: StatusIconAtlasConfig = {
            imageW: 1314,
            imageH: 400,
            frames: {
                purify: { x: 0, y: 0, w: 400, h: 400 },
            },
            imagePath: 'dicethrone/images/monk/status-icons-atlas.png',
        };

        const html = renderToStaticMarkup(
            getStatusEffectIconNode(
                { frameId: 'purify', atlasId: DICETHRONE_STATUS_ATLAS_IDS.MONK },
                undefined,
                'normal',
                { [DICETHRONE_STATUS_ATLAS_IDS.MONK]: atlas }
            )
        );

        expect(html).toContain('/assets/dicethrone/images/monk/compressed/status-icons-atlas.webp');
    });

    it('会把 game-data 骰图路径折算成 dice-sprite 资源 key', () => {
        expect(getDiceSpriteAssetPath('moon_elf-dice', 'moon_elf')).toBe('dicethrone/images/moon_elf/dice');
    });

    it('渲染骰图背景时应指向 dice-sprite 的压缩资源', () => {
        const backgroundImage = buildSpriteBackgroundImage('/game-data/dicethrone/monk/dice-sprite.png');
        expect(backgroundImage).toContain('dicethrone/images/monk/compressed/dice.webp');
    });

    it('本地资源模式下，骰图候选 URL 应保留 /assets 前缀', () => {
        const urls = getDiceSpriteUrls('moon_elf-dice', 'moon_elf', 'zh-CN');
        expect(urls.some(url => url.includes('/dice.webp'))).toBe(true);
        expect(urls.some(url => url.startsWith('/assets/i18n/zh-CN/dicethrone/images/moon_elf/compressed/dice.webp'))).toBe(true);
    });

    it('远程资源模式下，骰图候选 URL 应走官方资源域名', () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');
        const urls = getDiceSpriteUrls('moon_elf-dice', 'moon_elf', 'zh-CN');
        const base = getAssetsBaseUrl();
        expect(urls.some(url => url.includes('/dice.webp'))).toBe(true);
        expect(urls.every(url => url.startsWith(`${base}/`))).toBe(true);
    });

    it('远端骰图探测应通过 Image 加载，不应依赖跨域 fetch 成功', async () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');

        class MockImage {
            onload: null | (() => void) = null;
            onerror: null | (() => void) = null;
            naturalWidth = 256;
            complete = false;
            decoding = 'auto';

            set src(_value: string) {
                queueMicrotask(() => {
                    this.complete = true;
                    this.onload?.();
                });
            }
        }

        const fetchMock = vi.fn(async () => {
            throw new Error('remote fetch should not be used for dice sprite probing');
        });

        vi.stubGlobal('Image', MockImage as unknown as typeof Image);
        vi.stubGlobal('fetch', fetchMock);

        const { getByTestId } = render(
            <Dice3D
                value={6}
                isRolling={false}
                size="48px"
                locale="zh-CN"
                characterId="moon_elf"
                definitionId="moon_elf-dice"
            />
        );

        await waitFor(() => {
            expect(getByTestId('dice-3d')).toHaveAttribute('data-sprite-ready', 'true');
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('本地骰图应像手牌一样先走同源 fetch/blob 再渲染', async () => {
        const OriginalURL = URL;
        class MockUrl extends OriginalURL {
            static createObjectURL = vi.fn(() => 'blob:dicethrone-dice');
            static revokeObjectURL = vi.fn();
        }

        class MockImage {
            onload: null | (() => void) = null;
            onerror: null | (() => void) = null;
            naturalWidth = 256;
            complete = false;
            decoding = 'auto';

            set src(_value: string) {
                queueMicrotask(() => {
                    this.complete = true;
                    this.onload?.();
                });
            }
        }

        const fetchMock = vi.fn(async () => ({
            ok: true,
            blob: async () => new Blob(['dice-sprite']),
        }));

        vi.stubGlobal('URL', MockUrl);
        vi.stubGlobal('Image', MockImage as unknown as typeof Image);
        vi.stubGlobal('fetch', fetchMock);

        const { getByTestId } = render(
            <Dice3D
                value={6}
                isRolling={false}
                size="48px"
                locale="zh-CN"
                characterId="moon_elf"
                definitionId="moon_elf-dice"
            />
        );

        await waitFor(() => {
            expect(getByTestId('dice-3d')).toHaveAttribute('data-sprite-ready', 'true');
        });
        expect(fetchMock).toHaveBeenCalled();
        expect(MockUrl.createObjectURL).toHaveBeenCalled();
        expect(getByTestId('dice-3d')).toHaveAttribute('data-sprite-url', 'blob:dicethrone-dice');
    });

    it('状态图集 JSON 在远程资源模式下应优先走官方资源域名', async () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');

        const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ({
            ok: true,
            json: async () => ({
                meta: { image: 'status-icons-atlas.png', size: { w: 1314, h: 400 } },
                frames: {
                    purify: { frame: { x: 0, y: 0, w: 400, h: 400 } },
                },
            }),
        }));
        vi.stubGlobal('fetch', fetchMock);

        const atlases = await loadStatusAtlases('zh-CN');

        expect(Object.keys(atlases).length).toBeGreaterThan(0);
        expect(fetchMock).toHaveBeenCalled();
        expect(fetchMock.mock.calls.every(([input]) => String(input).startsWith('https://assets.easyboardgame.top/official/'))).toBe(true);
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/i18n/zh-CN/'))).toBe(true);
    });

    it('远端状态图集 JSON 缺失时应回退到本地 /assets', async () => {
        setAssetsBaseUrl('https://assets.easyboardgame.top/official');

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.startsWith('https://assets.easyboardgame.top/official/')) {
                return {
                    ok: false,
                    json: async () => null,
                };
            }
            return {
                ok: true,
                json: async () => ({
                    meta: { image: 'status-icons-atlas.png', size: { w: 1314, h: 400 } },
                    frames: {
                        purify: { frame: { x: 0, y: 0, w: 400, h: 400 } },
                    },
                }),
            };
        });
        vi.stubGlobal('fetch', fetchMock);

        const atlases = await loadStatusAtlases('zh-CN');

        expect(Object.keys(atlases).length).toBeGreaterThan(0);
        expect(fetchMock.mock.calls.some(([input]) => String(input).startsWith('/assets/'))).toBe(true);
    });

    it('骰图切片坐标应匹配旧版 3x3 atlas 布局', () => {
        expect(DICE_BG_SIZE).toBe('300% 300%');
        expect(getDiceSpritePosition(2)).toEqual({ xPos: 0, yPos: 50 });
        expect(getDiceSpritePosition(5)).toEqual({ xPos: 100, yPos: 50 });
        expect(getDiceSpritePosition(6)).toEqual({ xPos: 100, yPos: 100 });
    });

    it('dice sprite 缺失时不应渲染占位文本内容', () => {
        const html = renderToStaticMarkup(
            <Dice3D
                value={6}
                isRolling={false}
                size="48px"
                characterId="moon_elf"
                definitionId="moon_elf-dice"
            />
        );

        expect(html).toContain('data-sprite-ready="false"');
        expect(html).toContain('data-face-id="1"');
        expect(html).not.toContain('data-face-symbol=');
    });
});
