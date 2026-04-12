# Summoner Wars AI 交互链路审计（2026-04-12）

## 审计范围
- `src/games/summonerwars/ai.ts`
- `src/games/summonerwars/domain/**`
- `src/games/summonerwars/ui/useGameEvents.ts`
- `src/games/summonerwars/audio.config.ts`
- `src/games/summonerwars/__tests__/flow.test.ts`
- `src/games/summonerwars/__tests__/flowHooks.test.ts`

## 结论摘要
1. **Summoner Wars 当前没有游戏层 response-window 打开源。**
   - `game.ts` 虽挂了 `createResponseWindowSystem()`，但 `src/games/summonerwars/domain/**` 中没有 `RESPONSE_WINDOW_OPENED / RESPONSE_PASS / responderQueue` 等事件源。
   - 因此用户感知到的“响应反复弹/音效循环”，在 Summoner Wars 里**更像是 phase-halted 技能提示或 UI 本地交互被重复重建**，而不是 Dice Throne 那种真正的 response-window 重触发。

2. **已确认一个会制造“像 response-window 一样反复响”的根因：**
   - 链路：`flowHooks.onPhaseExit` → `resolveAbilityEffects` → `ABILITY_TRIGGERED(actionId=ice_shards_damage/feed_beast_check)` → `useGameEvents` → `setAbilityMode(...)`/本地提示 → `audio.config.ts` 中 `ABILITY_TRIGGERED` 即时音效。
   - 问题点：当 `sys.flowHalted === true` 时，如果 AI / watchdog / 非 UI 限制路径重复发 `ADVANCE_PHASE`（服务端还会把 Summoner Wars 的恢复推进映射成 `sw:end_phase`），`onPhaseExit` 之前会**再次发同一批 phase-end 提示事件**。
   - 结果：同一个 `ice_shards` / `feed_beast` 提示被重复推入 EventStream，表现为：
     - 提示像“又弹了一次”
     - `ABILITY_TRIGGERED` 音效重复响
     - 看起来像 AI 在不停重试同一个交互

3. **已做最小修复：**
   - 文件：`src/games/summonerwars/domain/flowHooks.ts`
   - 修复：当 `state.sys.flowHalted === true` 时，`onPhaseExit` 仍然重新判断“是否还需要确认”，**但不再重复发射 phase-end 的提示事件**。
   - 影响：
     - 不改变真人正常首次触发语义
     - 不改变 AI 真正可执行动作集合
     - 只消除“重复推进时再次重放提示/音效”的噪音与循环感

## 全链路审计

### A. response-window 链路
- 结论：**游戏层未使用**。
- 证据：`src/games/summonerwars/domain/**` 中未发现 `RESPONSE_WINDOW_OPENED / RESPONSE_PASS / responderQueue / windowType` 事件源。
- 推断：若线上看到“响应”类提示，根因更可能在：
  1. 共享 watchdog / 共享提示文案；或
  2. Summoner Wars 的 phase-halted / UI 本地提示链被误认为 response-window。

### B. phase-halted 技能链（本轮命中根因）
- 入口：`src/games/summonerwars/domain/flowHooks.ts`
- 触发技能：`ice_shards`、`feed_beast`
- 事件源：
  - `ice_shards` → `ABILITY_TRIGGERED(actionId=ice_shards_damage)`
  - `feed_beast` → `ABILITY_TRIGGERED(actionId=feed_beast_check)`
- UI 消费：`src/games/summonerwars/ui/useGameEvents.ts`
  - `matchId === 'ice_shards_damage'` → `setAbilityMode({ abilityId: 'ice_shards', ... })`
  - `matchId === 'feed_beast_check'` → `setAbilityMode({ abilityId: 'feed_beast', ... })`
- 音频消费：`src/games/summonerwars/audio.config.ts`
  - `ABILITY_TRIGGERED` 为 immediate 音效，重复事件就会重复响。
