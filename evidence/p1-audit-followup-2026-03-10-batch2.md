# P1 审计续查记录（2026-03-10，批次 2）

## 背景

- 本批次继续执行“只读优先、避免和用户当前修复冲突”的 POD 回滚审计。
- 目标不是把用户正在做的重构误判成 POD，而是继续缩小“旧总表挂账”和“当前真实遗留”之间的差距。
- 这次重点做了两件事：
  - 归因 `DiceThrone` 当前一条流程红测；
  - 补查 3 个总表尾项：`engine/hooks/index.ts`、`tictactoe/domain/index.ts`、`pages/admin/index.tsx`。

---

## 一、DiceThrone 红测归因（只读）

### 1. 目标用例

```bash
npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "flowHalted=true 状态下打出大吉大利不会误触发阶段推进"
```

### 2. 现象

- 当前工作区下，此用例失败。
- 实际现象是阶段从 `offensiveRoll` 被推进到了 `main2`。
- 日志显示：
  - `card-lucky` 执行时产出的是 `BONUS_DIE_ROLLED x4 + HEAL_APPLIED`
  - 没有再产生测试注释里预期的 displayOnly `BONUS_DICE_REROLL_REQUESTED`
  - 随后的 `SKIP_BONUS_DICE_REROLL` 结算了真实攻击用的 `pendingBonusDiceSettlement`
  - `InteractionSystem` 随后执行 `resolveInteraction`
  - `FlowSystem` 看到 `flowHalted=true` 且阻塞已清空，于是自动推进到 `main2`

### 3. 归因结论

本轮已能把这条红测归因到**当前工作区的未提交改动**，而不是稳定存在的 POD 残留：

- `git show HEAD:src/games/dicethrone/domain/customActions/barbarian.ts`
- `git blame HEAD -L 251,269 -- src/games/dicethrone/domain/customActions/barbarian.ts`
- `git diff --cached -- src/games/dicethrone/domain/customActions/barbarian.ts`
- `git diff -- src/games/dicethrone/domain/customActions/barbarian.ts`

核对结果：

- `HEAD` 版本里，`handleLuckyRollHeal` 仍然保留：
  - `createDisplayOnlySettlement(sourceAbilityId, attackerId, attackerId, dice, timestamp)`
- 当前工作区（staged + unstaged）把这条 displayOnly settlement 注释掉了，并改成：
  - 多个 `BONUS_DIE_ROLLED`
  - 再补一个汇总 `BONUS_DIE_ROLLED`
- 同类改动也出现在 `handleMorePleaseRollDamage`

因此，这条 `flow.test` 当前失败，**更像是正在进行中的“骰子/卡牌特写重构”副作用**，不应直接记成 POD 历史回滚。

### 4. 本轮处理策略

- 不修改业务代码；
- 只记录归因，避免和用户当前 `DiceThrone` 改动冲突；
- 后续如果要修，应基于“当前特写方案”重新决定：
  - 是恢复 displayOnly settlement；
  - 还是同步改测试和阻塞模型。

---

## 二、总表尾项补查

### 1. `src/engine/hooks/index.ts`

复核结论：

- 当前导出链完整，包含：
  - `useSpectatorMoves`
  - `useEventStreamCursor`
  - `EventStreamRollbackContext`
  - `useEventStreamRollback`
- 这说明旧报告里提到的“导出被删”并不是当前遗留状态。
- 未发现新的 POD 回滚证据。

验证：

```bash
npx vitest run src/engine/hooks/__tests__/useEventStreamCursor.test.ts
```

结果：通过。

### 2. `src/games/tictactoe/domain/index.ts`

复核结论：

- 当前 `DomainCore` 装配链完整：
  - `setup`
  - `validate`
  - `execute`
  - `reduce`
  - `isGameOver`
- 没看到 POD 把井字棋核心流程入口删坏的残留。

验证：

```bash
npx vitest run src/games/tictactoe/__tests__/flow.test.ts
```

结果：通过。

### 3. `src/pages/admin/index.tsx`

复核结论：

- 当前页面仍保留管理面板的主要数据拉取与展示链：
  - `/stats`
  - `/stats/trend`
  - 多个统计卡片与图表组件装配
- 本轮未看到会影响游戏逻辑、引擎流程或大厅主链路的 POD 回滚残留。
- 该文件仍归类为低风险尾项，本轮仅做只读确认，不做额外改动。

---

## 三、本轮实际执行的命令

