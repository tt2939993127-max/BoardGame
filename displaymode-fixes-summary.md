# DisplayMode 修复总结

## 修复原则
- **卡牌选项**（包含 `cardUid`）→ 添加 `displayMode: 'card' as const`
- **按钮选项**（`skip`/`done`/`cancel`）→ 添加 `displayMode: 'button' as const`

---

## 1. wizards.ts（巫师派系）- 9 处

### 1.1 聚集秘术 (Mass Enchantment) - 第 140 行
```typescript
// 修复前
const options = actionCandidates.map((c, i) => ({ id: `card-${i}`, label: c.label, value: { cardUid: c.uid, defId: c.defId, pid: c.pid } }));

// 修复后
const options = actionCandidates.map((c, i) => ({ id: `card-${i}`, label: c.label, value: { cardUid: c.uid, defId: c.defId, pid: c.pid }, displayMode: 'card' as const }));
```

### 1.2 传送门 (Portal) - 第 198 行
```typescript
// 修复前
return { id: `minion-${i}`, label: name, value: { index: i, cardUid: c.uid, defId: c.defId }, displayMode: 'button' as const };

// 修复后（修正错误的 displayMode）
return { id: `minion-${i}`, label: name, value: { index: i, cardUid: c.uid, defId: c.defId }, displayMode: 'card' as const };
```

### 1.3 传送门排序 - 第 241 行
```typescript
// 修复前
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };

// 修复后
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId }, displayMode: 'card' as const };
```

### 1.4 传送门排序 optionsGenerator - 第 255 行
```typescript
// 修复前
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };

// 修复后
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId }, displayMode: 'card' as const };
```

### 1.5 占卜 (Scry) - 第 285 行
```typescript
// 修复前
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };

// 修复后
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId }, displayMode: 'card' as const };
```

### 1.6-1.9 InteractionHandler 中的 optionsGenerator（4 处）
- 第 589 行：传送门排序 handler
- 第 602 行：传送门排序 optionsGenerator
- 第 636 行：传送门排序继续
- 第 649 行：传送门排序 optionsGenerator

---

## 2. aliens.ts（外星人派系）- 8 处

### 2.1 至高霸主 (Supreme Overlord) - 第 77 行
```typescript
// 修复前
{ id: 'skip', label: '跳过（不返回随从）', value: { skip: true } },

// 修复后
{ id: 'skip', label: '跳过（不返回随从）', value: { skip: true }, displayMode: 'button' as const },
```

### 2.2 收集者 (Collector) - 第 109 行
```typescript
// 修复前
{ id: 'skip', label: '跳过（不收回随从）', value: { skip: true } },

// 修复后
{ id: 'skip', label: '跳过（不收回随从）', value: { skip: true }, displayMode: 'button' as const },
```

### 2.3 探测 (Probe) - 第 272 行
```typescript
// 修复前
value: { cardUid: card.uid, defId: card.defId, targetPlayerId: targetPid },

// 修复后
value: { cardUid: card.uid, defId: card.defId, targetPlayerId: targetPid, displayMode: 'card' as const },
```

### 2.4 探测 optionsGenerator - 第 293 行
类似修复

### 2.5-2.6 探测 InteractionHandler（2 处）
- 第 497 行
- 第 518 行

### 2.7 地球化 (Terraform) - 第 648 行（类型定义 + 跳过选项）
```typescript
// 修复前
const options: Array<{
    id: string;
    label: string;
    value: { skip: true } | { cardUid: string; defId: string };
}> = [
    { id: 'skip', label: '跳过额外随从', value: { skip: true } },

// 修复后
const options: Array<{
    id: string;
    label: string;
    value: { skip: true } | { cardUid: string; defId: string };
    displayMode: 'button' | 'card';
}> = [
    { id: 'skip', label: '跳过额外随从', value: { skip: true }, displayMode: 'button' as const },
```

### 2.8 地球化随从选项 - 第 656 行
```typescript
// 修复前
value: { cardUid: card.uid, defId: card.defId },

// 修复后
value: { cardUid: card.uid, defId: card.defId },
displayMode: 'card' as const,
```

---

## 3. zombies.ts（僵尸派系）- 15 处

### 3.1 掘墓人 (Grave Digger) - 第 141 行
```typescript
// 修复前
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };

// 修复后
return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId }, displayMode: 'card' as const };
```

### 3.2 掘墓人跳过选项 - 第 143 行
```typescript
// 修复前
const skipOption = { id: 'skip', label: '跳过', value: { skip: true } };

// 修复后
const skipOption = { id: 'skip', label: '跳过', value: { skip: true }, displayMode: 'button' as const };
```

