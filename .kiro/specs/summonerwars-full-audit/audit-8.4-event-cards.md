# 审计 8.4 - 洞穴地精事件卡

## 1. 群情激愤（GOBLIN_FRENZY）

### 权威描述
传奇事件。所有费用为0的友方单位（非召唤师）获得一次额外攻击。

### 原子步骤拆解
1. 打出条件：魔力阶段，花费1魔力
2. 筛选目标：场上所有 owner=currentPlayer + cost=0 + unitClass≠summoner 的单位
3. 授予额外攻击：每个目标发射 EXTRA_ATTACK_GRANTED 事件

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config/factions/goblin.ts 定义 goblin-frenzy, eventType=legendary, cost=1 |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.GOBLIN_FRENZY |
| 执行层 | ✅ | 遍历 getPlayerUnits，过滤 cost=0 且非 summoner，发射 EXTRA_ATTACK_GRANTED |
| 状态层 | ✅ | reduce EXTRA_ATTACK_GRANTED 正确处理 |
| 验证层 | ✅ | 标准事件卡验证（手牌中、魔力足够、阶段正确） |
| UI层 | ✅ | 标准事件卡打出 UI |
| i18n层 | ✅ | zh-CN/en 均有 goblin-frenzy 条目 |
| 测试层 | ✅ | 2个测试：0费单位获得额外攻击+非0费不获得、召唤师不获得 |

✅ 全部通过。

---

## 2. 潜行（GOBLIN_SNEAK）

### 权威描述
推拉任意数量的费用为0的友方单位各1格。

### 原子步骤拆解
1. 打出条件：移动阶段，花费0魔力
2. 选择目标：任意数量的0费友方单位
3. 为每个目标选择方向：推拉1格
4. 执行推拉：每个目标发射 UNIT_PUSHED 事件

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config/factions/goblin.ts 定义 goblin-sneak, cost=0, playPhase=move |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.GOBLIN_SNEAK |
| 执行层 | ✅ | 读取 sneakDirections 数组，逐个发射 UNIT_PUSHED 事件 |
| 状态层 | ✅ | reduce UNIT_PUSHED 正确处理位置变更 |
| 验证层 | ✅ | 标准事件卡验证 + 执行层内部验证0费友方 |
| UI层 | ✅ | 需要玩家选择每个单位的推拉方向 |
| i18n层 | ✅ | zh-CN/en 均有 goblin-sneak 条目 |
| 测试层 | ✅ | 2个测试：单个推拉、多个同时推拉 |

✅ 全部通过。

---

## 3. 不屈不挠（GOBLIN_RELENTLESS）

### 权威描述
ACTIVE 持续事件。友方士兵（common）被消灭时，返回手牌而非进入弃牌堆。自毁原因（feed_beast/magic_addiction）不触发。

### 原子步骤拆解
1. 打出条件：魔力阶段，花费1魔力，放入主动事件区
2. 持续效果：reduce UNIT_DESTROYED 时检查
3. 触发条件：owner=当前玩家 + unitClass=common + reason≠自毁
4. 效果：卡牌返回手牌而非弃牌堆

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config/factions/goblin.ts 定义 goblin-relentless, isActive=true, cost=1 |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.GOBLIN_RELENTLESS（空，由 isActive 自动处理） |
| 执行层 | ✅ | reduce.ts UNIT_DESTROYED: 检查 hasRelentless + isCommon + !isSelfDestruct |
| 状态层 | ✅ | 满足条件→卡牌加入 hand 而非 discard |
| 验证层 | ✅ | 标准事件卡验证 |
| UI层 | ✅ | 标准 ACTIVE 事件卡 UI |
| i18n层 | ✅ | zh-CN/en 均有 goblin-relentless 条目 |
| 测试层 | ✅ | 4个测试：士兵返回手牌、冠军不触发、自毁不触发、无事件时正常弃牌 |

✅ 全部通过。

---

## 4. 成群结队（GOBLIN_SWARM）

### 权威描述
ACTIVE 持续事件。友方单位攻击时，每有一个其它友方单位与目标相邻，攻击者+1战力。

### 原子步骤拆解
1. 打出条件：攻击阶段，花费0魔力，放入主动事件区
2. 持续效果：calculateEffectiveStrength 中检查
3. 计算加成：统计与 targetUnit 相邻的其它友方单位数量
4. 战力加成：每个相邻友方+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config/factions/goblin.ts 定义 goblin-swarm, isActive=true, cost=0, playPhase=attack |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.GOBLIN_SWARM（空，由 isActive 自动处理） |
| 执行层 | ✅ | abilityResolver.ts calculateEffectiveStrength: 检查 hasSwarm → 统计相邻友方数量 |
| 状态层 | N/A | 被动加成，无状态变更 |
| 验证层 | ✅ | 标准事件卡验证 |
| UI层 | ✅ | 战力显示通过 calculateEffectiveStrength 自动反映 |
| i18n层 | ✅ | zh-CN/en 均有 goblin-swarm 条目 |
| 测试层 | ✅ | 2个测试：2个友方相邻=+2战力、无事件时无加成 |

✅ 全部通过。

## 总结
洞穴地精4张事件卡全部通过八层链路审计，无 bug。
