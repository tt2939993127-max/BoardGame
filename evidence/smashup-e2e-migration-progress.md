# 大杀四方 E2E 测试迁移进度

## 总体进度

- **开始日期**：2026-03-10
- **目标完成日期**：2026-04-14（5 周）
- **当前进度**：5/73（7%）

## 已完成（5 个）✅

### 纯三板斧测试
1. ✅ `smashup-4p-layout-test.e2e.ts` - 4 人布局测试
2. ✅ `smashup-alien-terraform.e2e.ts` - 外星人地形改造
3. ✅ `smashup-crop-circles.e2e.ts` - 麦田怪圈
4. ✅ `smashup-ghost-haunted-house-discard.e2e.ts` - 幽灵鬼屋弃牌
5. ✅ `smashup-refresh-base.e2e.ts` - 刷新基地

## 第一优先级：核心交互测试（0/8）

### 待迁移
- [ ] `smashup-ninja-infiltrate.e2e.ts` - 忍者渗透能力
- [ ] `smashup-wizard-portal.e2e.ts` - 法师传送门
- [ ] `smashup-multi-base-scoring-complete.e2e.ts` - 多基地计分（完整）
- [ ] `smashup-multi-base-scoring-simple.e2e.ts` - 多基地计分（简单）
- [ ] `smashup-pirate-cove-scoring-bug.e2e.ts` - 海盗湾计分 bug
- [ ] `smashup-innsmouth-locals-reveal.e2e.ts` - 印斯茅斯本地人展示
- [ ] `smashup-base-minion-selection.e2e.ts` - 基地随从选择
- [ ] `smashup-afterscoring-simple-complete.e2e.ts` - afterScoring 简单完整

## 第二优先级：半迁移测试（0/7）

### 待清理
- [ ] `smashup-robot-hoverbot-chain.e2e.ts` - 机器人悬浮机器人链
- [ ] `smashup-zombie-lord.e2e.ts` - 僵尸领主
- [ ] `smashup-complex-multi-base-scoring.e2e.ts` - 复杂多基地计分
- [ ] `smashup-phase-transition-simple.e2e.ts` - 阶段转换简单
- [ ] `smashup-response-window-pass-test.e2e.ts` - 响应窗口跳过测试
- [ ] `smashup-robot-hoverbot-new.e2e.ts` - 机器人悬浮机器人新

## 第三优先级：旧 Fixture 测试（0/18）

### 待迁移
- [ ] （待统计具体文件列表）

## 第四优先级：直接操作 TestHarness 的测试（0/22）

### 待迁移
- [ ] （待统计具体文件列表）

## 每日进度

### 2026-03-10（今天）
- ✅ 完成状态注入服务端同步功能
- ✅ 创建迁移计划文档
- ✅ 创建进度追踪文档
- 📋 下一步：开始迁移第一优先级测试

## 遇到的问题和解决方案

### 问题 1：状态持久化误解
- **问题**：误以为需要测试"刷新后状态保持"
- **解决**：明确 TestHarness 是临时工具，不需要刷新后保持
- **结果**：删除错误的测试，更新文档

## 迁移模板

```typescript
import { test } from './framework';

test('测试名', async ({ page, game }, testInfo) => {
  test.setTimeout(60000);
  
  await page.goto('/play/smashup');
  
  await page.waitForFunction(
    () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered(),
    { timeout: 15000 }
  );
  
  await game.setupScene({
    gameId: 'smashup',
    // ... 场景配置
  });
  
  await page.waitForTimeout(2000);
  
  // 测试逻辑
  
  await game.screenshot('test-result', testInfo);
});
```

## 下一步行动

1. **立即开始**：迁移 `smashup-ninja-infiltrate.e2e.ts`
2. **今天目标**：完成 2 个核心交互测试
3. **本周目标**：完成所有 8 个核心交互测试