```bash
git log --oneline --all -- src/games/dicethrone/domain/flowHooks.ts
git show --no-patch --pretty=raw 9c9dd78
git diff --cached -- src/games/dicethrone/domain/commandValidation.ts src/games/dicethrone/domain/core-types.ts src/games/dicethrone/domain/events.ts src/games/dicethrone/domain/flowHooks.ts src/games/dicethrone/domain/reducer.ts
git blame HEAD -L 251,269 -- src/games/dicethrone/domain/customActions/barbarian.ts
git show HEAD:src/games/dicethrone/domain/customActions/barbarian.ts
git diff --cached -- src/games/dicethrone/domain/customActions/barbarian.ts
git diff -- src/games/dicethrone/domain/customActions/barbarian.ts
npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "flowHalted=true 状态下打出大吉大利不会误触发阶段推进"
npx vitest run src/engine/hooks/__tests__/useEventStreamCursor.test.ts src/games/tictactoe/__tests__/flow.test.ts
```

---

## 四、本轮结论

- 本轮没有发现新的“已提交 POD 残留”明确证据。
- `DiceThrone` 当前那条 `flow.test` 红测，已可归因到**工作区内未提交的特写改造**，不是稳定历史基线上的 POD 回滚。
- `src/engine/hooks/index.ts`、`src/games/tictactoe/domain/index.ts`、`src/pages/admin/index.tsx` 本轮补查后，未见新的 POD 遗留问题。

## 五、本轮文件改动

- 业务代码：无
- 文档新增：
  - `evidence/p1-audit-followup-2026-03-10-batch2.md`

---

## 六、SmashUp 活跃区复核（POD 口径，只读）

### 1. 复核文件

- `src/games/smashup/domain/index.ts`
- `src/games/smashup/domain/systems.ts`
- `src/games/smashup/domain/reduce.ts`
- `src/games/smashup/abilities/pirates.ts`

### 2. 本轮重点核对内容

- `beforeScoringTriggeredBases` 是否被正确落地、清理，避免重复触发或漏触发；
- `afterScoring` 交互打开后，`BASE_CLEARED / BASE_REPLACED` 是否仍然延迟补发，而不是被 POD 提前清掉；
- 多个 `afterScoring` 交互之间，`_deferredPostScoringEvents` 是否继续链式传递；
- `pirate_king / pirate_first_mate` 的交互 `targetType / displayMode / continuationContext` 是否存在 POD 造成的回滚；
- 计分后 `reduce` 是否仍然清理 `beforeScoringTriggeredBases / afterScoringTriggeredBases`，避免新基地继承旧基地触发状态。

### 3. 只读结论

- 本轮未发现新的明确 POD 回滚残留。
- 当前实现里可以看到：
  - `scoreOneBase` 在 `beforeScoring` 标记事件发出后，会立即本地 `reduce`，避免交互解决后重复创建同一个前置计分交互；
  - `afterScoring` 创建交互时，会把 `BASE_CLEARED / BASE_REPLACED` 序列化进 `_deferredPostScoringEvents`，而不是直接丢失；
  - 多基地/多交互场景下，延迟事件会继续挂在交互链上，最后一个交互解决后再补发；
  - `reduce.ts` 在 `BASE_REPLACED` 时会清理该基地索引对应的 `beforeScoringTriggeredBases / afterScoringTriggeredBases`；
  - `pirates.ts` 当前 `pirate_king_move`、`pirate_first_mate_choose_base` 仍保留 `targetType`、`displayMode`、延迟事件补发和受控移动链路。
- 结合本轮回归测试，暂未看到“POD 把你已经修好的多基地计分/海盗交互逻辑又回滚掉”的新证据。

### 4. 验证

```bash
npx vitest run src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts src/games/smashup/__tests__/baseAbilitiesPrompt.test.ts src/games/smashup/__tests__/newOngoingAbilities.test.ts src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts
```

结果：4 个文件全部通过，共 154 条用例通过。

---

## 七、DiceThrone 活跃 UI / 战斗链路复核（POD 口径，只读）

### 1. 复核文件

- `src/games/dicethrone/Board.tsx`
- `src/games/dicethrone/domain/reduceCombat.ts`
- `src/games/dicethrone/ui/RightSidebar.tsx`
- `src/games/dicethrone/ui/viewMode.ts`
- `src/games/dicethrone/domain/commandCategories.ts`

### 2. 本轮重点核对内容

- `Board.tsx` 中响应窗口视角切换、可用 token 高亮、能力变体文案选择是否还保留；
- `reduceCombat.ts` 中 `BONUS_DAMAGE_ADDED → pendingAttack.bonusDamage` 及回合清理链是否仍在；
- `RightSidebar.tsx` 中 `activeModifiers` 与 `bonusDamage` 的展示入口是否被 POD 删掉；
- `viewMode.ts` 中 `isResponseAutoSwitch` 与响应视角判定是否存在回退；
- `commandCategories.ts` 是否仍保留本轮前面补上的命令分类修复。

### 3. 只读结论

