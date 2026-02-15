# 需求文档：召唤师战争语义深度审查（D6-D10 + 复杂语义拆解）

## 简介

对召唤师战争（SummonerWars）游戏进行补充审查，聚焦两个方向：(1) D6-D10 五个新维度的系统性检查（副作用传播、资源守恒、时序正确、幂等与重入、元数据一致）；(2) 使用复杂语义拆解方法论对充能系统差异矩阵、条件链真值表、跨机制语义交叉等复杂场景进行系统审查。本次审查是对已完成的 D1-D5 全链路审查（`summonerwars-full-audit` v1）的补充，不重复已覆盖的维度。

### 与 v1 审计的关系

v1 审计已完成：
- 6个阵营 50+ 能力 + 24 张事件卡的八层链路审查（D1-D5 覆盖）
- 数据查询一致性 grep（D4）
- 交叉影响检查（部分 D6）
- 审计反模式清单检查
- 修复 2 处 bug（BoardGrid.tsx getEffectiveLife、ice_ram stable 检查）

v2 补充审查聚焦：
- D6-D10 系统性维度检查
- 复杂语义拆解（充能系统差异矩阵、条件链真值表、跨机制语义交叉）
- v1 中标记为"低风险"但未深入的边界场景

## 术语表

- **审查系统**: 执行本次审查的 AI 代理与测试框架的组合
- **D6_副作用传播**: 新增效果是否触发已有机制的连锁反应（伤害→摧毁→魔力→弃置、消灭→感染/献祭/血腥狂怒/葬火）
- **D7_资源守恒**: 魔力（0-15）、伤害标记、充能、手牌、弃牌堆的增减在全流程中保持守恒
- **D8_时序正确**: 阶段流转钩子、能力触发顺序、攻击结算时序、回合结束清理顺序
- **D9_幂等与重入**: Undo 操作、刷新后 EventStream 重播、重复触发安全性
- **D10_元数据一致**: AbilityDef 的 trigger/type/tags 与下游逻辑判定一致
- **充能系统差异矩阵**: 逐字段对比不同阵营充能机制（获取方式、消耗方式、上限、衰减规则）的审查方法
- **条件链真值表**: 列出多条件组合的所有可能取值并验证每种组合行为的审查方法
- **跨机制语义交叉**: 多个独立机制在特定场景下产生交互时的行为验证
- **FlowHooks**: 阶段流转钩子，控制回合阶段的进入/退出逻辑
- **postProcessDeathChecks**: 每次命令执行后的死亡检测后处理
- **EventStream**: 事件流系统，用于 UI 消费游戏事件（特效/动画/音效）

## 需求

### 需求 1：副作用传播审查（D6）

**用户故事：** 作为开发者，我希望验证所有效果产生的事件能正确触发已有机制的连锁反应，以确保游戏逻辑的完整性。

#### 验收标准

1. WHEN 技能效果产生 UNIT_DAMAGED 事件 THEN THE 审查系统 SHALL 验证该事件被 postProcessDeathChecks 正确处理（伤害≥生命→UNIT_DESTROYED→弃置→魔力+1）
2. WHEN 技能效果产生 UNIT_DESTROYED 事件 THEN THE 审查系统 SHALL 验证所有"被消灭时"触发器正确响应：献祭（sacrifice）对相邻敌方造成1伤、感染（infection）从弃牌堆召唤疫病体、血腥狂怒（blood_rage）充能、葬火（NECRO_FUNERAL_PYRE）对相邻敌方造成1伤、无魂（soulless）不获魔力
3. WHEN 自伤效果（revive_undead 自伤2、blood_rune 自伤1）导致召唤师死亡 THEN THE 审查系统 SHALL 验证 postProcessDeathChecks 正确触发游戏结束（sys.gameover）
4. WHEN 连锁消灭发生（如献祭伤害导致另一个单位死亡） THEN THE 审查系统 SHALL 验证 postProcessDeathChecks 递归处理所有死亡，且不产生无限循环
5. WHEN 事件卡效果产生伤害（歼灭、地狱火之刃、寒冰冲撞） THEN THE 审查系统 SHALL 验证伤害事件被正确传播到死亡检测和后续触发器
6. WHEN 控制权转移（mind_capture/mind_control）后被控制单位被消灭 THEN THE 审查系统 SHALL 验证魔力归属正确（消灭方+1魔力，而非原始拥有者）

