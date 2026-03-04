# 需求文档：DiceThrone 语义审查（D6-D10 + 复杂语义拆解）

## 简介

对 DiceThrone 游戏进行补充审查，聚焦两个方向：(1) D6-D10 五个新维度的系统性检查（副作用传播、资源守恒、时序正确、幂等与重入、元数据一致）；(2) 使用复杂语义拆解方法论对升级变体差异、条件链真值表、跨机制语义交叉等复杂场景进行系统审查。本次审查是对已完成的 D1-D5 全链路审查的补充，不重复已覆盖的维度。

## 术语表

- **审查系统**: 执行本次审查的 AI 代理与测试框架的组合
- **D6_副作用传播**: 新增效果是否触发已有机制的连锁反应
- **D7_资源守恒**: 代价/消耗/限制是否正确扣除和恢复
- **D8_时序正确**: 效果的触发顺序和生命周期是否正确
- **D9_幂等与重入**: 重复触发/撤销重做是否安全
- **D10_元数据一致**: 声明的 categories/tags/meta 是否与实际行为匹配
- **升级变体差异矩阵**: 逐字段对比 L1/L2/L3 技能定义差异的审查方法
- **条件链真值表**: 列出多条件组合的所有可能取值并验证每种组合行为的审查方法
- **跨机制语义交叉**: 多个独立机制在特定场景下产生交互时的行为验证
- **CP**: 战斗点数（Combat Points），上限 15
- **Token**: 消耗性/被动状态指示物
- **FlowHooks**: 阶段流转钩子，控制回合阶段的进入/退出逻辑
- **PendingAttack**: 待结算攻击状态对象
- **PendingDamage**: 待处理伤害对象（Token 响应窗口使用）
- **EventStream**: 事件流系统，用于 UI 消费游戏事件

## 需求

### 需求 1：副作用传播审查（D6）

**用户故事：** 作为开发者，我希望验证所有效果产生的事件能正确触发已有机制的连锁反应，以确保游戏逻辑的完整性。

#### 验收标准

1. WHEN 技能效果产生 DAMAGE_DEALT 事件 THEN THE 审查系统 SHALL 验证该事件被所有消费者正确处理（HP 扣减、死亡检测、Token 响应窗口触发判定、伤害护盾消耗）
2. WHEN 技能效果产生 STATUS_APPLIED 事件（grantStatus） THEN THE 审查系统 SHALL 验证新施加的状态不会与已有的被动监听产生遗漏（如 onDamageReceived 触发器中的 thick_skin 护盾）
3. WHEN 技能效果产生 HEAL_APPLIED 事件 THEN THE 审查系统 SHALL 验证治疗量受 HP 上限（起始值+10=60）约束，且 reduce 中正确执行上限裁剪
4. WHEN 技能效果产生 TOKEN_GRANTED 事件 THEN THE 审查系统 SHALL 验证授予的 Token 数量受 stackLimit 约束，且超出部分被正确截断
5. WHEN upkeep 阶段的燃烧/中毒伤害产生 DAMAGE_DEALT 事件 THEN THE 审查系统 SHALL 验证该伤害标记为 undefendable 类型且不触发 Token 响应窗口
6. WHEN 攻击结算产生伤害且防御方拥有 onDamageReceived 被动触发器 THEN THE 审查系统 SHALL 验证被动触发器在伤害应用前正确执行（如 thick_skin 的 PREVENT_DAMAGE）

### 需求 2：资源守恒审查（D7）

**用户故事：** 作为开发者，我希望验证所有资源（CP、HP、Token 层数、手牌数量）的增减在全流程中保持守恒，以防止免费使用或重复扣费。

#### 验收标准

1. WHEN 玩家打出卡牌 THEN THE 审查系统 SHALL 验证 CP 消耗与卡牌定义的 cpCost 一致，且 CP 不会降至 0 以下
2. WHEN 收入阶段执行 THEN THE 审查系统 SHALL 验证 CP 增加量正确（普通+1，教会税升级+2），且不超过上限 15
3. WHEN 玩家使用消耗性 Token THEN THE 审查系统 SHALL 验证 Token 层数正确扣减（consumeAmount），且不会降至 0 以下
4. WHEN 回合结束进入弃牌阶段 THEN THE 审查系统 SHALL 验证手牌上限（6 张）正确执行，弃牌获得的 CP 每张恰好 1 点
5. WHEN 火焰精通 Token 在维持阶段冷却 THEN THE 审查系统 SHALL 验证每回合恰好移除 1 层，且层数为 0 时不再触发移除事件
6. WHEN 技能效果中包含 CP 变化（如盗取 CP） THEN THE 审查系统 SHALL 验证双方 CP 变化量守恒（一方减少的量等于另一方增加的量），且双方 CP 均在 [0, 15] 范围内
7. WHEN 伤害护盾（damageShield）消耗后 THEN THE 审查系统 SHALL 验证护盾值正确扣减，且剩余伤害正确传递给 HP

### 需求 3：时序正确审查（D8）

