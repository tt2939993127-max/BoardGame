# ActiveModifierBadge 不显示 - EventStream 为空

## 问题根因

用户日志显示：
```
[useActiveModifiers] 首次挂载，扫描历史事件: {totalEntries: 0, restoredModifiers: Array(0)}
```

**EventStream 是空的**（`totalEntries: 0`），导致 `useActiveModifiers` 无法找到 CARD_PLAYED 事件。

## 可能的原因

### 1. EventStream 在页面加载时是空的（正常）

**预期行为**：
- 页面刚加载时，EventStream 是空的
- 用户打出 Volley 卡牌后，CARD_PLAYED 事件被添加到 EventStream
- `useActiveModifiers` 通过 `useEventStreamCursor` 消费新事件
- 新事件应该触发 `useEffect`，添加修正卡到列表

### 2. consumeNew() 没有返回新事件

**可能原因**：
- `useEventStreamCursor` 的游标没有正确推进
- EventStream 更新后，`useEffect` 没有被触发
- `consumeNew()` 返回空数组

## 调试步骤

### 已添加的日志

1. **首次挂载**：
   ```typescript
   console.log('[useActiveModifiers] 首次挂载，扫描历史事件:', {
       totalEntries: eventStreamEntries.length,
       restoredModifiers,
   });
   ```

2. **consumeNew 结果**：
   ```typescript
   console.log('[useActiveModifiers] consumeNew 结果:', {
       newEntriesCount: newEntries.length,
       didReset,
       totalEntries: eventStreamEntries.length,
   });
   ```

3. **CARD_PLAYED 事件**：
   ```typescript
   console.log('[useActiveModifiers] CARD_PLAYED 事件:', {
       cardId: p.cardId,
       card,
       isAttackModifier: card?.isAttackModifier,
   });
   ```

4. **添加新修正卡**：
   ```typescript
   console.log('[useActiveModifiers] 添加新修正卡:', newModifiers);
   ```

5. **RightSidebar props**：
   ```typescript
   console.log('[RightSidebar] activeModifiers:', activeModifiers);
   console.log('[RightSidebar] bonusDamage:', bonusDamage);
   ```

### 下一步验证

请再次运行游戏，使用 Volley 卡牌，查看控制台日志：

1. **打出 Volley 前**：
   - `[useActiveModifiers] 首次挂载` → 应该显示 `totalEntries: 0`

2. **打出 Volley 后**：
   - `[useActiveModifiers] consumeNew 结果` → 应该显示 `newEntriesCount > 0`
   - `[useActiveModifiers] CARD_PLAYED 事件` → 应该显示 `cardId: 'volley'`
   - `[useActiveModifiers] 添加新修正卡` → 应该显示修正卡列表
   - `[RightSidebar] activeModifiers` → 应该显示修正卡列表

## 预期日志输出

### 正常情况

```
// 页面加载
[useActiveModifiers] 首次挂载，扫描历史事件: {totalEntries: 0, restoredModifiers: []}

// 打出 Volley 卡牌
[useActiveModifiers] consumeNew 结果: {newEntriesCount: 3, didReset: false, totalEntries: 3}
[useActiveModifiers] CARD_PLAYED 事件: {cardId: 'volley', card: {...}, isAttackModifier: true}
[useActiveModifiers] 添加新修正卡: [{cardId: 'volley', ...}]
[RightSidebar] activeModifiers: [{cardId: 'volley', ...}]
[RightSidebar] bonusDamage: 2
```

### 异常情况：consumeNew 返回空数组

```
// 页面加载
[useActiveModifiers] 首次挂载，扫描历史事件: {totalEntries: 0, restoredModifiers: []}

// 打出 Volley 卡牌
[useActiveModifiers] consumeNew 结果: {newEntriesCount: 0, didReset: false, totalEntries: 3}
// 没有后续日志
```

**原因**：`useEventStreamCursor` 的游标没有正确推进，或者 `useEffect` 没有被触发

## 修改文件

- `src/games/dicethrone/hooks/useActiveModifiers.ts`：添加 `consumeNew` 结果日志

## 下一步

请把打出 Volley 卡牌后的完整控制台日志发给我，特别是：
- `[useActiveModifiers] consumeNew 结果` 的输出
- 是否有 `[useActiveModifiers] CARD_PLAYED 事件` 的输出
- 是否有 `[useActiveModifiers] 添加新修正卡` 的输出
