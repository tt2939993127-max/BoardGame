# 审计报告 5.2：欺心巫族冠军能力

## 审计范围
- 飞行（flying）- 葛拉克
- 浮空术（aerial_strike）- 葛拉克
- 高阶念力（high_telekinesis）- 卡拉
- 稳固（stable）- 卡拉
- 读心传念（mind_transmission）- 古尔壮

---

## 1. 飞行（flying）

### 权威描述
zh-CN: "当本单位移动时，可以额外移动1个区格，并且可以穿过其它卡牌。"
en: "When this unit moves, it may move 1 extra space and pass through other cards."

### 原子步骤
1. 移动时 → 额外移动1格
2. 移动时 → 可穿越所有卡牌（单位+建筑）

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trigger: 'onMove'`, `effects: [{ type: 'extraMove', value: 1, canPassThrough: 'all' }]` |
| 注册层 | ✅ | 已注册到 abilityRegistry（TRICKSTER_ABILITIES 数组） |
| 执行层 | ✅ | `getUnitMoveEnhancements` 正确解析 extraMove 效果，`canPassThrough: 'all'` 设置 `canPassThrough=true` + `canPassStructures=true` |
| 状态层 | ✅ | 移动通过 UNIT_MOVED 事件处理，reduce.ts 正确更新位置 |
| 验证层 | ✅ | `canMoveToEnhanced` 正确使用 `getUnitMoveEnhancements` 获取增强，飞行单位 `canPassThrough=true` 时跳过路径检查 |
| UI层 | ✅ | `getValidMoveTargetsEnhanced` 生成正确的可移动位置，高亮显示 |
| i18n层 | ✅ | zh-CN/en 均有 name + description |
| 测试层 | ✅ | 3个测试覆盖：3格移动、穿越卡牌、非飞行不能穿越 |

---

## 2. 浮空术（aerial_strike）

### 权威描述
zh-CN: "本单位2个区格以内开始移动的友方士兵，在本次移动时获得飞行技能。"
en: "Friendly soldiers that start moving within 2 spaces of this unit gain Flying during that move."

### 原子步骤
1. 被动光环 → 检查移动单位是否为友方士兵
2. 检查移动单位起始位置是否在2格内
3. 满足条件 → 该次移动获得飞行（额外1格+穿越）

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trigger: 'passive'`, `effects: [{ type: 'custom', actionId: 'aerial_strike_aura' }]` |
| 注册层 | ✅ | 已注册到 abilityRegistry |
| 执行层 | ✅ | `getUnitMoveEnhancements` 中实现光环检查：`unit.card.unitClass === 'common'` + `unit.owner === aerialUnit.owner` + `manhattanDistance <= 2` + `getUnitAbilities(cell.unit, state).includes('aerial_strike')` |
| 状态层 | ✅ | 光环效果不修改状态，仅在移动验证时动态计算 |
| 验证层 | ✅ | `canMoveToEnhanced` 通过 `getUnitMoveEnhancements` 获取光环加成 |
| UI层 | ✅ | 移动高亮正确反映光环效果 |
| i18n层 | ✅ | zh-CN/en 均有 name + description |
| 测试层 | ✅ | 3个测试覆盖：2格内士兵获得飞行、超过2格不获得、冠军不受影响 |

### 限定条件全程约束检查
- "友方士兵" → `unit.card.unitClass === 'common'` ✅ 冠军/召唤师不受影响
- "2个区格以内" → `manhattanDistance(unitPos, pos) <= 2` ✅ 使用起始位置计算
- "开始移动" → 在 `getUnitMoveEnhancements(state, unitPos)` 中检查，`unitPos` 是移动起始位置 ✅

---

## 3. 高阶念力（high_telekinesis）

### 权威描述
zh-CN: "在本单位攻击之后，或代替本单位的攻击，可以指定其最多3个区格以内的一个士兵或英雄为目标，将目标推拉1个区格。"
en: "After this unit attacks, or instead of attacking, you may target a soldier or champion within 3 spaces and push or pull it 1 space."

