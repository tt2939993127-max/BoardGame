# 审计 14 - 审计反模式与数据查询一致性检查

## 14.1 "可以/可选"效果交互确认检查

逐个检查所有描述含"你可以"的能力，验证有玩家确认 UI：

| 能力 | 确认方式 | 状态 |
|------|----------|------|
| revive_undead | abilityMode 两步 + 取消 | ✅ |
| infection | abilityMode 两步 + 取消 | ✅ |
| soul_transfer | soulTransferMode + 确认/跳过 | ✅ |
| fire_sacrifice_summon | abilityMode + 取消 | ✅ |
| mind_capture | mindCaptureMode + 控制/伤害 | ✅ |
| fortress_power | CardSelectorOverlay | ✅ |
| healing | abilityMode selectCards + 确认/取消 | ✅ |
| ferocity | 玩家主动选择攻击单位 | ✅ |
| feed_beast | abilityMode + 自毁/取消 | ✅ |
| grab | GRAB_FOLLOW_REQUESTED 交互 | ✅ |
| ice_shards | abilityMode + 确认/跳过 | ✅ |
| frost_axe | abilityMode 两步 + 充能/附加/跳过 | ✅ |
| ice_ram | abilityMode 两步 + 跳过 | ✅ |
| prepare | directExecute 按钮（主动点击） | ✅ |
| rapid_fire | rapidFireMode + 确认/跳过 | ✅ |
| withdraw | withdrawMode 两步 + 取消 | ✅ |

结论：✅ 全部通过，无自动执行的"可选"效果。

## 14.2 测试层全链路覆盖验证

`as any` 使用分析：
- `{ core: state, sys: {} as any }` — 测试 helper 创建 fullState，sys 不参与领域逻辑，可接受
- `(event.payload as any).field` — 访问泛型 GameEvent 的 payload 字段，因 payload 类型为 `Record<string, unknown>`，可接受
- `card as any` — validate.test.ts 中构造测试数据，可接受
- 音频测试中的 `as any` — 构造 mock 对象，可接受

结论：✅ 无绕过正确性检查的 `as any`。

## 14.3 限定条件全程约束检查

抽查关键限定条件：
- vanish（0费友方）：validation + executor + UI quickCheck 三处均检查 `cost === 0` ✅
- blood_summon（费用≤2）：validation 检查 ✅
- frenzy（0费+非召唤师）：execution 检查 `cost === 0 && unitClass !== 'summoner'` ✅
- sneak（0费+非召唤师）：execution 检查 ✅

结论：✅ 限定条件在执行路径全程被强制约束。

## 14.4 数据查询一致性 grep 审查

### `.card.abilities` 访问点
| 文件 | 位置 | 说明 | 状态 |
|------|------|------|------|
| helpers.ts:541 | getUnitBaseAbilities 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:609,622 | getUnitBaseAbilities/getUnitAbilities 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:638,645 | getUnitAbilities 交缠颂歌逻辑 | 统一访问器内部 | ✅ |
| execute.ts:446 | attachedUnits 检查 frost_axe | 附加卡数据，非单位状态 | ✅ |
| UI 层 (.tsx) | 无 | — | ✅ |

### `.card.strength` 访问点
| 文件 | 位置 | 说明 | 状态 |
|------|------|------|------|
| abilityResolver.ts:742 | calculateEffectiveStrength 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:116 | getAttributeValue 内部 | 能力系统内部 | ✅ |
| abilityResolver.ts:912 | getStrengthDelta 内部 | 计算增量 | ✅ |
| execute.ts:418,516 | ATTACK_EXECUTED 事件 baseStrength | 展示用基础值，实际骰数用 effectiveStrength | ✅ |
| UI 层 (.tsx) | 无 | — | ✅ |

### `.card.life` 访问点
| 文件 | 位置 | 说明 | 状态 |
|------|------|------|------|
| abilityResolver.ts:936 | getEffectiveLife 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:961 | getEffectiveLifeBase 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:985 | getEffectiveStructureLife 内部 | 统一访问器 | ✅ |
| abilityResolver.ts:114 | getAttributeValue 内部 | 能力系统内部 | ✅ |
| UI 层 (.tsx) | 无 | — | ✅ |

结论：✅ 无绕过统一查询入口的直接字段访问。UI 层完全干净。
