# D1 子项 — 高风险卡牌深度审查报告（Task 5.3）

> 审计范围：4 张高风险卡牌的完整执行路径追踪
> 审计方法：源码逐行审查 + 边界情况分析
> 生成时间：Task 5.3

## 审查方法

对每张卡牌执行以下完整链路追踪：
1. **i18n 描述**（英文 + 中文）
2. **触发入口**（executor 函数）
3. **交互创建**（createSimpleChoice 配置）
4. **交互处理**（handler 函数）
5. **事件生成**（events 数组）
6. **reducer 消费**（reduce.ts 对应 case）
7. **边界情况分析**

---

## 1. `base_tortuga`（托尔图加）— 亚军移动范围

### 描述

| 语言 | 描述 |
|------|------|
| EN | "After this base scores and is replaced, the runner-up may move one of their minions on another base to the replacement base." |
| ZH | "在这个基地计分并被替换后，亚军可以移动他在其他基地上的一个随从到替换基地。" |

### 完整执行路径

```
触发: registerBaseAbility('base_tortuga', 'afterScoring', ...)
  → 检查 ctx.rankings.length >= 2（至少有亚军）
  → runnerUpId = ctx.rankings[1].playerId
  → 遍历所有基地收集亚军随从:
      for (i = 0; i < ctx.state.bases.length; i++)
        if (i === ctx.baseIndex) continue  // ✅ 排除托尔图加本身
        for (m of base.minions)
          if (m.controller !== runnerUpId) continue  // ✅ 只收集亚军的
  → 无随从时 return { events: [] }  // ✅ 安全退出
  → 有随从时创建 createSimpleChoice:
      - playerId = runnerUpId  // ✅ 亚军操作
      - options = [skip, ...minionOptions]  // ✅ 可跳过（"may"）
      - continuationContext = { baseIndex: ctx.baseIndex }  // ✅ 记录替换基地位置

Handler: registerInteractionHandler('base_tortuga', ...)
  → selected.skip → return { events: [] }  // ✅ 跳过
  → ctx = getContinuationContext<{ baseIndex }>  // ✅ 获取替换基地
  → moveMinion(minionUid, minionDefId, fromBaseIndex, ctx.baseIndex, ...)  // ✅ 移动到替换基地
```

### 边界情况分析

| 边界情况 | 预期行为 | 代码行为 | 判定 |
|----------|---------|---------|------|
| 亚军在其他基地无随从 | 不触发交互 | `otherMinions.length === 0 → return { events: [] }` | ✅ |
| 排名不足2人（无亚军） | 不触发 | `ctx.rankings.length < 2 → return { events: [] }` | ✅ |
| 亚军只在托尔图加上有随从 | 不触发交互 | 遍历时 `i === ctx.baseIndex → continue`，收集为空 | ✅ |
| 亚军平局（多人同分） | 取 rankings[1] | rankings 由计分系统排序，[1] 为第二名 | ✅ |
| 替换基地已在同一 baseIndex | 移动到该位置 | `ctx.baseIndex` 是原托尔图加的 index，替换后新基地在同一位置 | ✅ |
| 亚军选择跳过 | 不移动 | `selected.skip → return { events: [] }` | ✅ |
| 保护机制 | 不适用（移动己方随从） | 选项构建未调用 `buildMinionTargetOptions`（直接 map），但移动己方随从不需要保护检查 | ✅ |

### 结论

**✅ 完全正确。** 所有边界情况均已覆盖。关键点：
- 正确排除托尔图加本身（`i === ctx.baseIndex → continue`）
- 正确限定为亚军的随从（`m.controller !== runnerUpId → continue`）
- 正确处理无亚军/无随从的退出路径
- "may" 语义正确实现（skip 选项）
- `continuationContext.baseIndex` 正确传递替换基地位置



---

## 2. `alien_crop_circles`（麦田怪圈）— 全基地 vs 单基地

### 描述

