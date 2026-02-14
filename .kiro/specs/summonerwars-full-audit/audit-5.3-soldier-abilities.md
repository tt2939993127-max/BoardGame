# 审计报告 5.3：欺心巫族士兵能力

## 审计范围

6个士兵能力：迅捷（swift）、远射（ranged）、念力（telekinesis）、幻化（illusion）、迷魂（evasion）、缠斗（rebound）

## 权威描述（来源：i18n + 规则文档）

| 能力 | 权威描述 |
|------|----------|
| 迅捷（swift） | 当本单位移动时，可以额外移动1个区格。 |
| 远射（ranged） | 本单位可以攻击至多4个直线区格的目标。 |
| 念力（telekinesis） | 在本单位攻击之后，或代替本单位的攻击，可以指定其2个区格以内的一个士兵或英雄为目标，将目标推拉1个区格。 |
| 幻化（illusion） | 在你的移动阶段开始时，可以指定本单位3个区格以内的一个士兵为目标。本单位获得目标的所有技能，直到回合结束。 |
| 迷魂（evasion） | 当一个相邻敌方单位攻击时，如果掷出一个或更多✦，则本次攻击造成的伤害减少1点。 |
| 缠斗（rebound） | 每当一个相邻敌方单位因为移动或被推拉而远离本单位时，立刻对该单位造成1点伤害。 |

## 卡牌配置验证

| 单位 | 能力 | 配置文件 |
|------|------|----------|
| 清风弓箭手 | swift, ranged | `config/factions/trickster.ts` ✅ |
| 清风法师 | telekinesis, telekinesis_instead | `config/factions/trickster.ts` ✅ |
| 心灵巫女 | illusion | `config/factions/trickster.ts` ✅ |
| 掷术师 | evasion, rebound | `config/factions/trickster.ts` ✅ |

---

## 1. 迅捷（swift）— 低风险

### 原子步骤
1. 当本单位移动时 → 触发 `onMove` 效果
2. 额外移动1个区格 → `extraMove: { value: 1 }`

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-trickster.ts`: trigger='onMove', effects=[extraMove value=1] |
| 注册层 | ✅ | 通过 `TRICKSTER_ABILITIES` 注册到 `abilityRegistry` |
| 执行层 | ✅ | `helpers.getUnitMoveEnhancements` 遍历 onMove 效果，累加 extraDistance |
| 状态层 | ✅ | 移动验证通过后 `UNIT_MOVED` 事件由 reduce 处理位置变更 |
| 验证层 | ✅ | `canMoveToEnhanced` 使用 `getUnitMoveEnhancements` 计算 maxDistance=3 |
| UI层 | ✅ | 移动高亮通过 `getValidMoveTargetsEnhanced` 自动扩展范围 |
| i18n层 | ✅ | zh-CN/en 均有 `abilities.swift` 条目 |
| 测试层 | ✅ | `entity-chain-integrity.test.ts` 验证 swift 单位 extraDistance=1 |

### 发现：无

---

## 2. 远射（ranged）— 低风险

### 原子步骤
1. 本单位攻击时 → 检查攻击范围
2. 攻击范围扩展到4格直线 → `getEffectiveAttackRange` 返回 4

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-trickster.ts`: trigger='passive', effects=[custom actionId='extended_range' params={range:4}] |
| 注册层 | ✅ | 通过 `TRICKSTER_ABILITIES` 注册到 `abilityRegistry` |
| 执行层 | ✅ | `helpers.getEffectiveAttackRange` 检查 abilities.includes('ranged') 返回 4 |
| 状态层 | ✅ | 无状态变更（被动效果） |
| 验证层 | ✅ | `canAttackEnhanced` 使用 `getEffectiveAttackRange` 计算范围 |
| UI层 | ✅ | 攻击高亮通过 `getValidAttackTargetsEnhanced` 自动扩展范围 |
| i18n层 | ✅ | zh-CN/en 均有 `abilities.ranged` 条目 |
| 测试层 | ✅ | `entity-chain-integrity.test.ts` 验证 ranged 单位范围=4，普通单位=卡牌值 |

### 发现：无

---

## 3. 念力（telekinesis）— 高风险交互

### 原子步骤
1. 本单位攻击之后 → afterAttack 触发
2. 或代替本单位的攻击 → activated 触发（telekinesis_instead）
3. 指定2格内的一个士兵或英雄 → 目标选择（排除召唤师）
4. 将目标推拉1格 → 玩家选择推/拉方向

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `telekinesis`: trigger='afterAttack', pushPull distance=1, range=2; `telekinesis_instead`: trigger='activated', costsAttackAction=true |
| 注册层 | ✅ | 两个 ID 均注册到 abilityRegistry + abilityExecutorRegistry |
| 执行层 | ✅ | `executors/trickster.ts`: `executeTelekinesis(ctx, 2)` 共享逻辑，检查 stable 免疫 |
| 状态层 | ✅ | `reduce.ts` UNIT_PUSHED/UNIT_PULLED 正确移动单位位置 |
| 验证层 | ✅ | customValidator 检查：目标存在、距离≤2、非召唤师；telekinesis_instead 额外检查未攻击+攻击次数 |
| UI层 | ✅ | afterAttack → `afterAttackAbilityMode` → 选目标 → `telekinesisTargetMode` → 选推/拉方向 → 确认/取消 |
| i18n层 | ✅ | zh-CN/en 均有 telekinesis、telekinesisInstead 按钮标签和能力描述 |
| 测试层 | ✅ | `entity-chain-integrity.test.ts` 有 afterAttack 触发测试 |

