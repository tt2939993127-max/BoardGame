/**
 * 圣骑士 (Paladin) E2E 交互测试
 *
 * 覆盖交互面：
 * - 神圣祝福 (Blessing of Divinity) 触发：免疫伤害并回复生命
 */

import { test, expect } from '@playwright/test';
import { TOKEN_IDS } from '../src/games/dicethrone/domain/ids';
import { RESOURCE_IDS } from '../src/games/dicethrone/domain/resources';
import { initHeroState, createCharacterDice } from '../src/games/dicethrone/domain/characters';
// 触发骰子/资源定义注册（副作用 import）
import '../src/games/dicethrone/domain/index';
import { initContext } from './helpers/common';
import {
    waitForMainPhase,
    readCoreState,
    applyCoreStateDirect,
    applyDiceValues,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

/** 构建指定角色的初始状态 */
const buildHeroState = (playerId: string, characterId: 'barbarian' | 'paladin') => {
    const dummyRandom = {
        shuffle: <T>(arr: T[]) => arr,
        random: () => 0.5,
        d: (_n: number) => 1,
        range: (min: number) => min,
    } as const;
    return initHeroState(playerId, characterId, dummyRandom);
};

/** 推进到攻击掷骰阶段（本地模式，通过读取 core state 判断） */
const advanceToOffensiveRoll = async (page: import('@playwright/test').Page) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const cancelBtn = page.getByRole('button', { name: /Cancel.*Select Ability|取消/i });
        if (await cancelBtn.isVisible({ timeout: 300 }).catch(() => false)) {
            await cancelBtn.click();
            await page.waitForTimeout(300);
        }
        const coreState = await readCoreState(page) as Record<string, unknown>;
        await closeDebugPanelIfOpen(page);
        if (coreState?.currentPhase === 'offensiveRoll') return;
        const nextPhaseButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        if (await nextPhaseButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
            await nextPhaseButton.click();
            await page.waitForTimeout(800);
        } else {
            await page.waitForTimeout(300);
        }
    }
};

/** 创建本地对局并注入指定角色 */
const setupLocalMatch = async (
    browser: import('@playwright/test').Browser,
    baseURL: string | undefined,
    hostChar: 'barbarian' | 'paladin',
    guestChar: 'barbarian' | 'paladin',
) => {
    const context = await browser.newContext({ baseURL });
    await initContext(context, { storageKey: '__dt_paladin_reset' });
    const page = await context.newPage();

    await page.goto('/play/dicethrone/local?seed=paladin-e2e', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('debug-toggle')).toBeVisible({ timeout: 15000 });

    const coreSnapshot = await readCoreState(page) as Record<string, unknown>;
    const hostId = '0';
    const guestId = '1';
    const players = coreSnapshot.players as Record<string, unknown> | undefined;
    const forcedCore = {
        ...coreSnapshot,
        players: {
            ...players,
            [hostId]: buildHeroState(hostId, hostChar),
            [guestId]: buildHeroState(guestId, guestChar),
        },
        selectedCharacters: {
            ...((coreSnapshot.selectedCharacters as Record<string, unknown>) ?? {}),
            [hostId]: hostChar,
            [guestId]: guestChar,
        },
        readyPlayers: {
            ...((coreSnapshot.readyPlayers as Record<string, unknown>) ?? {}),
            [hostId]: true,
            [guestId]: true,
        },
        hostStarted: true,
        activePlayerId: hostId,
        startingPlayerId: hostId,
        dice: createCharacterDice(hostChar),
    };
    await applyCoreStateDirect(page, forcedCore);
    await page.waitForTimeout(300);
    await closeDebugPanelIfOpen(page);
    await waitForMainPhase(page, 20000);

    return { page, context, hostId, guestId };
};

test.describe('DiceThrone Paladin E2E', () => {
    test('Local match: Paladin Blessing of Divinity prevents lethal damage', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupLocalMatch(browser, baseURL, 'barbarian', 'paladin');
        const { page, context, hostId, guestId } = match;

        const hostNextPhase = page.locator('[data-tutorial-id="advance-phase-button"]');
        const hostIsActive = await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
        if (!hostIsActive) {
            const coreSnapshot = await readCoreState(page) as Record<string, unknown>;
            await applyCoreStateDirect(page, { ...coreSnapshot, activePlayerId: hostId, startingPlayerId: hostId });
            await page.waitForTimeout(300);
            await closeDebugPanelIfOpen(page);
        }

        const defenderId = guestId;
        const coreState = await readCoreState(page) as Record<string, unknown>;
        const players = coreState?.players as Record<string, Record<string, unknown>> | undefined;
        const defenderState = players?.[defenderId];
        if (!defenderState) throw new Error('无法读取防御方状态');

        const hpBefore = 1;
        const nextCoreState = {
            ...coreState,
            players: {
                ...players,
                [defenderId]: {
                    ...defenderState,
                    resources: {
                        ...((defenderState.resources as Record<string, unknown>) ?? {}),
                        [RESOURCE_IDS.HP]: hpBefore,
                    },
                    tokens: {
                        ...((defenderState.tokens as Record<string, unknown>) ?? {}),
                        [TOKEN_IDS.BLESSING_OF_DIVINITY]: 1,
                    },
                },
            },
        };

        await applyCoreStateDirect(page, nextCoreState);
        await page.waitForTimeout(300);
        await closeDebugPanelIfOpen(page);

        await advanceToOffensiveRoll(page);

        // 关闭可能出现的确认弹窗
        const skipModal = page.getByRole('button', { name: /Cancel/i });
        if (await skipModal.isVisible({ timeout: 500 }).catch(() => false)) {
            await skipModal.click();
            await page.waitForTimeout(300);
        }

        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await page.waitForTimeout(500);
        await applyDiceValues(page, [6, 6, 6, 6, 1]);
        await page.waitForTimeout(300);

        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();
        await page.waitForTimeout(1000);

        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });
        await expect(highlightedSlots.first()).toBeVisible({ timeout: 8000 });
        await highlightedSlots.first().click();

        const resolveAttackButton = page.getByRole('button', { name: /Resolve Attack|结算攻击/i });
        await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
        await resolveAttackButton.click();

        await expect(page.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

        const coreAfter = await readCoreState(page) as Record<string, unknown>;
        const playersAfter = coreAfter?.players as Record<string, Record<string, unknown>> | undefined;
        const defenderAfter = playersAfter?.[defenderId];
        const resourcesAfter = defenderAfter?.resources as Record<string, number> | undefined;
        const hpAfter = resourcesAfter?.[RESOURCE_IDS.HP] ?? 0;
        expect(hpAfter).toBe(hpBefore + 5);
        const tokensAfter = defenderAfter?.tokens as Record<string, number> | undefined;
        expect(tokensAfter?.[TOKEN_IDS.BLESSING_OF_DIVINITY] ?? 0).toBe(0);

        await page.screenshot({ path: testInfo.outputPath('paladin-blessing-prevent.png'), fullPage: false });
        await context.close();
    });
});
