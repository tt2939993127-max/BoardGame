# 审计报告 7.4 - 先锋军团事件卡

## 1. 圣洁审判 (paladin-holy-judgment)

### 权威描述
> 将2点充能放置到本事件上。
> 持续：友方士兵获得战力+1。
> 在你的回合开始时，你可以消耗1点充能，以代替弃除本事件。每当一个友方单位被消灭时，从本事件上移除1点充能。

### 独立交互链

**链A：打出时放置2点充能**
1. 打出事件卡
2. 放入主动事件区
3. 设置 charges=2

**链B：持续效果 - 友方士兵+1战力**
1. 条件：主动事件区有圣洁审判且 charges>0
2. 效果：友方士兵（common）+1战力

**链C：友方单位被消灭时移除1充能**
1. 触发条件：友方单位被消灭（UNIT_DESTROYED）
2. 效果：charges-1
3. 充能归零时自动弃置

**链D：回合开始消耗充能代替弃置**
1. 触发条件：回合开始
2. 可选操作：消耗1充能
3. 效果：保留事件卡（不弃置）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | 事件卡配置：eventType='legendary', playPhase='attack', isActive=true |
| 注册层 | ✅ | `execute/eventCards.ts` PALADIN_HOLY_JUDGMENT case 处理 |
| 执行层 | ✅ | 打出时发射 FUNERAL_PYRE_CHARGED(charges=2)；链B 在 abilityResolver.ts calculateEffectiveStrength 中处理 |
| 状态层 | ✅ | reduce.ts: UNIT_DESTROYED 时检查圣洁审判并减充能→归零弃置；FUNERAL_PYRE_CHARGED 设置充能→归零弃置 |
| 验证层 | ✅ | 通过 isActive 和 playPhase 验证 |
| UI层 | ✅ | 主动事件区显示 |
| i18n层 | ✅ | 事件卡 effect 描述在卡牌配置中 |
| 测试层 | ✅ | 7个测试：打出设置2充能、有充能时士兵+1战力、无充能不加、冠军不受加成、友方被消灭减充能、充能归零弃置、回合开始消耗充能归零弃置 |

### 结论
✅ 圣洁审判实现完整，无 bug。

---

## 2. 圣灵庇护 (paladin-holy-protection)

### 权威描述
> 持续：你的召唤师3个区格以内的友方士兵获得以下技能：
> 庇护：当本单位在一个回合中第一次被攻击时，该攻击造成的伤害至多为1点。

### 独立交互链

**链A：首次被攻击伤害上限1**
1. 条件：召唤师3格内的友方士兵
2. 条件：本回合未被攻击过（wasAttackedThisTurn=false）
3. 效果：伤害上限为1点

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | 事件卡配置：eventType='common', playPhase='magic', isActive=true |
| 注册层 | ✅ | `execute/eventCards.ts` PALADIN_HOLY_PROTECTION case（no-op，逻辑在 execute.ts） |
| 执行层 | ✅ | execute.ts 攻击解析：检查目标方有 holy_protection 主动事件→目标为 common→召唤师3格内→未被攻击过→hits 限制为1→发射 DAMAGE_REDUCED |
| 状态层 | ✅ | reduce.ts: UNIT_DAMAGED 设置 wasAttackedThisTurn=true；TURN_CHANGED 清除 wasAttackedThisTurn |
| 验证层 | ✅ | 通过 isActive 和 playPhase 验证 |
| UI层 | ✅ | 主动事件区显示 |
| i18n层 | ✅ | 事件卡 effect 描述在卡牌配置中 |
| 测试层 | ✅ | 5个测试：首次被攻击伤害限1、已被攻击不再庇护、超3格不庇护、冠军不受庇护、回合开始清除 wasAttackedThisTurn |

### 结论
✅ 圣灵庇护实现完整，无 bug。

---

## 3. 群体治疗 (paladin-mass-healing)

### 权威描述
> 从你的召唤师2个区格以内的每个友方士兵和英雄上移除2点伤害。

### 独立交互链

**链A：治疗召唤师2格内友方**
1. 找到召唤师位置
2. 遍历2格内友方士兵和英雄
3. 每个移除2点伤害

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | 事件卡配置：eventType='common', playPhase='move', cost=1, isActive=false |
| 注册层 | ✅ | `execute/eventCards.ts` PALADIN_MASS_HEALING case |
| 执行层 | ✅ | 找召唤师→遍历棋盘→2格内友方 common/champion→发射 UNIT_HEALED(amount=2) |
| 状态层 | ✅ | reduce.ts UNIT_HEALED：减少 damage（不低于0） |
| 验证层 | ✅ | 通过 playPhase='move' 和 cost=1 验证 |
| UI层 | ✅ | 手牌中显示，打出即生效 |
| i18n层 | ✅ | 事件卡 effect 描述在卡牌配置中 |
| 测试层 | ✅ | 3个测试：治疗2格内士兵和英雄、不治疗召唤师、不治疗超2格单位 |

### 结论
✅ 群体治疗实现完整，无 bug。

---

## 4. 重燃希望 (paladin-rekindle-hope)

### 权威描述
> 持续：你可以在你的回合中任意阶段召唤单位。你可以将单位召唤到你的召唤师相邻的区格。

### 独立交互链

**链A：任意阶段召唤**
1. 条件：主动事件区有重燃希望
2. 效果：非召唤阶段也可以召唤

**链B：召唤师相邻召唤**
1. 条件：主动事件区有重燃希望
2. 效果：额外允许召唤到召唤师相邻空格

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | 事件卡配置：eventType='common', playPhase='summon', isActive=true |
| 注册层 | ✅ | `execute/eventCards.ts` PALADIN_REKINDLE_HOPE case（no-op，逻辑在 validate.ts） |
| 执行层 | N/A | 纯验证层效果 |
| 状态层 | ✅ | 放入主动事件区 |
| 验证层 | ✅ | validate.ts SUMMON_UNIT：检查 hasRekindleHope→允许非召唤阶段→额外添加召唤师相邻位置到 validPositions |
| UI层 | ✅ | 主动事件区显示 |
| i18n层 | ✅ | 事件卡 effect 描述在卡牌配置中 |
| 测试层 | ✅ | 3个测试：非召唤阶段可召唤、召唤师相邻可召唤、无重燃希望时非召唤阶段拒绝 |

### 结论
✅ 重燃希望实现完整，无 bug。
