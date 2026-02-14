# 审计报告 5.4：欺心巫族事件卡

## 权威描述来源

规则文档 `src/games/summonerwars/rule/召唤师战争规则.md` 未包含阵营专属事件卡描述。
权威描述取自 `src/games/summonerwars/config/factions/trickster.ts` 中的 `effect` 字段（卡牌图片录入数据）。

---

## 1. 心灵操控（TRICKSTER_MIND_CONTROL）

### 权威描述
> 指定你的召唤师2个区格以内任意数量的敌方士兵和英雄为目标。获得所有目标的控制权，直到回合结束。

- 类型：传奇事件
- 费用：0
- 施放阶段：召唤阶段

### 原子步骤拆解
1. **指定目标** → 选择召唤师2格内的敌方士兵和英雄（任意数量）
2. **排除召唤师** → 不能选择敌方召唤师
3. **获得控制权** → 所有选中目标的 owner 变为施放者
4. **临时标记** → 标记 originalOwner，回合结束归还
5. **回合结束归还** → TURN_CHANGED 时恢复 originalOwner

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trickster.ts` 中 eventType='legendary', cost=0, playPhase='summon' 与描述一致 |
| 注册层 | ✅ | `ids.ts` 中 TRICKSTER_MIND_CONTROL 常量已注册 |
| 执行层 | ✅ | `eventCards.ts` 正确验证距离≤2、排除召唤师、发射 CONTROL_TRANSFERRED 事件（temporary=true, originalOwner） |
| 状态层 | ✅ | `reduce.ts` CONTROL_TRANSFERRED 正确修改 owner 并保存 originalOwner；TURN_CHANGED 正确归还 |
| 验证层 | ✅ | `validate.ts` PLAY_EVENT 通用验证（手牌、费用、阶段）；执行层内部验证距离和单位类型 |
| UI层   | ✅ | `useEventCardModes.ts` 正确过滤召唤师2格内敌方非召唤师单位，提供多选模式 |
| i18n层 | ✅ | zh-CN/en 均有 statusBanners.mindControl 条目 |
| 测试层 | ✅ | 3个测试覆盖：正常控制+状态验证、不能控制召唤师、超距离不生效 |

### 发现问题
无

---

## 2. 风暴侵袭（TRICKSTER_STORM_ASSAULT）

### 权威描述
> 持续：单位必须减少移动1个区格。

- 类型：普通事件
- 费用：0
- 施放阶段：魔力阶段
- ACTIVE 关键词（持续到下回合开始弃置）

### 原子步骤拆解
1. **施放** → 支付0费用，放入主动事件区（ACTIVE）
2. **持续效果** → 所有单位（双方）移动减少1格
3. **下回合弃置** → 回合开始时清空主动事件区

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trickster.ts` 中 isActive=true, cost=0, playPhase='magic' 与描述一致 |
| 注册层 | ✅ | `ids.ts` 中 TRICKSTER_STORM_ASSAULT 常量已注册 |
| 执行层 | ✅ | `eventCards.ts` 无额外逻辑（ACTIVE 事件由通用 EVENT_PLAYED 处理放入主动区域） |
| 状态层 | ✅ | `helpers.ts` getStormAssaultReduction 正确检测主动事件区，返回减少量1 |
| 验证层 | ✅ | `helpers.ts` getUnitMoveEnhancements 正确应用 stormReduction 到 extraDistance |
| UI层   | ✅ | 移动验证自动生效，无需额外 UI |
| i18n层 | ✅ | 事件卡名称和效果文本在卡牌配置中 |
| 测试层 | ✅ | 3个测试覆盖：移动减少验证+状态验证、getStormAssaultReduction 检测、飞行单位也受影响 |

### 发现问题
无

---

## 3. 催眠引诱（TRICKSTER_HYPNOTIC_LURE）

### 权威描述
> 指定一个士兵或英雄为目标。你可以将目标向你的召唤师靠近而推拉1个区格。
> 持续：当你的召唤师攻击这个目标时，获得战力+1。

- 类型：普通事件
- 费用：0
- 施放阶段：召唤阶段
- ACTIVE 关键词

### 原子步骤拆解
**交互链A：施放时拉动（可选）**
1. **指定目标** → 选择一个敌方士兵或英雄
2. **可选拉动** → "你可以"拉目标向召唤师靠近1格
3. **稳固免疫** → 有 stable 技能的目标不受拉动