- AI 为什么会放大这个问题：
  - AI 没有真人 UI 上的“按钮已禁用/提示已显示”的视觉门禁；
  - watchdog 的兜底推进如果命中这个阶段，会继续推 `ADVANCE_PHASE/sw:end_phase`；
  - 在修复前，重复推进会再次发同一批提示事件，形成“像在不停点击”的表象。

### C. engine interaction 链（AI 可见）
- `ai.ts` 已覆盖 `simple-choice` / `multistep-choice`：
  - 带 `interactionId` 的合法响应
  - exact-multi 组合枚举
  - 无选项时 emergency cancel
  - 其他玩家交互存在时不回落普通 phase actions
- 现有证据：`src/games/summonerwars/__tests__/flow.test.ts`

### D. UI 本地请求链（**重要未收口风险**）
以下事件目前是“领域事件 → `useGameEvents` 本地 mode → 人类 UI 继续操作”的模式：
- `SUMMON_FROM_DISCARD_REQUESTED`
- `GRAB_FOLLOW_REQUESTED`
- `SOUL_TRANSFER_REQUESTED`
- `MIND_CAPTURE_REQUESTED`
- 以及 `ice_shards_damage` / `feed_beast_check` 这类 `ABILITY_TRIGGERED(actionId=...)`

这些链路的共同问题：
- reduce 基本不落可供 AI 消费的持久状态；
- 不进入 `sys.interaction.current`；
- AI `buildLegalActions()` 默认看不到这些“本地 mode 请求”。

**判定：这是结构性风险，不一定卡死，但会导致 AI 看不见某些可选/必选后续交互。**
本轮未把这类 UI 本地交互整体迁到引擎 `InteractionSystem`，仅先止血重复提示/音效问题。

## 本轮修复文件
- `src/games/summonerwars/domain/flowHooks.ts`
- `src/games/summonerwars/__tests__/flowHooks.test.ts`

## 新增/更新测试
1. `src/games/summonerwars/__tests__/flowHooks.test.ts`
   - `flowHalted=true 时重复结束阶段不应重复发射 ice_shards 提示事件`
   - 证明：首次 `onPhaseExit` 会发提示；`flowHalted=true` 后重复推进仍然 `halt`，但**不再重复发 ABILITY_TRIGGERED**。

## 已运行验证
- `npx eslint src/games/summonerwars/domain/flowHooks.ts src/games/summonerwars/__tests__/flowHooks.test.ts`
- `node .\scripts\infra\vitest-cli-safe.mjs run src/games/summonerwars/__tests__/flowHooks.test.ts --configLoader native`
- `node .\scripts\infra\vitest-cli-safe.mjs run src/games/summonerwars/__tests__/flowHooks.test.ts src/games/summonerwars/__tests__/flow.test.ts --configLoader native`

## 审计裁决
- **已修复**：phase-halted 重复推进导致的重复提示/重复音效/像 response-window 一样反复弹的问题。
- **仍需后续架构收口**：把 UI 本地请求链（请求事件 → `useGameEvents` mode）逐步迁到引擎可见的 `InteractionSystem` 或等价持久状态，否则 AI 仍可能“看不见交互”，只是这类问题更多体现为漏操作，而非本轮这种重复弹/重复响。

---

## 2026-04-12 补充扩审：服务端可见性 / AI 可解性矩阵

> 本段对应本轮新增要求：逐条标注“服务端可见”与“AI 可解”，并补记最小修复后的状态。

### 一、当前**服务端可见且 AI 可解**的等待链