### 需求 2：资源守恒审查（D7）

**用户故事：** 作为开发者，我希望验证所有资源（魔力、伤害标记、充能、手牌、弃牌堆）的增减在全流程中保持守恒，以防止免费使用或重复扣费。

#### 验收标准

1. WHEN 魔力变化发生（弃牌+1、消灭敌方+1、建造-N、召唤-N、blood_rune-1、magic_addiction-1） THEN THE 审查系统 SHALL 验证魔力值始终在 [0, 15] 范围内（clampMagic），且不会因多个效果叠加而超出范围
2. WHEN 充能变化发生（blood_rage 充能、imposing/intimidate 充能、frost_axe 充能/消耗、ancestral_bond 转移） THEN THE 审查系统 SHALL 验证充能值正确增减，且转移操作守恒（源单位减少量 = 目标单位增加量）
3. WHEN 回合结束清理执行 THEN THE 审查系统 SHALL 验证 blood_rage 衰减2点正确执行（不低于0）、magic_addiction 扣魔力或自毁正确执行、tempAbilities 正确清除
4. WHEN 弃牌换魔力执行 THEN THE 审查系统 SHALL 验证弃牌数量 = 魔力增加量，且弃牌堆正确增加对应卡牌
5. WHEN 抽牌至5张执行 THEN THE 审查系统 SHALL 验证抽牌数量 = max(0, 5 - 手牌数)，且牌库为空时不洗混弃牌堆
6. WHEN 单位被消灭并进入弃牌堆 THEN THE 审查系统 SHALL 验证棋盘移除 + 弃牌堆增加守恒，且附加卡（frost_axe attachedUnits）同步弃置
7. WHEN 复活死灵从弃牌堆召唤 THEN THE 审查系统 SHALL 验证弃牌堆移除 + 棋盘增加守恒

### 需求 3：时序正确审查（D8）

**用户故事：** 作为开发者，我希望验证所有效果的触发顺序和生命周期与规则文档一致，以确保阶段流转、能力触发、攻击结算的时序正确。

#### 验收标准

1. WHEN 回合阶段流转执行 THEN THE 审查系统 SHALL 验证六阶段顺序正确：事件卡→召唤→移动→建造→攻击→魔力→抽牌，且 FlowHooks 在每个阶段入口/出口正确触发
2. WHEN 攻击结算执行 THEN THE 审查系统 SHALL 验证效果执行顺序：攻击声明→骰子投掷→伤害计算（含 rage/power_boost/fortress_elite 等被动加成）→伤害应用→afterAttack 触发器（telekinesis/soul_transfer/rapid_fire/fortress_power 等）
3. WHEN 多个 afterAttack 触发器同时存在（如 telekinesis + soul_transfer） THEN THE 审查系统 SHALL 验证触发顺序确定且不冲突
4. WHEN 阶段开始触发器执行（guidance 在召唤阶段开始、illusion 在移动阶段开始、blood_rune 在攻击阶段开始） THEN THE 审查系统 SHALL 验证触发时机与 FlowHooks 的 onPhaseStart 一致
5. WHEN 阶段结束触发器执行（feed_beast 在攻击阶段结束、ice_shards 在建造阶段结束） THEN THE 审查系统 SHALL 验证触发时机与 FlowHooks 的 onPhaseEnd 一致
6. WHEN 回合结束清理执行 THEN THE 审查系统 SHALL 验证清理顺序：blood_rage 衰减 → magic_addiction 检查 → tempAbilities 清除 → abilityUsageCount 重置 → mind_control 归还 → ACTIVE 事件卡 tick
7. WHEN 不活动惩罚检查执行 THEN THE 审查系统 SHALL 验证惩罚在正确的阶段（攻击阶段结束后）触发，且判定条件正确（本回合未移动且未攻击）

### 需求 4：幂等与重入审查（D9）

