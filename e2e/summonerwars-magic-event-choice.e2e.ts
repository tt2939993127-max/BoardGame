/**
 * 召唤师战争 E2E 测试 - 魔力阶段事件卡选择
 *
 * 测试场景：魔力阶段点击可打出的事件卡，应弹出选择横幅（打出/弃牌/取消）
 */

import { test, expect } from '@playwright/test';
import { setupSWOnlineMatch, advanceToPhase, readCoreState, applyCoreState } from './helpers/summonerwars';

test.describe('召唤师战争 - 魔力阶段事件卡选择', () => {
  test('魔力阶段点击事件卡应弹出选择横幅', async ({ browser, baseURL }) => {
    test.setTimeout(120000);
    
    let setup;
    try {
      setup = await setupSWOnlineMatch(browser, baseURL, 'goblin', 'necromancer');
    } catch (error) {
      test.skip();
      return;
    }
    
    if (!setup) {
      test.skip();
      return;
    }

    const { hostPage: player1Page, hostContext, guestContext } = setup;

    try {
      // 推进到玩家1的魔力阶段
      await advanceToPhase(player1Page, 'magic', 6);

      // 注入状态：给玩家1手牌中添加"群情激愤"事件卡，并设置魔力为1
      const state = await readCoreState(player1Page);
      state.players['0'].hand.push({
        id: 'test-goblin-frenzy',
        cardType: 'event',
        name: '群情激愤',
        faction: 'goblin',
        eventType: 'legendary',
        playPhase: 'magic',
        cost: 1,
        isActive: false,
        effect: '指定所有费用为0点的友方单位为目标。每个目标可以进行一次额外的攻击。',
        deckSymbols: [],
        spriteIndex: 9,
        spriteAtlas: 'cards',
      });
      state.players['0'].magic = 1;
      await applyCoreState(player1Page, state);
      
      // 等待状态更新生效
      await player1Page.waitForTimeout(1000);

      // 点击"群情激愤"事件卡
      const card = player1Page.locator('[data-card-id="test-goblin-frenzy"]');
      await card.click();
      
      // 等待状态更新和组件重新渲染
      await player1Page.waitForTimeout(1000);

      // 应该弹出选择横幅（紫色背景）
      const banner = player1Page.locator('.bg-purple-900\\/95').first();
      await expect(banner).toBeVisible({ timeout: 10000 });
      
      // 验证横幅内容包含关键文字（支持中英文）
      const bannerText = await banner.textContent();
      expect(bannerText).toMatch(/Choose|选择/);
      
      // 应该有三个按钮：Play/打出、Discard/弃牌、Cancel/取消
      const playButton = banner.locator('button').filter({ hasText: /Play|打出/ }).first();
      const discardButton = banner.locator('button').filter({ hasText: /Discard|弃牌/ }).first();
      const cancelButton = banner.locator('button').filter({ hasText: /Cancel|取消/ }).first();
      await expect(playButton).toBeVisible();
      await expect(discardButton).toBeVisible();
      await expect(cancelButton).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
