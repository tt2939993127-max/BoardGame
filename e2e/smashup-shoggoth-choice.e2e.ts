/**
 * 大杀四方 - 修格斯（Shoggoth）消灭随从选择权 E2E 测试
 *
 * 卡牌描述：
 * "你只能将这张卡打出到你至少拥有6点力量的基地。
 *  每位其他玩家可以抽一张疯狂卡。
 *  消灭每个没这样做的玩家在这个基地的一个随从。"
 *
 * 关键点：当对手拒绝抽疯狂卡时，由修格斯的控制者（而非系统自动）选择消灭对方的哪个随从。
 */

import { test, expect } from '@playwright/test';
import { initContext } from './helpers/common';
import {
    gotoLocalSmashUp,
    completeFactionSelectionLocal,
    readFullState,
    applyCoreStateDirect,
    closeDebugPanel,
    waitForHandArea,
    clickHandCard,
    waitForPrompt,
    isPromptVisible,
    clickPromptOption,
    clickPromptOptionByText,
    makeCard,
    makeMinion,
    getCurrentPlayer,
    FACTION,
} from './smashup-debug-helpers';

/** 等待随从部署模式的基地高亮（ring-green-400） */
async function waitForDeployBaseSelect(page: import('@playwright/test').Page, timeout = 10000) {
    await page.waitForFunction(
        () => document.querySelectorAll('[class*="ring-green-400"]').length > 0,
        { timeout },
    );
}

/** 点击部署模式下高亮的基地 */
async function clickDeployBase(page: import('@playwright/test').Page, index = 0) {
    await page.evaluate((idx) => {
        const bases = document.querySelectorAll('[class*="ring-green-400"]');
        if (bases[idx]) (bases[idx] as HTMLElement).click();
    }, index);
    await page.waitForTimeout(500);
}

