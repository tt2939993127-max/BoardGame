# 测试与审计规范

> 本文档定义测试策略、审计工具使用和质量保证流程。**触发条件**：新增功能/技能/API、修复 bug、审查实现完整性时阅读。

---

## 测试策略总览

**GameTestRunner 行为测试是最优先、最可靠的测试手段**，审计工具是补充。

| 工具 | 适用场景 | 已用游戏 |
|------|---------|---------|
| GameTestRunner | 命令序列+状态断言（首选） | DT/SW/SU |
| entityIntegritySuite | 数据定义契约（注册表/引用链/触发路径/效果/i18n） | SU/DT |
| referenceValidator | 实体引用链提取与验证 | SU |
| interactionChainAudit | UI 状态机 payload 覆盖（模式 A） | SW |
| interactionCompletenessAudit | Interaction handler 注册覆盖（模式 B） | SU |

**新游戏选型**：所有游戏必选 GameTestRunner；≥20 实体 → entityIntegritySuite；有多步 UI 交互 → interactionChainAudit；有 InteractionSystem → interactionCompletenessAudit。

---

## 效果数据契约测试（强制）

> 新增游戏/英雄/卡牌/Token 定义时，必须同步编写契约测试。

**契约测试的职责**：
1. **结构完整性**：字段存在、引用不断裂、格式正确
2. **语义正确性**：debuff 目标、buff 目标、数值范围、枚举值合法性

**数据结构完整性原则（强制）**：
- 数据定义必须包含所有执行所需的字段
- 禁止在执行层"猜测"或"自动推断"缺失的关键信息
- 契约测试必须检查数据语义正确性，不只是字段存在性

**示例：RollDieConditionalEffect 的 target 字段**
- ❌ 旧设计：`grantStatus: { statusId, value }` — 缺少 target，执行层根据 category 猜测
- ✅ 新设计：`grantStatus: { statusId, value, target?: 'self' | 'opponent' }` — 显式声明或自动推断（注释说明）
- ✅ 契约规则：检查 debuff 的 target 不能是 'self'，buff 的 target 不能是 'opponent'

### `createEffectContractSuite<TSource, TEffect>` 工厂

接受 `getSources()` / `getSourceId()` / `extractEffects()` / `rules: EffectContractRule[]` / `minSourceCount`。

每条 `EffectContractRule` 定义：`name`（测试标题）/ `appliesTo(effect)` / `check(effect)` / `describeViolation(effect)`。

用法示例（精简）：
```typescript
const rules: EffectContractRule<MyEffect>[] = [
  { name: 'random action 需 timing', appliesTo: e => ACTIONS_REQUIRING_RANDOM.has(e.action?.type),
    check: e => e.timing !== undefined, describeViolation: e => `"${e.action.type}" 缺 timing` },
];
createEffectContractSuite({ suiteName: '技能效果契约', getSources, getSourceId, extractEffects, rules, minSourceCount: 20 });
```

### 三类契约（DiceThrone 参考）

| 类别 | 数据源 | 典型规则 |
|------|--------|----------|
| 技能效果 | `AbilityDef.effects` + `variants` | random→timing、rollDie→conditionalEffects、customActionId→已注册 |
| 卡牌效果 | `AbilityCard.effects` | 主阶段卡需 `timing:'immediate'`、replaceAbility 需完整字段 |
| Token 被动 | `TokenDef.passiveTrigger.actions` | customActionId→已注册 |

### `createI18nContractSuite<TSource>` 工厂

验证 i18n key 格式（正则）和存在性（各语言文件）。接受 `keyExtractors`（`fieldName`/`extract`/`keyPattern`/`patternDescription`）+ `locales`（用 `flattenI18nKeys()` 转换）。

### 卡牌效果 timing 边界测试

| 验证内容 | 防止的 bug |
|----------|-----------|
| 非纯描述效果必须有显式 timing | 效果不执行 |
| instant 卡效果必须 `timing:'immediate'` | grantToken/grantStatus 静默跳过 |
| grantToken/grantStatus 必须有显式 timing | Token/状态未授予 |
| onHit 条件效果必须 `timing:'postDamage'` | 命中判定失效 |

### 强制要求

- 新增英雄/卡牌/Token → 确保现有契约规则覆盖，运行测试
- 新增效果类型/action type → 评估是否需新增契约规则
- 新增游戏 → 创建 `entity-chain-integrity.test.ts` 并注册契约规则
- 卡牌 name/description 必须用 i18n key（`cardText()` 辅助函数），同步更新 zh-CN 和 en
- 所有有 action 的效果必须声明 timing
- **参考**：`src/games/dicethrone/__tests__/entity-chain-integrity.test.ts`

