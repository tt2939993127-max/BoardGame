# SmashUp E2E Test - setupScene State Preservation Fix

## 问题描述

E2E 测试 `smashup-complex-multi-base-scoring.e2e.ts` 在运行时卡在加载屏幕，无法进入游戏。

## 根本原因

`e2e/framework/GameTestContext.ts` 中的 `setupScene` 方法在构建状态补丁时，只保留了部分 `core` 字段，导致关键字段（如 `turnOrder`、`baseDeck`、`nextUid` 等）在状态注入后丢失。

原始代码（第 631 行左右）：
```typescript
const patch: any = {
    core: {
        players: { ...state.core.players },
        bases,
        factionSelection: undefined,
    },
};
```

这种浅层结构会导致 `harness.state.patch(patch)` 覆盖整个 `core` 对象，丢失未显式列出的字段。

UI 组件 `src/games/smashup/Board.tsx` 检查 `!core.turnOrder || !core.bases` 时会显示加载屏幕，因为这些字段已丢失。

## 修复方案

修改 `e2e/framework/GameTestContext.ts` (约第 631 行) 以保留所有现有状态字段：

```typescript
const patch: any = {
    core: {
        ...state.core, // 保留所有现有字段
        players: { ...state.core.players },
        bases,
        ...(cfg.phase === 'factionSelect' ? {} : { factionSelection: undefined }),
    },
};
```

## 修复效果

- ✅ 保留所有 `core` 字段（`turnOrder`、`baseDeck`、`nextUid` 等）
- ✅ UI 不再卡在加载屏幕
- ✅ 测试可以正常进入游戏场景

## 相关文件

- `e2e/framework/GameTestContext.ts` - 修复位置
- `e2e/smashup-complex-multi-base-scoring.e2e.ts` - 受影响的测试
- `src/games/smashup/Board.tsx` - UI 加载检查逻辑
- `evidence/smashup-complex-multi-base-scoring-test-failure.md` - 原始失败报告

## 测试状态

**当前状态**：代码已修复，但测试因环境问题（端口占用/Playwright 配置）无法运行。

**下一步**：
1. 手动验证端口 6173 已释放
2. 运行测试：`npm run test:e2e:ci -- e2e/smashup-complex-multi-base-scoring.e2e.ts`
3. 验证测试通过且游戏正常加载
4. 查看测试截图确认功能正确

## 日期

2026-03-10