**用户故事：** 作为开发者，我希望验证 Undo 操作、重复触发、页面刷新等场景下游戏状态的正确性，以确保系统的健壮性。

#### 验收标准

1. WHEN 玩家执行 Undo 操作回退到使用能力之前的状态 THEN THE 审查系统 SHALL 验证充能、魔力、伤害标记、棋盘位置均正确恢复到使用前的值
2. WHEN usesPerTurn 限制的能力（revive_undead、blood_rune、imposing、intimidate、rapid_fire）被 Undo 后重新执行 THEN THE 审查系统 SHALL 验证 abilityUsageCount 正确回退，能力可再次使用
3. WHEN EventStream 消费者在页面刷新后重新挂载 THEN THE 审查系统 SHALL 验证消费者跳过历史事件，不会重播已处理的动画/音效
4. WHEN 同一个 UNIT_DESTROYED 事件被多个触发器监听（如 blood_rage + 感染 + 葬火） THEN THE 审查系统 SHALL 验证每个触发器只执行一次，不会因事件重播而重复触发

### 需求 5：元数据一致审查（D10）

**用户故事：** 作为开发者，我希望验证所有 AbilityDef 的 trigger/type/tags 与下游逻辑判定完全一致，以防止静默的逻辑分支错误。

#### 验收标准

1. WHEN 审查任意 AbilityDef 的 trigger 字段 THEN THE 审查系统 SHALL 验证 trigger 值与实际触发路径一致（activated → 玩家主动激活、passive → 自动触发、afterAttack → 攻击后触发、onDamageCalculation → 伤害计算时触发）
2. WHEN 审查 AbilityDef 的 requiredPhase 字段 THEN THE 审查系统 SHALL 验证 FlowHooks 在对应阶段正确检查该能力的可用性
3. WHEN 审查 AbilityDef 的 usesPerTurn 字段 THEN THE 审查系统 SHALL 验证 abilityUsageCount 追踪逻辑与 usesPerTurn 限制一致，且回合结束时正确重置
4. WHEN 审查 AbilityDef 的 interactionChain 字段 THEN THE 审查系统 SHALL 验证 interactionChain 的 steps 与 UI 实际交互步骤一致，payloadContract 的 required 字段与执行器读取的 payload 字段一致
5. WHEN 审查 AbilityDef 的 customValidator 字段 THEN THE 审查系统 SHALL 验证 customValidator 的检查条件与权威描述中的限定条件完全对应，无遗漏无多余

### 需求 6：充能系统差异矩阵审查

**用户故事：** 作为开发者，我希望对所有使用充能机制的能力进行逐字段差异对比，以确保充能获取、消耗、上限、衰减在定义层和执行层完全一致。

#### 验收标准

1. WHEN 审查所有充能相关能力 THEN THE 审查系统 SHALL 构建「字段 × 能力」差异矩阵，标注每个能力的充能获取方式、消耗方式、上限、衰减规则、战力/生命/移动加成公式
2. WHEN 差异矩阵中存在"有上限"的能力（power_up/life_up/speed_up 最多+5） THEN THE 审查系统 SHALL 验证上限在 calculateEffectiveStrength/getEffectiveLife/getMovementEnhancements 中正确执行 min(charge, 5)
3. WHEN 差异矩阵中存在"衰减"的能力（blood_rage 回合结束-2） THEN THE 审查系统 SHALL 验证衰减在 FlowHooks.onTurnEnd 中正确执行，且不低于0
4. WHEN 差异矩阵中存在"转移"的能力（ancestral_bond、frost_axe） THEN THE 审查系统 SHALL 验证转移操作守恒（源减少 = 目标增加），且转移后源单位充能不低于0
5. IF 发现充能机制中定义层与执行层不一致（如定义声明上限5但执行层未裁剪） THEN THE 审查系统 SHALL 记录为"充能定义-执行不一致"缺陷

### 需求 7：条件链真值表审查

**用户故事：** 作为开发者，我希望对攻击验证、移动验证、能力触发等多条件组合场景构建真值表并验证每种组合，以确保条件逻辑无遗漏。

#### 验收标准

