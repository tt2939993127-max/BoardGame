# 测试迁移指南

> 如何将现有 E2E 测试迁移到使用 TestHarness 测试工具

## 📋 概述

TestHarness 是项目提供的统一测试工具集，用于控制游戏状态、骰子投掷、随机数等，确保 E2E 测试稳定可靠。

### 为什么需要迁移

**之前的问题**：
- ❌ 依赖随机骰子，测试不稳定（如雷霆万钧测试成功率仅 0.46%）
- ❌ 通过调试面板修改状态，依赖 WebSocket 同步，可能有延迟
- ❌ 每个游戏需要单独实现测试工具，代码重复

**迁移后的收益**：
- ✅ 精确控制骰子值，测试成功率 100%
- ✅ 直接调用 setState，立即生效，无延迟
- ✅ 统一的测试工具，所有游戏自动继承
- ✅ 代码更简洁，易于维护

## 🎯 迁移优先级

### 高优先级（必须迁移）
- 依赖随机骰子的测试
- 有条件跳过逻辑的测试（`test.skip()`）
- 经常失败的测试

### 中优先级（建议迁移）
- 使用 `readCoreState`/`applyCoreState` 的测试
- 需要快速构造测试场景的测试

### 低优先级（可选迁移）
- 已经稳定的测试
- 不依赖随机性的测试

## 🔄 迁移模式

### 模式 1：骰子注入

**适用场景**：测试依赖特定骰子结果的技能/机制

**之前**：
```typescript
// ❌ 依赖随机骰子，测试不稳定
const diceValues = stateAfterConfirm.dice?.map((d: any) => d.value) || [];
const palmCount = diceValues.filter((v: number) => v === 3).length;

if (palmCount < 3) {
    test.skip(true, '骰子中没有3个掌面，无法触发雷霆万钧技能');
    return;
}
```

**现在**：
```typescript
// ✅ 精确控制骰子值，测试稳定可靠
import { waitForTestHarness } from './helpers/common';

// 等待测试工具就绪
await waitForTestHarness(hostPage);

// 注入骰子值：3个掌面（值为3）+ 2个拳头（值为1）
await hostPage.evaluate(() => {
    window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3, 1, 1]);
});
console.log('[Test] 已注入骰子值: [3,3,3,1,1]（3个掌面）');

// 执行掷骰操作
await hostPage.click('[data-tutorial-id="dice-roll-button"]');
await hostPage.waitForTimeout(2500);
await hostPage.click('button:has-text("确认")');

// 验证骰子值
const state = await hostPage.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.state.get();
});
const diceValues = state.core.dice?.map((d: any) => d.value) || [];
const palmCount = diceValues.filter((v: number) => v === 3).length;
expect(palmCount).toBeGreaterThanOrEqual(3);
console.log('[Test] ✅ 骰子验证通过：有', palmCount, '个掌面');
```

**关键变更**：
1. 添加 `import { waitForTestHarness } from './helpers/common'`
2. 在测试开始时调用 `await waitForTestHarness(page)`
3. 使用 `window.__BG_TEST_HARNESS__!.dice.setValues([...])` 注入骰子值
4. 移除条件跳过逻辑（`test.skip()`）
5. 使用 `expect()` 断言验证结果

### 模式 2：状态访问

**适用场景**：读取游戏状态进行验证

**之前**：
```typescript
// ❌ 使用辅助函数
import { readCoreState } from './helpers/dicethrone';

const state = await readCoreState(hostPage);
console.log('[Test] 当前 HP:', state.players['0'].resources.hp);
```

**现在**：
```typescript
// ✅ 使用 TestHarness
import { waitForTestHarness } from './helpers/common';

await waitForTestHarness(hostPage);

const state = await hostPage.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.state.get();
});
console.log('[Test] 当前 HP:', state.core.players['0'].resources.hp);
```

**关键变更**：
1. 移除 `import { readCoreState } from './helpers/xxx'`
2. 添加 `import { waitForTestHarness } from './helpers/common'`
3. 使用 `window.__BG_TEST_HARNESS__!.state.get()` 获取状态
4. 注意状态路径变化：`state.core.players['0']` 而不是 `state.players['0']`

### 模式 3：状态修改

**适用场景**：快速构造测试场景

**之前**：
```typescript
// ❌ 完全替换状态
import { readCoreState, applyCoreStateDirect } from './helpers/dicethrone';

const initialState = await readCoreState(hostPage);
const modifiedState = { ...initialState };
modifiedState.players['0'].tokens = {
    ...modifiedState.players['0'].tokens,
    taiji: 2,
};
await applyCoreStateDirect(hostPage, modifiedState);
```