- 本轮未发现新的明确 POD 回滚残留。
- 当前实现里可以确认：
  - `Board.tsx` 仍然保留 `tokenUsableOverrides`、`computeViewModeState(...)`、`rootPid === currentResponderId` 的响应高亮判定；
  - `Board.tsx` 仍把 `activeModifiers` 和 `bonusDamage={G.pendingAttack?.bonusDamage ?? G.players[G.activePlayerId]?.pendingBonusDamage}` 传给右侧栏；
  - `reduceCombat.ts` 仍保留 `BONUS_DAMAGE_ADDED` 处理器，并在攻击初始化时把排队的 bonusDamage 转进 `pendingAttack`；
  - `RightSidebar.tsx` 仍渲染 `ActiveModifierBadge` 与 `AttackBonusDamageDisplay`；
  - `viewMode.ts` 当前仍保留响应自动切视角的判断分支；
  - `commandCategories.ts` 当前没有看到前面补过的分类被再次回退。
- 结合现成回归测试，本轮未看到“POD 把你已经修好的修正伤害/侧栏/UI 视角逻辑又删掉”的新证据。

### 4. 验证

```bash
npx vitest run src/games/dicethrone/__tests__/viewMode.test.ts src/games/dicethrone/__tests__/bonus-damage-collection.test.ts src/games/dicethrone/__tests__/volley-5-dice-display.test.ts src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts
```

结果：5 个文件全部通过，共 20 条用例通过。

---

## 八、引擎层复核（POD 口径，只读）

### 1. 复核文件

- `src/engine/systems/FlowSystem.ts`
- `src/engine/systems/InteractionSystem.ts`
- `src/engine/transport/react.tsx`

### 2. 本轮重点核对内容

- `FlowSystem` 的 `halt / autoContinue / phase updated` 主链是否有 POD 留下的“少一拍/多推进”残留；
- `InteractionSystem` 的 `resolveInteraction`、队列推进、延迟事件传递、选项刷新与响应校验语义是否仍完整；
- `transport/react.tsx` 中测试场景与响应窗口相关的状态同步链是否存在回退。

### 3. 只读结论

- 本轮未发现新的明确 POD 回滚残留。
- 从 `9c9dd78 -> HEAD` 的可见历史看：
  - `FlowSystem.ts` 这段变化主要是去掉调试日志，不是功能回退；
  - `InteractionSystem.ts` 后续反而补进了更完整的类型、`targetType`、`autoRefresh`、`responseValidationMode`、`revalidateOnRespond` 以及延迟事件传递能力；
  - 这与当前 `SmashUp` 多交互/延迟事件链能通过测试是吻合的；
  - `transport/react.tsx` 这轮没有看到新的 POD 残留证据。

### 4. 验证

```bash
npx vitest run src/engine/systems/__tests__/FlowSystem.test.ts src/engine/systems/__tests__/InteractionSystem.test.ts src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts src/games/smashup/__tests__/commandExecutionFlow.test.ts src/games/smashup/__tests__/tortuga-pirate-king-flowhalted-fix.test.ts
```

结果：5 个文件全部通过，共 26 条用例通过。

说明：

- `commandExecutionFlow.test.ts` 中有预期内的命令验证失败日志，但测试本身通过；
- 本轮不把这些日志记为 POD 问题。

---

## 九、传输层复核（POD 口径，只读）

### 1. 复核文件

- `src/engine/transport/server.ts`
- `src/engine/transport/client.ts`
- `src/engine/transport/react.tsx`
- `src/engine/pipeline.ts`
- `src/engine/adapter.ts`

### 2. 本轮重点核对内容

- 服务端离线裁决、增量同步、断线重连、`setupData` / 测试注入相关链是否存在 POD 回滚；
- 客户端 patch / resync / stateID 连续性处理是否仍然完整；
- React 传输层注册与 TestHarness / provider 状态同步是否有回退；
- `pipeline.ts / adapter.ts` 是否仍保留引擎装配主链。

### 3. 只读结论

- 本轮未发现新的明确 POD 回滚残留。
- 当前工作区下，这批文件相对 `HEAD` 没有新增本地冲突修改；
- 结合现有文档和本轮测试结果，传输层的服务端离线裁决、补丁同步、resync 恢复、错误国际化链都仍然工作；
- 暂未看到“POD 把你已经修好的传输/同步/断线恢复逻辑又删掉”的新证据。

### 4. 验证

```bash
npx vitest run src/engine/transport/__tests__/server.test.ts src/engine/transport/__tests__/server-injectState.test.ts src/engine/transport/__tests__/patch.test.ts src/engine/transport/__tests__/patch-integration.test.ts src/engine/transport/__tests__/errorI18n.test.ts
```

结果：5 个文件全部通过。

说明：

- `patch.test.ts` 与 `patch-integration.test.ts` 中会输出预期内的 patch 失败 / resync 日志；
- 这些属于测试场景覆盖，不记为 POD 问题。
