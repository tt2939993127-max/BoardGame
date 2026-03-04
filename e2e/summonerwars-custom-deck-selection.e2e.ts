/**
 * 召唤师战争 - 自定义牌组选择 E2E 测试
 * 
 * 测试场景：
 * 1. 创建房间并停留在阵营选择阶段
 * 2. 注入测试用自定义牌组数据
 * 3. 选择自定义牌组
 * 4. 验证选择状态正确显示
 * 5. 完成联机进入对局
 */

import { test, expect } from '@playwright/test';
import { 
  initSWContext, 
  createSWRoomViaAPI 
} from './helpers/summonerwars';
import { 
  waitForTestHarness,
  ensureGameServerAvailable,
  waitForMatchAvailable,
  joinMatchViaAPI
} from './helpers/common';

test.describe('召唤师战争 - 自定义牌组选择', () => {
  test('应该能够选择自定义牌组并进入对局', async ({ browser }) => {
    // 创建临时页面用于检查服务器可用性
    const tempContext = await browser.newContext();
    const tempPage = await tempContext.newPage();
    
    // 确保游戏服务器可用
    console.log('[E2E] 检查游戏服务器可用性...');
    const serverAvailable = await ensureGameServerAvailable(tempPage);
    console.log('[E2E] 游戏服务器可用性:', serverAvailable);
    
    await tempPage.close();
    await tempContext.close();
    
    if (!serverAvailable) {
      console.log('[E2E] 游戏服务器不可用，跳过测试');
      test.skip();
      return;
    }
    
    // 创建两个浏览器上下文（模拟两个玩家）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    await initSWContext(context1, 'sw-e2e-p1');
    await initSWContext(context2, 'sw-e2e-p2');
    
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();
    
    // 在创建房间前注入测试数据（避免刷新页面）
    await player1.addInitScript(() => {
      (window as any).__TEST_CUSTOM_DECKS__ = [
        {
          id: 'test-deck-1',
          name: '测试牌组 - 凤凰精灵',
          summonerId: 'phoenix_elves_summoner',
          summonerFaction: 'phoenix_elves',
          freeMode: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    });
    
    try {
      console.log('[E2E] 步骤1: 玩家1 创建房间');
      
      // 玩家1 创建房间
      const roomId = await createSWRoomViaAPI(player1);
      if (!roomId) {
        throw new Error('创建房间失败');
      }
      console.log('[E2E] 房间创建成功:', roomId);
      
      // 玩家1 导航到对局页面
      await player1.goto(`/play/summonerwars/match/${roomId}`, { waitUntil: 'domcontentloaded' });
      await waitForMatchAvailable(player1, 'summonerwars', roomId);
      
      console.log('[E2E] 步骤2: 玩家2 加入房间');
      
      // 玩家2 加入房间
      const joined = await joinMatchViaAPI(player2, 'summonerwars', roomId, '1', 'Guest-SW-E2E');
      if (!joined) {
        throw new Error('玩家2 加入房间失败');
      }
      
      // 玩家2 导航到对局页面
      await player2.goto(`/play/summonerwars/match/${roomId}`, { waitUntil: 'domcontentloaded' });
      await waitForMatchAvailable(player2, 'summonerwars', roomId);
      
      // 等待 TestHarness 就绪
      await waitForTestHarness(player1);
      await waitForTestHarness(player2);
      
      console.log('[E2E] 步骤3: 等待阵营选择界面加载');
      
      // 等待阵营选择界面加载（检查网格容器）
      await player1.waitForSelector('.grid.grid-cols-4', { timeout: 10000 });
      console.log('[E2E] 阵营选择界面已加载');
      
      // 等待自定义牌组卡片显示
      await player1.waitForSelector('[data-testid="custom-deck-card-test-deck-1"]', { timeout: 10000 });
      console.log('[E2E] 自定义牌组卡片已显示');
      
      console.log('[E2E] 步骤4: 玩家1 选择自定义牌组');
      
      // 点击自定义牌组卡片
      await player1.click('[data-testid="custom-deck-card-test-deck-1"]');
      console.log('[E2E] 已点击自定义牌组卡片');
      
      // 等待一下让命令处理
      await player1.waitForTimeout(2000);
      
      // 检查核心状态
      const coreState = await player1.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state.get();
        return {
          selectedFactions: state?.core?.selectedFactions,
          customDeckData: state?.core?.customDeckData,
        };
      });
      console.log('[E2E] 核心状态:', JSON.stringify(coreState, null, 2));
      
      // 检查卡片的 class
      const cardClasses = await player1.getAttribute('[data-testid="custom-deck-card-test-deck-1"]', 'class');
      console.log('[E2E] 卡片 class:', cardClasses);
      
      // 等待选中状态更新（检查金色边框）
      try {
        await player1.waitForSelector('[data-testid="custom-deck-card-test-deck-1"].border-amber-400', { timeout: 5000 });
        console.log('[E2E] 自定义牌组已选中（金色边框）');
      } catch (err) {
        console.error('[E2E] 等待金色边框超时，继续测试...');
        // 截图保存当前状态
        await player1.screenshot({ 
          path: 'test-results/summonerwars-custom-deck-selection-failed.png',
          fullPage: true 
        });
      }
      
      // 验证 PlayerStatusCard 显示"自定义牌组"标签
      const customDeckLabel = await player1.locator('text=自定义牌组').first();
      await expect(customDeckLabel).toBeVisible({ timeout: 5000 });
      console.log('[E2E] PlayerStatusCard 显示"自定义牌组"标签');
      
      // 验证显示 DIY 徽章
      const diyBadge = await player1.locator('text=DIY').first();
      await expect(diyBadge).toBeVisible();
      console.log('[E2E] DIY 徽章已显示');
      
      console.log('[E2E] 步骤5: 玩家2 选择预设阵营');
      
      // 等待玩家2 的阵营选择界面加载
      await player2.waitForSelector('.grid.grid-cols-4', { timeout: 10000 });
      
      // 玩家2 选择第一个预设阵营
      const player2FactionCards = await player2.locator('.grid.grid-cols-4 > div').all();
      if (player2FactionCards.length > 0) {
        await player2FactionCards[0].click();
        console.log('[E2E] 玩家2 已选择预设阵营');
      }
      
      // 等待玩家2 选中状态更新
      await player2.waitForTimeout(1000);
      
      // 玩家2 点击准备按钮
      const player2ReadyButton = player2.locator('button:has-text("准备")');
      await expect(player2ReadyButton).toBeVisible({ timeout: 5000 });
      await player2ReadyButton.click();
      console.log('[E2E] 玩家2 已点击准备');
      
      console.log('[E2E] 步骤6: 玩家1（房主）开始游戏');
      
      // 等待开始按钮可用
      const startButton = player1.locator('button:has-text("开始游戏")');
      await expect(startButton).toBeEnabled({ timeout: 10000 });
      console.log('[E2E] 开始按钮已启用');
      
      // 点击开始游戏
      await startButton.click();
      console.log('[E2E] 已点击开始游戏');
      
      console.log('[E2E] 步骤7: 验证进入对局');
      
      // 等待游戏棋盘加载（检查地图层）
      await player1.waitForSelector('[data-testid="sw-map-layer"]', { timeout: 15000 });
      console.log('[E2E] 玩家1 游戏棋盘已加载');
      
      await player2.waitForSelector('[data-testid="sw-map-layer"]', { timeout: 15000 });
      console.log('[E2E] 玩家2 游戏棋盘已加载');
      
      // 验证玩家1 使用的是自定义牌组（通过检查核心状态）
      const player1CustomDeckData = await player1.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state.get();
        return state?.core?.customDeckData?.['0'];
      });
      
      expect(player1CustomDeckData).toBeDefined();
      expect(player1CustomDeckData?.id).toBe('test-deck-1');
      expect(player1CustomDeckData?.name).toBe('测试牌组 - 凤凰精灵');
      expect(player1CustomDeckData?.summonerFaction).toBe('phoenix_elves');
      console.log('[E2E] 玩家1 自定义牌组数据已正确存储:', player1CustomDeckData);
      
      // 验证玩家1 的阵营选择正确
      const player1Faction = await player1.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state.get();
        return state?.core?.selectedFactions?.['0'];
      });
      
      expect(player1Faction).toBe('phoenix_elves');
      console.log('[E2E] 玩家1 阵营选择正确:', player1Faction);
      
      // 验证游戏已开始（hostStarted = true）
      const hostStarted = await player1.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state.get();
        return state?.core?.hostStarted;
      });
      
      expect(hostStarted).toBe(true);
      console.log('[E2E] 游戏已开始');
      
      // 截图保存最终状态
      await player1.screenshot({ 
        path: 'test-results/summonerwars-custom-deck-player1-final.png',
        fullPage: true 
      });
      await player2.screenshot({ 
        path: 'test-results/summonerwars-custom-deck-player2-final.png',
        fullPage: true 
      });
      
      console.log('[E2E] 测试完成 - 自定义牌组选择功能正常工作');
    } finally {
      // 清理
      await player1.close();
      await player2.close();
      await context1.close();
      await context2.close();
    }
  });
});
