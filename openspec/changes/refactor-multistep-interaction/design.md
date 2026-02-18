# 设计文档：多步交互模型

## Context

InteractionSystem 当前支持两种交互 kind：
- `simple-choice`：选一个选项即结算
- `slider-choice`：选一个数值即结算

DiceThrone 的骰子修改需要"多步调整 → 预览 → 确认"，但引擎层没有这个模型。
当前绕过方式：`dt:card-interaction` 自定义 kind + UI 层 `pendingDieValues` + `systems.ts` 手写计数器。

## Goals / Non-Goals

Goals:
- 引擎层原生支持多步交互（中间步骤纯本地，确认时一次性提交）
- DiceThrone 骰子修改迁移到新模型，删除所有绕过代码
- 面向百游戏：新游戏的多步交互只需声明配置

Non-Goals:
- 不改变 `simple-choice` / `slider-choice` 的行为
- 不改变 `dt:token-response` / `dt:bonus-dice`（它们不是多步交互）
- 不改变网络协议（中间步骤纯本地，不涉及服务端）

## Decisions

### 核心设计：multistep-choice 交互模型

```typescript
/** 多步交互数据 */
interface MultistepChoiceData<TStep = unknown, TResult = unknown> {
    /** 弹窗标题（i18n key） */
    title: string;
    /** 来源技能/卡牌 ID */
    sourceId?: string;
    /** 最大步骤数（达到后自动确认，可选） */
    maxSteps?: number;
    /** 最小步骤数（未达到时禁止确认，默认 1） */
    minSteps?: number;
    /**
     * 本地 reducer：处理中间步骤
     * 纯客户端执行，不经过 pipeline，不发网络请求。
     * 返回更新后的累积结果。
     */
    localReducer: (current: TResult, step: TStep) => TResult;
    /**
     * 结果转命令：确认时将累积结果转换为引擎命令列表
     * 返回的命令会被依次 dispatch 到引擎。
     */
    toCommands: (result: TResult) => Array<{ type: string; payload: unknown }>;
    /** 初始累积结果 */
    initialResult: TResult;
    /** 验证函数：判断当前步骤是否合法（可选） */
    validateStep?: (current: TResult, step: TStep) => boolean;
}
```

### 生命周期

1. **创建**：游戏层调用 `createMultistepChoice(id, playerId, data)` → `queueInteraction()`
2. **中间步骤**：UI 层调用 `useMultistepInteraction().step(payload)` → 纯本地执行 `localReducer` → React state 更新 → UI 重渲染
3. **确认**：UI 层调用 `useMultistepInteraction().confirm()` → `toCommands(result)` 生成命令列表 → 依次 `dispatch` 到引擎
4. **取消**：UI 层调用 `dispatch(INTERACTION_COMMANDS.CANCEL)` → 引擎层 `resolveInteraction` 弹出下一个

### 关键决策

1. **中间步骤不经过 pipeline** — 重要的只是结果。中间调整是 UI 的事，引擎不需要知道。
2. **确认时生成命令列表而非单一事件** — 骰子修改需要多个 `MODIFY_DIE` 命令（每颗骰子一个），复用现有命令类型，不引入新命令。
3. **`localReducer` 在 React Hook 中执行** — 不在引擎系统中，避免 pipeline 开销。
4. **`MultistepChoiceSystem` 只管阻塞** — 有 `multistep-choice` 交互时阻塞该玩家的非系统命令，不处理中间步骤。
5. **自动确认** — `maxSteps` 达到时 Hook 自动调用 confirm，覆盖 DiceThrone 的 `selectCount` 语义。

### React Hook 设计

```typescript
/** UI 层消费多步交互的 Hook */
function useMultistepInteraction<TStep, TResult>(
    interaction: InteractionDescriptor<MultistepChoiceData<TStep, TResult>> | undefined,
    dispatch: (type: string, payload: unknown) => void,
): {
    /** 当前累积结果 */
    result: TResult | null;
    /** 已执行的步骤数 */
    stepCount: number;
    /** 是否可以确认（stepCount >= minSteps） */
    canConfirm: boolean;
    /** 执行一个中间步骤 */
    step: (payload: TStep) => void;
    /** 确认提交 */
    confirm: () => void;
    /** 取消 */
    cancel: () => void;
}
```

### DiceThrone 迁移方案

骰子修改的 4 种模式统一为 `multistep-choice`：

| 模式 | 当前行为 | 迁移后 |
|------|----------|--------|
| `set` | 选骰子 → 确认 → dispatch MODIFY_DIE | step(选骰子) → confirm → MODIFY_DIE |
| `copy` | 选2颗骰子 → 确认 → dispatch MODIFY_DIE | step(选骰子×2) → confirm → MODIFY_DIE |
| `adjust` | 每次 +/- 立即 dispatch MODIFY_DIE | step(+/-) → 本地预览 → confirm → MODIFY_DIE |
| `any` | pendingDieValues 本地预览 → 确认 → dispatch MODIFY_DIE | step(改值) → 本地预览 → confirm → MODIFY_DIE |

`selectDie`（重掷）同理：step(选骰子) → confirm → REROLL_DIE。

### 删除清单

- `RightSidebar.tsx`：删除 `pendingDieValues`、`selectedDice`、`modifiedDice`、`totalAdjustment` 状态
- `DiceTray.tsx`：删除所有本地状态 props，改用 `useMultistepInteraction` Hook
- `DiceActions.tsx`：删除 `handleConfirmClick` 中的模式分支，统一调用 `confirm()`
- `systems.ts`：删除 `_diceModCount` 计数器和 `DIE_MODIFIED`/`DIE_REROLLED` 自动完成逻辑
- `systems.ts`：骰子修改类 `INTERACTION_REQUESTED` 改为创建 `multistep-choice` 而非 `dt:card-interaction`

### 不变的部分

- `dt:card-interaction` 仍用于非骰子交互（状态选择 `selectStatus`/`selectPlayer`/`selectTargetStatus`）
- `dt:token-response` / `dt:bonus-dice` 不变
- `simple-choice` / `slider-choice` 不变
- 网络协议不变（中间步骤纯本地）

## Risks / Trade-offs

- `toCommands` 生成的命令列表在确认时依次 dispatch，如果中间某个命令失败，后续命令不会执行。这与当前 `adjust` 模式的行为一致（逐个 dispatch），风险不变。
- `localReducer` 在 React 渲染周期中执行，如果逻辑复杂可能影响帧率。但骰子修改的 reducer 极其简单（改个数值），不是问题。

## Open Questions

- `dt:card-interaction` 中的状态选择交互（`selectStatus` 等）是否也应迁移到 `simple-choice`？它们本质上是单选，不需要多步。但这不在本次重构范围内。