### 3.3 掘墓人 optionsGenerator - 第 155 行
卡牌选项 + 跳过选项

### 3.4-3.5 盗墓 (Grave Robbing) - 第 193、205 行
卡牌选项 + optionsGenerator

### 3.6-3.7 伸出援手 (Lend A Hand) - 第 245、259 行
卡牌选项 + optionsGenerator

### 3.8-3.9 僵尸领主 (Zombie Lord) - 第 332、334 行
```typescript
// 修复前
return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
options.push({ id: 'done', label: '完成', value: { done: true } } as any);

// 修复后
return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power }, displayMode: 'card' as const };
options.push({ id: 'done', label: '完成', value: { done: true }, displayMode: 'button' as const } as any);
```

### 3.10-3.11 僵尸领主 optionsGenerator - 第 352、354 行
类似修复

### 3.12-3.13 它们不断涌来 (They Keep Coming) - 第 412、426 行
卡牌选项 + optionsGenerator

### 3.14-3.15 InteractionHandler - 第 574 行及后续
卡牌选项

---

## 4. cthulhu.ts（克苏鲁派系）- 6 处

### 4.1 强制征召 (Recruit By Force) - 第 89 行
```typescript
// 修复前
[...options, { id: 'skip', label: '跳过', value: { skip: true } }]

// 修复后
[...options, { id: 'skip', label: '跳过', value: { skip: true }, displayMode: 'button' as const }]
```

### 4.2 再次降临 (It Begins Again) - 第 109 行
类似修复

### 4.3 再次降临 optionsGenerator - 第 121 行
```typescript
// 修复前
return [...opts, { id: 'skip', label: '跳过', value: { skip: true } }];

// 修复后
return [...opts, { id: 'skip', label: '跳过', value: { skip: true }, displayMode: 'button' as const }];
```

### 4.4-4.6 其他克苏鲁能力
类似的跳过选项和卡牌选项修复

---

## 5. 其他派系

### 5.1 elder_things.ts - 1 处
卡牌选项

### 5.2 frankenstein.ts - 2 处
卡牌选项 + 停止按钮

### 5.3 ghosts.ts - 8 处
跳过选项 + 卡牌选项

### 5.4 giant_ants.ts - 4 处
确认/取消按钮

### 5.5 killer_plants.ts - 3 处
卡牌选项 + 跳过选项

### 5.6 miskatonic.ts - 5 处
跳过选项

### 5.7 ninjas.ts - 10 处
跳过选项 + 卡牌选项

### 5.8 pirates.ts - 5 处
跳过/完成选项

### 5.9 robots.ts - 7 处
卡牌选项 + 跳过选项

### 5.10 vampires.ts - 3 处
跳过选项 + 卡牌选项

---

## 修复统计

| 文件 | 修复数量 | 主要类型 |
|------|---------|---------|
| wizards.ts | 9 | 卡牌选项 |
| aliens.ts | 8 | 卡牌选项 + 跳过选项 |
| zombies.ts | 15 | 卡牌选项 + 完成/跳过选项 |
| cthulhu.ts | 6 | 跳过选项 |
| ghosts.ts | 8 | 跳过选项 + 卡牌选项 |
| ninjas.ts | 10 | 跳过选项 + 卡牌选项 |
| robots.ts | 7 | 卡牌选项 + 跳过选项 |
| pirates.ts | 5 | 跳过/完成选项 |
| miskatonic.ts | 5 | 跳过选项 |
| giant_ants.ts | 4 | 确认/取消按钮 |
| vampires.ts | 3 | 跳过选项 + 卡牌选项 |
| killer_plants.ts | 3 | 卡牌选项 + 跳过选项 |
| frankenstein.ts | 2 | 卡牌选项 + 停止按钮 |
| elder_things.ts | 1 | 卡牌选项 |

**总计：86 处修复**

---

## 验证方法

```bash
# 检查修复完整性
node scripts/check-displaymode.mjs

# ESLint 检查（应该 0 errors）
npx eslint src/games/smashup/abilities/*.ts --max-warnings=999

# 查看具体修改
git diff src/games/smashup/abilities/
```

---

## 影响范围

所有修复都是**向后兼容**的：
- ✅ 不改变任何业务逻辑
- ✅ 只添加 UI 渲染提示
- ✅ 不影响现有测试
- ✅ 不需要数据迁移

修复后的效果：
- ✅ 卡牌选择交互正确显示卡牌预览（而非按钮）
- ✅ 跳过/完成/取消按钮正确显示为按钮（而非卡牌）
- ✅ 与传送门修复保持一致