| 语言 | 描述 |
|------|------|
| EN | "Choose a base. Return each minion on that base to its owner's hand." |
| ZH | "选择一个基地。返回每个在这个基地上的随从到它的拥有者的手上。" |

### 关键语义分析

| 维度 | 描述语义 | 预期代码行为 |
|------|---------|-------------|
| 基地范围 | "Choose **a** base"（单个基地） | 创建单选交互，选择一个基地 |
| 随从范围 | "**each** minion on that base"（该基地全部随从） | 选定基地后，自动返回该基地所有随从（强制效果，非逐个选择） |
| 归属范围 | "to **its owner's** hand"（各自拥有者） | 每个随从返回给 `m.owner`（非 controller） |
| 效果性质 | 无 "may" 限定词 | 选定基地后强制执行，无跳过选项 |

### 完整执行路径

```
触发: registerAbility('alien_crop_circles', 'onPlay', alienCropCircles)

Executor: alienCropCircles(ctx)
  → 遍历所有基地，收集有随从的基地:
      for (i = 0; i < ctx.state.bases.length; i++)
        if (ctx.state.bases[i].minions.length > 0)  // ✅ 任何有随从的基地都是候选
          baseCandidates.push({ baseIndex: i, ... })
  → baseCandidates.length === 0 → return feedback('no_valid_targets')  // ✅ 安全退出
  → 创建 createSimpleChoice:
      - playerId = ctx.playerId  // ✅ 当前玩家选择
      - options = buildBaseTargetOptions(baseCandidates, ctx.state)  // ✅ 无 skip 选项（强制效果）
      - sourceId = 'alien_crop_circles'
      - targetType = 'base'  // ✅ 棋盘直选模式

Handler: registerInteractionHandler('alien_crop_circles', ...)
  → value = { baseIndex }  // 玩家选择的基地
  → base = state.core.bases[baseIndex]
  → !base → return undefined  // ✅ 防御性检查
  → events = buildCropCirclesReturnEvents(state.core, baseIndex, base.minions.map(m => m.uid), ...)
      // ✅ 传入该基地所有随从的 uid（"each minion"）

buildCropCirclesReturnEvents(core, baseIndex, selectedMinionUids, timestamp, sourcePlayerId):
  → 过滤 base.minions 中 uid 在 selectedSet 中的随从
  → 对每个随从检查保护:
      if (sourcePlayerId && m.controller !== sourcePlayerId && isMinionProtected(core, m, baseIndex, sourcePlayerId, 'affect'))
        → return false  // ✅ 跳过受保护的对手随从
  → 生成 MINION_RETURNED 事件:
      payload: {
        minionUid: m.uid,
        minionDefId: m.defId,
        fromBaseIndex: baseIndex,
        toPlayerId: m.owner,  // ✅ 返回给拥有者（非 controller）
        reason: 'alien_crop_circles',
      }

Reducer: case SU_EVENTS.MINION_RETURNED
  → 从 fromBaseIndex 基地移除随从
  → 将卡牌加入 toPlayerId 的手牌
```

### 边界情况分析

| 边界情况 | 预期行为 | 代码行为 | 判定 |
|----------|---------|---------|------|
| 所有基地都没有随从 | 不触发交互，反馈无目标 | `baseCandidates.length === 0 → return feedback('no_valid_targets')` | ✅ |
| 只有一个基地有随从 | 仍创建交互让玩家选择 | `baseCandidates.length >= 1 → createSimpleChoice`（无自动执行优化） | ✅ 正确但可优化 |
| 基地上有受保护的对手随从 | 受保护随从不被返回 | `isMinionProtected(core, m, baseIndex, sourcePlayerId, 'affect') → skip` | ✅ |
| 基地上有己方随从 | 己方随从也被返回 | `m.controller !== sourcePlayerId` 检查只对对手随从做保护检查，己方随从直接通过 | ✅ |
| 基地上全是受保护的对手随从 | 选择该基地后无事件产生 | `buildCropCirclesReturnEvents` 过滤后返回空数组 | ✅ 安全但无反馈 |
| 随从的 controller ≠ owner（被控制的随从） | 返回给 owner（原始拥有者） | `toPlayerId: m.owner` | ✅ |
| 保护类型为 'affect'（广义保护） | 使用 'affect' 类型检查 | `isMinionProtected(core, m, baseIndex, sourcePlayerId, 'affect')` | ✅ |
| 无 skip 选项（强制效果） | 必须选择一个基地 | `options = buildBaseTargetOptions(baseCandidates, ...)` 无 skip | ✅ |