**交互链B：持续战力加成（ACTIVE）**
4. **放入主动区域** → 标记目标单位 ID
5. **战力加成** → 召唤师攻击被标记目标时+1战力
6. **下回合弃置** → 回合开始时清空主动事件区

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trickster.ts` 中 isActive=true, cost=0, playPhase='summon' 与描述一致 |
| 注册层 | ✅ | `ids.ts` 中 TRICKSTER_HYPNOTIC_LURE 常量已注册 |
| 执行层 | ✅ | `eventCards.ts` 正确使用 calculatePushPullPosition 拉向召唤师1格，发射 HYPNOTIC_LURE_MARKED 标记目标。**已修复**：添加 stable 免疫检查和 skipPull 可选拉动支持 |
| 状态层 | ✅ | `reduce.ts` HYPNOTIC_LURE_MARKED 正确在主动事件卡上标记 targetUnitId |
| 验证层 | ✅ | `abilityResolver.ts` calculateEffectiveStrength 正确检查主动事件区催眠引诱标记，召唤师攻击被标记目标时+1 |
| UI层   | ⚠️ | `useEventCardModes.ts` 提供目标选择，但缺少"跳过拉动"选项（"你可以"可选效果应有确认/跳过 UI）。**低优先级**：当前自动拉动在大多数场景下是玩家期望行为 |
| i18n层 | ✅ | zh-CN/en 均有 statusBanners.hypnoticLure 条目 |
| 测试层 | ✅ | 4个测试覆盖：拉动+状态验证、标记目标、召唤师攻击加成、非催眠目标无加成 |

### 发现问题

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| 1 | medium | 催眠引诱缺少 stable 免疫检查 | ✅ 已修复 |
| 2 | low | "你可以"拉动缺少跳过 UI（执行层已支持 skipPull 参数，UI 层未提供跳过按钮） | 记录，后续优化 |

---

## 4. 震慑（TRICKSTER_STUN）

### 权威描述
> 指定你的召唤师3个直线视野区格以内的一个士兵或英雄为目标。将目标推拉1至3个区格，并且可以穿过士兵和英雄。对目标和每个被穿过的单位造成1点伤害。

- 类型：普通事件
- 费用：1
- 施放阶段：移动阶段

### 原子步骤拆解
1. **指定目标** → 召唤师3格直线视野内的一个敌方士兵或英雄
2. **选择方向** → 推或拉
3. **选择距离** → 1-3格
4. **逐格推拉** → 可穿过士兵和英雄
5. **穿过伤害** → 对每个被穿过的单位造成1点伤害
6. **目标伤害** → 对目标造成1点伤害
7. **最终位置** → 目标停在最后一个空格
8. **稳固免疫** → 有 stable 技能的目标不受推拉（但仍受伤害）
9. **建筑阻挡** → 遇到建筑停止

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `trickster.ts` 中 cost=1, playPhase='move' 与描述一致 |
| 注册层 | ✅ | `ids.ts` 中 TRICKSTER_STUN 常量已注册 |
| 执行层 | ✅ | `eventCards.ts` 正确实现逐格推拉、穿过伤害、目标伤害、建筑阻挡。**已修复**：添加 stable 免疫检查、距离≤3验证、直线验证、最终位置追踪（lastEmptyPos） |
| 状态层 | ✅ | `reduce.ts` UNIT_DAMAGED 正确添加伤害标记，UNIT_PUSHED 正确移动单位 |
| 验证层 | ✅ | UI 层过滤直线3格内目标；**已修复**：执行层也验证距离和直线 |
| UI层   | ✅ | `useEventCardModes.ts` 正确过滤直线3格内非召唤师目标，提供方向和距离选择 |
| i18n层 | ✅ | zh-CN/en 均有 statusBanners.stun 条目（selectTarget/direction/distance） |
| 测试层 | ✅ | 2个测试覆盖：推拉+伤害+状态验证、穿过伤害验证 |

### 发现问题

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| 1 | high | 震慑缺少 stable 免疫检查（有 stable 的单位不应被推拉，但伤害仍生效） | ✅ 已修复 |
| 2 | medium | 震慑执行层缺少距离≤3和直线验证（仅 UI 层过滤，执行层未校验） | ✅ 已修复 |
| 3 | medium | 震慑最终位置逻辑有缺陷：穿过占用格后 currentPos 更新但未追踪最后空格 | ✅ 已修复（引入 lastEmptyPos 追踪） |

---

## 交叉影响检查

| 检查项 | 结果 |
|--------|------|
| 心灵操控控制的单位是否正确触发能力 | ✅ 控制权转移后 owner 变更，能力触发基于 owner 判定 |
| 心灵操控回合结束归还是否正确 | ✅ TURN_CHANGED 中检查 originalOwner 并恢复 |
| 风暴侵袭是否影响双方单位 | ✅ getStormAssaultReduction 检查双方主动事件区 |
| 震慑推拉是否触发缠斗/反弹 | ✅ execute.ts 后处理检查 UNIT_PUSHED/UNIT_PULLED 事件 |
| 催眠引诱战力加成是否走 calculateEffectiveStrength | ✅ abilityResolver.ts 中统一处理 |
| 催眠引诱拉动是否触发缠斗/反弹 | ✅ UNIT_PULLED 事件会被后处理捕获 |

## 数据查询一致性

本次审计范围内的事件卡不涉及 `.card.abilities`、`.card.strength`、`.card.life` 的直接访问。
催眠引诱的战力加成通过 `calculateEffectiveStrength` 统一入口实现，无绕过。

## 修复总结

| # | 文件 | 修改内容 |
|---|------|----------|
| 1 | `domain/execute/eventCards.ts` | 震慑：添加 stable 免疫检查、距离/直线验证、lastEmptyPos 最终位置追踪 |
| 2 | `domain/execute/eventCards.ts` | 催眠引诱：添加 stable 免疫检查、skipPull 可选拉动参数支持 |
| 3 | `domain/execute/eventCards.ts` | 添加 getUnitAbilities、isInStraightLine 导入 |

## 测试结果

修复后运行全部 861 个测试，全部通过。