---

## 交互链完整性审计 — 模式 A：UI 状态机（强制）

> 多步交互技能（UI ≥2 步输入构建 payload）必须声明 `interactionChain`。

### 核心类型（`engine/primitives/ability.ts`）

```typescript
interface InteractionStep { step: string; inputType: 'unit'|'position'|'card'|'direction'|'choice'|'cards'; producesField: string; optional?: boolean; }
interface PayloadContract { required: string[]; optional?: string[]; }
interface InteractionChain { steps: InteractionStep[]; payloadContract: PayloadContract; }
```

### 使用方式

1. `AbilityDef` 中声明 `interactionChain`（steps + payloadContract）
2. 执行器 `register()` 时声明 `payloadContract`
3. 测试文件用 `createInteractionChainAuditSuite({ suiteName, abilities, requiresMultiStep, declarationWhitelist })`

### 三类检查

| 检查 | 检测的 bug |
|------|-----------|
| 声明完整性：多步技能是否都声明了 `interactionChain` | 新增多步技能忘记声明 |
| 步骤覆盖：steps 产出 ⊇ payloadContract.required | UI 缺少某个交互步骤 |
| 契约对齐：AbilityDef 与执行器的 payloadContract 双向一致 | 两端字段不同步 |

**循环依赖注意**：`executors/index.ts` 副作用导入与 `abilities.ts` 有初始化顺序问题，测试中用手动 `EXECUTOR_CONTRACTS` Map。

**参考**：`src/games/summonerwars/__tests__/interactionChainAudit.test.ts`、`domain/abilities-frost.ts`

---

## 交互完整性审计 — 模式 B：Interaction 链（强制）

> 使用 InteractionSystem（`createSimpleChoice` + `InteractionHandler`）的游戏必须创建此审计。

### 三类检查

| 检查 | 检测的 bug |
|------|-----------|
| Handler 注册覆盖：所有 sourceId 都有对应 handler | 创建了交互但没注册处理函数 |
| 链式完整性：handler 产出的后续 sourceId 也有 handler | 多步链中间断裂 |
| 孤儿 Handler：注册了 handler 但无能力引用 | 死代码/重构遗留 |

用法：`createInteractionCompletenessAuditSuite({ suiteName, sources, registeredHandlerIds, chains })`

### 审计输入自动抽取（P0 强制）

禁止长期维护超长手工 `INTERACTION_SOURCES/HANDLER_CHAINS`。

- 对 SmashUp，审计输入由 `src/games/smashup/__tests__/helpers/interactionAuditAuto.ts` 自动抽取：
  - `createSimpleChoice(..., sourceId)` → source 声明
  - `registerInteractionHandler(sourceId, handler)` 内后续 `createSimpleChoice`/helper 调用 → chain 声明
  - `grantExtraMinion/grantExtraAction` 的 reason（且存在同名 handler）→ 隐式 source 补齐
- 抽取阶段发现动态 `sourceId`（非字面量）视为审计风险；必须改成可静态分析或补充明确白名单策略。

### Release 严格模式（P1 强制）

`createTriggerPathSuite` 支持两个严格开关：

- `failOnTodo`
- `failOnIncompleteBranches`

建议在 release/主干门禁启用：`AUDIT_RELEASE_MODE=1`。
此时 `TODO` 或 `INCOMPLETE_BRANCHES` 非空将直接失败，而非仅 warning。

**模式 A vs B**：A 检查 UI payload 字段覆盖，B 检查 handler 注册覆盖。一个游戏可同时使用两种。

**参考**：`src/games/smashup/__tests__/interactionCompletenessAudit.test.ts`

---

## CI 质量门禁（P0）

新增统一门禁工作流：`.github/workflows/quality-gate.yml`。

PR 必跑并阻断合并：

1. `npm run typecheck`
2. `npm run test:games`
3. `npm run i18n:check`
4. `npm run test:e2e:critical`

其中关键 E2E 由脚本 `test:e2e:critical` 维护（当前包含 SmashUp + TicTacToe rematch 烟测）。

---

## 描述→实现全链路审查规范（强制）

> **当用户说"审查"/"审核"/"检查实现"/"核对"等词时，必须按此规范执行，禁止凭印象回答。**

### 适用场景

① 新增技能/Token/事件卡/被动/光环实现 ② 修复"没效果"类 bug ③ 审查已有机制 ④ 重构涉及消费链路