### 结论

**✅ 完全正确。** 关键点：
- 正确实现"选择一个基地"语义（单选交互，无 skip）
- 正确实现"每个随从"语义（handler 传入 `base.minions.map(m => m.uid)` 全量 uid）
- 正确实现"拥有者的手上"语义（`toPlayerId: m.owner`，非 controller）
- 保护机制正确应用（`'affect'` 类型，只对对手随从检查）
- 所有基地无随从时安全退出

---

## 3. `pirate_full_sail`（全速航行）— 移动目标范围

### 描述

| 语言 | 描述 |
|------|------|
| EN | "Move any number of your minions to other bases. Special: You may play this card before a base scores." |
| ZH | "移动你任意数量的随从到其他基地。特殊：在一个基地计分前，你可以打出本卡。" |

### 关键语义分析

| 维度 | 描述语义 | 预期代码行为 |
|------|---------|-------------|
| 数量范围 | "**any number**"（任意数量，含 0） | 循环选择随从，提供 "完成" 按钮随时停止 |
| 归属范围 | "**your** minions"（己方随从） | 只收集 `m.controller === playerId` 的随从 |
| 目标范围 | "to **other** bases"（其他基地） | 每个随从移动时排除其当前所在基地 |
| 卡牌类型 | "Special"（特殊行动卡） | 注册为 `'special'` 类型，可在计分前打出 |
| 重复移动 | 隐含：已移动的随从不应再次被选择 | 维护 `movedUids` 列表排除已移动随从 |

### 完整执行路径

```
触发: registerAbility('pirate_full_sail', 'special', pirateFullSail)

Executor: pirateFullSail(ctx)
  → buildFullSailChooseMinionInteraction(ctx.state, ctx.playerId, ctx.now, [])
  → 返回 null（无己方随从）→ return { events: [] }  // ✅ 安全退出
  → 返回 interaction → queueInteraction

buildFullSailChooseMinionInteraction(state, playerId, now, movedUids):
  → 遍历所有基地收集己方随从:
      for (i = 0; i < state.bases.length; i++)
        for (m of state.bases[i].minions)
          if (m.controller === playerId && !movedUids.includes(m.uid))  // ✅ 己方 + 未移动
            myMinions.push({ uid, defId, baseIndex: i, label })
  → myMinions.length === 0 → return null  // ✅ 无可移动随从时结束
  → options = [
      ...buildMinionTargetOptions(myMinions, { state, sourcePlayerId: playerId }),  // ✅ 己方随从不做保护检查
      { id: 'done', label: '完成移动', value: { done: true } },  // ✅ "any number" 含 0
    ]
  → createSimpleChoice:
      - sourceId = 'pirate_full_sail_choose_minion'
      - targetType = 'minion'  // ✅ 棋盘直选模式
      - continuationContext = { movedUids }  // ✅ 传递已移动列表

Handler 1: registerInteractionHandler('pirate_full_sail_choose_minion', ...)
  → selected.done → return { state, events: [] }  // ✅ 完成移动（0 个也可以）
  → 找到选中的随从 → buildMoveToBaseInteraction(...)
      - fromBaseIndex = baseIndex（随从当前所在基地）
      - sourceId = 'pirate_full_sail_choose_base'
      - extraData = { movedUids }  // ✅ 传递已移动列表

buildMoveToBaseInteraction(state, minionUid, minionDefId, fromBaseIndex, ...):
  → 遍历所有基地:
      for (i = 0; i < state.bases.length; i++)
        if (i === fromBaseIndex) continue  // ✅ 排除当前基地（"other bases"）
        candidates.push({ baseIndex: i, ... })
  → candidates.length === 0 → return null  // ✅ 只有一个基地时无法移动
  → createSimpleChoice:
      - sourceId = 'pirate_full_sail_choose_base'
      - targetType = 'base'
      - continuationContext = { minionUid, minionDefId, fromBaseIndex, ...extraData }

Handler 2: registerInteractionHandler('pirate_full_sail_choose_base', ...)
  → destBase = value.baseIndex
  → events = [moveMinion(ctx.minionUid, ctx.minionDefId, ctx.fromBaseIndex, destBase, 'pirate_full_sail', ...)]
  → newMovedUids = [...(ctx.movedUids ?? []), ctx.minionUid]  // ✅ 追加已移动
  → nextInteraction = buildFullSailChooseMinionInteraction(state.core, playerId, timestamp, newMovedUids)
      // ✅ 循环：用更新后的 movedUids 重新构建选择交互
  → nextInteraction 存在 → queueInteraction + 返回移动事件
  → nextInteraction 为 null（无更多可移动随从）→ 返回移动事件，结束
```

