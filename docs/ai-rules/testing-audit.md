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

**第一步自检（强制）**：拆分完成后，将所有交互链的描述拼接起来，与原文逐句对照。原文中每一句话都必须被至少一条链覆盖，否则拆分不完整，禁止进入第二步。

> **常见遗漏模式**：一张卡牌的描述包含"即时效果"和"持续/触发效果"两段，只审查了前者。持续效果的后续触发往往是一条完整的独立交互链（触发条件 → 玩家选择 → 执行 → 状态变更），必须单独审查。

**第二步：逐链追踪八层**

| 层 | 检查内容 |
|----|----------|
| 1. 定义层 | 效果在数据定义中声明（AbilityDef/TokenDef/CardDef），且字段值与权威描述一致 |
| 2. 注册层 | 定义已注册到对应 registry（abilityRegistry/executorRegistry/customActionRegistry），白名单/映射表已同步更新 |
| 3. 执行层 | 触发/执行逻辑存在（execute/abilityResolver/handler），逻辑与描述语义一致 |
| 4. 状态层 | 状态变更被 reduce 正确持久化 |
| 5. 验证层 | 是否影响其他命令合法性（validate 放宽/收紧） |
| 6. UI 层 | 视觉反馈/交互入口/状态提示同步（动态效果必须有 UI 提示） |
| 7. i18n 层 | 所有面向玩家的文本（技能名/描述/状态提示/按钮文案）在全部语言文件中有对应条目，禁止依赖 fallback 字符串上线 |
| 8. 测试层 | 端到端测试覆盖"触发→生效→状态正确" |

**第三步：grep 发现所有消费点** — ID 只出现在定义+注册文件 = 消费层缺失。

**第四步：交叉影响检查** — 新增的交互链是否会触发已有机制的连锁反应（如推拉触发其他单位的"被推拉后"效果、伤害触发"受伤时"被动）。列出可能的连锁路径，确认已有机制能正确响应或显式声明不触发。

### 测试覆盖要求

每条交互链：正向（触发→生效→验证状态）+ 负向（不触发→状态未变）+ 边界（0值/空目标/多次叠加）。**禁止只测注册/写入就判定"已实现"。**

### 产出要求

- 输出"独立交互链 × 八层"矩阵
- 每条交互链必须附带权威描述原文（逐句引用），作为矩阵第一列
- 每个交叉点 ✅/❌ + 具体证据（文件名+函数名）
- ❌ 时立即修复或标注 TODO
- UI/i18n 层不明确时询问用户
- 禁止"看起来没问题"的模糊结论

---

## 测试覆盖要求（强制）

- **新增功能必须补充测试**：新增功能/技能/API 必须同步补充测试，覆盖正常+异常场景。
- **GameTestRunner 优先**：行为测试是最可靠的测试手段，优先使用。
- **契约测试补充**：用于批量覆盖注册表引用完整性和交互链完整性。
- **端到端测试**：关键交互面（按钮/Modal/Tab/表单校验）必须有 E2E 覆盖。