**现在**：
```typescript
// ✅ 部分更新（深度合并）
import { waitForTestHarness } from './helpers/common';

await waitForTestHarness(hostPage);

await hostPage.evaluate(() => {
    window.__BG_TEST_HARNESS__!.state.patch({
        core: {
            players: {
                '0': {
                    tokens: { taiji: 2 }
                }
            }
        }
    });
});
console.log('[Test] 已设置玩家0有2个太极标记');

// 等待状态更新
await hostPage.waitForTimeout(500);
```

**关键变更**：
1. 移除 `import { readCoreState, applyCoreStateDirect } from './helpers/xxx'`
2. 添加 `import { waitForTestHarness } from './helpers/common'`
3. 使用 `window.__BG_TEST_HARNESS__!.state.patch({...})` 部分更新状态
4. 状态修改后等待 500ms 让 React 重新渲染

### 模式 4：移除条件跳过

**适用场景**：测试依赖随机结果，之前会条件跳过

**之前**：
```typescript
// ❌ 条件跳过
if (palmCount < 3) {
    test.skip(true, '骰子中没有3个掌面，无法触发雷霆万钧技能');
    return;
}
```

**现在**：
```typescript
// ✅ 断言验证
expect(palmCount).toBeGreaterThanOrEqual(3);
```

**关键变更**：
1. 移除 `test.skip()` 调用
2. 使用 `expect()` 断言验证结果
3. 测试总是运行，不再跳过

## 📝 迁移步骤

### 步骤 1：识别需要迁移的测试

扫描测试文件，查找以下特征：
- 使用 `readCoreState`/`applyCoreState`/`applyCoreStateDirect`
- 有 `test.skip()` 条件跳过
- 依赖随机骰子结果
- 经常失败的测试

### 步骤 2：更新 import 语句

```typescript
// 移除旧的 import
// import { readCoreState, applyCoreStateDirect } from './helpers/dicethrone';

// 添加新的 import
import { waitForTestHarness } from './helpers/common';
```

### 步骤 3：等待测试工具就绪

在测试开始时添加：
```typescript
await waitForTestHarness(hostPage);
```

### 步骤 4：替换状态访问

```typescript
// 之前
const state = await readCoreState(hostPage);

// 现在
const state = await hostPage.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.state.get();
});
```

### 步骤 5：替换状态修改

```typescript
// 之前
const modifiedState = { ...state };
modifiedState.players['0'].tokens.taiji = 2;
await applyCoreStateDirect(hostPage, modifiedState);

// 现在
await hostPage.evaluate(() => {
    window.__BG_TEST_HARNESS__!.state.patch({
        core: { players: { '0': { tokens: { taiji: 2 } } } }
    });
});
await hostPage.waitForTimeout(500);
```

### 步骤 6：添加骰子注入（如果需要）

```typescript
await hostPage.evaluate(() => {
    window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3, 1, 1]);
});
```

### 步骤 7：移除条件跳过

```typescript
// 移除
// if (condition) {
//     test.skip(true, 'reason');
//     return;
// }

// 替换为断言
expect(condition).toBeTruthy();
```

### 步骤 8：验证测试

```bash
# 运行迁移后的测试
npm run test:e2e -- <测试文件名>

# 验证测试通过
# 验证测试结果可预测
# 验证测试不再依赖随机性
```

## ⚠️ 注意事项

### 1. 总是等待测试工具就绪

```typescript
// ❌ 错误：可能报错 "Cannot read property 'dice' of undefined"
await page.evaluate(() => {
    window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3]);
});

// ✅ 正确
await waitForTestHarness(page);
await page.evaluate(() => {
    window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3]);
});
```

### 2. 使用类型断言

```typescript
// ✅ 正确：使用 ! 断言非空
window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3]);

// ❌ 错误：TypeScript 会报错
window.__BG_TEST_HARNESS__.dice.setValues([3, 3, 3]);
```

### 3. 状态路径变化

```typescript
// ❌ 错误：缺少 core 前缀
state.players['0'].hp

// ✅ 正确
state.core.players['0'].resources.hp
```

### 4. 骰子值范围

```typescript
// ❌ 错误：骰子值必须是 1-6
window.__BG_TEST_HARNESS__!.dice.setValues([0, 7, 10]);

// ✅ 正确
window.__BG_TEST_HARNESS__!.dice.setValues([1, 6, 3]);
```

### 5. 状态修改后等待

```typescript
// ❌ 错误：状态可能还没更新
await page.evaluate(() => {
    window.__BG_TEST_HARNESS__!.state.patch({ ... });
});
await page.click('button'); // 可能使用旧状态

// ✅ 正确
await page.evaluate(() => {
    window.__BG_TEST_HARNESS__!.state.patch({ ... });
});
await page.waitForTimeout(500); // 等待 React 重新渲染
await page.click('button');
```

## 📊 迁移示例

### 完整示例：DiceThrone 雷霆万钧测试

