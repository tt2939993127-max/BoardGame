# D48：UI 交互渲染模式正确性审计

> **新增维度**：补充 `testing-audit.md` 中缺失的 UI 渲染正确性检查

---

## 问题根源

**历史教训**：传送门交互显示按钮而非卡牌预览，全项目 86 处缺失 `displayMode` 声明，审计未发现。

**根本原因**：
1. **D34 维度不够具体**：只检查"是否有 displayMode"，未检查"所有应该有的地方是否都有"
2. **缺少静态扫描**：没有工具自动检查所有交互选项的 displayMode 声明
3. **缺少 UI 渲染测试**：E2E 测试只验证功能，不验证 UI 渲染方式

---

## D48：UI 交互渲染模式完整性审计

### 触发条件
- 新增交互能力（`createSimpleChoice`/`createInteraction`）
- 修复"UI 显示不对"/"卡牌预览不显示"/"显示按钮而非卡牌"类 bug
- 全面审计（如派系审计）

### 核心原则

**显式声明 > 自动推断**：所有交互选项必须显式声明 `displayMode`，不依赖 UI 层的自动推断逻辑。

**原因**：
1. **自动推断脆弱**：UI 根据 `value` 字段推断（有 `cardUid` → 卡牌，有 `skip` → 按钮），但业务语义可能不同
2. **维护困难**：自动推断规则变化时，所有依赖推断的交互都可能破坏
3. **可读性差**：代码中看不出 UI 渲染方式，需要查看 UI 组件代码才能理解

### 审查方法

#### 1. 静态扫描（自动化）

```bash
# 检查所有缺失 displayMode 的交互选项
node scripts/check-displaymode.mjs
```

**检查规则**：
- 包含 `cardUid` 的选项 → 必须有 `displayMode: 'card'`
- 包含 `skip`/`done`/`cancel` 的选项 → 必须有 `displayMode: 'button'`
- 其他选项 → 根据业务语义判断

#### 2. 代码审查（手动）

**检查清单**：

```typescript
// ❌ 错误：缺少 displayMode
const options = minions.map(c => ({
    id: `minion-${i}`,
    label: name,
    value: { cardUid: c.uid, defId: c.defId }
}));

// ✅ 正确：显式声明
const options = minions.map(c => ({
    id: `minion-${i}`,
    label: name,
    value: { cardUid: c.uid, defId: c.defId },
    displayMode: 'card' as const  // 显式声明
}));

// ❌ 错误：displayMode 与业务语义不符
const options = [
    { id: 'yes', label: '是', value: { cardUid, defId }, displayMode: 'button' as const }  // 应该是 'card'
];

// ✅ 正确：displayMode 与业务语义一致
const options = [
    { id: 'yes', label: '是（打出这张牌）', value: { cardUid, defId }, displayMode: 'card' as const }
];
```

**判定标准**：

| 业务语义 | value 字段 | displayMode | 示例 |
|---------|-----------|-------------|------|
| 从列表选择卡牌 | `{ cardUid, defId }` | `'card'` | 传送门：选择随从 |
| 确认/取消操作 | `{ skip: true }` | `'button'` | 跳过、完成、取消 |
| 是/否决策（涉及卡牌） | `{ cardUid, defId, activate: true }` | `'button'` | 神选者：是否抽疯狂卡 |
| 选择随从（场上） | `{ minionUid, baseIndex }` | `'minion'` | 选择要消灭的随从 |
| 选择基地 | `{ baseIndex }` | `'base'` | 选择要移动到的基地 |

#### 3. UI 渲染验证（E2E）

**测试模板**：

```typescript
test('传送门交互应显示卡牌预览', async ({ page }) => {
    // 1. 触发交互
    await playCard(page, 'wizard_portal');
    
    // 2. 验证 UI 渲染方式
    const cardPreviews = page.locator('[data-testid="card-preview"]');
    await expect(cardPreviews).toHaveCount(3);  // 3 个随从选项
    
    // 3. 验证不是按钮
    const buttons = page.locator('button:has-text("随从")');
    await expect(buttons).toHaveCount(0);  // 不应该有按钮
});

test('跳过选项应显示按钮', async ({ page }) => {
    // 1. 触发交互
    await playCard(page, 'zombie_grave_digger');
    
    // 2. 验证跳过按钮存在
    const skipButton = page.locator('button:has-text("跳过")');
    await expect(skipButton).toBeVisible();
    
    // 3. 验证跳过不是卡牌预览
    const skipCard = page.locator('[data-testid="card-preview"]:has-text("跳过")');
    await expect(skipCard).toHaveCount(0);
});
```

### 典型缺陷模式

#### 模式 1：卡牌选择缺少 displayMode

```typescript
// ❌ 错误
const options = actionCards.map(c => ({
    id: `card-${i}`,
    label: name,
    value: { cardUid: c.uid, defId: c.defId }
    // 缺少 displayMode: 'card'
}));

// 症状：UI 可能显示按钮而非卡牌预览（取决于自动推断逻辑）
```

#### 模式 2：按钮选择缺少 displayMode

```typescript
// ❌ 错误
const options = [
    { id: 'skip', label: '跳过', value: { skip: true } }
    // 缺少 displayMode: 'button'
];

// 症状：UI 可能显示为其他形式（取决于自动推断逻辑）
```

#### 模式 3：displayMode 与业务语义不符

```typescript
// ❌ 错误：传送门选择随从应该显示卡牌预览，不是按钮
const options = minions.map(c => ({
    id: `minion-${i}`,
    label: name,
    value: { cardUid: c.uid, defId: c.defId },
    displayMode: 'button' as const  // 错误！应该是 'card'
}));

// 症状：UI 显示按钮而非卡牌预览
```