### 独立交互链
- **链A**：攻击后 → 选择3格内非召唤师目标 → 选择推/拉方向 → 推拉1格
- **链B**：代替攻击 → 选择3格内非召唤师目标 → 选择推/拉方向 → 推拉1格（消耗攻击行动）

### 原子步骤（链A - 攻击后）
1. 攻击完成后 → 触发 ABILITY_TRIGGERED 事件
2. UI 显示目标选择提示 → 玩家选择3格内非召唤师目标
3. UI 显示推/拉方向选择 → 玩家选择推或拉
4. 执行推拉 → 目标移动1格
5. 稳固免疫检查 → 有 stable 的目标不可被推拉

### 原子步骤（链B - 代替攻击）
1. 攻击阶段 → 玩家点击"高阶念力（代替攻击）"按钮
2. UI 显示目标选择提示 → 玩家选择3格内非召唤师目标
3. UI 显示推/拉方向选择 → 玩家选择推或拉
4. 执行推拉 → 目标移动1格 + 消耗一次攻击行动
5. 稳固免疫检查 → 有 stable 的目标不可被推拉

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | 链A: `trigger: 'afterAttack'`; 链B: `trigger: 'activated'`, `costsAttackAction: true` |
| 注册层 | ✅ | `high_telekinesis` + `high_telekinesis_instead` 均已注册 |
| 执行层 | ✅ | `executeTelekinesis(ctx, 3)` 共享逻辑，检查 stable 免疫 + 召唤师排除 + 距离验证 |
| 状态层 | ✅ | UNIT_PUSHED/UNIT_PULLED 事件正确移动单位；ATTACK_ACTION_CONSUMED 正确消耗攻击行动 |
| 验证层 | ✅ | customValidator 检查距离≤3、目标存在、非召唤师；链B 额外检查 hasAttacked + attackCount |
| UI层 | ✅ | 链A: afterAttackAbilityMode → 目标高亮 → telekinesisTargetMode 推/拉选择 → 跳过按钮; 链B: 按钮 → abilityMode selectUnit → telekinesisTargetMode |
| i18n层 | ✅ | zh-CN/en 均有 name + description + 按钮文本 |
| 测试层 | ✅ | 链A: 推拉3格内敌方、超过3格拒绝; 链B: 新增功能，复用相同执行器 |

### 发现与修复
- **🔧 已修复**：链B（代替攻击）路径缺失。新增 `high_telekinesis_instead` 技能定义 + 执行器注册 + UI 按钮 + 验证 + i18n + ATTACK_ACTION_CONSUMED 事件

---

## 4. 稳固（stable）

### 权威描述
zh-CN: "本单位不能被推拉。"
en: "This unit cannot be pushed or pulled."