**用户故事：** 作为开发者，我希望验证所有效果的触发顺序和生命周期与规则文档一致，以确保攻击结算、状态效果触发、阶段流转的时序正确。

#### 验收标准

1. WHEN 攻击结算执行 THEN THE 审查系统 SHALL 验证效果执行顺序为 preDefense → defense(withDamage + postDamage) → attack(withDamage) → Token 响应 → attack(postDamage) → ATTACK_RESOLVED
2. WHEN 攻击方拥有进攻性 Token 且防御方拥有防御性 Token THEN THE 审查系统 SHALL 验证攻击方 Token 响应窗口在防御方 Token 响应窗口之前打开
3. WHEN 玩家进入 upkeep 阶段且拥有燃烧和中毒状态 THEN THE 审查系统 SHALL 验证燃烧伤害先于中毒伤害结算，且中毒伤害计算时考虑了燃烧已造成的 HP 损失
4. WHEN 玩家进入 offensiveRoll 阶段且拥有眩晕（stun）状态 THEN THE 审查系统 SHALL 验证眩晕在阶段进入时立即移除并跳过该阶段
5. WHEN 玩家进入 offensiveRoll 阶段且拥有缠绕（entangle）状态 THEN THE 审查系统 SHALL 验证掷骰次数减少 1 次（3→2）且缠绕状态在阶段进入时移除
6. WHEN 攻击方拥有致盲（blinded）状态 THEN THE 审查系统 SHALL 验证致盲判定在 preDefense 效果之前执行，且致盲失败（骰值 1-2）时跳过整个攻击结算
7. WHEN 攻击方拥有晕眩（daze）状态且攻击结算完成 THEN THE 审查系统 SHALL 验证晕眩在 ATTACK_RESOLVED 后触发额外攻击，且额外攻击的活跃玩家切换为防御方
8. WHEN 技能效果包含组合效果（如"造成伤害并获得 Token"） THEN THE 审查系统 SHALL 验证伤害效果在 Token 授予效果之前执行（withDamage 时机先于 postDamage 时机）

### 需求 4：幂等与重入审查（D9）

**用户故事：** 作为开发者，我希望验证 Undo 操作、重复触发、页面刷新等场景下游戏状态的正确性，以确保系统的健壮性。

#### 验收标准

1. WHEN 玩家执行 Undo 操作回退到使用 Token 之前的状态 THEN THE 审查系统 SHALL 验证 Token 层数、CP、HP 均正确恢复到使用前的值
2. WHEN 同一 Token 响应阶段中玩家连续使用多个同类型 Token THEN THE 审查系统 SHALL 验证每次使用都正确扣减层数且伤害修正累加正确
3. WHEN EventStream 消费者在页面刷新后重新挂载 THEN THE 审查系统 SHALL 验证消费者跳过历史事件，不会重播已处理的动画/音效
4. WHEN 同一个 DAMAGE_DEALT 事件被 reduce 处理 THEN THE 审查系统 SHALL 验证 HP 扣减操作是幂等的（不会因事件重播而重复扣血）

### 需求 5：元数据一致审查（D10）

**用户故事：** 作为开发者，我希望验证所有 customAction 的 categories 声明、AbilityDef 的 type/tags 标签与下游逻辑判定完全一致，以防止静默的逻辑分支错误。

#### 验收标准

1. WHEN 审查任意 customAction 处理器 THEN THE 审查系统 SHALL 验证其 categories 声明与实际产生的事件类型一致（产生 DAMAGE_DEALT → categories 包含 'damage'）
2. WHEN 审查 AbilityDef 的 type 字段 THEN THE 审查系统 SHALL 验证 type='offensive' 的技能在 isDefendableAttack 判定中被正确处理（非 unblockable 且非 ultimate 的进攻技能应触发防御阶段）
3. WHEN 审查 AbilityDef 的 tags 字段 THEN THE 审查系统 SHALL 验证 unblockable 标签的技能在 shouldOpenTokenResponse 中跳过防御方 Token 响应，ultimate 标签的技能跳过防御方 Token 响应但保留攻击方 Token 响应
4. WHEN 审查 TokenDef 的 activeUse.timing 配置 THEN THE 审查系统 SHALL 验证 timing 数组中的值与 getUsableTokensForTiming 函数的过滤逻辑一致
5. WHEN 审查 TokenDef 的 passiveTrigger.timing 配置 THEN THE 审查系统 SHALL 验证 timing 值与 flowHooks.ts 和 effects.ts 中的实际触发点一致

### 需求 6：升级变体差异矩阵审查

**用户故事：** 作为开发者，我希望对每个英雄的 L1→L2→L3 技能升级差异进行逐字段验证，以确保升级后的数值变化、新增效果、标签变更在定义层和执行层完全一致。

#### 验收标准