### 边界情况分析

| 边界情况 | 预期行为 | 代码行为 | 判定 |
|----------|---------|---------|------|
| 场上无己方随从 | 不触发交互 | `buildFullSailChooseMinionInteraction` 返回 `null` → `pirateFullSail` 返回 `{ events: [] }` | ✅ |
| 选择 0 个随从（直接完成） | 允许，不移动任何随从 | `selected.done → return { state, events: [] }` | ✅ |
| 移动到同一基地 | 不允许（"other bases"） | `buildMoveToBaseInteraction` 中 `i === fromBaseIndex → continue` | ✅ |
| 只有一个基地 | 无法移动（无"其他基地"） | `candidates.length === 0 → return null` → handler 返回 `undefined` | ✅ |
| 已移动的随从不再出现 | 排除已移动随从 | `!movedUids.includes(m.uid)` 过滤 | ✅ |
| 所有随从都已移动 | 自动结束循环 | `myMinions.length === 0 → return null` → handler 返回移动事件，无后续交互 | ✅ |
| 移动后随从在新基地，再次选择时 | 不应再次出现 | `movedUids` 追踪 uid，无论随从在哪个基地都会被排除 | ✅ |
| 保护机制（己方随从） | 不适用 | `buildMinionTargetOptions` 对己方随从跳过保护检查 | ✅ |
| Special 卡类型 | 可在计分前打出 | `registerAbility('pirate_full_sail', 'special', ...)` | ✅ |

### 结论

**✅ 完全正确。** 关键点：
- "any number" 正确实现为循环选择 + "完成" 按钮（含 0 个）
- "your minions" 正确限定为 `m.controller === playerId`
- "other bases" 正确排除随从当前所在基地（`i === fromBaseIndex → continue`）
- `movedUids` 机制正确防止重复移动同一随从
- 循环终止条件正确（无更多可移动随从时自动结束）
- Special 卡类型正确注册

---

## 4. `zombie_they_keep_coming`（它们不断来临）— 弃牌堆来源范围

### 描述

| 语言 | 描述 |
|------|------|
| EN | "Play an extra minion from your discard pile." |
| ZH | "从你的弃牌堆中额外打出一个随从。" |

### 关键语义分析

| 维度 | 描述语义 | 预期代码行为 |
|------|---------|-------------|
| 来源范围 | "from **your discard pile**"（己方弃牌堆） | 只从 `player.discard` 中筛选 |
| 实体类型 | "**minion**"（随从） | 过滤 `c.type === 'minion'` |
| 数量 | "**an** extra minion"（一个） | 单选交互 |
| 额度性质 | "**extra**"（额外） | 使用 `grantExtraMinion` 增加全局 `minionLimit`，不消耗正常额度 |
| 效果性质 | 无 "may" 限定词 | 强制效果（但弃牌堆无随从时安全退出） |

