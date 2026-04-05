# DiceThrone 枪手 / 武士对比老派系审计（2026-04-06）

## 审计范围

- 游戏：`dicethrone`
- 新角色：`gunslinger`、`samurai`
- 对照老派系：`monk`、`barbarian`、`pyromancer`、`paladin`、`moon_elf`、`shadow_thief`
- 本轮重点不再只看“新角色自己能不能跑”，而是看它们是否沿用了老派系已经稳定的共享契约：
  - 升级卡状态链
  - 通用卡 `previewRef` / atlas 接线
  - AI 与阶段门禁
  - 技能槽 / 卡牌特写 UI
  - 被动能力建模与时序消费

## 权威来源

- 运行时代码：
  - `src/games/dicethrone/domain/reduceCards.ts`
  - `src/games/dicethrone/domain/commonCards.ts`
  - `src/games/dicethrone/domain/rules.ts`
  - `src/games/dicethrone/domain/flowHooks.ts`
  - `src/games/dicethrone/domain/passiveAbility.ts`
  - `src/games/dicethrone/domain/characters.ts`
  - `src/games/dicethrone/ui/cardPreviewHelper.ts`
  - `src/games/dicethrone/ui/AbilityOverlays.tsx`
- 新角色真相源 / 规则文档：
  - `src/games/dicethrone/rule/枪手录入核对.md`
  - `src/games/dicethrone/rule/枪手卡牌录入核对.md`
  - `src/games/dicethrone/rule/武士录入核对.md`
  - `src/games/dicethrone/rule/武士卡牌录入核对.md`
- 既有审计文档：
  - `evidence/dicethrone-gunslinger-samurai-reaudit-2026-04-05.md`
  - `evidence/dicethrone-gunslinger-samurai-card-preview-audit-2026-04-04.md`
  - `evidence/dicethrone-full-capability-audit-2026-04-05.md`

## 对比方法

1. 先用老派系已有稳定实现确定“共享契约”长什么样。
2. 再看枪手 / 武士是否复用同一条链，而不是只看某张牌或某个 UI 现象是否暂时正常。
3. 命中差异后区分：
   - 运行时已错
   - 运行时暂时正确但共享抽象分叉
   - 证据 / 文档口径过度收口

## 逐项结论

### 1. 升级卡状态链：新角色现已与老派系一致

- 老派系稳定契约：
  - 升级卡打出后，升级状态由 `abilityLevels` + `upgradeCardByAbilityId` 记录。
  - 升级卡本体不应再进入 `discard`，否则 UI 会把“已安装升级”和“弃牌”混成同一来源。
- 当前新角色实现：
  - `src/games/dicethrone/domain/reduceCards.ts` 中 `handleCardPlayed` 已对 `card.type === 'upgrade'` 特判，不把升级卡放入弃牌堆。
  - `handleAbilityReplaced` 会统一写入 `abilityLevels` 与 `upgradeCardByAbilityId`。
- 对比结论：
  - 枪手 / 武士当前已经回到和老派系一致的升级状态契约。
  - 这一点和此前“升级牌进弃牌堆”口径相反，旧口径必须视为失效。

### 2. 通用卡 atlas / `previewRef`：新角色现已与老派系共享同一展示合同

- 老派系稳定契约：
  - 运行时手牌图统一走 `previewRef.type = 'atlas'`，以角色自己的 `ability-cards` atlas 为真相源。
- 当前新角色实现：
  - `src/games/dicethrone/domain/commonCards.ts` 中枪手 / 武士都有角色级 `COMMON_ATLAS_INDEX` 映射。
  - `src/games/dicethrone/ui/cardPreviewHelper.ts` 已按“角色 + cardId”取精确 `previewRef`，不再偷用全局首个匹配项。
- 对比结论：
  - 枪手 / 武士虽然通用卡索引不同于老派系默认顺序，但运行时合同已经统一回 `previewRef -> atlas`，不再是另一套 hand atlas 体系。

### 3. AI 与阶段门禁：`card-next-time` 已补回老派系同类防御响应语义

- 老派系稳定契约：
  - 防御响应牌 / token 必须绑定到真实响应窗口，不能在主阶段被当作普通主动牌。
- 当前新角色实现：
  - `src/games/dicethrone/domain/commonCards.ts` 中 `card-next-time` 已带 `pendingDamage.role = 'target'` 与 `responseType = 'beforeDamageReceived'`。
  - `src/games/dicethrone/ai.ts` 的响应动作构建已走 `isCardPlayableInResponseWindow(...)`。
- 对比结论：
  - 枪手 / 武士之前暴露出来的“AI 第一张就打 +6 护盾”属于共享规则漏门禁，不是新角色独有机制。
  - 当前这条链已经回到老派系共享规则上。

### 4. UI 技能槽 / 特写：新角色现已能沿用老派系升级展示逻辑

- 老派系稳定契约：
  - 技能槽升级显示依赖 `abilityLevels` + `getUpgradeCardPreviewRef(...)`，不是靠弃牌堆。
  - 卡牌特写只能消费一次真实“打出升级牌”的事件，不应把升级替换事件再当成第二次打牌。
- 当前新角色实现：
  - `src/games/dicethrone/ui/AbilityOverlays.tsx` 与 `src/games/dicethrone/ui/BoardOverlays.tsx` 已统一按技能槽 + 等级查升级卡图。
  - `useCardSpotlight` 之前的重复消费问题已在前一轮修复。