### 审查流程

**第零步：锁定权威描述** — 从规则文档（`src/games/<gameId>/rule/*.md`）或卡牌图片中提取完整原文。禁止仅凭代码注释、AbilityDef.description 或 i18n 文本作为审查输入——这些是实现产物，不是需求来源。若规则文档缺失，必须向用户索要原文后再开始。

**第一步：拆分独立交互链** — 审查的原子单位不是"卡牌"或"技能"，而是**独立交互链**。任何需要独立的触发条件、玩家输入、或状态变更路径的效果，都必须作为单独的审查条目。一个卡牌/机制拆出几条链就审查几条。

拆分方法：逐句读权威描述，每遇到以下信号就拆出一条独立链：
- 不同的触发时机（"打出时" vs "之后每当…时"）
- 需要玩家做出新的选择（"你可以指定一个目标"）
- 独立的条件→结果对（"如果…则…"）
- **"可以/可选"语义（强制）**：描述中出现"你可以"/"可选"/"may"时，该效果必须作为独立交互链，且实现必须包含玩家确认 UI（确认/跳过按钮），禁止自动执行。审查时必须验证 UI 层存在确认入口。

**第一步自检（强制）**：拆分完成后，将所有交互链的描述拼接起来，与原文逐句对照。原文中每一句话都必须被至少一条链覆盖，否则拆分不完整，禁止进入第二步。

> **常见遗漏模式**：
> - 一张卡牌的描述包含"即时效果"和"持续/触发效果"两段，只审查了前者。持续效果的后续触发往往是一条完整的独立交互链（触发条件 → 玩家选择 → 执行 → 状态变更），必须单独审查。
> - **限定条件被全局化实现丢失**：描述含限定词但实现使用不携带约束的全局机制（如 `grantExtraMinion`），审计时看到"有前置检查+有额度增加"容易误判为 ✅，必须追问"额度使用时限定条件是否仍被强制执行"。

**第二步：逐链追踪八层**

| 层 | 检查内容 |
|----|----------|
| 1. 定义层 | 效果在数据定义中声明（AbilityDef/TokenDef/CardDef），且字段值与权威描述一致 |
| 2. 注册层 | 定义已注册到对应 registry（abilityRegistry/executorRegistry/customActionRegistry），白名单/映射表已同步更新 |
| 3. 执行层 | 触发/执行逻辑存在（execute/abilityResolver/handler），逻辑与描述语义一致。**限定条件全程约束检查（强制）**：描述中的限定词（"在…的基地"/"对…的随从"/"力量≤X"）是否在执行路径全程被强制约束？仅在入口做前置检查但执行时不约束 = ❌。`grantExtra*` 类全局额度增加不携带约束信息，用它实现限定效果必须配合交互流程锁定目标。 |
| 4. 状态层 | 状态变更被 reduce 正确持久化 |
| 5. 验证层 | 是否影响其他命令合法性（validate 放宽/收紧）。**额度/权限泄漏检查（强制）**：效果给出的额度/权限，玩家能否绕过描述中的限定条件使用？ |
| 6. UI 层 | 视觉反馈/交互入口/状态提示同步。**UI 数据显示必须走统一查询入口（强制）**：UI 层显示的动态数值禁止直接读底层字段，必须通过统一查询函数获取。审查时 grep 范围必须包含 `.tsx` 文件。 |
| 7. i18n 层 | 所有面向玩家的文本（技能名/描述/状态提示/按钮文案）在全部语言文件中有对应条目，禁止依赖 fallback 字符串上线 |
| 8. 测试层 | 端到端测试覆盖"触发→生效→状态正确" |

**第三步：grep 发现所有消费点** — ID 只出现在定义+注册文件 = 消费层缺失。

**第四步：交叉影响检查** — 新增的交互链是否会触发已有机制的连锁反应（如推拉触发其他单位的"被推拉后"效果、伤害触发"受伤时"被动）。列出可能的连锁路径，确认已有机制能正确响应或显式声明不触发。

### 测试覆盖要求

每条交互链：正向（触发→生效→验证状态）+ 负向（不触发→状态未变）+ 边界（0值/空目标/多次叠加）。**禁止只测注册/写入就判定"已实现"。**

**测试必须验证状态变更（强制）**：事件发射 ≠ 状态生效，必须同时断言 reduce 后的最终状态。

**"可以/可选"效果测试要求（强制）**：正向（确认→生效）+ 负向（跳过→不生效）+ 验证（条件不满足→拒绝）。禁止只测自动触发路径。

