import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

import { test, expect } from '../framework';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from '../framework/evidenceScreenshots';
import { waitForTestHarness } from '../helpers/common';

const OPEN_TIMEOUT_MS = 180000;
const GUNSLINGER_HAND = [
    'card-just-this',
    'card-super-double',
    'card-surprise',
    'card-eat-my-lead',
];

const expectedFrameTranslateXPercent: Record<string, number> = {
    // 浏览器把 inline transform 序列化为四位小数；断言按同一精度比较，避免浮点格式化误报。
    'card-just-this': -60.5914,
    'card-super-double': -40.6989,
    'card-surprise': -20.8065,
    'card-eat-my-lead': -10.8602,
};

async function waitForHandCards(page: Page): Promise<void> {
    await page.waitForFunction((cardIds) => {
        const hand = document.querySelector('[data-testid="hand-area"]');
        if (!hand || hand.querySelectorAll('.atlas-shimmer').length > 0) return false;

        return (cardIds as string[]).every((cardId) => {
            const card = hand.querySelector(`[data-card-id="${cardId}"]`);
            const atlasImage = card?.querySelector('[data-card-atlas-img="true"]') as HTMLImageElement | null;
            return card?.getAttribute('data-is-flipped') === 'true'
                && atlasImage?.complete === true
                && atlasImage.naturalWidth > 16
                && atlasImage.naturalHeight > 16;
        });
    }, GUNSLINGER_HAND, { timeout: 20000, polling: 100 });
    await page.waitForTimeout(800);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
    const path = getEvidenceScreenshotPath(testInfo, name, {
        filename: `${name}.jpg`,
        requireChineseName: true,
    });
    await mkdir(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: false, type: 'jpeg', quality: 90 });
}

test.describe('DiceThrone - 枪手手牌图集', () => {
    test('枪手原始四张手牌不应出现空白黑卡面', async ({ page, game }, testInfo) => {
        test.setTimeout(120000);
        await clearEvidenceScreenshotsForTest(testInfo);
        await game.openTestGame('dicethrone', { playerID: '0', seat1: 'human' }, OPEN_TIMEOUT_MS);
        await waitForTestHarness(page, 40000);

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: GUNSLINGER_HAND,
                resources: { CP: 10, HP: 50 },
            },
            player1: {
                resources: { CP: 2, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'gunslinger', '1': 'barbarian' },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollConfirmed: false,
                dice: [
                    { id: 0, value: 1, isKept: false },
                    { id: 1, value: 2, isKept: false },
                    { id: 2, value: 3, isKept: false },
                    { id: 3, value: 4, isKept: false },
                    { id: 4, value: 5, isKept: false },
                ],
            },
        });

        await expect.poll(async () => {
            const state = await game.getState();
            return (state?.core?.players?.['0']?.hand ?? []).map((card: { id?: string }) => card.id);
        }, { timeout: 10000 }).toEqual(GUNSLINGER_HAND);
        await waitForHandCards(page);

        const frameTranslations = await page.evaluate((cardIds) => Object.fromEntries(
            cardIds.map((cardId) => {
                const card = document.querySelector(`[data-testid="hand-area"] [data-card-id="${cardId}"]`);
                const image = card?.querySelector('[data-card-atlas-img="true"]') as HTMLImageElement | null;
                const match = image?.style.transform.match(/translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/);
                return [cardId, {
                    atlasIndex: card?.querySelector('[data-card-atlas-frame="true"]')?.getAttribute('data-card-atlas-index'),
                    translateX: match ? Number(match[1]) : null,
                    hasUsableImage: Boolean(image && image.naturalWidth > 16 && image.naturalHeight > 16),
                }];
            }),
        ), GUNSLINGER_HAND);

        for (const cardId of GUNSLINGER_HAND) {
            expect(frameTranslations[cardId]?.hasUsableImage).toBe(true);
            expect(frameTranslations[cardId]?.translateX).toBeCloseTo(expectedFrameTranslateXPercent[cardId], 5);
        }
        expect(frameTranslations['card-eat-my-lead']).toMatchObject({ atlasIndex: '34' });

        await expect(page.getByTestId('card-spotlight-overlay')).toBeHidden({ timeout: 5000 });
        await screenshot(page, testInfo, '枪手四张原始手牌均显示实际卡面');
    });
});