### 完整执行路径

```
触发: registerAbility('zombie_they_keep_coming', 'onPlay', zombieTheyKeepComing)

Executor: zombieTheyKeepComing(ctx)
  → player = ctx.state.players[ctx.playerId]
  → minionsInDiscard = player.discard.filter(c => c.type === 'minion')  // ✅ 己方弃牌堆 + 随从类型
  → minionsInDiscard.length === 0 → return feedback('discard_empty')  // ✅ 安全退出
  → 构建选项: minionsInDiscard.map(c => ({ cardUid: c.uid, defId: c.defId, power }))
  → createSimpleChoice:
      - playerId = ctx.playerId
      - sourceId = 'zombie_they_keep_coming'
      - 无 multi 配置（单选）  // ✅ "an extra minion"
      - 无 skip 选项（强制效果）  // ✅ 无 "may"
  → 手动设置 optionsGenerator:  // ✅ 动态刷新弃牌堆选项
      (state) => state.core.players[ctx.playerId].discard.filter(c => c.type === 'minion')

Handler 1: registerInteractionHandler('zombie_they_keep_coming', ...)
  → value = { cardUid, defId, power }（玩家选择的随从）
  → 收集所有基地作为候选:
      for (i = 0; i < state.core.bases.length; i++)
        candidates.push({ baseIndex: i, ... })  // ✅ 所有基地都可选（无限制）
  → candidates.length === 1:
      // 只有一个基地，直接打出
      events = [
        grantExtraMinion(playerId, 'zombie_they_keep_coming', timestamp),  // ✅ 先授予额度
        { type: MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex, power, fromDiscard: true } },  // ✅ 标记弃牌堆来源
      ]
  → candidates.length > 1:
      // 多个基地，创建选择基地交互
      next = createSimpleChoice(... sourceId: 'zombie_they_keep_coming_choose_base', targetType: 'base')
      → continuationContext = { cardUid, defId, power }
      events = [grantExtraMinion(playerId, 'zombie_they_keep_coming', timestamp)]  // ✅ 先授予额度
      → queueInteraction(state, next)

Handler 2: registerInteractionHandler('zombie_they_keep_coming_choose_base', ...)
  → value = { baseIndex }
  → ctx = continuationContext = { cardUid, defId, power }
  → events = [{ type: MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex, power, fromDiscard: true } }]

Reducer: case SU_EVENTS.LIMIT_MODIFIED (from grantExtraMinion)
  → limitType === 'minion', 无 restrictToBase
  → player.minionLimit += 1  // ✅ 全局额度 +1

Reducer: case SU_EVENTS.MINION_PLAYED
  → fromDiscard: true → newDiscard = player.discard.filter(c => c.uid !== cardUid)  // ✅ 从弃牌堆移除
  → fromDiscard: true → newHand = player.hand（手牌不变）  // ✅ 不从手牌移除
  → consumesNormalLimit 未设置（默认 !== false → shouldIncrementPlayed = true）
  → 全局额度已被 grantExtraMinion 增加，所以 minionsPlayed++ 消耗的是额外额度  // ✅ 正确
  → 随从放置到选定基地
```

### 额度消耗机制详解

```
初始状态: minionLimit=1, minionsPlayed=0（正常回合开始）

场景 A: 先正常打随从，再用"它们不断来临"
  1. 正常打随从: minionsPlayed=1, minionLimit=1（额度用完）
  2. 打出"它们不断来临"行动卡
  3. grantExtraMinion → LIMIT_MODIFIED → minionLimit=2
  4. MINION_PLAYED(fromDiscard) → minionsPlayed=2, minionLimit=2（消耗额外额度）
  ✅ 正确：额外随从消耗额外额度

场景 B: 先用"它们不断来临"，再正常打随从
  1. 打出"它们不断来临"行动卡
  2. grantExtraMinion → LIMIT_MODIFIED → minionLimit=2
  3. MINION_PLAYED(fromDiscard) → minionsPlayed=1, minionLimit=2
  4. 正常打随从: minionsPlayed=2, minionLimit=2
  ✅ 正确：两次打出都在额度内
```