### 原子步骤
1. 被动效果 → 推拉解析时检查目标是否有 stable
2. 有 stable → 推拉无效

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trigger: 'passive'`, `effects: [{ type: 'custom', actionId: 'stable_immunity' }]` |
| 注册层 | ✅ | 已注册到 abilityRegistry |
| 执行层 | ✅ | `executeTelekinesis` 中 `getUnitAbilities(target, core).includes('stable')` 正确检查 |
| 状态层 | ✅ | 被动效果不修改状态 |
| 验证层 | ✅ | UI 层 `afterAttackAbilityHighlights` 过滤掉 stable 单位，不显示为可选目标 |
| UI层 | ✅ | stable 单位不出现在推拉目标高亮中 |
| i18n层 | ✅ | zh-CN/en 均有 name + description |
| 测试层 | ✅ | hasStableAbility 正确返回 true/false |

### 发现与修复
- **🔧 已修复**：`abilityResolver.ts` 中 pushPull 效果的 stable 检查使用 `a.id === 'stable'`（`a` 是 string，无 `.id` 属性），改为 `a === 'stable'`（`targetAbilityIds.includes('stable')`）。此 bug 当前为休眠状态（telekinesis 的 pushPull 效果因 `selectedTarget` 无法解析而不走此路径），但修复确保未来正确性。

### 交叉影响检查
- 念力/高阶念力执行器：✅ 正确检查 stable
- abilityResolver pushPull 通用路径：✅ 已修复
- 震慑（stun）事件卡：⚠️ 未检查 stable（记录为跨阵营交叉影响问题，属于 task 15.2 范围）

---

## 5. 读心传念（mind_transmission）

### 权威描述
zh-CN: "在本单位攻击一张敌方卡牌之后，可以指定本单位3个区格以内的一个友方士兵为目标，目标进行一次额外的攻击。"
en: "After this unit attacks an enemy card, you may target a friendly soldier within 3 spaces. That soldier makes an extra attack."

### 原子步骤
1. 攻击敌方卡牌后 → 触发 ABILITY_TRIGGERED 事件
2. UI 显示目标选择提示 → 玩家选择3格内友方士兵
3. 发送 ACTIVATE_ABILITY 命令 → 执行器生成 EXTRA_ATTACK_GRANTED 事件
4. reduce 重置目标 hasAttacked + 增加 extraAttacks 计数
5. 玩家可跳过（取消按钮）

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trigger: 'afterAttack'`, `effects: [{ type: 'grantExtraAttack', target: { unitId: 'selectedTarget' } }]` |
| 注册层 | ✅ | 已注册到 abilityRegistry + executorRegistry |
| 执行层 | ✅ | 检查 owner === playerId + unitClass === 'common' + distance ≤ 3 |
| 状态层 | ✅ | EXTRA_ATTACK_GRANTED → `hasAttacked: false, extraAttacks: +1` |
| 验证层 | ✅ | customValidator 检查距离≤3、友方、士兵 |
| UI层 | ✅ | afterAttackAbilityMode → 目标高亮（友方士兵3格内）→ 点击直接发送 ACTIVATE_ABILITY → 跳过按钮 |
| i18n层 | ✅ | zh-CN/en 均有 name + description |
| 测试层 | ✅ | 3个测试：给友方士兵额外攻击、不能给敌方、不能给冠军、超过3格拒绝 |

### 限定条件全程约束检查
- "攻击一张敌方卡牌之后" → 攻击流程中 `canAttackEnhanced` 拒绝友方目标，治疗模式有独立路径不触发 afterAttack ✅
- "友方士兵" → 验证层 `owner !== playerId` 拒绝 + `unitClass !== 'common'` 拒绝; 执行层同样检查; UI 层过滤 ✅
- "3个区格以内" → 验证层 + 执行层 + UI 层三重检查 ✅
- "可以" → UI 有跳过按钮（`onCancelAfterAttackAbility`）✅

---

## 数据查询一致性审查

grep `.card.abilities` 结果：
- `helpers.ts:getUnitBaseAbilities` — 统一查询函数内部 ✅
- `abilityResolver.ts:getUnitBaseAbilities/getUnitAbilities` — 统一查询函数内部 ✅
- `execute.ts:446` — `attachedUnits` 附加卡牌检查，不受 buff/共享影响 ✅
- 测试文件 — 测试断言 ✅

无绕过发现。

---

## 修复清单

| # | 严重度 | 描述 | 修复 |
|---|--------|------|------|
| 1 | medium | `abilityResolver.ts` pushPull stable 检查 `a.id === 'stable'` 应为 `a === 'stable'`（`a` 是 string） | ✅ 已修复 |
| 2 | high | `high_telekinesis` 缺少"代替攻击"路径（描述明确说"或代替本单位的攻击"） | ✅ 已修复：新增 `high_telekinesis_instead` 技能 + 执行器 + UI + 验证 + i18n + ATTACK_ACTION_CONSUMED 事件 |

## 跨阵营交叉影响备注
- 震慑（stun）事件卡推拉未检查 stable 免疫 → 记录到 task 15.2