### 发现：无

---

## 4. 幻化（illusion）— 高风险交互

### 原子步骤
1. 移动阶段开始时 → onPhaseStart 触发
2. 可以指定3格内的一个士兵 → 目标选择（任意阵营，排除自身）
3. 获得目标的所有技能 → 复制到 tempAbilities
4. 直到回合结束 → TURN_CHANGED 时清除 tempAbilities

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | trigger='onPhaseStart', effects=[custom actionId='illusion_copy' params={phase:'move'}], targetSelection 限制 common + range 3 |
| 注册层 | ✅ | abilityRegistry + abilityExecutorRegistry('illusion') |
| 执行层 | ✅ | `executors/trickster.ts`: 读取 `getUnitAbilities(target, core)` 复制所有技能（含 tempAbilities），生成 ABILITIES_COPIED 事件 |
| 状态层 | ✅ | `reduce.ts` ABILITIES_COPIED: 将 copiedAbilities 写入源单位 tempAbilities；TURN_CHANGED: 解构移除 tempAbilities |
| 验证层 | ✅ | customValidator 检查：目标存在、unitClass='common'、距离 1-3（排除自身 dist=0） |
| UI层 | ✅ | flowHooks onPhaseEnter(move) → ABILITY_TRIGGERED(illusion_copy) → useGameEvents 设置 abilityMode('illusion') → 选目标 → ACTIVATE_ABILITY → 有取消按钮 |
| i18n层 | ✅ | zh-CN/en 均有 abilities.illusion 描述和 abilityButtons.illusion 按钮标签 |
| 测试层 | ✅ | `phase-ability-integration.test.ts` 验证 illusion_copy 事件包含 sourcePosition |

### 语义边界检查
- "一个士兵" — 无敌我限定 → 实现正确，targetSelection 无 isOwner 过滤 ✅
- "可以" — 可选效果 → UI 有取消按钮 ✅
- "直到回合结束" — TURN_CHANGED 清除 tempAbilities ✅

### 发现：无

---

## 5. 迷魂（evasion）— 中风险

### 原子步骤
1. 相邻敌方单位攻击时 → 检查攻击者相邻是否有 evasion 单位
2. 掷出一个或更多✦ → 检查 diceResults 包含 'special'
3. 伤害减少1点 → hits = max(0, hits - evasionCount)

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | trigger='onAdjacentEnemyAttack', effects=[reduceDamage value=1 condition='onSpecialDice'] |
| 注册层 | ✅ | 通过 TRICKSTER_ABILITIES 注册 |
| 执行层 | ✅ | `execute.ts` DECLARE_ATTACK: 检查 hasSpecialDice → getEvasionUnits → 每个减伤1 → DAMAGE_REDUCED 事件 |
| 状态层 | ✅ | 减伤在 hits 计算中直接应用，无额外状态变更 |
| 验证层 | ✅ | 无需验证（被动触发） |
| UI层 | ✅ | DAMAGE_REDUCED 事件可被 UI 消费显示减伤效果 |
| i18n层 | ✅ | zh-CN/en 均有 abilities.evasion 描述 |
| 测试层 | ✅ | `entity-chain-integrity.test.ts` 验证攻击者相邻有迷魂单位且掷出✦时减伤 |

### 语义边界检查
- "相邻敌方单位" → `getEvasionUnits` 检查 `unit.owner !== attackerOwner` ✅
- "一个或更多✦" → `diceResults.some(r => r === 'special')` ✅
- 多个迷魂单位叠加 → `reduction = evasionUnits.length` ✅

### 发现：无

---

## 6. 缠斗（rebound）— 中风险

### 原子步骤
1. 相邻敌方单位移动远离 → 检查移动前后距离变化
2. 或被推拉远离 → 检查推拉前后距离变化
3. 造成1点伤害 → UNIT_DAMAGED 事件

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | trigger='onAdjacentEnemyLeave', effects=[damage target='target' value=1] |
| 注册层 | ✅ | 通过 TRICKSTER_ABILITIES 注册；`hasEntangleAbility` 检查 'rebound' 或 'entangle' |
| 执行层 | ✅（修复后） | MOVE_UNIT: `getEntangleUnits` + 距离检查 ✅；UNIT_PUSHED/UNIT_PULLED: **新增后处理0** ✅ |
| 状态层 | ✅ | UNIT_DAMAGED 由 reduce 正确应用伤害 |
| 验证层 | ✅ | 无需验证（被动触发） |
| UI层 | ✅ | UNIT_DAMAGED 事件可被 UI 消费显示伤害效果 |
| i18n层 | ✅ | zh-CN/en 均有 abilities.rebound 描述 |
| 测试层 | ✅ | `entity-chain-integrity.test.ts` 验证移动远离时受1点伤害 |