1. WHEN 审查任意英雄的进攻技能升级变体 THEN THE 审查系统 SHALL 构建「字段 × 等级」差异矩阵，标注每个字段在 L1/L2/L3 的值和变化类型（数值递增/新增效果/标签新增/条件变化/效果替换）
2. WHEN 差异矩阵中存在"新增效果"类型的变化 THEN THE 审查系统 SHALL 验证新增效果在对应等级的 AbilityDef.effects 中存在，且 customAction 处理器正确处理该等级
3. WHEN 差异矩阵中存在"标签新增"类型的变化（如 L3 新增 unblockable 或 ultimate） THEN THE 审查系统 SHALL 验证标签在 AbilityDef 中正确设置，且下游逻辑（isDefendableAttack、shouldOpenTokenResponse）正确响应
4. WHEN 差异矩阵中存在"数值递增"类型的变化 THEN THE 审查系统 SHALL 验证 AbilityDef.effects 中对应 action 的 value 字段与规则文档/i18n 描述一致
5. IF 发现升级变体中旧等级的值在新等级中残留（如 L2 的 damage 值出现在 L3 定义中） THEN THE 审查系统 SHALL 记录为"升级残留"缺陷

### 需求 7：条件链真值表审查

**用户故事：** 作为开发者，我希望对 Token 响应时机判定、技能触发条件等多条件组合场景构建真值表并验证每种组合，以确保条件逻辑无遗漏。

#### 验收标准

1. WHEN 审查 Token 响应窗口触发逻辑（shouldOpenTokenResponse） THEN THE 审查系统 SHALL 构建条件真值表（damage>0 × hasPendingDamage × isUltimate × hasOffensiveTokens × hasDefensiveTokens），验证每种组合的返回值正确
2. WHEN 审查 isDefendableAttack 判定逻辑 THEN THE 审查系统 SHALL 构建条件真值表（hasAttack × isUnblockable × isUltimate × hasDamage），验证每种组合是否正确决定进入防御阶段
3. WHEN 审查 upkeep 阶段状态效果触发逻辑 THEN THE 审查系统 SHALL 构建条件真值表（hasBurn × hasPoison × hasConcussion × hasFireMastery），验证每种组合的处理顺序和效果正确
4. WHEN 审查击倒（knockdown）移除逻辑 THEN THE 审查系统 SHALL 构建条件真值表（hasKnockdown × playerHasEnoughCP × playerChoosesToRemove），验证每种组合的阶段跳转正确
5. IF 真值表中发现某种条件组合未被代码覆盖 THEN THE 审查系统 SHALL 记录为"条件分支遗漏"缺陷并补充测试

### 需求 8：跨机制语义交叉审查

**用户故事：** 作为开发者，我希望验证多个独立机制在特定场景下的交叉行为正确，以确保复杂场景下的游戏逻辑无误。

#### 验收标准

1. WHEN 终极技能（ultimate）造成伤害 THEN THE 审查系统 SHALL 验证攻击方仍可使用 Token 加伤，但防御方 Token 响应窗口被跳过，且防御阶段被跳过
2. WHEN 不可防御技能（unblockable）造成伤害 THEN THE 审查系统 SHALL 验证防御掷骰阶段被跳过，但防御方仍可使用 Token 减伤/闪避
3. WHEN 选择效果（choice）中包含授予 Token 的选项 THEN THE 审查系统 SHALL 验证 Token 授予时 stackLimit 被正确校验，且选择结果正确持久化到状态
4. WHEN 掷骰效果（rollDie）的条件结果包含伤害 THEN THE 审查系统 SHALL 验证条件伤害正确累加到 accumulatedBonusDamage，且最终伤害值包含该累加值
5. WHEN 攻击方拥有晕眩（daze）且攻击为终极技能 THEN THE 审查系统 SHALL 验证终极技能的不可阻挡特性与晕眩的额外攻击机制不冲突（终极伤害不可被降低，但晕眩仍在攻击结算后触发）
6. WHEN 伤害护盾（damageShield）与 Token 减伤同时存在 THEN THE 审查系统 SHALL 验证两者的结算顺序正确（Token 响应先于伤害护盾，或反之），且总减伤量不超过原始伤害

### 需求 9：审查结果修复与测试补充

**用户故事：** 作为开发者，我希望审查发现的所有问题都有对应的代码修复和测试覆盖，以确保问题不会回归。

#### 验收标准

1. WHEN 审查发现代码缺陷 THEN THE 审查系统 SHALL 修复缺陷代码并确保现有测试仍然通过
2. WHEN 审查发现缺失的测试覆盖 THEN THE 审查系统 SHALL 补充 GameTestRunner 行为测试，覆盖正向（触发→生效→状态正确）和负向（不触发→状态未变）场景
3. WHEN 审查完成条件链真值表 THEN THE 审查系统 SHALL 为每个真值表中的关键条件组合补充至少一个测试用例
4. WHEN 审查完成跨机制语义交叉 THEN THE 审查系统 SHALL 为每个交叉场景补充至少一个集成测试用例
5. WHEN 所有修复完成 THEN THE 审查系统 SHALL 运行全部 DiceThrone 测试套件并确保全部通过
