# 审计报告 5.4：欺心巫族事件卡

## 审计范围
- 心灵操控（trickster-mind-control）- 传奇事件
- 风暴侵袭（trickster-storm-assault）- ACTIVE 持续事件
- 催眠引诱（trickster-hypnotic-lure）- ACTIVE 持续事件
- 震慑（trickster-stun）- 普通事件

---

## 1. 心灵操控（trickster-mind-control）

### 权威描述
zh-CN: "指定你的召唤师2个区格以内任意数量的敌方士兵和英雄为目标。获得所有目标的控制权，直到回合结束。"
类型：传奇事件，费用 0，施放阶段 summon

### 原子步骤
1. 施放时 → 选择召唤师2格内任意数量的敌方士兵和英雄
2. 获得所有选中目标的控制权
3. 控制权持续到回合结束（临时控制）
4. 回合结束时 → 归还控制权给原始拥有者
5. 不能控制召唤师

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `eventType: 'legendary'`, `cost: 0`, `playPhase: 'summon'` |
| 注册层 | ✅ | `CARD_IDS.TRICKSTER_MIND_CONTROL` 在 ids.ts 中定义 |
| 执行层 | ✅ | eventCards.ts: 遍历 targets，检查 `owner !== playerId` 和 `unitClass !== 'summoner'`，距离 ≤ 2，生成 CONTROL_TRANSFERRED 事件（`temporary: true`, `originalOwner`） |
| 状态层 | ✅ | reduce.ts CONTROL_TRANSFERRED: 修改 `unit.owner = newOwner`，临时控制时保存 `originalOwner`；TURN_CHANGED: 解构 `originalOwner` 并归还控制权 |
| 验证层 | ✅ | validate.ts PLAY_EVENT: 检查手牌、费用、施放阶段；目标选择由 UI 层验证 |
| UI层 | ✅ | useEventCardModes.ts: mindControlMode 高亮召唤师2格内敌方非召唤师单位，支持多选 |
| i18n层 | ✅ | zh-CN/en 均有事件卡名称和效果描述 |
| 测试层 | ✅ | 3个测试：控制权转移、不能控制召唤师、超过2格不受影响 |

### 限定条件全程约束检查
- "召唤师2个区格以内" → execute 层 `dist <= 2` ✅，UI 层 `manhattanDistance <= 2` ✅
- "敌方士兵和英雄" → execute 层 `owner !== playerId && unitClass !== 'summoner'` ✅
- "直到回合结束" → TURN_CHANGED 归还 `originalOwner` ✅

---

## 2. 风暴侵袭（trickster-storm-assault）

### 权威描述
zh-CN: "持续：单位必须减少移动1个区格。"
类型：普通事件，费用 0，施放阶段 magic，ACTIVE

### 原子步骤
1. 施放时 → 放入主动事件区（ACTIVE 关键词）
2. 持续效果 → 所有单位（双方）移动减少1格
3. 主动事件区有此卡时生效

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `isActive: true`, `cost: 0`, `playPhase: 'magic'` |
| 注册层 | ✅ | `CARD_IDS.TRICKSTER_STORM_ASSAULT` 在 ids.ts 中定义 |
| 执行层 | ✅ | eventCards.ts: 空 break（ACTIVE 卡由 EVENT_PLAYED 处理放入主动区域） |
| 状态层 | ✅ | helpers.ts `getStormAssaultReduction`: 检查任一玩家主动事件区是否有 storm-assault，有则返回 1 |
| 验证层 | ✅ | 移动验证 `getUnitMoveEnhancements` 中 `extraDistance -= stormReduction` |
| UI层 | ✅ | `getValidMoveTargetsEnhanced` 正确反映减少后的移动范围 |
| i18n层 | ✅ | zh-CN/en 均有事件卡名称和效果描述 |
| 测试层 | ✅ | 3个测试：移动减少1格、getStormAssaultReduction 正确检测、飞行单位也受影响 |

### 限定条件全程约束检查
- "单位必须减少移动1个区格" → `getStormAssaultReduction` 返回 1，在 `getUnitMoveEnhancements` 中减去 ✅
- 影响所有单位（双方）→ 检查任一玩家的主动事件区 ✅
- 飞行单位也受影响 → 测试确认 3格→2格 ✅

---

## 3. 震慑（trickster-stun）

### 权威描述
zh-CN: "指定你的召唤师3个直线视野区格以内的一个士兵或英雄为目标。将目标推拉1至3个区格，并且可以穿过士兵和英雄。对目标和每个被穿过的单位造成1点伤害。"
类型：普通事件，费用 1，施放阶段 move

### 独立交互链
- **链A**：选择目标 → 选择推/拉方向 → 选择距离(1-3) → 推拉目标（可穿过单位） → 对目标造成1伤 → 对每个被穿过的单位造成1伤

### 原子步骤
1. 选择召唤师3格直线内的一个士兵或英雄
2. 选择推或拉方向
3. 选择推拉距离（1-3格）
4. 逐格推拉目标，可穿过士兵和英雄
5. 对每个被穿过的单位造成1点伤害
6. 对目标造成1点伤害
7. 目标移动到最终位置（如果为空）
8. 建筑阻挡停止推拉

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `cost: 1`, `playPhase: 'move'` |
| 注册层 | ✅ | `CARD_IDS.TRICKSTER_STUN` 在 ids.ts 中定义 |
| 执行层 | ✅ | eventCards.ts: 计算推拉方向向量，逐格推拉，穿过单位时 UNIT_DAMAGED，建筑阻挡停止，对目标 UNIT_DAMAGED，最终位置空则 UNIT_PUSHED |
| 状态层 | ✅ | UNIT_DAMAGED 添加伤害，UNIT_PUSHED 移动单位 |
| 验证层 | ✅ | PLAY_EVENT 检查手牌、费用、施放阶段；目标选择由 UI 层验证直线+距离 |
| UI层 | ✅ | useEventCardModes.ts: stunMode 两步交互（selectTarget → selectDirection），UI 验证 `isInStraightLine` + `dist <= 3`；StatusBanners.tsx StunBanner 提供方向和距离选择 |
| i18n层 | ✅ | zh-CN/en 均有事件卡名称、效果描述、UI 提示（selectTarget/direction/distance） |
| 测试层 | ✅ | 2个测试：推拉+目标伤害、穿过单位伤害 |