1. WHEN 审查攻击验证逻辑（canAttackEnhanced） THEN THE 审查系统 SHALL 构建条件真值表（isAdjacent × isRanged × isPathClear × hasWall × ferocity × attackCount），验证每种组合的返回值正确
2. WHEN 审查移动验证逻辑（getValidMoveTargetsEnhanced） THEN THE 审查系统 SHALL 构建条件真值表（baseMove × extraMove × flying × climb × charge × immobile × slow），验证每种组合的移动范围正确
3. WHEN 审查能力可用性判定（canActivateAbility） THEN THE 审查系统 SHALL 构建条件真值表（requiredPhase × usesPerTurn × customValidator × hasLegalTargets），验证每种组合的可用性判定正确
4. WHEN 审查伤害计算逻辑（calculateEffectiveStrength） THEN THE 审查系统 SHALL 构建条件真值表（baseStrength × rage × power_boost × fortress_elite × charge × radiant_shot × swarm × holy_arrow），验证每种加成的叠加逻辑正确
5. IF 真值表中发现某种条件组合未被代码覆盖 THEN THE 审查系统 SHALL 记录为"条件分支遗漏"缺陷并补充测试

### 需求 8：跨机制语义交叉审查

**用户故事：** 作为开发者，我希望验证多个独立机制在特定场景下的交叉行为正确，以确保复杂场景下的游戏逻辑无误。

#### 验收标准

1. WHEN 充能单位被交缠颂歌连接 THEN THE 审查系统 SHALL 验证充能加成（power_up/life_up/speed_up）是否通过交缠共享传递给连接的单位，以及这是否符合规则意图
2. WHEN 幻化（illusion）复制了充能相关能力（power_up/life_up/speed_up） THEN THE 审查系统 SHALL 验证复制的能力是否正确读取复制者自身的充能值（而非被复制者的充能值）
3. WHEN 力量颂歌（chant_of_power）授予 power_up 给无充能的单位 THEN THE 审查系统 SHALL 验证 power_up 在充能为0时不产生加成，且不会因缺少充能字段而报错
4. WHEN 守卫（guardian）与飞行（flying）交互 THEN THE 审查系统 SHALL 验证飞行单位是否受守卫强制攻击限制（规则：守卫只限制相邻攻击，飞行单位可远程攻击绕过）
5. WHEN 践踏（trample）穿过有献祭（sacrifice）的单位 THEN THE 审查系统 SHALL 验证践踏伤害是否触发献祭（如果践踏伤害导致单位死亡）
6. WHEN 冲锋（charge）与缓慢（slow）同时存在 THEN THE 审查系统 SHALL 验证移动范围计算正确（charge 的1-4格直线 vs slow 的-1移动如何交互）
7. WHEN 不活动惩罚与禁足（immobile）交互 THEN THE 审查系统 SHALL 验证禁足单位不移动是否触发不活动惩罚（规则：禁足是被动限制，不应算作"不活动"）
8. WHEN 活体结构（mobile_structure）与建筑相关能力交互 THEN THE 审查系统 SHALL 验证寒冰魔像在所有建筑相关逻辑中被正确识别（frost_bolt/ice_shards/cold_snap/structure_shift/living_gate/召唤位置）

### 需求 9：审查结果修复与测试补充

**用户故事：** 作为开发者，我希望审查发现的所有问题都有对应的代码修复和测试覆盖，以确保问题不会回归。

#### 验收标准

1. WHEN 审查发现代码缺陷 THEN THE 审查系统 SHALL 修复缺陷代码并确保现有测试仍然通过
2. WHEN 审查发现缺失的测试覆盖 THEN THE 审查系统 SHALL 补充 GameTestRunner 行为测试，覆盖正向（触发→生效→状态正确）和负向（不触发→状态未变）场景
3. WHEN 审查完成条件链真值表 THEN THE 审查系统 SHALL 为每个真值表中的关键条件组合补充至少一个测试用例
4. WHEN 审查完成跨机制语义交叉 THEN THE 审查系统 SHALL 为每个交叉场景补充至少一个集成测试用例
5. WHEN 所有修复完成 THEN THE 审查系统 SHALL 运行全部 SummonerWars 测试套件并确保全部通过