| 链路 | 实现入口 | 服务端可见 | AI 可解 | 说明 |
| --- | --- | --- | --- | --- |
| `sys.interaction.current.kind === simple-choice` | `InteractionSystem` | 是 | 是 | `ai.ts` 已生成 `SYS_INTERACTION_RESPOND/CANCEL`，含 `interactionId`、multi 组合与 emergency cancel。 |
| `sys.interaction.current.kind === multistep-choice` | `InteractionSystem` | 是 | 是 | `ai.ts` 已覆盖 confirm/继续链。 |
| `flowHalted + ice_shards` | `domain/flowHooks.ts` + `ai.ts` | 是（`sys.flowHalted`） | 是 | AI 直接生成 `ACTIVATE_ABILITY(ice_shards)`，不会依赖 UI 横幅。 |
| `flowHalted + feed_beast` | `domain/flowHooks.ts` + `ai.ts` | 是（`sys.flowHalted`） | 是 | AI 直接生成喂食相邻单位/自毁动作。 |
| `FUNERAL_PYRE_HEAL`（殉葬火堆） | `players[].activeEvents` + `SW_COMMANDS.FUNERAL_PYRE_HEAL` | 是 | **是（本轮补齐）** | 之前只有人类 UI `funeralPyreMode`；现在 AI 会直接生成治疗或 `skip` 命令，不再悬空等待本地横幅。 |

### 二、当前**UI 本地驱动、服务端看不到等待态**的链路

| 链路 | 本地驱动入口 | 服务端可见 | AI 可解 | 风险判断 |
| --- | --- | --- | --- | --- |
| `SUMMON_FROM_DISCARD_REQUESTED → infection` | `useGameEvents.ts -> setAbilityMode(infection)` | 否 | 否 | 高：事件只进 EventStream，本地选卡/落点 AI 看不到。 |
| `GRAB_FOLLOW_REQUESTED` | `useGameEvents.ts -> setGrabFollowMode` | 否 | 否 | 高：需要本地确认是否跟随。 |
| `SOUL_TRANSFER_REQUESTED` | `useGameEvents.ts -> setSoulTransferMode` | 否 | 否 | 高：需要本地确认是否转移。 |
| `MIND_CAPTURE_REQUESTED` | `useGameEvents.ts -> setMindCaptureMode` | 否 | 否 | 高：需要本地二选一决策。 |
| `ABILITY_TRIGGERED -> telekinesis/high_telekinesis/mind_transmission` | `useGameEvents.ts -> setAfterAttackAbilityMode / telekinesisTargetMode` | 否 | 否 | 高：攻击后目标/终点选择全在本地。 |
| `ABILITY_TRIGGERED -> rapid_fire_extra_attack` | `useGameEvents.ts -> setRapidFireMode` | 否 | 否 | 中高：本地确认额外攻击；若事件重复，会重复响提示音。 |
| `ABILITY_TRIGGERED -> withdraw` | `useGameEvents.ts -> setWithdrawTrigger / setWithdrawMode` | 否 | 否 | 中高：本地先选代价再选位置。 |
| `ABILITY_TRIGGERED -> illusion_copy` | `useGameEvents.ts -> setAbilityMode(illusion)` | 否 | 否 | 中：移动阶段开始技能，本地选目标。 |
| `ABILITY_TRIGGERED -> blood_rune_choice` | `useGameEvents.ts -> setAbilityMode(blood_rune)` | 否 | 否 | 中：攻击阶段开始本地二选一。 |
| `ABILITY_TRIGGERED -> afterMove:spirit_bond / ancestral_bond / structure_shift / frost_axe` | `useGameEvents.ts -> setAbilityMode(...)` | 否 | 否 | 中高：移动后追加技能全靠本地 mode。 |
| `ABILITY_TRIGGERED -> ice_ram_trigger` | `useGameEvents.ts -> setAbilityMode(ice_ram)` | 否 | 否 | 中高：建筑位移后的目标/推拉选择全在本地。 |
| `ABILITY_TRIGGERED -> ice_shards_damage / feed_beast_check` | `useGameEvents.ts -> setAbilityMode(...)` | **部分** | **部分** | 真人仍走本地横幅；AI 已有游戏层直出动作，不再依赖该本地 mode。 |

### 三、当前**只有最终命令可见、但中间选择链仍是本地 UI**的链路