### 发现与修复

#### 🔴 BUG-1（已修复）：缠斗/反弹不在推拉时触发

- **严重度**：high
- **描述**：规则明确说"因为移动**或被推拉**而远离"，但实现只在 `MOVE_UNIT` 命令中检查缠斗，`UNIT_PUSHED`/`UNIT_PULLED` 事件路径完全缺失缠斗检查。
- **影响**：念力/高阶念力/震慑等推拉效果将敌方推离缠斗单位时，不会触发缠斗伤害。
- **修复**：在 `execute.ts` 后处理管线中新增"后处理0"，扫描所有 `UNIT_PUSHED`/`UNIT_PULLED` 事件，检查被推拉单位原位置相邻是否有敌方缠斗单位，若推拉后距离增大则注入 `UNIT_DAMAGED` 事件。
- **位置**：`src/games/summonerwars/domain/execute.ts` 后处理管线
- **测试**：861 测试全部通过，无回归

---

## 数据查询一致性审查

### `.card.abilities` 直接访问
| 文件 | 行号 | 判定 |
|------|------|------|
| helpers.ts:541 | `getUnitBaseAbilities` 内部 | ✅ 合法（统一入口本身） |
| execute.ts:446 | `attachedUnits.card.abilities` | ✅ 合法（附加卡牌，非单位本身） |
| abilityResolver.ts:609,622,638,645 | 统一查询函数内部 | ✅ 合法 |

### `.card.strength` 直接访问
| 文件 | 行号 | 判定 |
|------|------|------|
| execute.ts:418,516 | `baseStrength` 事件字段 | ✅ 合法（展示用基础值） |
| abilityResolver.ts:116,742,912 | 统一查询函数内部 | ✅ 合法 |

### `.card.life` 直接访问
| 文件 | 行号 | 判定 |
|------|------|------|
| BoardGrid.tsx:388 | `unit.card.life` 用于血条显示 | ⚠️ 应使用 `getEffectiveLife` |
| abilityResolver.ts:114,936,961,985 | 统一查询函数内部 | ✅ 合法 |

> **注**：BoardGrid.tsx:388 的 `.card.life` 绕过问题影响的是炽原精灵的 `life_up` 能力（生命强化），不在本次审计的6个能力范围内。已记录，建议在后续审计中修复。

---

## 交叉影响检查

1. **缠斗 × 推拉**：修复后，念力/高阶念力/震慑/结构变换等推拉效果均会触发缠斗伤害 ✅
2. **幻化 × 交缠颂歌**：幻化复制使用 `getUnitAbilities(target, core)` 包含交缠共享的技能 ✅
3. **幻化 × 缠斗**：心灵巫女通过幻化获得 rebound 后，敌方远离会触发缠斗（因为 `getUnitAbilities` 包含 tempAbilities） ✅
4. **迷魂 × 幻化**：心灵巫女通过幻化获得 evasion 后，相邻敌方攻击掷出✦时减伤（`hasEvasionAbility` 使用 `getUnitAbilities`） ✅
5. **稳固 × 念力**：稳固单位免疫念力推拉（`executeTelekinesis` 检查 `getUnitAbilities(target).includes('stable')`） ✅

---

## 审计反模式清单检查

| # | 反模式 | 检查结果 |
|---|--------|----------|
| 1 | "可以/可选"效果自动执行 | ✅ 念力/幻化均有玩家选择 UI + 取消按钮 |
| 2 | 测试只断言事件发射 | ✅ 测试验证状态变更（extraDistance、attackRange、damage） |
| 3 | `as any` 绕过类型检查 | ✅ 未发现相关 `as any` |
| 4 | 审计矩阵测试层标✅但只有事件断言 | ✅ 测试覆盖命令→事件→状态变更 |
| 5 | 消费点绕过统一查询入口 | ✅ 无绕过（BoardGrid.tsx 问题不影响本次6个能力） |
| 6 | 对其他单位的技能查询绕过 | ✅ 幻化复制使用 `getUnitAbilities` |
| 7 | 纵向通过不做横向检查 | ✅ 已做数据查询一致性 grep |
| 8 | 限定条件使用不携带约束的全局机制 | ✅ 念力的"非召唤师"限定在 validator + executor 双重检查 |
| 9 | UI 层直接读底层字段 | ⚠️ BoardGrid.tsx `.card.life`（不影响本次6个能力） |

---

## 总结

| 严重度 | 数量 | 描述 |
|--------|------|------|
| high | 1 | 缠斗不在推拉时触发（**已修复**） |
| info | 1 | BoardGrid.tsx `.card.life` 绕过（不影响本次能力，记录待修复） |

**修复验证**：861 测试全部通过，无回归。
