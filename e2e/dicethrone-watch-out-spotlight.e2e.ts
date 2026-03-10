/**
 * Watch Out / 大吉大利 特写 E2E 测试
 *
 * 覆盖两条链路：
 * 1. 自己打出 Watch Out 时，应该看到单骰特写
 * 2. P1 打出大吉大利时，P0 只应看到卡牌特写，不应重复看到 bonus overlay
 */

import { test, expect } from './framework';
import { BARBARIAN_CARDS } from '../src/games/dicethrone/heroes/barbarian/cards';
import {
    advanceToOffensiveRoll,
    applyCoreStateDirect,
    ensureDebugPanelClosed,
    readyAndStartGame,
    readCoreState,
    selectCharacter,
    setupDTOnlineMatch,
    waitForGameBoard,
} from './helpers/dicethrone';
import { waitForTestHarness } from './helpers/common';

test('自己打出 Watch Out 应显示骰子特写', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('/play/dicethrone');

    await page.waitForFunction(
        () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered(),
        { timeout: 15000 }
    );

    await page.waitForFunction(
        () => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
            return state !== undefined;
        },
        { timeout: 20000 }
    );

    await game.setupScene({
        gameId: 'dicethrone',
        player0: {
            hand: ['watch-out'],
            resources: { CP: 2, HP: 50 },
        },
        player1: {
            resources: { HP: 50 },
        },
        currentPlayer: '0',
        phase: 'offensiveRoll',
        extra: {
            selectedCharacters: { '0': 'moon_elf', '1': 'barbarian' },
            hostStarted: true,
            rollCount: 1,
            rollConfirmed: true,
            dice: [
                { id: 0, value: 1, isKept: false },
                { id: 1, value: 2, isKept: false },
                { id: 2, value: 3, isKept: false },
                { id: 3, value: 4, isKept: false },
                { id: 4, value: 5, isKept: false },
            ],
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                damage: 5,
                bonusDamage: 0,
            },
        },
    });

    await page.waitForFunction(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
        return state?.sys?.phase === 'offensiveRoll'
            && state?.core?.activePlayerId === '0'
            && state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'watch-out');
    }, { timeout: 10000 });

    await game.screenshot('01-initial-state', testInfo);

    const handArea = page.locator('[data-testid="hand-area"]');
    const handCards = handArea.locator('[data-card-id]');
    await expect(handCards).toHaveCount(1, { timeout: 10000 });

    const watchOutCard = page.locator('[data-card-id="watch-out"]').first();
    await watchOutCard.waitFor({ state: 'visible', timeout: 10000 });
    await watchOutCard.click();

    const bonusDieOverlay = page.locator('[data-testid="bonus-die-overlay"]');
    await expect(bonusDieOverlay).toBeVisible({ timeout: 2000 });

    const afterClickState = await page.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
        const entries = state?.sys?.eventStream?.entries ?? [];
        const bonusDieEvent = [...entries].reverse().find((entry: any) => entry.event?.type === 'BONUS_DIE_ROLLED');
        return {
            player0Hand: state?.core?.players?.['0']?.hand?.map((card: any) => card.id),
            lastEventTypes: entries.slice(-4).map((entry: any) => entry.event?.type),
            bonusDieEffectKey: bonusDieEvent?.event?.payload?.effectKey,
        };
    });

    const expectedOverlayTextByEffectKey: Record<string, RegExp> = {
        'bonusDie.effect.watchOut.bow': /(Bow🎯: \+2 Damage|弓🎯：伤害\+2)/,
        'bonusDie.effect.watchOut.foot': /(Foot🦶: Inflict Entangle|足🦶：施加缠绕)/,
        'bonusDie.effect.watchOut.moon': /(Moon🌙: Inflict Blinded|月🌙：施加致盲)/,
    };

    expect(afterClickState.bonusDieEffectKey).toMatch(/^bonusDie\.effect\.watchOut\.(bow|foot|moon)$/);
    await expect(
        bonusDieOverlay,
    ).toContainText(expectedOverlayTextByEffectKey[afterClickState.bonusDieEffectKey], { timeout: 5000 });

    await game.screenshot('02-after-play-card', testInfo);
    await game.screenshot('03-final-state', testInfo);

    expect(afterClickState.player0Hand).not.toContain('watch-out');
    expect(afterClickState.lastEventTypes).toContain('BONUS_DIE_ROLLED');
});