### 限定条件全程约束检查
- "召唤师3个直线视野区格以内" → UI 层 `isInStraightLine && dist <= 3` ✅；execute 层信任 UI 选择（无二次校验，但 UI 已过滤）
- "一个士兵或英雄" → execute 层 `unitClass !== 'summoner'` ✅，UI 层过滤 ✅
- "推拉1至3个区格" → execute 层 `Math.min(3, Math.max(1, stunDistance))` ✅
- "可以穿过士兵和英雄" → execute 层遇到 occupant 时继续推进 ✅
- "对目标和每个被穿过的单位造成1点伤害" → execute 层分别生成 UNIT_DAMAGED 事件 ✅

### 细节备注
- 推拉最终位置如果被占据（单位），目标不移动但伤害仍然生效。这是因为玩家选择距离，应选择能落地的距离。
- execute 层不做直线校验（信任 UI），这是项目通用模式。

---

## 4. 催眠引诱（trickster-hypnotic-lure）

### 权威描述
zh-CN: "指定一个士兵或英雄为目标。你可以将目标向你的召唤师靠近而推拉1个区格。\n持续：当你的召唤师攻击这个目标时，获得战力+1。"
类型：普通事件，费用 0，施放阶段 summon，ACTIVE

### 独立交互链
- **链A**：选择目标 → 拉向召唤师1格
- **链B**：ACTIVE 持续效果 → 召唤师攻击被催眠目标时+1战力

### 原子步骤（链A - 即时效果）
1. 选择一个士兵或英雄为目标（无距离限制，无敌我限制）
2. 将目标向召唤师靠近1格（拉）
3. 标记目标单位 ID 到主动事件区

### 原子步骤（链B - 持续效果）
1. 召唤师攻击时 → 检查目标是否被催眠标记
2. 如果是 → 战力+1

### 八层链路检查

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `isActive: true`, `cost: 0`, `playPhase: 'summon'` |
| 注册层 | ✅ | `CARD_IDS.TRICKSTER_HYPNOTIC_LURE` 在 ids.ts 中定义 |
| 执行层 | ✅ | eventCards.ts: `calculatePushPullPosition(core, lureTarget, summonerPos, 1, 'pull')` 拉向召唤师1格 + HYPNOTIC_LURE_MARKED 标记目标 |
| 状态层 | ✅ | reduce.ts HYPNOTIC_LURE_MARKED: 在主动事件区的催眠引诱卡上设置 `targetUnitId`；UNIT_PULLED 移动单位 |
| 验证层 | ✅ | PLAY_EVENT 检查手牌、费用、施放阶段 |
| UI层 | ✅ | useEventCardModes.ts: hypnoticLureMode 高亮所有非召唤师单位 |
| i18n层 | ✅ | zh-CN/en 均有事件卡名称和效果描述 |
| 测试层 | ✅ | 4个测试：拉向召唤师1格、标记目标到主动事件区、召唤师攻击被催眠目标+1战力、攻击非催眠目标不加成 |

### 限定条件全程约束检查
- "一个士兵或英雄" → execute 层 `unitClass !== 'summoner'` ✅
- "向你的召唤师靠近" → `calculatePushPullPosition(core, target, summonerPos, 1, 'pull')` ✅
- "当你的召唤师攻击这个目标时" → abilityResolver.ts: `unit.card.unitClass === 'summoner'` 且 `ev.targetUnitId === targetUnit.cardId` ✅
- "获得战力+1" → `strength += 1` ✅

### 语义细节
- 描述说"你可以将目标向你的召唤师靠近而推拉1个区格"，"你可以"表示可选。当前实现中如果拉不动（目标已在召唤师旁边或被阻挡），`calculatePushPullPosition` 返回 null，不生成 UNIT_PULLED 事件，但仍然标记目标。这是正确的——即使拉不动，ACTIVE 效果仍然生效。✅
- 描述无距离限制（"指定一个士兵或英雄为目标"），UI 层也未限制距离。✅

---

## 数据查询一致性审查

- `getStormAssaultReduction` 使用 `getBaseCardId(ev.id) === CARD_IDS.TRICKSTER_STORM_ASSAULT` ✅
- 催眠引诱战力加成使用 `getBaseCardId(ev.id) === CARD_IDS.TRICKSTER_HYPNOTIC_LURE` ✅
- 心灵操控使用 `CARD_IDS.TRICKSTER_MIND_CONTROL` ✅
- 震慑使用 `CARD_IDS.TRICKSTER_STUN` ✅

无绕过发现。

---

## 修复清单

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| 无 | - | 四张事件卡实现均与描述一致 | ✅ 全部通过 |

## 跨阵营交叉影响备注
- 风暴侵袭影响所有单位（双方），与飞行/迅捷/冲锋等移动增强叠加正确（先加后减）
- 震慑推拉可穿过单位，与缠斗（rebound）的推拉触发缺失 bug 相关（task 15.2）
- 催眠引诱的 HYPNOTIC_LURE_MARKED reduce 逻辑被先锋军团的编织之墙复用
