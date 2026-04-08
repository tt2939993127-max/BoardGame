/**
 * 大杀四方 - 基地选择卡牌展示模式测试
 * 验证选择基地时是否正确显示基地卡牌而不是按钮
 */

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from '@playwright/test';
import {
    setupTwoPlayerMatch as setupOnlineMatch,
    cleanupTwoPlayerMatch,
    completeFactionSelectionCustom,
    waitForHandArea,
    FACTION,
} from './smashup-helpers';
import { readFullState as readCoreState, applyCoreStateDirect } from './smashup-debug-helpers';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from './framework/evidenceScreenshots';

const saveEvidenceScreenshot = async (
    page: Parameters<typeof readCoreState>[0],
    testInfo: Parameters<typeof getEvidenceScreenshotPath>[0],
    name: string,
) => {
    const path = getEvidenceScreenshotPath(testInfo, name, { filename: `${name}.png` });
    await mkdir(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true });
    return path;
};

const setDragInteractionMode = async (page: Parameters<typeof readCoreState>[0]) => {
    await page.evaluate(() => {
        localStorage.setItem('smashup_interaction_mode', 'drag');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 20000 });
};

test.describe('大杀四方 - 基地选择卡牌展示', () => {
    test.setTimeout(120000);

    test('麦田怪圈：选择基地时显示基地卡牌', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineMatch(browser, baseURL);
        
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage: p0Page, guestPage: p1Page, hostContext, guestContext } = setup;

        try {
            await completeFactionSelectionCustom(
                p0Page,
                p1Page,
                [FACTION.ALIENS, FACTION.ZOMBIES],
                [FACTION.NINJAS, FACTION.ROBOTS],
            );
            await waitForHandArea(p0Page);
            await waitForHandArea(p1Page);

            // 设置初始状态：两个基地都有随从
            const initialState = await readCoreState(p0Page);
            const currentPid = initialState.core.turnOrder[initialState.core.currentPlayerIndex];
            const modifiedState = {
                ...initialState,
                core: {
                    ...initialState.core,
                    bases: initialState.core.bases.map((base, idx) => ({
                        ...base,
                        minions: idx < 2 ? [{
                            uid: `minion-${idx}`,
                            defId: 'alien_invader',
                            controller: currentPid,
                            owner: currentPid,
                            attachedActions: [],
                            powerCounters: 0,
                        }] : [],
                    })),
                    players: {
                        ...initialState.core.players,
                        [currentPid]: {
                            ...initialState.core.players[currentPid],
                            hand: [
                                { uid: 'crop-circles-1', defId: 'alien_crop_circles', type: 'action' },
                            ],
                        },
                    },
                },
            };

            await applyCoreStateDirect(p0Page, modifiedState);

            // P0 打出麦田怪圈
            await p0Page.locator('[data-card-uid="crop-circles-1"]').click();

            // 等待基地选择界面出现
            await p0Page.waitForSelector('[data-testid="prompt-overlay"]', { timeout: 3000 });

            // 验证标题
            const title = await p0Page.textContent('h2');
            expect(title).toContain('选择一个基地');

            // 验证显示的是卡牌而不是按钮
            // 卡牌模式会使用 CardPreview 组件，按钮模式会使用 GameButton
            const cardPreviews = await p0Page.locator('[data-testid^="card-preview"]').count();
            const gameButtons = await p0Page.locator('button:has-text("基地")').count();

            console.log(`卡牌数量: ${cardPreviews}, 按钮数量: ${gameButtons}`);

            // 应该显示卡牌，不显示按钮
            expect(cardPreviews).toBeGreaterThan(0);
            expect(gameButtons).toBe(0);

            // 验证卡牌尺寸（基地卡牌应该是横向的）
            const firstCard = p0Page.locator('[data-testid^="card-preview"]').first();
            const boundingBox = await firstCard.boundingBox();

            if (boundingBox) {
                // 基地卡牌应该是横向的（宽度 > 高度）
                expect(boundingBox.width).toBeGreaterThan(boundingBox.height);
                console.log(`基地卡牌尺寸: ${boundingBox.width}x${boundingBox.height}`);
            }
        } finally {
            await cleanupTwoPlayerMatch({ ...setup, hostContext, guestContext });
        }
    });

    test('拖拽模式下，手牌选择 prompt 不应进入拖拽，正常打牌箭头曲线应保持平顺', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineMatch(browser, baseURL);

        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage, guestPage, hostContext, guestContext } = setup;

        try {
            await clearEvidenceScreenshotsForTest(testInfo);
            await completeFactionSelectionCustom(
                hostPage,
                guestPage,
                [FACTION.ALIENS, FACTION.ZOMBIES],
                [FACTION.NINJAS, FACTION.ROBOTS],
            );
            await waitForHandArea(hostPage);
            await waitForHandArea(guestPage);
            await setDragInteractionMode(hostPage);

            const initialState = await readCoreState(hostPage);
            const currentPid = initialState.core.turnOrder[initialState.core.currentPlayerIndex];
            const otherPid = initialState.core.turnOrder.find((pid: string) => pid !== currentPid) ?? '1';

            const makeMinionCard = (uid: string, defId: string) => ({
                uid,
                defId,
                type: 'minion',
                owner: currentPid,
            });

            const promptState = {
                ...initialState,
                core: {
                    ...initialState.core,
                    currentPlayerIndex: 0,
                    turnOrder: [currentPid, otherPid],
                    players: {
                        ...initialState.core.players,
                        [currentPid]: {
                            ...initialState.core.players[currentPid],
                            hand: [
                                makeMinionCard('e2e-extra-minion-1', 'alien_invader'),
                                makeMinionCard('e2e-extra-minion-2', 'zombie_walker'),
                            ],
                            minionsPlayed: 0,
                            minionLimit: 1,
                            actionsPlayed: 0,
                            actionLimit: 1,
                        },
                        [otherPid]: {
                            ...initialState.core.players[otherPid],
                            hand: [],
                        },
                    },
                },
                sys: {
                    ...initialState.sys,
                    phase: 'playCards',
                    interaction: {
                        ...initialState.sys.interaction,
                        current: {
                            id: 'e2e-extra-minion-choice',
                            kind: 'simple-choice',
                            playerId: currentPid,
                            data: {
                                title: '选择要额外打出的随从',
                                sourceId: 'e2e_extra_minion_choice',
                                targetType: 'hand',
                                options: [
                                    { id: 'extra-minion-1', label: '外星侵略者', value: { cardUid: 'e2e-extra-minion-1' } },
                                    { id: 'extra-minion-2', label: '僵尸步兵', value: { cardUid: 'e2e-extra-minion-2' } },
                                    { id: 'skip-extra', label: '跳过', value: { skip: true }, displayMode: 'button' },
                                ],
                            },
                        },
                        queue: [],
                        isBlocked: false,
                    },
                },
            };

            await applyCoreStateDirect(hostPage, promptState);
            await hostPage.waitForTimeout(800);

            const promptCard = hostPage.locator('[data-card-uid="e2e-extra-minion-1"]').first();
            await expect(promptCard).toBeVisible({ timeout: 5000 });

            const promptCursor = await promptCard.evaluate((node) => window.getComputedStyle(node as HTMLElement).cursor);
            expect(promptCursor).not.toContain('grab');

            const promptBox = await promptCard.boundingBox();
            expect(promptBox).not.toBeNull();
            if (!promptBox) {
                throw new Error('prompt 卡牌 bounding box 获取失败');
            }

            await hostPage.mouse.move(promptBox.x + promptBox.width / 2, promptBox.y + promptBox.height / 2);
            await hostPage.mouse.down();
            await hostPage.mouse.move(promptBox.x + promptBox.width / 2 + 100, promptBox.y + promptBox.height / 2 - 80, { steps: 12 });
            await hostPage.waitForTimeout(250);
            await expect(hostPage.getByTestId('su-drag-arrow')).toHaveCount(0);

            const handPromptScreenshot = await saveEvidenceScreenshot(hostPage, testInfo, 'hand-prompt-click-mode');

            await hostPage.mouse.up();

            const dragState = {
                ...promptState,
                sys: {
                    ...promptState.sys,
                    interaction: {
                        ...promptState.sys.interaction,
                        current: null,
                    },
                },
            };

            await applyCoreStateDirect(hostPage, dragState);
            await hostPage.waitForTimeout(600);

            const base = hostPage.locator('[data-base-index="0"]').first();
            await expect(base).toBeVisible({ timeout: 5000 });
            const baseBox = await base.boundingBox();
            expect(baseBox).not.toBeNull();
            if (!baseBox) {
                throw new Error('基地 bounding box 获取失败');
            }

            await hostPage.mouse.move(promptBox.x + promptBox.width / 2, promptBox.y + promptBox.height / 2);
            await hostPage.mouse.down();
            await hostPage.mouse.move(baseBox.x + baseBox.width / 2, baseBox.y + baseBox.height / 2, { steps: 20 });
            await expect(hostPage.getByTestId('su-drag-arrow')).toBeVisible({ timeout: 5000 });

            const dragArrowScreenshot = await saveEvidenceScreenshot(hostPage, testInfo, 'drag-arrow-curve');

            await hostPage.mouse.up();

            console.log('手牌 prompt 截图:', handPromptScreenshot);
            console.log('拖拽箭头截图:', dragArrowScreenshot);
        } finally {
            await cleanupTwoPlayerMatch({ ...setup, hostContext, guestContext });
        }
    });
});