test('P1 打出大吉大利时，P0 只应看到卡牌特写，不应重复看到多骰 overlay', async ({ browser }, testInfo) => {
    test.setTimeout(120000);

    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupDTOnlineMatch(browser, baseURL);
    if (!setup) {
        test.skip(true, '游戏服务器不可用或房间创建失败');
        return;
    }

    const { hostPage, guestPage, hostContext, guestContext } = setup;

    try {
        await selectCharacter(hostPage, 'moon_elf');
        await selectCharacter(guestPage, 'barbarian');
        await readyAndStartGame(hostPage, guestPage);
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);
        await waitForTestHarness(hostPage, 10000);
        await waitForTestHarness(guestPage, 10000);
        await advanceToOffensiveRoll(hostPage);

        const coreState = await readCoreState(hostPage) as Record<string, any>;
        const luckyCard = BARBARIAN_CARDS.find(card => card.id === 'card-lucky');
        if (!luckyCard) {
            throw new Error('未找到 card-lucky');
        }

        const injectedCore = JSON.parse(JSON.stringify(coreState));
        injectedCore.activePlayerId = '1';
        injectedCore.rollCount = 1;
        injectedCore.rollConfirmed = true;
        injectedCore.dice = [
            { id: 0, value: 1, isKept: false, playerId: '1' },
            { id: 1, value: 2, isKept: false, playerId: '1' },
            { id: 2, value: 3, isKept: false, playerId: '1' },
            { id: 3, value: 4, isKept: false, playerId: '1' },
            { id: 4, value: 5, isKept: false, playerId: '1' },
        ];
        injectedCore.pendingAttack = {
            attackerId: '1',
            defenderId: '0',
            isDefendable: true,
            damage: 5,
            bonusDamage: 0,
        };
        injectedCore.pendingBonusDiceSettlement = undefined;
        injectedCore.players['0'].resources.CP = 2;
        injectedCore.players['0'].resources.HP = 50;
        injectedCore.players['1'].resources.CP = 3;
        injectedCore.players['1'].resources.HP = 40;
        injectedCore.players['1'].hand = [JSON.parse(JSON.stringify(luckyCard))];

        await applyCoreStateDirect(hostPage, injectedCore);
        await ensureDebugPanelClosed(hostPage);
        await ensureDebugPanelClosed(guestPage);

        await guestPage.waitForFunction(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
            return state?.sys?.phase === 'offensiveRoll'
                && state?.core?.activePlayerId === '1'
                && state?.core?.players?.['1']?.hand?.some((card: any) => card.id === 'card-lucky');
        }, { timeout: 15000 });

        await hostPage.screenshot({
            path: testInfo.outputPath('04-p0-before-p1-play-lucky.png'),
            fullPage: false,
        });

        const luckyCardInHand = guestPage.locator('[data-card-id="card-lucky"]').first();
        await expect(luckyCardInHand).toBeVisible({ timeout: 10000 });
        await luckyCardInHand.click();

        const hostCardSpotlight = hostPage.locator('[data-testid="card-spotlight-overlay"]');
        await expect(hostCardSpotlight).toBeVisible({ timeout: 15000 });
        await expect(hostPage.locator('[data-testid="card-spotlight-die"]')).toHaveCount(3, { timeout: 15000 });

        await hostPage.waitForTimeout(1200);

        const bonusOverlayVisible = await hostPage
            .locator('[data-testid="bonus-die-overlay"]')
            .isVisible()
            .catch(() => false);
        expect(bonusOverlayVisible).toBe(false);

        const overlayState = await hostPage.evaluate(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
            return {
                lastEventTypes: (state?.sys?.eventStream?.entries ?? []).slice(-8).map((entry: any) => entry.event?.type),
                pendingBonusDiceSettlement: state?.core?.pendingBonusDiceSettlement
                    ? {
                        id: state.core.pendingBonusDiceSettlement.id,
                        attackerId: state.core.pendingBonusDiceSettlement.attackerId,
                        diceCount: state.core.pendingBonusDiceSettlement.dice?.length ?? 0,
                        displayOnly: state.core.pendingBonusDiceSettlement.displayOnly,
                    }
                    : null,
            };
        });

        expect(overlayState.lastEventTypes).toContain('CARD_PLAYED');
        expect(overlayState.lastEventTypes).toContain('BONUS_DICE_REROLL_REQUESTED');
        expect(overlayState.pendingBonusDiceSettlement?.displayOnly).toBe(true);
        expect(overlayState.pendingBonusDiceSettlement?.attackerId).toBe('1');
        expect(overlayState.pendingBonusDiceSettlement?.diceCount).toBe(3);

        await hostPage.screenshot({
            path: testInfo.outputPath('05-p0-after-p1-play-lucky-no-duplicate-overlay.png'),
            fullPage: false,
        });
    } finally {
        await guestContext.close();
        await hostContext.close();
    }
});