| 链路 | 本地驱动入口 | 服务端可见 | AI 可解 | 说明 |
| --- | --- | --- | --- | --- |
| `PLAY_EVENT` 多步骤事件卡：`blood_summon / annihilate / mind_control / stun / hypnotic_lure / chant_of_* / glacial_shift / sneak / hellfire_blade` | `useEventCardModes.handlePlayEvent()` | 否（仅最终 `PLAY_EVENT` payload 可见） | 否 | 人类通过本地 mode 组装 payload；AI 当前不会生成这些 `PLAY_EVENT` 多目标/多步骤命令。 |
| `magicEventChoiceMode`（魔力阶段事件卡“打出还是弃牌”） | `useCellInteraction.ts` | 否 | 否 | AI 当前 `buildMagicActions()` 只会弃牌换魔力，不会处理“先弹横幅再决定打出事件卡”。 |
| `funeralPyreMode`（UI 横幅） | `useEventCardModes.ts` | **是（activeEvents + `FUNERAL_PYRE_HEAL`）** | **是（本轮补齐）** | UI 仍可用，但 AI 已不依赖该横幅。 |

### 四、对已修 `flowHalted` 重复 `end_phase` 的扩审结论

1. **SummonerWars 游戏层没有真正的 response-window reopen 源。**
   - `game.ts` 虽挂 `createResponseWindowSystem()`，但领域层未打开 `RESPONSE_WINDOW_OPENED/RESPONSE_PASS` 等链路。
   - 因此“响应不停弹/不停响”在 SummonerWars 里不是 DiceThrone 那种 response-window 重开。

2. **当前确认过的重复提示/音效源，仍然集中在“重复发相同 `ABILITY_TRIGGERED` 事件”。**
   - 已修：`flowHooks.onPhaseExit` 在 `flowHalted=true` 时不再重复发 `ice_shards_damage/feed_beast_check`。
   - `useGameEvents` 的刷新恢复逻辑有 `hasRecoveredRef` 一次性门禁，不会每次 render 都重复恢复。
   - 未发现第二条“同类必现”的服务端 reopen 源。

3. **剩余潜在循环风险仍然存在于所有本地 mode 依赖的 `ABILITY_TRIGGERED` 链。**
   - 只要领域层未来又重复发同一个 `ABILITY_TRIGGERED(actionId=...)`，`useGameEvents` 仍会再次 `setAbilityMode` / 再播 immediate 音效。
   - 这不是当前已命中的具体 bug，但属于结构性脆弱点；根因仍是“等待态只存在于客户端，不存在于服务端状态机”。 

### 五、本轮最小修复与新增验证

#### 最小修复
- `src/games/summonerwars/ai.ts`
  - 新增 `buildPendingActiveEventActions()`：
    - 有充能的殉葬火堆 + 有受伤友军 → 生成 `FUNERAL_PYRE_HEAL { targetPosition }`
    - 有充能但无合法目标 → 生成 `FUNERAL_PYRE_HEAL { skip: true }`
  - 该链路优先于普通 phase action 返回，避免 AI 无视待处理主动事件继续推进流程。

#### 新增验证
- `src/games/summonerwars/__tests__/flow.test.ts`
  - `殉葬火堆有受伤友军时，AI 应优先生成并选择 FUNERAL_PYRE_HEAL，而不是回落普通阶段动作`
  - `殉葬火堆无可治疗目标时，AI 应只生成 skip 以避免悬空等待 UI`

### 六、当前裁决

- **本轮已收口**
  - `flowHalted` 重复 `end_phase` 导致的重复提示/重复音效。
  - 殉葬火堆 `FUNERAL_PYRE_HEAL`：从“只有 UI 横幅能处理”提升为“服务端可见 + AI 可解”。

- **仍属结构性风险，需后续迁移**
  - `useGameEvents` / `useEventCardModes` / `useCellInteraction` 中所有“本地 mode 才知道下一步”的链路。
  - 这些链路如果不迁到 `InteractionSystem` 或等价服务端等待态，AI 仍会继续存在“看不见交互”的系统性缺口。 
