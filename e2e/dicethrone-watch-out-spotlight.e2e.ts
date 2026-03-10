/**
 * Watch Out 骰子特写 E2E 测试
 * 
 * 验证:自己打出 Watch Out 后,应该看到独立骰子特写
 */

import { test, expect } from './framework';

test('自己打出 Watch Out 应显示骰子特写', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('/play/dicethrone');

    // 等待 TestHarness 就绪
    await page.waitForFunction(
        () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered(),
        { timeout: 15000 }
    );

    // 等待状态容器可读
    await page.waitForFunction(
        () => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
            return state !== undefined;
        },
        { timeout: 20000 }
    );

    // 状态注入:跳过选角,直接设置游戏状态
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

    await page.waitForTimeout(3000);

    await page.waitForFunction(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
        return state?.sys?.phase === 'offensiveRoll'
            && state?.core?.activePlayerId === '0'
            && state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'watch-out');
    }, { timeout: 10000 });

    // 截图:初始状态
    await game.screenshot('01-initial-state', testInfo);

    // 检查手牌是否存在
    const handArea = page.locator('[data-testid="hand-area"]');
    const handCards = handArea.locator('[data-card-id]');
    await expect(handCards).toHaveCount(1, { timeout: 10000 });

    // 点击 Watch Out 卡牌
    const watchOutCard = page.locator('[data-card-id="watch-out"]').first();
    await watchOutCard.waitFor({ state: 'visible', timeout: 10000 });
    await watchOutCard.click();

    // 等待骰子特写出现
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
        'bonusDie.effect.watchOut.bow': /(Bow🏹: \+2 Damage|弓🏹：伤害\+2)/,
        'bonusDie.effect.watchOut.foot': /(Foot🦶: Inflict Entangle|足🦶：施加缠绕)/,
        'bonusDie.effect.watchOut.moon': /(Moon🌙: Inflict Blinded|月🌙：施加致盲)/,
    };

    expect(afterClickState.bonusDieEffectKey).toMatch(/^bonusDie\.effect\.watchOut\.(bow|foot|moon)$/);
    await expect(
        bonusDieOverlay,
    ).toContainText(expectedOverlayTextByEffectKey[afterClickState.bonusDieEffectKey], { timeout: 5000 });

    // 截图:打出卡牌后，文案已出现
    await game.screenshot('02-after-play-card', testInfo);

    await game.screenshot('03-final-state', testInfo);
    expect(afterClickState.player0Hand).not.toContain('watch-out');
    expect(afterClickState.lastEventTypes).toContain('BONUS_DIE_ROLLED');
});
