# D2 子项 — 打出约束与额度授予约束审计报告

> 审计日期：2026-02-27
> 审计范围：playConstraint 数据驱动系统 + grantExtraMinion 约束参数完整性
> 审计方法：代码审查（grep playConstraint 定义 → 比对 validate/UI 检查 → 比对描述）

---

## 16.1 playConstraint 定义清单

| 卡牌 | 派系 | 类型 | playConstraint | 描述语义 | 一致性 |
|------|------|------|---------------|----------|--------|
| 修格斯 (Shoggoth) | 远古 | 随从 | `{ type: 'requireOwnPower', minPower: 6 }` | "只能打到你至少拥有6点力量的基地" | ✅ |
| 完成仪式 (Complete the Ritual) | 克苏鲁 | ongoing 行动 | `'requireOwnMinion'` | "打到你有随从的基地" | ✅ |
| 灵体 (Specter) | 幽灵 | ongoing 行动 | `'onlyCardInHand'` | "只能在本卡是你的唯一手牌时打出" | ✅ |

---

## 16.2 validate 层检查

**commands.ts `checkPlayConstraint` 函数**覆盖所有 3 种约束类型：

| 约束类型 | validate 检查 | 正确性 |
|----------|--------------|--------|
| `'requireOwnMinion'` | `bases[baseIndex].minions.some(m => m.owner === playerId)` | ✅ |
| `'onlyCardInHand'` | `hand.length !== 1` | ✅ |
| `{ type: 'requireOwnPower', minPower }` | `getPlayerEffectivePowerOnBase(...) < minPower` | ✅ |

**随从打出**（PLAY_MINION）：L150 检查 `minionDef.playConstraint` ✅
**行动卡打出**（PLAY_ACTION ongoing）：L250 检查 `def.playConstraint` ✅

---

## 16.3 UI 层 deployableBaseIndices 检查

**Board.tsx `checkPlayConstraintUI` 函数**覆盖 2 种约束类型：

| 约束类型 | UI 检查 | 正确性 |
|----------|---------|--------|
| `'requireOwnMinion'` | `bases[baseIndex].minions.some(m => m.owner === playerId)` | ✅ |
| `{ type: 'requireOwnPower', minPower }` | `getPlayerEffectivePowerOnBase(...) >= minPower` | ✅ |
| `'onlyCardInHand'` | 未检查（返回 `true`） | ⚠️ 见下文 |

**`onlyCardInHand` 在 UI 层的处理**：`checkPlayConstraintUI` 对 `'onlyCardInHand'` 返回 `true`（不过滤基地）。这是正确行为，因为 `onlyCardInHand` 约束的是"手牌数量"而非"目标基地"，所有基地都是合法目标。validate 层会在提交时检查手牌数量。

**结论**：✅ UI 层正确处理了所有约束类型。

---

## 16.4 grantExtraMinion 约束参数完整性

| 调用方 | 描述约束 | payload 参数 | 一致性 |
|--------|----------|-------------|--------|
| robot_zapbot | "力量≤2的额外随从" | `powerMax: 2` | ✅ |
| killer_plant_blossom | "同名随从 ×3" | `sameNameOnly: true` ×3 | ✅ |
| innsmouth_sacred_circle | "同名随从到此基地" | `restrictToBase + sameNameOnly: true` | ✅ |
| innsmouth_spreading_the_word | "同名随从（指定 defId）" | `sameNameOnly: true, sameNameDefId` | ✅ |
| base_secret_garden | "力量≤2的随从到此基地" | `restrictToBase + powerMax: 2` | ✅ |
| base_fairy_ring | "随从到此基地" | `restrictToBase` | ✅ |
| miskatonic_lost_knowledge | "随从到此基地" | `restrictToBase` | ✅ |
| 其他（wizard_summon 等） | "额外随从（无约束）" | 无额外参数 | ✅ |

---

## 16.5 已有审计测试覆盖

`abilityBehaviorAudit.test.ts` 包含两个 property 测试：
1. "描述含条件性打出目标的 ongoing 行动卡必须有 playConstraint" — 扫描所有 ongoing 行动卡的 effectText
2. "描述含条件性打出限制的随从卡必须有 playConstraint" — 扫描所有随从卡的 abilityText

这两个测试确保描述中含条件性打出语义的卡牌都有对应的 `playConstraint` 字段。

---

## 总结

| 子项 | 结论 | 缺陷 |
|------|------|------|
| 16.1 playConstraint 定义 | 3 种约束类型，3 张卡牌 | 0 |
| 16.2 validate 层 | 全部覆盖 | 0 |
| 16.3 UI 层 | 全部正确处理 | 0 |
| 16.4 grantExtraMinion 约束 | 全部参数完整 | 0 |

**D2 子项结论**：✅ 全部通过，打出约束系统数据驱动，validate/UI 双层检查一致。
