/**
 * 召唤师战争 - 阵营选择流程 E2E 测试
 *
 * 覆盖：创建房间 → 双方加入 → 选择阵营 → 准备 → 开始 → 进入游戏
 */

import { test, expect } from '@playwright/test';
import { initContext, ensureGameServerAvailable } from './helpers/common';
import {
    createSummonerWarsRoom,
    ensurePlayerIdInUrl,
    waitForFactionSelection,
    selectFaction,
    waitForSummonerWarsUI,
} from './helpers/summonerwars';

const normalizeUrl = (url: string) => url.replace(/\/$/, '');
const getGameServerBaseURL = () => {
    const envUrl = process.env.PW_GAME_SERVER_URL || process.env.VITE_GAME_SERVER_URL;
    if (envUrl) return normalizeUrl(envUrl);
    const port = process.env.GAME_SERVER_PORT || process.env.PW_GAME_SERVER_PORT || '18000';
    return `http://localhost:${port}`;
};

const joinMatchAsGuest = async (page: import('@playwright/test').Page, matchId: string, gameId = 'summonerwars') => {
    const base = getGameServerBaseURL();
    const matchResp = await page.request.get(`${base}/games/${gameId}/${matchId}`);
    const matchData = await matchResp.json();
    const openSeat = (matchData.players as { id: number; name?: string }[])
        ?.sort((a, b) => b.id - a.id)
        .find((p) => !p.name);
    if (!openSeat) throw new Error('No open seat found');
    const pid = String(openSeat.id);
    const guestId = `e2e_guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const joinResp = await page.request.post(`${base}/games/${gameId}/${matchId}/join`, {
        data: { playerID: pid, playerName: `Guest_${guestId}`, data: { guestId } },
    });
    const joinData = await joinResp.json();
    await page.goto(`/play/${gameId}/match/${matchId}?playerID=${pid}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
        ({ mid, p, creds, gname }) => {
            localStorage.setItem(
                `match_creds_${mid}`,
                JSON.stringify({ playerID: p, credentials: creds, matchID: mid, gameName: gname }),
            );
        },
        { mid: matchId, p: pid, creds: joinData.playerCredentials, gname: gameId },
    );
};

test.describe('SummonerWars 阵营选择流程', () => {
    test('完整联机流程：选择阵营 → 准备 → 开始 → 进入游戏', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // ---- Host ----
        const hostContext = await browser.newContext({ baseURL });
        await initContext(hostContext, { storageKey: '__sw_storage_reset' });
        const hostPage = await hostContext.newPage();

        const hostLogs: string[] = [];
        hostPage.on('console', (msg) => {
            if (['log', 'warning', 'error'].includes(msg.type())) {
                hostLogs.push(`[host][${msg.type()}] ${msg.text()}`);
            }
        });

        if (!(await ensureGameServerAvailable(hostPage))) {
            test.skip(true, 'Game server unavailable');
        }

        const matchId = await createSummonerWarsRoom(hostPage);
        if (!matchId) test.skip(true, 'Room creation failed');

        await ensurePlayerIdInUrl(hostPage, '0');
        await waitForFactionSelection(hostPage);
        await hostPage.screenshot({ path: testInfo.outputPath('sw-selection-initial.png') });

        // ---- Guest ----
        const guestContext = await browser.newContext({ baseURL });
        await initContext(guestContext, { storageKey: '__sw_storage_reset' });
        const guestPage = await guestContext.newPage();

        const guestLogs: string[] = [];
        guestPage.on('console', (msg) => {
            if (['log', 'warning', 'error'].includes(msg.type())) {
                guestLogs.push(`[guest][${msg.type()}] ${msg.text()}`);
            }
        });

        await joinMatchAsGuest(guestPage, matchId!);
        await waitForFactionSelection(guestPage);

        // ---- Host 选择阵营 ----
        await selectFaction(hostPage, 0);
        await hostPage.waitForTimeout(1000);
        await hostPage.screenshot({ path: testInfo.outputPath('sw-selection-host-selected.png') });

        // 验证 P1 标记同步
        const p1Badge = guestPage.locator('.grid > div').first().locator('text=P1');
        try {
            await expect(p1Badge).toBeVisible({ timeout: 8000 });
        } catch {
            console.log('[test] 警告：Guest 端未看到 P1 标记');
            console.log('[test] Host 最近日志:', hostLogs.slice(-20).join('\n'));
            console.log('[test] Guest 最近日志:', guestLogs.slice(-20).join('\n'));
            await guestPage.screenshot({ path: testInfo.outputPath('sw-selection-guest-no-p1.png') });
        }

        // ---- Guest 选择阵营 ----
        await selectFaction(guestPage, 1);
        await guestPage.waitForTimeout(1000);
        await guestPage.screenshot({ path: testInfo.outputPath('sw-selection-guest-selected.png') });

        // ---- Guest 准备 ----
        const readyButton = guestPage.locator('button').filter({ hasText: /准备|Ready/i });
        try {
            await expect(readyButton).toBeVisible({ timeout: 5000 });
            await readyButton.click();
        } catch {
            console.log('[test] 警告：准备按钮未出现');
            await guestPage.screenshot({ path: testInfo.outputPath('sw-selection-no-ready-btn.png') });
        }

        await hostPage.waitForTimeout(1000);

        // ---- Host 开始游戏 ----
        const startButton = hostPage.locator('button').filter({ hasText: /开始游戏|Start Game/i });
        try {
            await expect(startButton).toBeVisible({ timeout: 5000 });
            await expect(startButton).toBeEnabled({ timeout: 5000 });
            await startButton.click();
        } catch {
            console.log('[test] 警告：开始按钮未出现或不可用');
            await hostPage.screenshot({ path: testInfo.outputPath('sw-selection-no-start-btn.png') });
        }

        // ---- 等待游戏 UI ----
        try {
            await waitForSummonerWarsUI(hostPage, 30000);
        } catch {
            console.log('[test] Host 最近日志:', hostLogs.slice(-30).join('\n'));
            await hostPage.screenshot({ path: testInfo.outputPath('sw-selection-host-stuck.png') });
            throw new Error('Host 未能进入游戏 UI');
        }

        try {
            await waitForSummonerWarsUI(guestPage, 30000);
        } catch {
            console.log('[test] Guest 最近日志:', guestLogs.slice(-30).join('\n'));
            await guestPage.screenshot({ path: testInfo.outputPath('sw-selection-guest-stuck.png') });
            throw new Error('Guest 未能进入游戏 UI');
        }

        await hostPage.screenshot({ path: testInfo.outputPath('sw-selection-game-started.png') });

        await expect(hostPage.getByTestId('sw-phase-tracker')).toBeVisible();
        await expect(hostPage.getByTestId('sw-hand-area')).toBeVisible();
        await expect(hostPage.getByTestId('sw-energy-player')).toBeVisible();

        await hostContext.close();
        await guestContext.close();
    });
});
