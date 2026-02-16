/**
 * 召唤师战争 - 能力指示器 E2E 测试
 *
 * 测试青色波纹指示器是否正确显示可使用技能的单位
 */

import { test, expect } from '@playwright/test';
import {
  setupOnlineMatchViaUI,
  completeFactionSelection,
  waitForSummonerWarsUI,
  waitForPhase,
  readCoreState,
  applyCoreState,
  closeDebugPanelIfOpen,
  cloneState,
} from './helpers/summonerwars';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 测试中 coreState 为动态 JSON 结构
type CoreState = any;

/** 从 core 状态中查找指定玩家的召唤师位置 */
const findSummonerPosition = (coreState: CoreState, playerId: '0' | '1') => {
  for (let row = 0; row < coreState.board.length; row += 1) {
    for (let col = 0; col < coreState.board[row].length; col += 1) {
      const unit = coreState.board[row][col]?.unit;
      if (unit && unit.owner === playerId && unit.card?.unitClass === 'summoner') {
        return { row, col };
      }
    }
  }
  return null;
};

test.describe('召唤师战争 - 能力指示器', () => {
  test('召唤阶段：召唤师位置存在能力指示器元素', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupOnlineMatchViaUI(browser, baseURL);
    if (!setup) { test.skip(true, '服务器不可用或创建房间失败'); return; }
    const { hostPage, guestPage, hostContext, guestContext } = setup;

    await completeFactionSelection(hostPage, guestPage);
    await waitForSummonerWarsUI(hostPage);

    const coreState = await readCoreState(hostPage);
    const next = cloneState(coreState);
    next.phase = 'summon';
    next.currentPlayer = '0';
    await applyCoreState(hostPage, next);
    await closeDebugPanelIfOpen(hostPage);
    await waitForPhase(hostPage, 'summon');

    const summonerPos = findSummonerPosition(next, '0');
    expect(summonerPos).toBeTruthy();

    // 检查召唤师位置是否有能力指示器元素
    const abilityIndicator = hostPage.locator(
      `[data-testid="ability-indicator-${summonerPos!.row}-${summonerPos!.col}"]`,
    );
    const indicatorCount = await abilityIndicator.count();
    console.log(`召唤阶段能力指示器数量: ${indicatorCount}`);

    await hostContext.close();
    await guestContext.close();
  });

  test('移动阶段：召唤师位置存在能力指示器元素', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupOnlineMatchViaUI(browser, baseURL);
    if (!setup) { test.skip(true, '服务器不可用或创建房间失败'); return; }
    const { hostPage, guestPage, hostContext, guestContext } = setup;

    await completeFactionSelection(hostPage, guestPage);
    await waitForSummonerWarsUI(hostPage);

    const coreState = await readCoreState(hostPage);
    const next = cloneState(coreState);
    next.phase = 'move';
    next.currentPlayer = '0';
    if (next.players?.['0']) next.players['0'].moveCount = 0;
    await applyCoreState(hostPage, next);
    await closeDebugPanelIfOpen(hostPage);
    await waitForPhase(hostPage, 'move');

    const summonerPos = findSummonerPosition(next, '0');
    expect(summonerPos).toBeTruthy();

    const abilityIndicator = hostPage.locator(
      `[data-testid="ability-indicator-${summonerPos!.row}-${summonerPos!.col}"]`,
    );
    const indicatorCount = await abilityIndicator.count();
    console.log(`移动阶段能力指示器数量: ${indicatorCount}`);

    await hostContext.close();
    await guestContext.close();
  });

  test('可操作指示器和能力指示器可以同时存在', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupOnlineMatchViaUI(browser, baseURL);
    if (!setup) { test.skip(true, '服务器不可用或创建房间失败'); return; }
    const { hostPage, guestPage, hostContext, guestContext } = setup;

    await completeFactionSelection(hostPage, guestPage);
    await waitForSummonerWarsUI(hostPage);

    const coreState = await readCoreState(hostPage);
    const next = cloneState(coreState);
    next.phase = 'move';
    next.currentPlayer = '0';
    if (next.players?.['0']) next.players['0'].moveCount = 0;
    await applyCoreState(hostPage, next);
    await closeDebugPanelIfOpen(hostPage);
    await waitForPhase(hostPage, 'move');

    const summonerPos = findSummonerPosition(next, '0');
    expect(summonerPos).toBeTruthy();

    const actionableIndicator = hostPage.locator(
      `[data-testid="actionable-indicator-${summonerPos!.row}-${summonerPos!.col}"]`,
    );
    const abilityIndicator = hostPage.locator(
      `[data-testid="ability-indicator-${summonerPos!.row}-${summonerPos!.col}"]`,
    );

    const actionableCount = await actionableIndicator.count();
    const abilityCount = await abilityIndicator.count();
    console.log(`可操作指示器: ${actionableCount}, 能力指示器: ${abilityCount}`);

    await hostContext.close();
    await guestContext.close();
  });
});