#### 模式 4：类型定义中缺少 displayMode

```typescript
// ❌ 错误：类型定义中没有 displayMode 字段
const options: Array<{
    id: string;
    label: string;
    value: { skip: true } | { cardUid: string; defId: string };
}> = [
    { id: 'skip', label: '跳过', value: { skip: true }, displayMode: 'button' as const }
    //                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                                    TypeScript 报错：类型中没有 displayMode
];

// 修复：在类型定义中添加 displayMode 字段
const options: Array<{
    id: string;
    label: string;
    value: { skip: true } | { cardUid: string; defId: string };
    displayMode: 'button' | 'card';  // 添加这一行
}> = [
    { id: 'skip', label: '跳过', value: { skip: true }, displayMode: 'button' as const }
];
```

### 修复策略

#### 策略 1：全面扫描修复（推荐）

```bash
# 1. 运行检查脚本
node scripts/check-displaymode.mjs

# 2. 运行自动修复脚本
node scripts/fix-all-displaymode.mjs

# 3. 手动修复内联选项
node scripts/fix-inline-skip-options.mjs

# 4. 验证修复完整性
node scripts/check-displaymode.mjs
```

#### 策略 2：逐个文件修复

```bash
# 1. 查看具体文件的问题
git diff src/games/smashup/abilities/wizards.ts

# 2. 手动修复
# 添加 displayMode: 'card' as const 或 displayMode: 'button' as const

# 3. 验证
npx eslint src/games/smashup/abilities/wizards.ts
```

### 审计输出格式

```markdown
## D48 审计报告：UI 交互渲染模式完整性

### 扫描范围
- 文件数：14
- 交互选项总数：156

### 发现问题
- 缺少 displayMode：86 处
  - 卡牌选项：56 处
  - 按钮选项：30 处
- displayMode 错误：1 处
  - 传送门：'button' → 应为 'card'

### 修复建议
1. 批量修复：运行 `node scripts/fix-all-displaymode.mjs`
2. 手动修复：传送门 displayMode 从 'button' 改为 'card'
3. 验证：运行 E2E 测试确认 UI 渲染正确

### 影响评估
- 安全性：✅ 只添加 UI 提示，不改变业务逻辑
- 兼容性：✅ 向后兼容
- 效果：✅ 所有卡牌选择正确显示卡牌预览
```

---

## 为什么之前的审计没发现？

### 1. D34 维度不够具体

**D34 原文**：
> 交互选项的 `value` 字段是否包含会被 UI 误判为"卡牌选择"的字段（`defId`/`minionDefId`/`baseDefId`）？

**问题**：
- 只关注"误判"场景（value 包含 defId 但不应该显示卡牌）
- 未关注"应该有但没有"场景（value 包含 cardUid 但缺少 displayMode）
- 未要求"所有选项都显式声明"

### 2. 缺少静态扫描工具

**问题**：
- 审计文档只提供检查维度，未提供自动化工具
- 手动检查容易遗漏（14 个文件，156 个选项）

**解决方案**：
- 创建 `scripts/check-displaymode.mjs` 自动扫描
- 创建 `scripts/fix-all-displaymode.mjs` 自动修复

### 3. E2E 测试未覆盖 UI 渲染

**问题**：
- E2E 测试只验证功能（能否选择、能否完成）
- 未验证 UI 渲染方式（显示卡牌还是按钮）

**解决方案**：
- 补充 UI 渲染验证（检查 `data-testid="card-preview"` 存在）

---

## 改进建议

### 1. 更新 D34 维度

**原 D34**：
> 交互选项 UI 渲染模式正确性

**新 D34**：
> **交互选项 UI 渲染模式完整性与正确性**
> 
> - **完整性**：所有交互选项必须显式声明 `displayMode`
> - **正确性**：`displayMode` 必须与业务语义一致
> - **自动化**：使用 `scripts/check-displaymode.mjs` 扫描
> - **测试**：E2E 测试验证 UI 渲染方式

### 2. 添加 D48 维度

将本文档作为 D48 维度，补充到 `testing-audit.md` 中。

### 3. 更新审计流程

**新增步骤**：

```markdown
## 审计流程（更新）

1. **静态扫描**（自动化）
   - 运行 `node scripts/check-displaymode.mjs`
   - 检查所有交互选项的 displayMode 声明

2. **代码审查**（手动）
   - 按 D1-D48 维度逐项检查
   - 重点关注 D34（UI 渲染模式）和 D48（完整性）

3. **测试验证**（自动化）
   - 运行 GameTestRunner 测试（引擎层）
   - 运行 E2E 测试（完整流程 + UI 渲染）
```

### 4. 添加 CI 门禁

```yaml
# .github/workflows/ci.yml
- name: Check displayMode completeness
  run: node scripts/check-displaymode.mjs
  # 如果发现缺失，CI 失败
```

---

## 总结

**问题根源**：
1. D34 维度不够具体（只关注误判，未关注完整性）
2. 缺少自动化工具（手动检查容易遗漏）
3. E2E 测试未覆盖 UI 渲染（只验证功能）

**解决方案**：
1. 补充 D48 维度（UI 渲染模式完整性）
2. 创建自动化扫描工具（`check-displaymode.mjs`）
3. 补充 E2E UI 渲染测试
4. 添加 CI 门禁

**教训**：
- **审计维度要具体**：不只是"检查是否有"，还要"检查是否全有"
- **自动化优先**：能自动化的检查不要手动做
- **测试要全面**：不只验证功能，还要验证 UI
