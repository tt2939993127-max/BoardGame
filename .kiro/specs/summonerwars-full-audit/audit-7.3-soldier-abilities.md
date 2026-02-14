# 审计报告 7.3 - 先锋军团士兵能力

## 1. 治疗 (healing)

### 权威描述
> 在本单位攻击一个友方士兵或英雄之前，你可以从你的手牌弃除一张卡牌。如果你这样做，则本次攻击掷出的每个⚔️或❤️会从目标上移除1点伤害，以代替造成伤害。

### 独立交互链

**链A：弃牌进入治疗模式**
1. 触发条件：攻击友方士兵或英雄之前
2. 可选操作：从手牌弃除一张卡牌
3. 效果：进入治疗模式

**链B：治疗模式攻击**
1. 前置条件：处于治疗模式
2. 攻击友方单位
3. 投骰：每个⚔️或❤️移除1点伤害（代替造成伤害）
4. 攻击后清除治疗模式

### 原子步骤拆解
1. 弃除手牌 → CARD_DISCARDED 事件
2. 设置治疗模式 → HEALING_MODE_SET 事件
3. 攻击友方单位 → 投骰
4. 计算治疗量（melee 面数量）→ UNIT_HEALED 事件
5. 不造成伤害（hits=0 in UNIT_ATTACKED）
6. 攻击后清除 healingMode

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger: `beforeAttack`, effects: custom `healing_convert`, validation: requiredPhase `attack` + customValidator 检查手牌和目标 |
| 注册层 | ✅ | `customActionHandlers.ts` 注册 no-op handler；实际逻辑在 `executors/paladin.ts` 和 `execute.ts` |
| 执行层 | ✅ | executor 发射 CARD_DISCARDED + HEALING_MODE_SET；execute.ts 治疗模式独立路径：投骰→计算 melee 数→UNIT_HEALED |
| 状态层 | ✅ | reduce.ts: HEALING_MODE_SET 设置 healingMode=true；UNIT_HEALED 减少 damage；UNIT_ATTACKED 清除 healingMode |
| 验证层 | ✅ | validate.ts: healing beforeAttack 检查手牌存在+目标为友方士兵/英雄；healingMode 时允许攻击友方 |
| UI层 | ✅ | requiresButton=true, activationContext='beforeAttack', quickCheck 检查手牌非空 |
| i18n层 | ✅ | zh-CN/en 均有 healing 的 name/description |
| 测试层 | ✅ | 6个测试：弃牌进入治疗模式、beforeAttack 触发治疗攻击、治疗模式攻击友方、不造成伤害、攻击后清除模式、只能攻击友方 |

### 发现问题

**⚠️ 低风险 - 描述说"⚔️或❤️"但实现只计算 melee（❤️）**

描述原文："每个⚔️或❤️会从目标上移除1点伤害"。但 execute.ts 治疗路径中 `healDiceResults.filter(r => r === 'melee').length` 只计算 melee 面。

查看骰子系统：melee 对应 ❤️，ranged 对应 🏹，special 对应 ✦。⚔️ 在近战攻击中就是 melee 面。由于圣殿牧师是近战单位（attackType: 'melee'），所有命中面都是 melee，所以 ⚔️ 和 ❤️ 在近战中是同一个面。实现正确。

### 结论
✅ 治疗实现完整，无 bug。

---

## 2. 裁决 (judgment)

### 权威描述
> 在本单位攻击一个敌方单位之后，抓取数量等于所掷出❤️数量的卡牌。

### 独立交互链

**链A：攻击后按❤️数量抓牌**
1. 触发条件：攻击敌方单位之后
2. 计算：统计骰子中 melee（❤️）面数量
3. 效果：抓取对应数量的卡牌

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger: `afterAttack`, effects: custom `judgment_draw` |
| 注册层 | ✅ | `customActionHandlers.ts` - `swCustomActionRegistry.register('judgment_draw', ...)` |
| 执行层 | ✅ | handler 从 ctx.diceResults 统计 melee 数量，发射 CARD_DRAWN 事件（带 sourceAbilityId） |
| 状态层 | ✅ | reduce.ts CARD_DRAWN 处理：从牌组顶部移入手牌 |
| 验证层 | N/A | afterAttack 自动触发，无需验证 |
| UI层 | N/A | 自动触发，无按钮 |
| i18n层 | ✅ | zh-CN/en 均有 judgment 的 name/description |
| 测试层 | ✅ | 3个测试：全 melee 抓3张、无 melee 不抓、混合 melee 按实际数量抓 |

### 结论
✅ 裁决实现完整，无 bug。

---

## 3. 缠斗 (entangle)

### 权威描述
> 每当一个相邻敌方单位因为移动或被推拉而远离本单位时，立刻对该单位造成1点伤害。

### 独立交互链

**链A：敌方移动远离时造成1伤**
1. 触发条件：相邻敌方单位移动远离
2. 效果：造成1点伤害

