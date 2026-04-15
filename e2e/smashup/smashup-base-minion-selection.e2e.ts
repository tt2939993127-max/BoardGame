/**
 * 大杀四方 - 基地和随从选择交互 E2E 测试
 * 
 * 验证目标：
 * 1. 基地选择交互不弹出 PromptOverlay 窗口
 * 2. 随从选择交互不弹出 PromptOverlay 窗口
 * 3. 可选目标高亮显示
 * 4. 直接点击目标完成选择
 * 5. 顶部显示交互标题横幅
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { waitForTestHarness } from '../helpers/common';
import { getMatchState, injectMatchState } from '../helpers/state-injection';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from '../framework/evidenceScreenshots';
import {
    setupTwoPlayerMatch as setupOnlineMatch,
    cleanupTwoPlayerMatch,
    completeFactionSelectionCustom,
    waitForHandArea,
    FACTION,
} from './smashup-helpers';

const HOST_PLAYER_ID = '0';
const MISKATONIC_BASE_LEGACY_TEXT = '在这个基地计分后，冠军可以搜寻他的手牌和弃牌堆中任意数量的疯狂卡，然后返回到疯狂卡牌库。';
const MISKATONIC_BASE_POD_TEXT = '每回合一次，在你于此打出一个随从后，你可以抽两张疯狂卡，或从你的手牌弃置一张疯狂卡来额外打出一张战术。';
const STEAMPUNK_TRICKSTER_PACKET_CORE = {
    players: {
        '0': {
            id: '0',
            vp: 0,
            hand: [
                { uid: 'c22', defId: 'trickster_brownie_pod', type: 'minion', owner: '0' },
                { uid: 'c35', defId: 'trickster_hideout_pod', type: 'action', owner: '0' },
                { uid: 'c4', defId: 'steampunk_steam_man_pod', type: 'minion', owner: '0' },
                { uid: 'c12', defId: 'steampunk_aggromotive_pod', type: 'action', owner: '0' },
                { uid: 'c16', defId: 'steampunk_change_of_venue_pod', type: 'action', owner: '0' },
            ],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
            factions: ['steampunks_pod', 'tricksters_pod'],
            sameNameMinionDefId: null,
        },
        '1': {
            id: '1',
            vp: 0,
            hand: [],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
            factions: ['robots', 'wizards'],
        },
    },
    turnOrder: ['0', '1'],
    currentPlayerIndex: 0,
    bases: [
        { defId: 'base_mushroom_kingdom', minions: [], ongoingActions: [] },
        { defId: 'base_the_factory', minions: [], ongoingActions: [] },
        { defId: 'base_great_library', minions: [], ongoingActions: [] },
    ],
    titans: [
        {
            uid: 'titan_0_tricksters_big_funny_giant',
            defId: 'tricksters_big_funny_giant',
            faction: 'tricksters',
            ownerId: '0',
            controllerId: '0',
            powerCounters: 0,
            talentUsed: false,
            location: { zone: 'setaside' },
        },
    ],
    enabledExpansions: ['titans'],
    baseDeck: [],
    baseDiscard: [],
    turnNumber: 1,
    nextUid: 81,
    cardsPlayedThisTurn: 0,
    powerCountersPlacedOnMinionsThisTurn: 0,
    turnDestroyedMinions: [],
};

async function applySmashUpStatePatch(
    matchId: string,
    page: Page,
    updater: (state: any) => any,
): Promise<void> {
    const currentState = await getMatchState(matchId, page);
    const nextState = normalizeInjectedMatchState(matchId, updater(currentState));
    await injectMatchState(matchId, nextState, page);
    await page.waitForTimeout(500);
}

function normalizeInjectedMatchState(matchId: string, state: any): any {
    const next = structuredClone(state);
    const fallbackTurnOrder = Array.isArray(next.core?.turnOrder)
        ? [...next.core.turnOrder]
        : Object.keys(next.core?.players ?? {});
    const currentPlayerIndex = typeof next.sys?.currentPlayerIndex === 'number'
        ? next.sys.currentPlayerIndex
        : typeof next.core?.currentPlayerIndex === 'number'
            ? next.core.currentPlayerIndex
            : Math.max(0, fallbackTurnOrder.indexOf(next.core?.activePlayerId ?? HOST_PLAYER_ID));

    next.sys = {
        ...next.sys,
        matchId,
        turnOrder: Array.isArray(next.sys?.turnOrder) ? next.sys.turnOrder : fallbackTurnOrder,
        currentPlayerIndex,
        phase: typeof next.sys?.phase === 'string' ? next.sys.phase : next.core?.phase,
    };
    next.core = {
        ...next.core,
        turnOrder: fallbackTurnOrder,
        currentPlayerIndex,
        phase: typeof next.core?.phase === 'string' ? next.core.phase : next.sys.phase,
    };
    return next;
}

async function injectSteampunkTricksterPacketState(matchId: string, page: Page): Promise<void> {
    await applySmashUpStatePatch(matchId, page, (state) => ({
        ...state,
        core: {
            ...state.core,
            ...structuredClone(STEAMPUNK_TRICKSTER_PACKET_CORE),
        },
        sys: {
            ...state.sys,
            phase: 'playCards',
        },
    }));
    await page.waitForSelector('[data-card-uid="c4"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="su-rail-titan-titan_0_tricksters_big_funny_giant"]', { timeout: 5000 });
}

async function injectMiskatonicPodBaseState(matchId: string, page: Page): Promise<void> {
    await applySmashUpStatePatch(matchId, page, (state) => ({
        ...state,
        core: {
            ...state.core,
            players: {
                ...(state.core?.players ?? {}),
                '0': {
                    ...(state.core?.players?.['0'] ?? {}),
                    id: '0',
                    hand: [],
                    deck: [],
                    discard: [],
                    minionsPlayed: 0,
                    minionLimit: 1,
                    actionsPlayed: 0,
                    actionLimit: 1,
                    factions: ['miskatonic_university_pod', 'ghosts_pod'],
                },
                '1': {
                    ...(state.core?.players?.['1'] ?? {}),
                    id: '1',
                    hand: [],
                    deck: [],
                    discard: [],
                    minionsPlayed: 0,
                    minionLimit: 1,
                    actionsPlayed: 0,
                    actionLimit: 1,
                    factions: ['aliens', 'robots'],
                },
            },
            bases: [
                { defId: 'base_miskatonic_university_base', minions: [], ongoingActions: [] },
                { defId: 'base_the_factory', minions: [], ongoingActions: [] },
                { defId: 'base_great_library', minions: [], ongoingActions: [] },
            ],
            titans: [],
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
        },
        sys: {
            ...state.sys,
            phase: 'playCards',
        },
    }));
    await page.waitForSelector('[data-testid="base-zone-0"]', { timeout: 5000 });
}

function updatePlayer(core: any, playerId: string, patch: Record<string, unknown>): Record<string, unknown> {
    return {
        ...(core.players ?? {}),
        [playerId]: {
            ...(core.players?.[playerId] ?? {}),
            ...patch,
        },
    };
}

function updateBase(core: any, index: number, patch: Record<string, unknown>): Array<Record<string, unknown>> {
    const bases = [...(core.bases ?? [])];
    bases[index] = {
        ...(bases[index] ?? {}),
        ...patch,
    };
    return bases;
}

test.describe('SmashUp Base/Minion Selection', () => {
    test.describe.configure({ timeout: 90000 });

    test('基地选择：外星人地形改造 - 不弹窗，直接点击基地', async ({ smashupMatch }) => {
        const { hostPage: page, matchId } = smashupMatch;

        // 等待测试工具就绪
        await waitForTestHarness(page);

        // 注入状态：玩家1手牌中有地形改造卡
        await applySmashUpStatePatch(matchId, page, (state) => {
            const core = state.core ?? {};
            const players = updatePlayer(core, HOST_PLAYER_ID, {
                hand: [{ uid: 'terraform-1', defId: 'alien_terraform', type: 'action', owner: HOST_PLAYER_ID }],
                actionsPlayed: 0,
                actionLimit: 1,
            });
            return {
                ...state,
                core: {
                    ...core,
                    players,
                },
            };
        });

        // 等待手牌渲染
        await page.waitForSelector('[data-card-uid="terraform-1"]', { timeout: 5000 });

        // 点击地形改造卡
        await page.click('[data-card-uid="terraform-1"]');

        // 等待交互标题横幅出现
        await page.waitForSelector('text=地形改造：选择要替换的基地', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：基地应该高亮（可点击）
        const bases = page.locator('[data-testid^="base-zone-"]');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThan(0);

        // 点击第一个基地
        await bases.first().click();

        // 等待基地牌库选择交互（第二步）
        await page.waitForSelector('text=地形改造：从基地牌库中选择一张基地进行替换', { timeout: 5000 });

        // 验证：第二步应该弹出 PromptOverlay（选择基地牌库中的卡牌）
        await expect(promptOverlay).toBeVisible();
    });

    test('随从选择：外星人至高霸主 - 不弹窗，直接点击随从', async ({ smashupMatch }) => {
        const { hostPage: page, matchId } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有随从，玩家1手牌中有至高霸主
        await applySmashUpStatePatch(matchId, page, (state) => {
            const core = state.core ?? {};
            const bases = updateBase(core, 0, {
                minions: [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] },
                    { uid: 'minion-2', defId: 'pirate_buccaneer', owner: '1', controller: '1', attachedActions: [] },
                ],
            });
            const players = updatePlayer(core, HOST_PLAYER_ID, {
                hand: [{ uid: 'overlord-1', defId: 'alien_supreme_overlord', type: 'minion', owner: HOST_PLAYER_ID }],
                minionsPlayed: 0,
                minionLimit: 1,
            });
            return {
                ...state,
                core: {
                    ...core,
                    bases,
                    players,
                },
            };
        });

        // 等待手牌渲染
        await page.waitForSelector('[data-card-uid="overlord-1"]', { timeout: 5000 });

        // 点击至高霸主卡
        await page.click('[data-card-uid="overlord-1"]');

        // 点击基地打出随从
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.first().click();

        // 等待至高霸主能力触发的交互标题
        await page.waitForSelector('text=你可以将一个随从返回到其拥有者的手上', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：随从应该高亮（可点击）
        const minions = page.locator('[data-minion-uid]');
        const minionCount = await minions.count();
        expect(minionCount).toBeGreaterThan(0);

        // 点击第一个随从
        await minions.first().click();

        // 验证：随从应该被返回手牌（交互完成）
        await page.waitForTimeout(1000);
        const state = await getMatchState(matchId, page);
        const base0Minions = state.core.bases[0].minions;
        expect(base0Minions.length).toBeLessThan(2); // 至少有一个随从被返回
    });

    test('随从选择：外星人收集者 - 不弹窗，直接点击随从', async ({ smashupMatch }) => {
        const { hostPage: page, matchId } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有力量≤3的随从，玩家1手牌中有收集者
        await applySmashUpStatePatch(matchId, page, (state) => {
            const core = state.core ?? {};
            const bases = updateBase(core, 0, {
                minions: [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] }, // 力量2
                    { uid: 'minion-2', defId: 'pirate_first_mate', owner: '1', controller: '1', attachedActions: [] }, // 力量4
                ],
            });
            const players = updatePlayer(core, HOST_PLAYER_ID, {
                hand: [{ uid: 'collector-1', defId: 'alien_collector', type: 'minion', owner: HOST_PLAYER_ID }],
                minionsPlayed: 0,
                minionLimit: 1,
            });
            return {
                ...state,
                core: {
                    ...core,
                    bases,
                    players,
                },
            };
        });

        await page.waitForSelector('[data-card-uid="collector-1"]', { timeout: 5000 });

        // 点击收集者卡
        await page.click('[data-card-uid="collector-1"]');

        // 点击基地打出随从
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.first().click();

        // 等待收集者能力触发的交互标题
        await page.waitForSelector('text=你可以将这个基地的一个力量≤3的随从返回其拥有者的手上', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：只有力量≤3的随从高亮（可点击）
        // 这里我们通过点击第一个随从来验证交互工作正常
        const minions = page.locator('[data-minion-uid="minion-1"]');
        await minions.click();

        // 验证：随从应该被返回手牌
        await page.waitForTimeout(1000);
        const state = await getMatchState(matchId, page);
        const base0Minions = state.core.bases[0].minions;
        expect(base0Minions.some((m: any) => m.uid === 'minion-1')).toBe(false);
    });

    test('基地选择：外星人入侵（第二步）- 不弹窗，直接点击基地', async ({ smashupMatch }) => {
        const { hostPage: page, matchId } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有随从，玩家1手牌中有入侵卡
        await applySmashUpStatePatch(matchId, page, (state) => {
            const core = state.core ?? {};
            let bases = updateBase(core, 0, {
                minions: [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] },
                ],
            });
            bases = updateBase({ ...core, bases }, 1, { minions: [] });
            const players = updatePlayer(core, HOST_PLAYER_ID, {
                hand: [{ uid: 'invasion-1', defId: 'alien_invasion', type: 'action', owner: HOST_PLAYER_ID }],
                actionsPlayed: 0,
                actionLimit: 1,
            });
            return {
                ...state,
                core: {
                    ...core,
                    bases,
                    players,
                },
            };
        });

        await page.waitForSelector('[data-card-uid="invasion-1"]', { timeout: 5000 });

        // 点击入侵卡
        await page.click('[data-card-uid="invasion-1"]');

        // 等待第一步交互：选择要移动的随从
        await page.waitForSelector('text=选择要移动的随从', { timeout: 5000 });

        // 第一步应该不弹窗（随从选择）
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 点击随从
        const minions = page.locator('[data-minion-uid="minion-1"]');
        await minions.click();

        // 等待第二步交互：选择目标基地
        await page.waitForSelector('text=选择要移动到的基地', { timeout: 5000 });

        // 第二步也不应该弹窗（基地选择）
        await expect(promptOverlay).not.toBeVisible();

        // 点击第二个基地
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.nth(1).click();

        // 验证：随从应该被移动到第二个基地
        await page.waitForTimeout(1000);
        const state = await getMatchState(matchId, page);
        expect(state.core.bases[1].minions.some((m: any) => m.uid === 'minion-1')).toBe(true);
    });

    test('反馈复现：蒸汽朋克 + 魔法妖精在空基地局面下，随从/持续行动/泰坦都应能进入并完成打出链路', async ({ smashupMatch }) => {
        const { hostPage: page, matchId } = smashupMatch;

        await waitForTestHarness(page);

        await injectSteampunkTricksterPacketState(matchId, page);

        await page.click('[data-card-uid="c4"]');
        await page.click('[data-testid="base-zone-1"]');
        await expect.poll(async () => {
            const state = await getMatchState(matchId, page);
            return state.core.bases[1].minions.some((m: any) => m.uid === 'c4');
        }, { timeout: 5000 }).toBe(true);

        await injectSteampunkTricksterPacketState(matchId, page);

        await page.click('[data-card-uid="c12"]');
        await page.click('[data-testid="base-zone-0"]');
        await expect.poll(async () => {
            const state = await getMatchState(matchId, page);
            return state.core.bases[0].ongoingActions.some((card: any) => card.defId === 'steampunk_aggromotive_pod');
        }, { timeout: 5000 }).toBe(true);

        await injectSteampunkTricksterPacketState(matchId, page);

        await page.click('[data-testid="su-rail-titan-titan_0_tricksters_big_funny_giant"]');
        await page.click('[data-testid="base-zone-2"]');
        await expect.poll(async () => {
            const state = await getMatchState(matchId, page);
            const titan = state.core.titans.find((candidate: any) => candidate.uid === 'titan_0_tricksters_big_funny_giant');
            return titan?.location?.zone === 'base' && titan?.location?.baseIndex === 2;
        }, { timeout: 5000 }).toBe(true);
    });

    test('反馈复现（移动端横屏）："点击无反应"场景下，随从/持续行动/泰坦都应能完成点击打出', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        await clearEvidenceScreenshotsForTest(testInfo);
        const setup = await setupOnlineMatch(browser, baseURL, {
            contextOptions: {
                viewport: { width: 1280, height: 720 },
                isMobile: true,
                hasTouch: true,
            },
        });

        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage: page, guestPage, hostContext, guestContext, matchId } = setup;

        try {
            await completeFactionSelectionCustom(
                page,
                guestPage,
                [FACTION.PIRATES, FACTION.NINJAS],
                [FACTION.ALIENS, FACTION.ZOMBIES],
            );
            await waitForHandArea(page);
            await injectSteampunkTricksterPacketState(matchId, page);

            await page.locator('[data-card-uid="c4"]').tap();
            await page.locator('[data-testid="base-zone-1"]').tap();
            await expect.poll(async () => {
                const state = await getMatchState(matchId, page);
                return state.core.bases[1].minions.some((m: any) => m.uid === 'c4');
            }, { timeout: 5000 }).toBe(true);
            const minionShot = getEvidenceScreenshotPath(testInfo, 'mobile-minion-played', {
                filename: 'smashup-steampunks-tricksters-mobile-minion-played.png',
            });
            await page.screenshot({ path: minionShot, fullPage: false });

            await injectSteampunkTricksterPacketState(matchId, page);

            await page.locator('[data-card-uid="c12"]').tap();
            await page.locator('[data-testid="base-zone-0"]').tap();
            await expect.poll(async () => {
                const state = await getMatchState(matchId, page);
                return state.core.bases[0].ongoingActions.some((card: any) => card.defId === 'steampunk_aggromotive_pod');
            }, { timeout: 5000 }).toBe(true);
            const actionShot = getEvidenceScreenshotPath(testInfo, 'mobile-ongoing-played', {
                filename: 'smashup-steampunks-tricksters-mobile-ongoing-played.png',
            });
            await page.screenshot({ path: actionShot, fullPage: false });

            await injectSteampunkTricksterPacketState(matchId, page);

            await page.locator('[data-testid="su-rail-titan-titan_0_tricksters_big_funny_giant"]').tap();
            await page.locator('[data-testid="base-zone-2"]').tap();
            await expect.poll(async () => {
                const state = await getMatchState(matchId, page);
                const titan = state.core.titans.find((candidate: any) => candidate.uid === 'titan_0_tricksters_big_funny_giant');
                return titan?.location?.zone === 'base' && titan?.location?.baseIndex === 2;
            }, { timeout: 5000 }).toBe(true);
            const titanShot = getEvidenceScreenshotPath(testInfo, 'mobile-titan-played', {
                filename: 'smashup-steampunks-tricksters-mobile-titan-played.png',
            });
            await page.screenshot({ path: titanShot, fullPage: false });
        } finally {
            await cleanupTwoPlayerMatch({ hostPage: page, guestPage, hostContext, guestContext, matchId });
        }
    });

    test('POD 版米斯卡塔尼克大学：基地悬浮文案和放大预览都应跟随 POD 版本文本', async ({ smashupMatch }, testInfo) => {
        const { hostPage: page, matchId } = smashupMatch;
        await clearEvidenceScreenshotsForTest(testInfo);

        await waitForTestHarness(page);
        await injectMiskatonicPodBaseState(matchId, page);

        const baseZone = page.getByTestId('base-zone-0');
        await expect(baseZone).toBeVisible();
        await baseZone.hover();

        const podTextOnBoard = page.getByText(MISKATONIC_BASE_POD_TEXT, { exact: true });
        await expect(podTextOnBoard).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(MISKATONIC_BASE_LEGACY_TEXT, { exact: true })).toHaveCount(0);

        const boardShot = getEvidenceScreenshotPath(testInfo, 'miskatonic-pod-base-hover', {
            filename: 'smashup-miskatonic-pod-base-hover.png',
        });
        await page.screenshot({ path: boardShot, fullPage: false });

        const inspectButton = baseZone.locator('button.cursor-zoom-in').first();
        await expect(inspectButton).toBeVisible({ timeout: 5000 });
        await inspectButton.click({ force: true });

        const magnifyOverlay = page.getByTestId('su-card-magnify-overlay');
        const magnifyContent = page.getByTestId('su-card-magnify-content');
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await expect(magnifyContent).toHaveAttribute('data-card-type', 'base');
        await magnifyContent.hover();

        const podTextInMagnify = magnifyContent.getByText(MISKATONIC_BASE_POD_TEXT, { exact: true });
        await expect(podTextInMagnify).toBeVisible({ timeout: 5000 });
        await expect(magnifyContent.getByText(MISKATONIC_BASE_LEGACY_TEXT, { exact: true })).toHaveCount(0);

        const magnifyShot = getEvidenceScreenshotPath(testInfo, 'miskatonic-pod-base-magnify', {
            filename: 'smashup-miskatonic-pod-base-magnify.png',
        });
        await page.screenshot({ path: magnifyShot, fullPage: false });
    });
});
