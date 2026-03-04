# 审计报告 7.2 - 先锋军团冠军能力

> 审计日期：2025-01
> 审计范围：guidance、fortress_elite、radiant_shot、divine_shield
> 审计方法：六步全链路审查（锁定权威描述→拆分交互链→逐链八层→grep消费点→交叉影响→数据查询一致性）

## 权威描述来源

i18n `public/locales/zh-CN/game-summonerwars.json`（规则文档无阵营详情）

---

## 1. 指引 (guidance)

### 权威描述
> 在你的召唤阶段开始时，抓取两张卡牌。

### 独立交互链

**链A：召唤阶段开始抓2张牌**
原子步骤：
1. 触发条件：召唤阶段开始时 → `trigger: 'onPhaseStart'`, `requiredPhase: 'summon'`
2. 抓取2张卡牌 → `Math.min(2, deck.length)` + `CARD_DRAWN` 事件
3. 牌组不足时按实际数量 → `Math.min` 保证

自检：原文每句话均被覆盖 ✅

### 八层链路矩阵

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-paladin.ts`: trigger=onPhaseStart, effects=[custom guidance_draw], requiredPhase=summon, customValidator 检查牌组非空 |
| 注册层 | ✅ | `executors/paladin.ts`: `abilityExecutorRegistry.register('guidance', ...)` |
| 执行层 | ✅ | executor: `Math.min(2, guidancePlayer.deck.length)` → 发射 `CARD_DRAWN` 事件 |
| 状态层 | ✅ | `reduce.ts` CARD_DRAWN 处理：从牌组顶部移入手牌 |
| 验证层 | ✅ | customValidator 检查牌组非空；无限定条件泄漏风险 |
| UI层 | ✅ | requiresButton=false, activationType='directExecute'（自动触发，无需玩家交互） |
| i18n层 | ✅ | zh-CN: "指引"/"在你的召唤阶段开始时，抓取两张卡牌。" en: "Guidance"/"At the start of your Summon phase, draw two cards." |
| 测试层 | ✅ | `abilities-phase-triggered.test.ts`: 正常抓2张、牌组1张只抓1张、牌组为空不触发；`abilities-paladin.test.ts` 额外覆盖；均验证状态变更（手牌数量） |

### 结论
✅ 指引实现完整，无 bug。

---

## 2. 城塞精锐 (fortress_elite)

### 权威描述
> 本单位2个区格以内每有一个友方城塞单位，则获得战力+1。

### 独立交互链

**链A：被动战力加成**
原子步骤：
1. 条件：2格内（曼哈顿距离≤2）有友方城塞单位 → `manhattanDistance(unit.position, {row, col}) <= 2`
2. 每个城塞单位+1战力 → 遍历棋盘累加
3. 城塞判定 → `isFortressUnit(other.card)`（task 7.1 已修复为名称匹配）
4. 排除自身 → `other.cardId !== unit.cardId`
5. 仅友方 → `other.owner === unit.owner`

自检：原文每句话均被覆盖 ✅

### 八层链路矩阵

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-paladin.ts`: trigger=onDamageCalculation, effects=[custom fortress_elite_boost] |
| 注册层 | ✅ | `abilityResolver.ts` calculateEffectiveStrength 中通过 `abilityIds.has('fortress_elite')` 直接处理 |
| 执行层 | ✅ | 遍历棋盘，统计2格内友方城塞单位数量（`isFortressUnit` + `manhattanDistance <= 2` + `owner === unit.owner` + `cardId !== unit.cardId`） |
| 状态层 | ✅ | 被动计算，不修改状态（纯函数） |
| 验证层 | N/A | 被动技能无需验证 |
| UI层 | N/A | 被动技能无按钮；UI 通过 `getStrengthBoostForDisplay` 显示加成 |
| i18n层 | ✅ | zh-CN/en 均有 fortress_elite 的 name/description |
| 测试层 | ✅ | `abilities-paladin.test.ts`: 5个测试覆盖无城塞=基础值、1个+1、2个+2、超3格不计、敌方不计；`entity-chain-integrity.test.ts` 验证注册完整性 |

### 交叉影响检查
- 交缠颂歌共享：如果非城塞单位通过交缠获得 fortress_elite，会正确计算（`abilityIds` 来自 `getUnitAbilities` 含交缠共享）✅
- 心灵捕获后：被控制单位的 `unit.owner` 已更新，fortress_elite 会按新 owner 计算友方城塞 ✅

### 结论
✅ 城塞精锐实现完整，无 bug。

---

## 3. 辉光射击 (radiant_shot)

### 权威描述
> 你每拥有2点魔力，则本单位获得战力+1。

### 独立交互链

**链A：被动战力加成**
原子步骤：
1. 读取玩家魔力 → `state.players[unit.owner]?.magic ?? 0`
2. 每2点魔力+1战力 → `Math.floor(playerMagic / 2)`
3. 向下取整 → `Math.floor` 保证

自检：原文每句话均被覆盖 ✅

### 八层链路矩阵

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-paladin.ts`: trigger=onDamageCalculation, effects=[custom radiant_shot_boost] |
| 注册层 | ✅ | `abilityResolver.ts` calculateEffectiveStrength 中通过 `abilityIds.has('radiant_shot')` 直接处理 |
| 执行层 | ✅ | `Math.floor(playerMagic / 2)` 加到 strength；使用 `unit.owner` 读取正确玩家的魔力 |
| 状态层 | ✅ | 被动计算，不修改状态（纯函数） |
| 验证层 | N/A | 被动技能无需验证 |
| UI层 | N/A | 被动技能无按钮；UI 通过 `getStrengthBoostForDisplay` 显示加成 |
| i18n层 | ✅ | zh-CN/en 均有 radiant_shot 的 name/description |
| 测试层 | ✅ | `abilities-paladin.test.ts`: 4个测试覆盖 0魔力=基础值、1魔力=基础值、4魔力+2、10魔力+5；均验证 `calculateEffectiveStrength` 返回值 |

### 交叉影响检查
- 心灵捕获后：被控制单位的 `unit.owner` 已更新，radiant_shot 会读取新 owner 的魔力 ✅
- 交缠颂歌共享：如果非雅各布单位通过交缠获得 radiant_shot，会正确按该单位 owner 的魔力计算 ✅

### 结论
✅ 辉光射击实现完整，无 bug。

---

## 4. 神圣护盾 (divine_shield)

### 权威描述
> 每当本单位3个区格以内的一个友方城塞单位成为攻击的目标时，投掷2个骰子。每掷出一个❤️，则攻击单位在本次攻击的战力-1，战力最少为1点。

### 独立交互链

**链A：友方城塞被攻击时投骰减伤**
原子步骤：
1. 触发条件：友方城塞单位被攻击 → `isFortressUnit(targetCell.unit.card)` + `targetOwner === shieldUnit.owner`
2. 科琳在3格内 → `manhattanDistance({row, col}, target) <= 3`
3. 科琳拥有 divine_shield → `getUnitAbilities(shieldUnit, workingCore).includes('divine_shield')`
4. 投掷2个骰子 → `rollDice(2, () => random.random())`
5. 计算❤️（melee）数量 → `shieldDice.filter(r => r === 'melee').length`
6. 减少命中数 → `Math.min(shieldMelee, hits - 1)` 保证最