**迁移前**（依赖随机骰子，成功率 0.46%）：
```typescript
test('雷霆万钧技能测试', async ({ browser }, testInfo) => {
    // ... setup code ...

    // 点击掷骰按钮（使用随机骰子）
    await hostPage.click('[data-tutorial-id="dice-roll-button"]');
    await hostPage.waitForTimeout(2500);
    await hostPage.click('button:has-text("确认")');

    // 读取骰子值，检查是否有3个掌面
    const stateAfterConfirm = await readCoreState(hostPage);
    const diceValues = stateAfterConfirm.dice?.map((d: any) => d.value) || [];
    const palmCount = diceValues.filter((v: number) => v === 3).length;

    if (palmCount < 3) {
        test.skip(true, '骰子中没有3个掌面，无法触发雷霆万钧技能');
        return;
    }

    // ... rest of test ...
});
```

**迁移后**（精确控制骰子，成功率 100%）：
```typescript
test('雷霆万钧技能测试', async ({ browser }, testInfo) => {
    // ... setup code ...

    // 等待测试工具就绪
    await waitForTestHarness(hostPage);

    // 注入骰子值：3个掌面（值为3）+ 2个拳头（值为1）
    await hostPage.evaluate(() => {
        window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3, 1, 1]);
    });

    // 点击掷骰按钮
    await hostPage.click('[data-tutorial-id="dice-roll-button"]');
    await hostPage.waitForTimeout(2500);
    await hostPage.click('button:has-text("确认")');

    // 验证骰子值
    const state = await hostPage.evaluate(() => {
        return window.__BG_TEST_HARNESS__!.state.get();
    });
    const diceValues = state.core.dice?.map((d: any) => d.value) || [];
    const palmCount = diceValues.filter((v: number) => v === 3).length;
    expect(palmCount).toBeGreaterThanOrEqual(3);

    // ... rest of test ...
});
```

**改进效果**：
- 测试成功率：0.46% → 100%（提升 217 倍）
- 代码减少：~10 行
- 移除条件跳过逻辑
- 测试结果可预测

## 🎓 最佳实践

### 1. 使用有意义的骰子值

```typescript
// ✅ 正确：注释说明骰子含义
await page.evaluate(() => {
    // 武僧骰子：3=掌面，1=拳头
    // 雷霆万钧需要3个掌面才能触发
    window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3, 1, 1]);
});
```

### 2. 验证状态变更

```typescript
// ✅ 正确：验证状态确实改变了
const before = await page.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.state.get().core.players['0'].resources.hp;
});

await page.evaluate(() => {
    window.__BG_TEST_HARNESS__!.state.patch({
        core: { players: { '0': { resources: { hp: 10 } } } }
    });
});

const after = await page.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.state.get().core.players['0'].resources.hp;
});

expect(after).toBe(10);
expect(after).not.toBe(before);
```

### 3. 测试结束时清理

```typescript
test('我的测试', async ({ page }) => {
    // ... 测试代码 ...

    // 清理测试工具
    await page.evaluate(() => {
        window.__BG_TEST_HARNESS__!.reset();
    });
});
```

### 4. 调试测试

```typescript
// 检查测试工具状态
const status = await page.evaluate(() => {
    return window.__BG_TEST_HARNESS__!.getStatus();
});
console.log('测试工具状态:', status);

// 检查是否在测试环境
const isTest = await page.evaluate(() => {
    return !!(window as any).__E2E_TEST_MODE__;
});
console.log('测试环境:', isTest);
```

## 📖 更多资源

- 完整设计文档：`docs/testing-infrastructure.md`
- 快速参考：`docs/testing-tools-quick-reference.md`
- 自动化测试指南：`docs/automated-testing.md`
- 示例测试：`e2e/example-test-harness-usage.e2e.ts`
- 实际案例：`e2e/dicethrone-thunder-strike.e2e.ts`

## 🆘 故障排除

### 问题：测试工具未定义

```
错误：Cannot read property 'dice' of undefined
```

**解决方案**：
1. 确保调用了 `waitForTestHarness(page)`
2. 确保 `initContext()` 被调用（自动启用测试模式）
3. 检查浏览器控制台是否有错误

### 问题：骰子注入不生效

```
设置了骰子值，但实际投掷结果不同
```

**解决方案**：
1. 确保在掷骰之前注入骰子值
2. 检查骰子值是否在 1-6 范围内
3. 检查是否有足够的骰子值（队列不能为空）
4. 查看控制台日志确认注入成功

### 问题：状态注入后 UI 没有更新

```
修改了状态，但 UI 没有变化
```

**解决方案**：
1. 在状态注入后等待一段时间（`await page.waitForTimeout(500)`）
2. 确保修改的是正确的状态路径
3. 检查是否有其他代码覆盖了状态
4. 使用 `state.patch()` 而不是直接修改对象

---

**提示**：迁移过程中遇到问题，可以参考示例测试或查阅快速参考文档！