### 产出要求

- 输出"独立交互链 × 八层"矩阵
- 每条交互链必须附带权威描述原文（逐句引用），作为矩阵第一列
- 每个交叉点 ✅/❌ + 具体证据（文件名+函数名）
- ❌ 时立即修复或标注 TODO
- UI/i18n 层不明确时询问用户
- 禁止"看起来没问题"的模糊结论

### 第五步：数据查询一致性审查（强制）

> **来源**：交缠颂歌共享技能 bug 复盘——八层链路全部 ✅，但 10+ 处消费点直接读 `unit.card.abilities` 绕过了 `getUnitAbilities`，导致共享技能在战力计算、推拉免疫、UI 按钮等场景完全不生效。

**问题本质**：纵向链路（定义→注册→执行→状态→…）完整，但横向一致性（所有消费点是否走统一查询入口）未覆盖。

**审查方法**：

1. **识别关键数据查询入口**：每个机制都有"正确的查询方式"（如 `getUnitAbilities(unit, state)` 而非 `unit.card.abilities`）。审查时必须明确列出该机制的统一查询入口。

2. **grep 原始字段访问**：用 grep 搜索所有直接访问底层数据的代码（如 `\.card\.abilities`、`\.statusEffects`、`\.tags\.`），排除以下合法场景后，剩余的都是绕过嫌疑：
   - 统一查询函数内部（数据源本身）
   - 不受该机制影响的场景（如 `attachedUnits` 的技能检查）

3. **逐个判定**：对每个绕过嫌疑点，判断是否应该走统一入口。判定标准：
   - 该查询结果是否会因为 buff/共享/临时效果而改变？→ 是 → 必须走统一入口
   - 该查询是否只关心"印刷值"（卡牌原始数据）？→ 是 → 可以直接访问

4. **输出绕过清单**：列出所有需要修复的绕过点（文件+行号+当前代码+应改为）

**典型绕过模式**：

| 绕过模式 | 正确做法 | 影响 |
|----------|----------|------|
| `unit.card.abilities.includes('X')` | `getUnitAbilities(unit, state).includes('X')` 或 `hasXAbility(unit, state)` | 共享/临时技能不生效 |
| `unit.card.strength` 直接用于计算 | `calculateEffectiveStrength(unit, state)` | buff/光环加成不生效 |
| `unit.card.life` 直接用于判定 | `getEffectiveLife(unit, state)` | 生命加成不生效 |
| `otherUnit.card.abilities` 检查其他单位 | `getUnitAbilities(otherUnit, state)` | 其他单位的共享技能不生效 |
| **UI 层** 直接读底层字段显示数值 | 通过统一查询函数获取 | 动态修正（ongoing/临时/buff）不反映在界面上 |

**适用时机**：
- 新增任何"修改/增强/共享"类机制时（buff、光环、装备、交缠等）
- 修复"没效果"类 bug 后，必须做一次全量 grep 确认无遗漏
- 重构数据查询入口时
- **grep 范围必须包含 `.tsx` 文件**：UI 层是最常见的绕过位置

---

## 元数据语义一致性审计（强制）

> **来源**：灵魂燃烧 bug 复盘——八层链路全 ✅，注册完整性审计全 ✅，但 custom action 的 `categories` 声明为 `['resource']`，handler 实际产生 `DAMAGE_DEALT`。`playerAbilityHasDamage` 依赖 categories 判断技能是否包含伤害，缺少 `'damage'` 导致防御投掷阶段被跳过。同类 bug 波及 fiery-combo、burn-down、ignite、suppress 等多个技能。

**问题本质**：注册完整性审计只检查"是否注册了、categories 是否非空"，不检查"categories 声明是否与 handler 实际行为一致"。元数据（categories/tags/meta）被下游逻辑消费时，语义错误会导致静默的逻辑分支错误。

### 核心规则

**handler 产生 `DAMAGE_DEALT` → categories 必须包含 `'damage'`**。这是 `playerAbilityHasDamage` 的判定依据，缺失会导致防御投掷阶段被跳过。

### 审计方法

1. **自动化审计**：`customaction-category-consistency.test.ts` 对每个注册的 custom action 调用 handler（mock 状态），检查输出事件类型是否与 categories 声明一致。
2. **关键映射**：`DAMAGE_DEALT → 'damage'`（强制，失败即阻断）。`STATUS_APPLIED → 'status'`、`HEAL_APPLIED → 'resource'` 等为建议级别。
3. **反向检查**：声明了 `'damage'` 但 handler 未产生 `DAMAGE_DEALT` → 可能是 categories 声明过度或 mock 不足。