test.describe('SmashUp 修格斯消灭随从选择权', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ context }) => {
        await initContext(context, { storageKey: '__smashup_shoggoth_reset' });
    });

    test('对手拒绝抽疯狂卡时，修格斯控制者选择消灭对方哪个随从', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        // P0: Elder Things + Aliens, P1: Pirates + Ninjas
        await completeFactionSelectionLocal(page, [FACTION.ELDER_THINGS, FACTION.PIRATES, FACTION.NINJAS, FACTION.ALIENS]);
        await waitForHandArea(page);

        // 读取状态并注入测试场景
        const fullState = await readFullState(page);
        const core = (fullState.core ?? fullState) as Record<string, unknown>;
        const { currentPid, player } = getCurrentPlayer(core);
        const turnOrder = core.turnOrder as string[];
        const opponentPid = turnOrder.find(p => p !== currentPid)!;

        const nextUid = (core.nextUid as number) ?? 100;

        // P0 手牌：修格斯
        const hand = player.hand as any[];
        hand.length = 0;
        hand.push(makeCard(`card_${nextUid}`, 'elder_thing_shoggoth', 'minion', currentPid));

        // 基地0：P0 有一个 6 力量随从（满足修格斯打出条件），P1 有两个随从（力量不同）
        const bases = core.bases as any[];
        bases[0].minions = [
            makeMinion(`m_${nextUid + 1}`, 'alien_supreme_overlord', currentPid, currentPid, 6),
            makeMinion(`m_${nextUid + 2}`, 'pirate_first_mate', opponentPid, opponentPid, 2),
            makeMinion(`m_${nextUid + 3}`, 'pirate_saucy_wench', opponentPid, opponentPid, 3),
        ];
        // 清空其他基地的随从
        for (let i = 1; i < bases.length; i++) {
            bases[i].minions = [];
        }

        core.nextUid = nextUid + 10;
        player.minionsPlayed = 0;
        player.minionLimit = 1;

        await applyCoreStateDirect(page, core);
        await closeDebugPanel(page);
        await page.waitForTimeout(1000);

        await page.screenshot({ path: testInfo.outputPath('01-initial-state.png'), fullPage: true });

        // P0 打出修格斯
        await clickHandCard(page, 0);
        await page.waitForTimeout(500);

        // 选择基地打出（只有基地0满足条件）
        await waitForDeployBaseSelect(page);
        await page.screenshot({ path: testInfo.outputPath('02-base-select.png'), fullPage: true });
        await clickDeployBase(page, 0);
        await page.waitForTimeout(1500);

        await page.screenshot({ path: testInfo.outputPath('03-shoggoth-played.png'), fullPage: true });

        // 本地模式下，P1 的选择提示会显示给当前玩家（因为是同一个页面）
        // 等待对手选择提示出现
        await waitForPrompt(page);
        await page.screenshot({ path: testInfo.outputPath('04-opponent-madness-choice.png'), fullPage: true });

        // P1 选择拒绝（不抽疯狂卡）
        const declineResult = await clickPromptOptionByText(page, /拒绝|Decline|不抽/i);
        expect(declineResult).toBe('clicked');
        await page.waitForTimeout(1500);

        await page.screenshot({ path: testInfo.outputPath('05-after-decline.png'), fullPage: true });

        // 关键验证：P0（修格斯控制者）应该收到选择消灭哪个随从的提示
        // 而不是系统自动选择最弱的随从
        await waitForPrompt(page, 15000);
        await page.screenshot({ path: testInfo.outputPath('06-host-destroy-choice.png'), fullPage: true });

        // 验证看到的是随从选择界面
        const hasPrompt = await isPromptVisible(page);
        expect(hasPrompt).toBe(true);

        // P0 选择消灭力量较高的随从（saucy_wench，力量3）而非自动选最弱的
        // 这证明了选择权在 P0 手中
        // 尝试点击第二个选项（力量较高的随从）
        await clickPromptOption(page, 1);
        await page.waitForTimeout(1500);

        await page.screenshot({ path: testInfo.outputPath('07-after-destroy.png'), fullPage: true });

        // 验证结果：P1 在基地0应该只剩一个随从
        const afterState = await readFullState(page);
        const afterCore = (afterState.core ?? afterState) as Record<string, unknown>;
        const afterBases = afterCore.bases as any[];
        const opponentMinionsOnBase0 = afterBases[0].minions.filter((m: any) => m.controller === opponentPid);

        // P1 原本有 2 个随从，被消灭 1 个后应该剩 1 个
        expect(opponentMinionsOnBase0.length).toBe(1);

        // 验证剩下的是力量较低的那个（first_mate，力量2）
        // 因为 P0 选择消灭了力量较高的 saucy_wench
        expect(opponentMinionsOnBase0[0].defId).toBe('pirate_first_mate');
    });

    test('对手只有一个随从时，拒绝后直接消灭（无需选择）', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page, [FACTION.ELDER_THINGS, FACTION.PIRATES, FACTION.NINJAS, FACTION.ALIENS]);
        await waitForHandArea(page);

        const fullState = await readFullState(page);
        const core = (fullState.core ?? fullState) as Record<string, unknown>;
        const { currentPid, player } = getCurrentPlayer(core);
        const turnOrder = core.turnOrder as string[];
        const opponentPid = turnOrder.find(p => p !== currentPid)!;

        const nextUid = (core.nextUid as number) ?? 100;

        const hand = player.hand as any[];
        hand.length = 0;
        hand.push(makeCard(`card_${nextUid}`, 'elder_thing_shoggoth', 'minion', currentPid));

        // P1 只有一个随从
        const bases = core.bases as any[];
        bases[0].minions = [
            makeMinion(`m_${nextUid + 1}`, 'alien_supreme_overlord', currentPid, currentPid, 6),
            makeMinion(`m_${nextUid + 2}`, 'pirate_first_mate', opponentPid, opponentPid, 2),
        ];
        for (let i = 1; i < bases.length; i++) {
            bases[i].minions = [];
        }

        core.nextUid = nextUid + 10;
        player.minionsPlayed = 0;
        player.minionLimit = 1;

        await applyCoreStateDirect(page, core);
        await closeDebugPanel(page);
        await page.waitForTimeout(1000);

        // P0 打出修格斯
        await clickHandCard(page, 0);
        await page.waitForTimeout(500);
        await waitForDeployBaseSelect(page);
        await clickDeployBase(page, 0);
        await page.waitForTimeout(1500);

        // P1 拒绝
        await waitForPrompt(page);
        await clickPromptOptionByText(page, /拒绝|Decline|不抽/i);
        await page.waitForTimeout(1500);

        await page.screenshot({ path: testInfo.outputPath('single-minion-after.png'), fullPage: true });

        // 只有一个随从时，应该直接消灭，P0 不需要选择
        // 验证 P1 的随从已被消灭
        const afterState = await readFullState(page);
        const afterCore = (afterState.core ?? afterState) as Record<string, unknown>;
        const afterBases = afterCore.bases as any[];
        const opponentMinionsOnBase0 = afterBases[0].minions.filter((m: any) => m.controller === opponentPid);

        expect(opponentMinionsOnBase0.length).toBe(0);
    });

    test('对手选择抽疯狂卡时，不消灭随从', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page, [FACTION.ELDER_THINGS, FACTION.PIRATES, FACTION.NINJAS, FACTION.ALIENS]);
        await waitForHandArea(page);

        const fullState = await readFullState(page);
        const core = (fullState.core ?? fullState) as Record<string, unknown>;
        const { currentPid, player } = getCurrentPlayer(core);
        const turnOrder = core.turnOrder as string[];
        const opponentPid = turnOrder.find(p => p !== currentPid)!;

        const nextUid = (core.nextUid as number) ?? 100;

        const hand = player.hand as any[];
        hand.length = 0;
        hand.push(makeCard(`card_${nextUid}`, 'elder_thing_shoggoth', 'minion', currentPid));

        const bases = core.bases as any[];
        bases[0].minions = [
            makeMinion(`m_${nextUid + 1}`, 'alien_supreme_overlord', currentPid, currentPid, 6),
            makeMinion(`m_${nextUid + 2}`, 'pirate_first_mate', opponentPid, opponentPid, 2),
            makeMinion(`m_${nextUid + 3}`, 'pirate_saucy_wench', opponentPid, opponentPid, 3),
        ];
        for (let i = 1; i < bases.length; i++) {
            bases[i].minions = [];
        }

        core.nextUid = nextUid + 10;
        player.minionsPlayed = 0;
        player.minionLimit = 1;

        await applyCoreStateDirect(page, core);
        await closeDebugPanel(page);
        await page.waitForTimeout(1000);

        // P0 打出修格斯
        await clickHandCard(page, 0);
        await page.waitForTimeout(500);
        await waitForDeployBaseSelect(page);
        await clickDeployBase(page, 0);
        await page.waitForTimeout(1500);

        // P1 选择抽疯狂卡
        await waitForPrompt(page);
        await page.screenshot({ path: testInfo.outputPath('draw-madness-choice.png'), fullPage: true });
        await clickPromptOptionByText(page, /抽.*疯狂|Draw.*Madness/i);
        await page.waitForTimeout(1500);

        await page.screenshot({ path: testInfo.outputPath('draw-madness-after.png'), fullPage: true });

        // 验证 P1 的随从都还在
        const afterState = await readFullState(page);
        const afterCore = (afterState.core ?? afterState) as Record<string, unknown>;
        const afterBases = afterCore.bases as any[];
        const opponentMinionsOnBase0 = afterBases[0].minions.filter((m: any) => m.controller === opponentPid);

        expect(opponentMinionsOnBase0.length).toBe(2);
    });
});