### 边界情况分析

| 边界情况 | 预期行为 | 代码行为 | 判定 |
|----------|---------|---------|------|
| 弃牌堆无随从 | 不触发交互，反馈弃牌堆为空 | `minionsInDiscard.length === 0 → return feedback('discard_empty')` | ✅ |
| 弃牌堆只有行动卡 | 不触发交互 | `player.discard.filter(c => c.type === 'minion')` 过滤后为空 | ✅ |
| 只有一个基地 | 自动打出到该基地 | `candidates.length === 1 → 直接生成事件` | ✅ |
| 额外打出正确追踪 | 使用 grantExtraMinion 增加全局额度 | `grantExtraMinion(playerId, 'zombie_they_keep_coming', ...)` 无 restrictToBase → 全局 minionLimit+1 | ✅ |
| fromDiscard 标记 | 从弃牌堆移除卡牌，非手牌 | `MINION_PLAYED payload: { fromDiscard: true }` → reducer 从 discard 移除 | ✅ |
| 动态选项刷新 | 弃牌堆变化时选项更新 | `optionsGenerator` 手动设置，从最新 state 重新过滤 | ✅ |
| 无 skip 选项（强制效果） | 必须选择一个随从 | 选项列表无 skip/done | ✅ |
| grantExtraMinion 时序 | 额度授予在 MINION_PLAYED 之前 | handler 返回 `events: [grantExtraMinion, playedEvt]`（顺序正确） | ✅ |
| 多个基地时的链式交互 | 先选随从，再选基地 | handler 1 选随从 → handler 2 选基地 → MINION_PLAYED | ✅ |

### 结论

**✅ 完全正确。** 关键点：
- 正确限定来源为"己方弃牌堆"（`player.discard.filter(c => c.type === 'minion')`）
- 正确实现"额外"语义（`grantExtraMinion` 增加全局 `minionLimit`，MINION_PLAYED 消耗该额度）
- `fromDiscard: true` 正确标记来源，reducer 从弃牌堆而非手牌移除卡牌
- `optionsGenerator` 确保弃牌堆选项动态刷新
- 事件顺序正确（`grantExtraMinion` 在 `MINION_PLAYED` 之前）
- 单基地时自动打出优化正确

---

## 总结

### 审查结果汇总

| 卡牌 | 核心语义 | 判定 | 关键验证点 |
|------|---------|------|-----------|
| `base_tortuga` | 亚军 + 其他基地 + 可跳过 | ✅ 完全正确 | 排除本基地、限定亚军、skip 选项 |
| `alien_crop_circles` | 单基地 + 全部随从 + 强制 + 保护检查 | ✅ 完全正确 | 全量 uid 传入、owner 返回、affect 保护 |
| `pirate_full_sail` | 任意数量 + 己方 + 其他基地 + 循环 | ✅ 完全正确 | done 按钮、movedUids 去重、排除当前基地 |
| `zombie_they_keep_coming` | 己方弃牌堆 + 随从 + 额外额度 | ✅ 完全正确 | discard 过滤、grantExtraMinion、fromDiscard 标记 |

### 发现的问题

**无逻辑错误。** 4 张高风险卡牌的筛选范围、交互语义、事件生成、reducer 消费均与描述完全一致。

### 可优化项（非 bug）

1. **`alien_crop_circles`**：只有一个基地有随从时仍创建交互（可用 `resolveOrPrompt` 自动执行）
2. **`alien_crop_circles`**：选择的基地上全是受保护随从时，无反馈提示（事件数组为空，静默完成）
