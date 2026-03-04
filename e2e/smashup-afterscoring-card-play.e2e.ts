import { test } from './fixtures';

/**
 * afterScoring 卡牌点击测试
 * 
 * 测试场景：
 * 1. 基地达到 breakpoint，触发计分
 * 2. afterScoring 窗口打开
 * 3. 验证 afterScoring 卡牌可以打出
 * 4. 验证 afterScoring 卡牌在 meFirst 窗口被禁用
 * 
 * 使用 smashupMatch fixture 创建在线对局，通过 TestHarness.state.patch 注入状态
 */

test.describe('SmashUp afterScoring Card Play', () => {
  test('should allow playing afterScoring card in afterScoring window', async ({ smashupMatch }, testInfo) => {
    test.setTimeout(180000);

    const { host } = smashupMatch;

    // 等待游戏开始
    await host.page.waitForSelector('[data-testid^="base-zone-"]', { timeout: 15000 });
    await host.page.waitForTimeout(2000);

    // 注入测试状态
    await host.page.evaluate(() => {
      const harness = (window as any).__BG_TEST_HARNESS__;
      
      harness.state.patch({
        'core.bases.0.breakpoint': 10,
        'core.bases.0.power': 10, // 达到 breakpoint，会触发计分
        'core.players.0.hand': [
          { uid: 'card-afterscoring-1', defId: 'robot_we_are_the_champions', type: 'action' }
        ],
        'core.bases.0.minions': [
          { uid: 'minion-1', defId: 'robot_microbot_alpha', owner: '0', controller: '0', power: 5, attachedActions: [] },
          { uid: 'minion-2', defId: 'wizard_archmage', owner: '1', controller: '1', power: 5, attachedActions: [] }
        ],
        'core.currentPlayer': '0',
        'core.phase': 'playCards',
      });
    });

    await host.page.waitForTimeout(2000);

    // P0 结束回合，触发计分
    await host.page.click('button:has-text("结束回合")');
    await host.page.waitForTimeout(3000);

    // 等待计分完成，afterScoring 窗口应该打开
    await host.page.waitForSelector('text=/计分后响应/', { timeout: 10000 });
    await host.page.waitForTimeout(1000);

    // 截图：afterScoring 窗口打开
    await host.page.screenshot({ 
      path: testInfo.outputPath('01-afterscoring-window-opened.png'), 
      fullPage: true 
    });

    // 检查"我们乃最强"卡牌是否可点击
    const cardElement = host.page.locator('[data-card-uid="card-afterscoring-1"]').first();
    await cardElement.waitFor({ state: 'visible', timeout: 5000 });

    // 检查卡牌是否没有 disabled 样式
    const isDisabled = await cardElement.evaluate((el) => {
      return el.classList.contains('opacity-50') || el.classList.contains('cursor-not-allowed');
    });
    if (isDisabled) {
      throw new Error('afterScoring card should NOT be disabled in afterScoring window');
    }

    // 点击"我们乃最强"卡牌
    console.log('[TEST] Clicking afterScoring card');
    await cardElement.click();
    await host.page.waitForTimeout(2000);

    // 截图：点击后
    await host.page.screenshot({ 
      path: testInfo.outputPath('02-afterscoring-card-clicked.png'), 
      fullPage: true 
    });

    // 验证卡牌已从手牌移除（打出成功）
    const cardStillInHand = await host.page.locator('[data-card-uid="card-afterscoring-1"]').count();
    if (cardStillInHand > 0) {
      throw new Error('afterScoring card should be removed from hand after playing');
    }

    // 验证 ActionLog 中有打出记录
    const actionLog = await host.page.locator('[data-testid="action-log"]').textContent();
    if (!actionLog?.includes('我们乃最强')) {
      throw new Error('ActionLog should contain "我们乃最强"');
    }

    // 截图：最终状态
    await host.page.screenshot({ 
      path: testInfo.outputPath('03-afterscoring-card-played.png'), 
      fullPage: true 
    });

    console.log('[TEST] afterScoring card play test completed successfully');
  });

  test('should NOT allow playing afterScoring card in meFirst window', async ({ smashupMatch }, testInfo) => {
    test.setTimeout(180000);

    const { host } = smashupMatch;

    // 等待游戏开始
    await host.page.waitForSelector('[data-testid^="base-zone-"]', { timeout: 15000 });
    await host.page.waitForTimeout(2000);

    // 注入测试状态：P0 手牌有两种卡
    await host.page.evaluate(() => {
      const harness = (window as any).__BG_TEST_HARNESS__;
      
      harness.state.patch({
        'core.bases.0.breakpoint': 10,
        'core.bases.0.power': 10,
        'core.players.0.hand': [
          { uid: 'card-afterscoring-1', defId: 'robot_we_are_the_champions', type: 'action' },
          { uid: 'card-beforescoring-1', defId: 'giant_ant_under_pressure', type: 'action' }
        ],
        'core.bases.0.minions': [
          { uid: 'minion-1', defId: 'robot_microbot_alpha', owner: '0', controller: '0', power: 5, attachedActions: [] },
          { uid: 'minion-2', defId: 'wizard_archmage', owner: '1', controller: '1', power: 5, attachedActions: [] }
        ],
        'core.currentPlayer': '0',
        'core.phase': 'playCards',
      });
    });

    await host.page.waitForTimeout(2000);

    // P0 结束回合，触发计分前窗口（Me First!）
    await host.page.click('button:has-text("结束回合")');
    await host.page.waitForTimeout(3000);

    // 等待 Me First! 窗口打开
    await host.page.waitForSelector('text=/Me First!/', { timeout: 10000 });
    await host.page.waitForTimeout(1000);

    // 截图：Me First! 窗口打开
    await host.page.screenshot({ 
      path: testInfo.outputPath('01-mefirst-window-opened.png'), 
      fullPage: true 
    });

    // 检查"我们乃最强"（afterScoring）卡牌应该是禁用的
    const afterScoringCard = host.page.locator('[data-card-uid="card-afterscoring-1"]').first();
    const isAfterScoringDisabled = await afterScoringCard.evaluate((el) => {
      return el.classList.contains('opacity-50') || el.classList.contains('cursor-not-allowed');
    });
    if (!isAfterScoringDisabled) {
      throw new Error('afterScoring card should be disabled in meFirst window');
    }

    // 检查"承受压力"（beforeScoring）卡牌应该是可用的
    const beforeScoringCard = host.page.locator('[data-card-uid="card-beforescoring-1"]').first();
    const isBeforeScoringDisabled = await beforeScoringCard.evaluate((el) => {
      return el.classList.contains('opacity-50') || el.classList.contains('cursor-not-allowed');
    });
    if (isBeforeScoringDisabled) {
      throw new Error('beforeScoring card should NOT be disabled in meFirst window');
    }

    // 尝试点击"我们乃最强"（应该无效）
    console.log('[TEST] Clicking afterScoring card in meFirst window (should be denied)');
    await afterScoringCard.click();
    await host.page.waitForTimeout(1000);

    // 验证卡牌仍在手牌中（未打出）
    const cardStillInHand = await host.page.locator('[data-card-uid="card-afterscoring-1"]').count();
    if (cardStillInHand === 0) {
      throw new Error('afterScoring card should still be in hand (not played)');
    }

    // 截图：点击后（卡牌应该仍在手牌）
    await host.page.screenshot({ 
      path: testInfo.outputPath('02-afterscoring-card-denied-in-mefirst.png'), 
      fullPage: true 
    });

    console.log('[TEST] afterScoring card correctly denied in meFirst window');
  });
});