### 适用时机

- **新增 custom action handler 时（强制）**：注册 categories 前，先确认 handler 所有可能的输出事件类型，确保 categories 覆盖
- **修改 handler 逻辑时（强制）**：如果新增/移除了某类事件输出，同步更新 categories
- **修复"防御阶段被跳过"/"效果未触发"类 bug 时**：先检查 categories 是否与 handler 行为一致

### 典型错误模式

| 错误模式 | 后果 | 正确做法 |
|----------|------|----------|
| handler 产生 `DAMAGE_DEALT` 但 categories 只有 `['resource']` 或 `['other']` | `playerAbilityHasDamage` 返回 false，跳过防御投掷 | categories 必须包含 `'damage'` |
| handler 内部对对手造成伤害但 `target='self'`，且 categories 无 `'damage'` | 同上（target 和 categories 双重遗漏） | categories 声明以 handler 实际输出为准，不依赖 target 字段 |
| 重构时将单个 handler 拆分为多个，但新 handler 的 categories 从旧 handler 复制而未审查 | 拆分后的子 handler 可能只覆盖部分事件类型 | 拆分后逐个审查每个子 handler 的输出事件类型 |

**参考**：`src/games/dicethrone/__tests__/customaction-category-consistency.test.ts`

---

## 测试覆盖要求（强制）

- **新增功能必须补充测试**：新增功能/技能/API 必须同步补充测试，覆盖正常+异常场景。
- **GameTestRunner 优先**：行为测试是最可靠的测试手段，优先使用。
- **契约测试补充**：用于批量覆盖注册表引用完整性和交互链完整性。
- **端到端测试**：关键交互面（按钮/Modal/Tab/表单校验）必须有 E2E 覆盖。

---

## 审计反模式清单（强制）

> 审查时逐条检查，来自实际遗漏复盘。

| # | 反模式 | 正确做法 | 优先级 |
|---|--------|----------|--------|
| 1 | "可以/可选"效果自动执行（`DECLARE_ATTACK` 直接消耗充能） | 触发事件 → UI 确认 → 独立命令执行 | P0 |
| 2 | 测试只断言事件发射，不验证 reduce 后状态 | 同时断言事件 + 最终状态（`hasAttacked`/`extraAttacks`/`boosts`） | P0 |
| 3 | `as any` 绕过类型检查访问不存在的字段 | 用正确类型或类型守卫，grep `as any` 逐个验证 | P0 |
| 4 | 审计矩阵测试层标 ✅ 但只有事件断言 | 必须覆盖"命令→事件→状态变更"全链路才能标 ✅ | P1 |
| 5 | 八层链路全 ✅ 但消费点绕过统一查询入口 | 新增修改/共享/增强类机制后，必须 grep 原始字段访问，确认所有消费点走统一入口（见「数据查询一致性审查」） | P0 |
| 6 | 只检查自身单位的技能查询，忽略对其他单位的技能查询 | `otherUnit.card.abilities` 同样需要走 `getUnitAbilities(otherUnit, state)`，其他单位也可能有共享/临时技能 | P0 |
| 7 | 纵向审计通过就判定"已实现"，不做横向一致性检查 | 纵向（八层链路）+ 横向（数据查询一致性）双维度审查才能判定完整 | P1 |
| 8 | custom action 的 categories 声明与 handler 实际输出事件类型不一致（如 handler 产生 `DAMAGE_DEALT` 但 categories 无 `'damage'`） | 注册 categories 前先确认 handler 所有输出事件类型；修改 handler 后同步更新 categories；运行 `customaction-category-consistency.test.ts` 验证（见「元数据语义一致性审计」） | P0 |
| 9 | 描述含限定条件但实现使用不携带约束的全局机制（如 `grantExtraMinion` 全局额度增加），限定条件仅在入口检查、执行时不约束 | 限定效果必须通过交互流程（选目标→锁定→直接执行）将约束固化在执行路径中，禁止用"前置检查+全局额度"模式（玩家可绕过）。审计时对 `grantExtra*` 类实现必须追问"额度使用时限定条件是否仍被强制执行" | P0 |
| 10 | UI 层（`.tsx`）直接读底层字段显示数值，绕过统一查询入口，导致动态修正不反映在界面上 | 数据查询一致性审查的 grep 范围必须包含 `.tsx` 文件 | P0 |