- 对比结论：
  - 枪手 / 武士当前 UI 主链已对齐老派系的升级展示合同。

### 5. 仍存在的共享抽象缺口：`Bushido` 没有沿用同一套被动建模

- 老派系 / 现有稳定路径至少已经存在两种被动模型：
  - `tithes`：走 `player.passiveAbilities` + `PassiveAbilityDef.trigger`
  - `quick-draw`：走 `player.abilities` 中 `type = 'passive'` + `trigger.type = 'phaseStart'`
- 武士当前状态：
  - `src/games/dicethrone/heroes/samurai/abilities.ts` 中 `BUSHIDO` 只有 `type: 'passive'` 和描述，`effects` 为空，也没有 `trigger`。
  - `src/games/dicethrone/domain/flowHooks.ts` 却通过硬编码 `playerHasAbility(..., 'bushido')` 在 `upkeep` / `discard -> turn changed` 两个时机单独发 `honor`。
- 判定：
  - 这是本轮唯一仍然成立的结构性 finding。
  - 运行时目前是对的，但共享抽象并不统一；`Bushido` 不能被静态地从“被动定义 -> 触发器 -> 消费链”完整读出来。
  - 命中维度：
    - `D3 数据流闭环`
    - `D23 架构假设一致性`
    - `D33 跨实体同类能力实现路径一致性`
- 风险：
  - 后续做“全角色被动扫描 / 审计 / UI 展示 / 自动化契约测试”时，`Bushido` 容易再次被漏掉。
  - 新角色再出现 upkeep / end-turn 类被动时，开发者会继续随手选第三种实现方式。

## Findings

### P1：`Bushido` 仍绕过共享被动抽象，靠 `flowHooks` 的角色 ID 硬编码维持正确性

- 证据：
  - `src/games/dicethrone/heroes/samurai/abilities.ts` 中 `BUSHIDO` 为空定义。
  - `src/games/dicethrone/domain/flowHooks.ts` 在两个位置直接判断 `playerHasAbility(..., 'bushido')`。
  - `src/games/dicethrone/domain/passiveAbility.ts` 并不知道 `phaseStart` / `turn-end reward` 这类被动。
- 为什么这是对比老派系后才会暴露的问题：
  - 只审武士自己时，测试能过，看起来“规则已实现”。
  - 但和 `tithes` / `quick-draw` 对比后，才会发现它没有沿用任何现成共享被动模型，而是第三条特例路径。

### P2：此前“枪手 / 武士已收口”的 evidence 主要按单点问题写，缺少一次强制的老派系对比审计

- 证据：
  - 既有文档大量覆盖 atlas、调试发牌、spotlight、compare-roll、bushido/quick-draw 个案。
  - 但缺少一份把“升级卡、previewRef、AI 阶段门禁、被动建模、UI 升级展示”同时拿来和老派系并排核对的文档。
- 判定：
  - 这不是“文档写少了”这么简单，而是流程门禁缺了一条“新角色必须和成熟旧角色做共享契约对比”的规范。

## 为什么会这样

1. 过去的审计更像“打补丁式专项复核”，谁报 bug 就补谁的证据，导致看到的是很多局部文档，不是一条共享契约总图。
2. 新角色接入时，资源链、规则链、UI 链、AI 链是分批修的；每次只盯当前症状，容易把“当前症状消失”误写成“已与老派系完全一致”。
3. DiceThrone 现在至少同时存在三种被动实现口径：
   - `player.passiveAbilities`
   - `ability.type = 'passive' + trigger`
   - `flowHooks` 直接按 `abilityId` 做角色特判
   只要文档不强制做“同类机制单一建模或显式登记例外”，以后还会继续分叉。

## 建议更新的规范

### 1. 通用审计规范

- 新增“新对象对成熟旧对象的共享契约对比”门禁：
  - 新角色 / 新派系 / 新模块只要复用了旧系统，审计时必须至少选 1 个成熟旧对象做并排比对。
  - 不允许只写“新对象自己现在能跑”。

### 2. DiceThrone 角色 intake 规范

- 新角色 intake 完成前，必须单独核对这 6 条共享契约：
  - 升级卡状态落点
  - `previewRef` / atlas 接线
  - 通用卡索引差异是否已显式登记
  - AI / 阶段门禁
  - UI 技能槽 / spotlight
  - 被动能力走哪条共享抽象
- 如果同类语义被拆进 `abilities`、`passiveAbilities`、`flowHooks` 多条路径，必须在角色规则文档和 evidence 里显式写“为什么例外”，不能默认算“已收口”。

## 本轮验证

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts src/games/dicethrone/__tests__/card-cross-audit.test.ts src/games/dicethrone/__tests__/BonusDieOverlay.test.tsx --configLoader native --maxWorkers 1
```

## 未覆盖风险

1. 本轮没有直接重构 `Bushido` 的共享建模，只是把它明确标成剩余结构性缺口。
2. 本轮没有重跑 UI E2E；因此结论聚焦在共享契约对比和现有运行时路径核对，不拿本轮新 E2E 收口。
3. 如果后续决定统一 DiceThrone 被动系统，需要再单开一轮架构变更，而不是继续往 `flowHooks` 里加角色分支。

## 修订记录

- 2026-04-06：
  - 首次把枪手 / 武士放到老派系共享契约下并排审计，而不是只审它们各自的专项问题。
  - 明确记录：当前剩余主要缺口不是 atlas、升级卡、AI 门禁，而是 `Bushido` 的被动建模仍然分叉。
