# D31 — 效果拦截路径完整性审计报告

> 审计日期：2026-02-27
> 审计范围：所有产生 MINION_DESTROYED / MINION_MOVED / MINION_RETURNED / CARD_TO_DECK_BOTTOM 事件的路径
> 审计方法：代码审查（grep 调用链 + 比对过滤函数覆盖）

---

## 13.1 保护过滤函数清单

| 函数 | 保护类型 | 位置 |
|------|----------|------|
| `filterProtectedDestroyEvents` | destroy / action / affect | reducer.ts L523 |
| `filterProtectedMoveEvents` | move / action / affect | reducer.ts L743 |
| `filterProtectedReturnEvents` | move / action / affect | reducer.ts L795 |
| `filterProtectedDeckBottomEvents` | move / action / affect | reducer.ts L850 |

所有过滤函数均调用 `isMinionProtected(core, minion, baseIndex, sourcePlayerId, type)` 进行判定。

---

## 13.2 事件产生路径 vs 过滤覆盖

### MINION_DESTROYED 事件路径

| 路径 | 调用链 | 是否经过 filterProtectedDestroyEvents |
|------|--------|--------------------------------------|
| 命令执行（execute） | execute → events → processDestroyMoveCycle → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| 交互解决（InteractionSystem afterEvents） | systems.ts afterEvents → processDestroyMoveCycle → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| 回合结束 onTurnEnd trigger | index.ts onPhaseExit('playCards') → processDestroyMoveCycle → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| 计分后处理 afterScoring | index.ts afterScoring → processDestroyMoveCycle → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| onPlay 派生事件 | index.ts postProcessSystemEvents → processDestroyMoveCycle → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| destroy→move 循环中新产生的 MINION_DESTROYED | processDestroyMoveCycle 内部循环 → processDestroyTriggers → filterProtectedDestroyEvents | ✅ |
| 基地能力 onMinionDestroyed 拯救机制 | processDestroyTriggers 内部 pendingSaveMinionUids 暂缓 → 交互解决后决定 | ✅ 特殊处理 |

### MINION_MOVED 事件路径

| 路径 | 调用链 | 是否经过 filterProtectedMoveEvents |
|------|--------|-------------------------------------|
| 命令执行 | execute → events → processDestroyMoveCycle → processMoveTriggers → filterProtectedMoveEvents | ✅ |
| 交互解决 | systems.ts afterEvents → processDestroyMoveCycle → processMoveTriggers → filterProtectedMoveEvents | ✅ |
| 回合结束 | index.ts → processDestroyMoveCycle → processMoveTriggers → filterProtectedMoveEvents | ✅ |
| 计分后处理 | index.ts → processDestroyMoveCycle → processMoveTriggers → filterProtectedMoveEvents | ✅ |

### MINION_RETURNED 事件路径

| 路径 | 调用链 | 是否经过 filterProtectedReturnEvents |
|------|--------|---------------------------------------|
| 命令执行 | execute → filterProtectedReturnEvents | ✅ |
| 交互解决 | systems.ts afterEvents → filterProtectedReturnEvents | ✅ |
| 计分后处理 | index.ts → filterProtectedReturnEvents | ✅ |
| onPlay 派生事件 | index.ts → filterProtectedReturnEvents | ✅ |

### CARD_TO_DECK_BOTTOM 事件路径

| 路径 | 调用链 | 是否经过 filterProtectedDeckBottomEvents |
|------|--------|------------------------------------------|
| 命令执行 | execute → filterProtectedDeckBottomEvents | ✅ |
| 交互解决 | systems.ts afterEvents → filterProtectedDeckBottomEvents | ✅ |
| 计分后处理 | index.ts → filterProtectedDeckBottomEvents | ✅ |
| onPlay 派生事件 | index.ts → filterProtectedDeckBottomEvents | ✅ |

---

## 13.3 未覆盖路径检查

**检查方法**：对比所有产生 MINION_DESTROYED/MINION_MOVED 事件的代码路径，确认每条路径最终都经过对应的过滤函数。

**关键发现**：所有事件产生路径最终都汇入以下三个后处理入口之一：
1. `execute()` 后处理（reducer.ts L88-99）
2. `systems.ts afterEvents` 后处理（systems.ts L71-78）
3. `index.ts` 中的 `postProcessSystemEvents` / `onPhaseExit` / `afterScoring`

这三个入口均完整调用了 `processDestroyMoveCycle` + `filterProtectedReturnEvents` + `filterProtectedDeckBottomEvents` 链。

**结论**：✅ 无未覆盖路径。

---

## 13.4 计分清场路径特殊说明

计分清场（`afterScoring` 中的 `BASE_CLEARED` 事件）不经过保护过滤，这是正确行为：
- 计分清场是规则强制行为，不受保护效果影响
- 保护效果（如 tooth_and_claw、deep_roots）只保护"被对手效果消灭/移动"，不保护规则清场

---

## 总结

| 子项 | 结论 | 缺陷 |
|------|------|------|
| 13.1 过滤函数清单 | 4 个过滤函数覆盖 4 种事件类型 | 0 |
| 13.2 事件路径覆盖 | 所有路径均经过对应过滤 | 0 |
| 13.3 未覆盖路径 | 无 | 0 |

**D31 维度结论**：✅ 全部通过，所有效果拦截路径完整覆盖。