**链B：敌方被推拉远离时造成1伤**
1. 触发条件：相邻敌方单位被推拉远离
2. 效果：造成1点伤害

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger: `onAdjacentEnemyLeave`, effects: damage target 1 |
| 注册层 | ✅ | execute.ts 中 MOVE_UNIT 和推拉处理都调用 `getEntangleUnits` |
| 执行层 | ✅ | 移动时：getEntangleUnits 找相邻缠斗单位→检查移动后距离增大→发射 UNIT_DAMAGED(reason:'entangle')；推拉时：同样逻辑 |
| 状态层 | ✅ | reduce.ts UNIT_DAMAGED 处理：增加 damage |
| 验证层 | N/A | 被动触发，无需验证 |
| UI层 | N/A | 被动触发，无按钮 |
| i18n层 | ✅ | zh-CN/en 均有 entangle 的 name/description |
| 测试层 | ✅ | 2个测试：远离时触发、移动后仍相邻时也触发（因为距离从1变为2） |

### 已知问题
与 trickster 的 rebound 共享同一个 bug：推拉触发路径在某些边界情况下可能不完整。已记录到 task 15.2。

### 结论
✅ 缠斗核心逻辑正确，推拉边界问题已记录。

---

## 4. 守卫 (guardian)

### 权威描述
> 当一个相邻敌方单位攻击时，必须指定一个具有守卫技能的单位为目标。

### 独立交互链

**链A：强制攻击守卫单位**
1. 条件：攻击者相邻有敌方守卫单位
2. 约束：必须攻击守卫单位（不能攻击其他目标）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger: `passive`, effects: custom `guardian_force_target` |
| 注册层 | ✅ | 实际逻辑在 validate.ts 中 |
| 执行层 | N/A | 纯验证层技能，无执行逻辑 |
| 状态层 | N/A | 不修改状态 |
| 验证层 | ✅ | validate.ts DECLARE_ATTACK：检查攻击者相邻是否有敌方守卫→目标不是守卫则拒绝。使用 `getUnitAbilities` 查询（支持交缠共享） |
| UI层 | N/A | 被动技能无按钮 |
| i18n层 | ✅ | zh-CN/en 均有 guardian 的 name/description |
| 测试层 | ✅ | 3个测试：相邻有守卫必须攻击守卫、攻击守卫本身允许、守卫不相邻时不强制 |

### 验证层细节审查

validate.ts 中守卫检查逻辑：
1. 获取目标单位的技能列表（通过 `getUnitAbilities`）
2. 如果目标没有 guardian，遍历攻击者相邻4个方向
3. 找到相邻的敌方守卫单位且攻击者能攻击该守卫（`canAttackEnhanced`）→ 拒绝
4. 额外检查：守卫单位必须是攻击者能实际攻击到的（防止远程攻击者被不可达的守卫阻挡）

### 结论
✅ 守卫实现完整，无 bug。

---

## 5. 圣光箭 (holy_arrow)

### 权威描述
> 在本单位攻击之前，从你的手牌展示并弃除任意数量的非同名单位。每以此法弃除一张卡牌，则获得1点魔力并且本单位在本次攻击获得战力+1。

### 独立交互链

**链A：攻击前弃牌获得魔力和战力**
1. 触发条件：攻击之前
2. 可选操作：从手牌弃除任意数量非同名单位
3. 效果：每张+1魔力+1战力（本次攻击）

### 原子步骤拆解
1. 选择手牌中的单位卡（非同名、不与弓箭手同名）
2. 弃除选中的卡牌 → CARD_DISCARDED 事件（每张一个）
3. 获得魔力 → MAGIC_CHANGED 事件（delta = 弃牌数）
4. 获得战力加成 → UNIT_CHARGED 事件（delta = 弃牌数）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger: `beforeAttack`, effects: custom `holy_arrow_discard`, validation: requiredPhase `attack` + customValidator 检查非同名 |
| 注册层 | ✅ | `executors/paladin.ts` - `abilityExecutorRegistry.register('holy_arrow', ...)` |
| 执行层 | ✅ | executor 验证手牌存在→发射 MAGIC_CHANGED + CARD_DISCARDED(每张) + UNIT_CHARGED |
| 状态层 | ✅ | reduce.ts: MAGIC_CHANGED 增加魔力、CARD_DISCARDED 移除手牌、UNIT_CHARGED 增加 boosts |
| 验证层 | ✅ | customValidator：检查 discardCardIds 非空、每张为单位卡、不与弓箭手同名、互相不同名 |
| UI层 | ✅ | requiresButton=true, activationContext='beforeAttack', quickCheck 检查手牌有非同名单位 |
| i18n层 | ✅ | zh-CN/en 均有 holy_arrow 的 name/description |
| 测试层 | ✅ | 7个测试：弃1张+1魔力+1战力、弃多张、同名拒绝、与弓箭手同名拒绝、非攻击阶段拒绝、DECLARE_ATTACK beforeAttack 集成、空列表拒绝 |

### 结论
✅ 圣光箭实现完整，无 bug。
