---
name: create-new-game
description: "为本项目创建新游戏。当用户要求新增游戏时使用。基于 dicethrone/summonerwars/smashup 三个游戏的真实模式，分 6 个阶段逐步完成，每阶段有明确验收标准，不允许跳阶段。"
---

# 创建新游戏（分阶段工作流）

> **核心原则**：每个阶段独立可验证、独立可提交。阶段之间不留 TODO 缺口。AI 必须在完成当前阶段验收后才能进入下一阶段。

## 前置：信息收集（启动门禁）

收集以下信息后才能开始。**已有信息直接使用，缺失项回问用户，不猜测**：

1. **gameId**（小写，与目录名一致，如 `smashup`）
2. **玩家人数范围**（如 `[2]`、`[2,3,4]`）
3. **核心机制简述**（如"卡牌驱动+区域控制"、"骰子+角色技能"、"战棋+召唤"）
4. **是否需要阶段/流程系统**（多阶段回合制 → FlowSystem）
5. **规则文档位置**（若有，先放 `rule/` 目录下）
6. **i18n 标题与简介**（中英文）

**先查已有字段**：阅读 `src/games/manifest.types.ts` 确认可用字段，避免重复询问。

---

## 阶段 1：目录骨架与 Manifest 落地

**目标**：建立完整目录结构与最小占位实现，`npm run generate:manifests` 可成功运行。

### 1.1 创建目录结构

```
src/games/<gameId>/
  manifest.ts          # 清单元数据
  game.ts              # 引擎适配器组装（占位）
  Board.tsx            # UI 主板（占位）
  thumbnail.tsx        # 缩略图组件
  tutorial.ts          # 教学配置（占位）
  audio.config.ts      # 音频配置（占位）
  criticalImageResolver.ts  # 关键图片预加载（若有精灵图）
  domain/
    index.ts           # 领域内核入口
    types.ts           # 核心状态/命令/事件类型
    ids.ts             # 领域 ID 常量表
  rule/
    <游戏名>规则.md     # 规则文档占位
  ui/                  # 游戏 UI 子模块（空目录）
  __tests__/
    smoke.test.ts      # 冒烟测试占位
```

### 1.2 manifest.ts（参考真实游戏）

```ts
import type { GameManifestEntry } from '../manifest.types';

const entry: GameManifestEntry = {
    id: '<gameId>',
    type: 'game',
    enabled: true,
    titleKey: 'games.<gameId>.title',
    descriptionKey: 'games.<gameId>.description',
    category: 'strategy',         // strategy | casual | party | abstract
    playersKey: 'games.<gameId>.players',
    icon: '🎮',
    thumbnailPath: '<gameId>/thumbnails/cover',
    allowLocalMode: false,        // 默认仅联机
    playerOptions: [2],           // 可选 [2,3,4]
    tags: [],                     // dice_driven | card_driven | tactical 等
    bestPlayers: [2],
};

export const <GAME_ID>_MANIFEST: GameManifestEntry = entry;
export default entry;
```

### 1.3 domain/types.ts（核心状态骨架）

**必须定义**：
- `GamePhase` 类型（所有游戏阶段枚举）
- `PlayerState` 接口
- `<GameId>Core` 核心状态接口
- `<GameId>Command` 命令联合类型
- `<GameId>Event` 事件联合类型
- 命令常量对象 `XX_COMMANDS`
- 事件常量对象 `XX_EVENTS`

参考 smashup 的模式：
```ts
export type GamePhase = 'factionSelect' | 'startTurn' | 'playCards' | ...;
export const PHASE_ORDER: GamePhase[] = [...];
export const SU_COMMANDS = { PLAY_MINION: 'PLAY_MINION', ... } as const;
export const SU_EVENTS = { MINION_PLAYED: 'MINION_PLAYED', ... } as const;
```

### 1.4 domain/ids.ts（领域 ID 常量表）

所有稳定 ID 必须在此定义，禁止字符串字面量。

### 1.5 domain/index.ts（领域内核占位）

```ts
import type { DomainCore, PlayerId, RandomFn, GameOverResult } from '../../../engine/types';
import type { <GameId>Core } from './types';

export const <GameId>Domain: DomainCore<<GameId>Core> = {
    gameId: '<gameId>',
    setup: (playerIds: PlayerId[], random: RandomFn): <GameId>Core => ({
        // 最小初始状态
        players: Object.fromEntries(playerIds.map(pid => [pid, createPlayerState(pid)])),
        turnNumber: 1,
        // ...其他必要字段
    }),
    validate: (state, command) => ({ valid: true }),  // 占位
    execute: (state, command, random) => [],            // 占位
    reduce: (core, event) => core,                     // 占位
    isGameOver: (core) => core.gameResult,
};
```

### 1.6 game.ts（引擎适配器占位）

```ts
import { createGameAdapter, createDefaultSystems, createFlowSystem } from '../../engine';
import { <GameId>Domain } from './domain';
import type { <GameId>Core } from './domain/types';

// FlowHooks 占位（阶段 4 实现）
const flowHooks = {
    initialPhase: '<firstPhase>',
    getNextPhase: () => '<firstPhase>',
    getActivePlayerId: ({ state }) => Object.keys(state.core.players)[0],
};

const systems = [
    createFlowSystem<<GameId>Core>({ hooks: flowHooks }),
    ...createDefaultSystems<<GameId>Core>(),
];

export const <GameId> = createGameAdapter<<GameId>Core>({
    domain: <GameId>Domain,
    systems,
    minPlayers: 2,
    maxPlayers: 2,
    commandTypes: [],  // 阶段 4 填充
});

export default <GameId>;
```

### 1.7 Board.tsx（最小占位）

```tsx
import React from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { MatchState } from '../../engine/types';
import type { <GameId>Core } from './domain/types';

type Props = BoardProps<MatchState<<GameId>Core>>;

const <GameId>Board: React.FC<Props> = ({ G, moves, playerID, ctx }) => {
    return <div className="p-4 text-white">
        <h1><gameId> - 骨架占位</h1>
        <pre>{JSON.stringify(G.core, null, 2)}</pre>
    </div>;
};

export default <GameId>Board;
```

### 1.8 其他占位文件

- **thumbnail.tsx**：使用 `ManifestGameThumbnail` 组件
- **tutorial.ts**：导出空 `TutorialManifest`（`{ id: '<gameId>-basic', steps: [] }`）
- **audio.config.ts**：导出空 `GameAudioConfig`
- **__tests__/smoke.test.ts**：验证 domain.setup 不报错

### 1.9 资源目录

```
public/assets/<gameId>/
  thumbnails/.gitkeep
  images/.gitkeep
```

### 1.10 i18n 文件

创建 `public/locales/zh-CN/game-<gameId>.json` 和 `public/locales/en/game-<gameId>.json`，包含 title/description/players。

### 验收

```bash
npm run generate:manifests    # 成功生成清单
npx vitest run src/games/<gameId>  # 冒烟测试通过
npm run dev                   # 编译无报错（游戏可在大厅列表看到）
```

---

## 阶段 2：规则分析 → 类型与数据定义

**目标**：完成核心类型定义与静态数据配置，不写业务逻辑。

### 2.1 阅读规则文档

阅读 `src/games/<gameId>/rule/` 下的规则文档，拆解为：

1. **阶段流程**：回合结构、阶段顺序、阶段间切换条件
2. **核心实体**：卡牌/单位/骰子/资源的类型与属性
3. **操作类型**：玩家可执行的命令（如出牌/移动/攻击/弃牌）
4. **结算规则**：积分/伤害/胜利条件
5. **特殊机制**：如 faction 选择、deck building、技能触发

### 2.2 完善 domain/types.ts

根据规则分析，补充：
- 完整的 `PlayerState`（手牌/牌库/弃牌/资源/状态效果等）
- 完整的 `<GameId>Core`（玩家状态/回合信息/棋盘/选择状态等）
- 所有命令类型（`XX_COMMANDS` 常量对象）
- 所有事件类型（`XX_EVENTS` 常量对象）
- 卡牌/单位等静态数据类型

### 2.3 创建数据配置

根据游戏复杂度选择结构：

**简单游戏**（如 tictactoe）：直接在 domain 中定义。

**中等游戏**（如 smashup）：
```
data/
  cards.ts           # 卡牌定义与查询函数
  factions/          # 按 faction 组织数据
    aliens.ts
    dinosaurs.ts
    ...
```

**复杂游戏**（如 summonerwars）：
```
config/
  board.ts           # 棋盘配置
  dice.ts            # 骰子配置
  heroes.ts          # 英雄/召唤师配置
  factions/          # 阵营数据
    necromancer.ts
    ...
```

### 2.4 检查系统需求

对照规则，在引擎层检索可复用实现：
- 骰子 → `src/systems/DiceSystem/`
- 资源 → `src/systems/ResourceSystem/`
- 卡牌 → `src/systems/CardSystem/`
- 技能 → `src/systems/AbilitySystem/`
- 状态效果 → `src/systems/StatusEffectSystem/`

**若缺口存在**：先在 `src/systems/` 或 `src/engine/systems/` 补齐通用实现，再回到游戏层。

### 验收

- types.ts 中所有类型能覆盖规则文档描述的实体
- 数据文件可正常导入，无循环依赖
- 冒烟测试仍通过

---

## 阶段 3：领域内核实现（Command → Event → Reduce）

**目标**：完成确定性核心逻辑，测试通过。

### 3.1 实现 validate（命令校验）

```ts
// domain/commands.ts 或 domain/validate.ts
export function validate(state: MatchState<Core>, command: Command): ValidationResult {
    // 1. 检查是否是当前玩家的回合
    // 2. 检查当前阶段是否允许此命令
    // 3. 检查命令参数合法性
    // 4. 检查资源/条件是否满足
}
```

**三个游戏共同模式**：
- dicethrone: `domain/commands.ts` → `validateCommand()`
- summonerwars: `domain/validate.ts` → `validateCommand()`
- smashup: `domain/commands.ts` → `validate()`

### 3.2 实现 execute（生成事件）

```ts
// domain/execute.ts 或 domain/reducer.ts
export function execute(state: MatchState<Core>, command: Command, random?: RandomFn): GameEvent[] {
    // 根据 command.type 分发处理
    // 返回一系列事件（不直接修改状态）
}
```

### 3.3 实现 reduce（应用事件到状态）

```ts
// domain/reducer.ts
export function reduce(core: Core, event: GameEvent): Core {
    switch (event.type) {
        case 'UNIT_MOVED': return { ...core, ... };
        case 'DAMAGE_DEALT': return { ...core, ... };
        // 每种事件类型一个 case
        default: return core;
    }
}
```

**关键约束**：reduce 必须是纯函数，不依赖随机数。

### 3.4 实现 isGameOver

```ts
isGameOver: (core): GameOverResult | undefined => {
    // 检查胜利条件
    // 返回 { winner: playerId } 或 { draw: true } 或 undefined
}
```

### 3.5 补充单元测试

在 `__tests__/` 创建测试文件，覆盖：
- 正常流程（happy path）
- 非法操作被拒绝
- 边界条件
- 胜利条件判定

**测试辅助模式**（参考 smashup/__tests__/helpers.ts）：
```ts
export function makePlayer(id: string, overrides?: Partial<PlayerState>): PlayerState { ... }
export function makeState(overrides?: Partial<Core>): Core { ... }
export function makeMatchState(core: Core): MatchState<Core> { ... }
```

### 验收

```bash
npx vitest run src/games/<gameId>  # 所有测试通过
```

核心规则正常 + 异常场景有覆盖。

---

## 阶段 4：FlowSystem 与系统组装

**目标**：接入 FlowSystem 完成阶段流转，`game.ts` 组装完毕。

### 4.1 实现 FlowHooks

创建 `domain/flowHooks.ts`（参考 summonerwars/domain/flowHooks.ts）：

```ts
import type { FlowHooks, PhaseExitResult } from '../../../engine/systems/FlowSystem';

export const flowHooks: FlowHooks<Core> = {
    // 初始阶段（通常为 factionSelect 或第一个游戏阶段）
    initialPhase: 'factionSelect',

    // 是否允许推进
    canAdvance: ({ state }) => ({ ok: true }),

    // 下一阶段计算
    getNextPhase: ({ state, from }) => {
        const idx = PHASE_ORDER.indexOf(from as GamePhase);
        return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
    },

    // 当前活跃玩家
    getActivePlayerId: ({ state }) => state.core.currentPlayer,

    // 阶段退出副作用（如：抽牌/切换回合/结算伤害）
    onPhaseExit: ({ state, from }): PhaseExitResult => {
        const events: GameEvent[] = [];
        // 按阶段处理副作用
        return { events };
    },

    // 阶段进入副作用（如：回合开始事件/状态重置）
    onPhaseEnter: ({ state, from, to }): GameEvent[] => {
        const events: GameEvent[] = [];
        // 按阶段处理副作用
        return events;
    },

    // 自动推进检查（如：非交互阶段自动跳过）
    onAutoContinueCheck: ({ state, events }) => {
        // 如 startTurn/endTurn 等纯自动阶段
        return undefined;
    },
};
```

**三个游戏的 FlowHooks 复杂度对比**：
- smashup: `domain/index.ts` 内联（~150 行），阶段退出处理记分逻辑
- summonerwars: 独立 `domain/flowHooks.ts`（~250 行），阶段进退处理抽牌/换人/技能触发
- dicethrone: `game.ts` 内联（~500 行），最复杂，攻防阶段有大量分支

### 4.2 完善 game.ts

```ts
// 系统选择模式（三个游戏共同模式）
const systems = [
    createFlowSystem<Core>({ hooks: flowHooks }),
    // 方式 A：逐个选择（dicethrone/summonerwars 风格，精细控制）
    createEventStreamSystem(),
    createLogSystem(),
    createActionLogSystem({ commandAllowlist: ACTION_ALLOWLIST, formatEntry }),
    createUndoSystem({ snapshotCommandAllowlist: ACTION_ALLOWLIST }),
    createPromptSystem(),
    createRematchSystem(),
    createResponseWindowSystem(),
    createTutorialSystem(),
    createCheatSystem<Core>(cheatModifier),

    // 方式 B：默认集合（smashup 风格，简洁）
    // ...createDefaultSystems<Core>(),
    // createCheatSystem<Core>(cheatModifier),
];

// 命令类型（必须列出所有业务命令 + 系统命令）
const commandTypes = [
    ...Object.values(XX_COMMANDS),
    FLOW_COMMANDS.ADVANCE_PHASE,    // 阶段推进
    UNDO_COMMANDS.REQUEST_UNDO,     // 撤销系统
    UNDO_COMMANDS.APPROVE_UNDO,
    UNDO_COMMANDS.REJECT_UNDO,
    UNDO_COMMANDS.CANCEL_UNDO,
    CHEAT_COMMANDS.SET_RESOURCE,    // 作弊系统（开发用）
    CHEAT_COMMANDS.SET_STATE,
    // ...按需添加
];
```

### 4.3 实现 CheatModifier（开发调试必备）

参考 summonerwars/game.ts 的 `summonerWarsCheatModifier`，至少实现：
- `getResource` / `setResource`
- `setPhase`
- `dealCardByIndex`（如有牌库）

### 4.4 实现 ActionLog 格式化与卡牌预览注册

**ActionLog 格式化**：为核心命令提供人类可读的日志格式。需要在 `game.ts` 中配置 `createActionLogSystem` 的 `formatEntry` 和 `commandAllowlist`。

```ts
// game.ts 中配置 ActionLogSystem（若使用 createDefaultSystems 则需单独配置）
import { createActionLogSystem } from '../../engine/systems/ActionLogSystem';
import type { ActionLogEntry } from '../../engine/types';

// 命令白名单（哪些命令需要记录日志）
const ACTION_ALLOWLIST = Object.values(XX_COMMANDS);

// 日志格式化函数
function formatEntry({ command, state, events }): ActionLogEntry | null {
    const segments: ActionLogSegment[] = [];
    switch (command.type) {
        case XX_COMMANDS.PLAY_CARD: {
            const cardId = command.payload?.cardId;
            const cardName = getCardName(cardId);  // 从配置中查找
            segments.push(
                { type: 'text', text: '打出：' },
                { type: 'card', cardId, previewText: cardName },
            );
            break;
        }
        // ...其他命令类型
        default:
            return null;
    }
    return {
        id: `${command.type}-${Date.now()}`,
        timestamp: Date.now(),
        actorId: command.playerId,
        kind: command.type,
        segments,
    };
}
```

**卡牌预览注册**（若游戏有卡牌）：让日志中的卡牌名称支持 hover 预览图片。

```ts
// ui/cardPreviewHelper.ts
import type { CardPreviewRef } from '../../../systems/CardSystem';
import { registerCardPreviewGetter } from '../../../components/game/cardPreviewRegistry';

// 构建 cardId → CardPreviewRef 的映射
export function get<GameId>CardPreviewRef(cardId: string): CardPreviewRef | null {
    // 从卡牌配置中查找对应的精灵图/图片引用
    // 横向卡牌需要设置 aspectRatio（如 1044/729）
    return { type: 'atlas', atlasId: '...', index: spriteIndex, aspectRatio: W/H };
    // 或 { type: 'image', src: 'path/to/card', aspectRatio: W/H };
}

// game.ts 末尾注册（注意 Vite SSR 函数提升陷阱，放文件末尾）
registerCardPreviewGetter('<gameId>', get<GameId>CardPreviewRef);
```

**`aspectRatio` 说明**：`CardPreviewRef` 的 `aspectRatio` 字段（宽/高）控制日志预览的尺寸比例。竖向卡牌（如 DiceThrone）可不传（默认竖向），横向卡牌（如 SummonerWars 1044:729）必须传。

### 4.5 补充 FlowHooks 测试

```bash
npx vitest run src/games/<gameId>/__tests__/flow.test.ts
```

### 验收

```bash
npm run generate:manifests   # 清单生成成功
npx vitest run src/games/<gameId>  # 所有测试通过
npm run dev                  # 游戏可从大厅创建对局，基础回合可推进
```

---

## 阶段 5：Board/UI 与交互闭环

**目标**：提供最小可玩 UI，完成交互闭环。

### 5.0 UI 设计规范生成（强制前置）

> 每个游戏的视觉风格各不相同，**禁止直接复用已有游戏的样式规范**。必须为新游戏生成独立的设计规范。

1. **执行 ui-ux-pro-max `--design-system`**：根据新游戏的类型、题材、美术风格生成专属设计系统：
   ```bash
   python3 skills/ui-ux-pro-max/scripts/search.py "<游戏类型> <题材> <风格关键词>" --design-system --persist -p "<游戏名>" --page "game-board"
   ```
2. **产出保存到 `design-system/games/<gameId>.md`**：作为该游戏的 UI 权威参考，后续 Board/组件开发以此为准。
3. **与通用规范的关系**：`design-system/game-ui/MASTER.md` 中的交互原则（反馈/状态清晰/动画时长等）仍然适用，但配色/字体/视觉风格以游戏专属规范为准。

### 5.1 Board.tsx 主组件

**三个游戏的 Board 共同模式**：

```tsx
const Board: React.FC<Props> = ({ G, moves, playerID, ctx }) => {
    const core = G.core;
    const phase = G.sys.phase;
    const gameMode = useGameMode();
    const { t } = useTranslation('game-<gameId>');

    // 1. 基础状态
    const isGameOver = ctx.gameover;
    const isMyTurn = playerID === core.currentPlayer;

    // 2. 教学系统集成
    useTutorialBridge(G.sys.tutorial, moves as Record<string, unknown>);
    const { isActive: isTutorialActive, currentStep: tutorialStep } = useTutorial();

    // 3. 音效系统
    useGameAudio({ config: AUDIO_CONFIG, gameId: MANIFEST.id, G: core, ctx: { ... } });

    // 4. 事件消费 → 动画驱动
    const gameEvents = useGameEvents({ G, myPlayerId: playerID || '0' });

    // 5. 阵营/角色选择阶段
    if (isInSelectionPhase) {
        return <FactionSelection ... />;
    }

    // 6. 游戏主 UI
    return (
        <div className="...">
            {/* 棋盘/基地/卡牌区域 */}
            {/* 手牌区 */}
            {/* 阶段指示/操作按钮 */}
            {/* 结算覆盖层 */}
            {isGameOver && <EndgameOverlay ... />}
        </div>
    );
};
```

### 5.2 UI 子模块拆分

当 Board.tsx 超过 300 行时，按职责拆分到 `ui/` 目录：

**参考 summonerwars/ui/**：
- `BoardGrid.tsx` — 棋盘网格渲染
- `HandArea.tsx` — 手牌区
- `PhaseTracker.tsx` — 阶段指示器
- `PlayerInfo.tsx` — 玩家信息面板
- `GameButton.tsx` — 游戏操作按钮
- `useGameEvents.ts` — 事件消费 hook
- `useCellInteraction.ts` — 格子交互 hook
- `BoardEffects.tsx` — 特效层
- `FactionSelection.tsx` — 阵营选择 UI

**参考 smashup/ui/**：
- `HandArea.tsx` — 手牌区
- `FactionSelection.tsx` — 派系选择
- `PromptOverlay.tsx` — 提示覆盖层
- `useGameEvents.ts` — 事件消费
- `BoardEffects.tsx` — 特效层

### 5.3 交互映射

所有用户操作通过 `moves[COMMAND_TYPE](payload)` 触发：
- 点击/拖拽 → Command
- Board 不直接改 core

### 5.4 阵营/角色选择

**三个游戏共同模式**：初始阶段是 `factionSelect`/`setup`，通过 FlowHooks 的 `onAutoContinueCheck` 在所有玩家准备后自动推进到游戏阶段。

UI 侧使用 `TutorialSelectionGate`（框架组件）或自定义选择组件。

### 验收

- 核心操作可在 UI 中完成
- 阶段推进正常
- 结束界面正常显示

---

## 阶段 6：收尾与启用

**目标**：补齐 i18n、测试、教学、音效。

### 6.1 i18n 文案

补齐 `public/locales/{zh-CN,en}/game-<gameId>.json` 中的所有文案：
- 阶段名称
- 命令/事件描述
- UI 文本
- 教学步骤文案

### 6.2 教学配置

参考 smashup/tutorial.ts 的模式：
1. setup 步骤：AI 自动完成选角 + 作弊设置手牌
2. UI 介绍步骤：逐个高亮 UI 元素（`highlightTarget` + `blockedCommands`）
3. 操作教学步骤：`requireAction: true` + `allowedCommands` + `advanceOnEvents`

### 6.3 音频配置

参考 smashup/audio.config.ts：
- 定义 `GameAudioConfig` 包含 BGM 列表和事件音效解析
- 音效 key 来自 `public/assets/common/audio/registry.json`
- `criticalSounds` 列表：列出进入游戏后立即需要的高频音效（5-15 个），消除首次播放延迟

### 6.4 关键图片预加载（若游戏有精灵图/图集）

当游戏使用精灵图集（如卡牌图集、角色图集）时，需要实现关键图片解析器，防止首屏渲染闪烁。

**创建 `criticalImageResolver.ts`**：

```ts
import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import type { <GameId>Core } from './domain/types';
import type { MatchState } from '../../engine/types';

export const <gameId>CriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    const state = gameState as MatchState<<GameId>Core>;
    const core = state?.core;

    // 无状态时（刚进入对局）
    if (!core) {
        return {
            critical: ['<gameId>/images/base-atlas'],  // 必须立即加载的图集
            warm: [],  // 后台预取的图集
        };
    }

    // 根据游戏阶段/玩家选择动态决定关键资源
    // 例如：阵营选择阶段 → 预加载所有阵营头像
    //       游戏进行中 → 预加载已选阵营的卡牌图集
    
    return {
        critical: [...selectedAtlasPaths],
        warm: [...unselectedAtlasPaths],
    };
};
```

**在 `game.ts` 末尾注册**：

```ts
import { registerCriticalImageResolver } from '../../core';
import { <gameId>CriticalImageResolver } from './criticalImageResolver';

registerCriticalImageResolver('<gameId>', <gameId>CriticalImageResolver);
```

**两阶段预加载策略**：
- **关键图片（critical）**：阻塞渲染，10 秒超时后放行
- **暖图片（warm）**：后台异步加载，不阻塞

**参考实现**：
- `src/games/smashup/criticalImageResolver.ts` — 按派系图集分组
- `src/games/summonerwars/criticalImageResolver.ts` — 按阵营 + 游戏阶段动态解析
- `src/games/dicethrone/criticalImageResolver.ts` — 按角色动态解析

### 6.5 debug-config（可选）

若需要调试面板，创建 `debug-config.tsx` 提供游戏专属调试选项。

**调试面板规范**：
- 调试入口统一使用 `GameDebugPanel` 组件挂载在 Board 内，不得创建新的全局入口。
- 调试操作必须通过 `SYS_CHEAT_*` 指令（依赖 CheatSystem），禁止直接修改 core。
- 若包含“发牌/出牌”类调试：
  - **必须以精灵图索引为发牌依据**（或等价的稳定索引），保证可复现。
  - **必须提供索引对照表**（索引 → 名称/类型），支持快速查找与一键发牌。
- 面板内状态复制/赋值需校验 JSON，失败给出明确提示。
- 重要调试动作尽量提供快捷按钮（如“清零/满值/切换阶段”）。

### 6.6 缩略图

1. 用户提供图片后放入 `public/assets/<gameId>/thumbnails/`
2. 运行 `npm run compress:images -- public/assets/<gameId>/thumbnails`
3. `manifest.ts` 中 `thumbnailPath` 已配置

### 6.7 最终验证

```bash
npm run generate:manifests          # 清单生成成功
npx vitest run src/games/<gameId>   # 所有测试通过
npm run dev                         # 大厅可见、可创建对局、可完整游玩
```

### 验收

- 清单生成成功
- 所有测试通过
- 游戏可从大厅进入并完成完整游玩流程
- i18n 双语齐全

---

## 系统选型速查

| 需求 | 系统 | 说明 |
|------|------|------|
| 多阶段回合制 | FlowSystem | 必选。所有游戏都使用 |
| 撤销/重做 | UndoSystem | 默认包含。配置 snapshotCommandAllowlist |
| 玩家选择/输入 | PromptSystem | 需要玩家从选项中选择时使用 |
| 响应窗口 | ResponseWindowSystem | 对手操作后玩家可响应时使用 |
| 日志记录 | LogSystem + ActionLogSystem | 默认包含 |
| 事件流消费 | EventStreamSystem | UI 消费事件驱动动画/音效时必选 |
| 教学 | TutorialSystem | 教学模式必选 |
| 重赛 | RematchSystem | 默认包含 |
| 调试作弊 | CheatSystem | 开发模式必选，需实现 CheatResourceModifier |
| 角色/阵营选择 | CharacterSelectionSystem | 或自行在 domain 中实现（三个游戏都是自行实现） |

### 默认系统组合

```ts
createDefaultSystems()  // = EventStream + Log + ActionLog + Undo + Prompt + Rematch + ResponseWindow + Tutorial
```

**注意**：`createDefaultSystems` 不包含 FlowSystem 和 CheatSystem，需额外添加。

---

## 关键约束（必须遵守）

1. **三层复用模型**：`/core/ui/` 类型契约 → `/components/game/framework/` 骨架组件 → `/games/<id>/` 游戏实现
2. **命令驱动**：UI 不直接改 core，必须通过 Command → Event → Reduce
3. **清单自动生成**：不要手改 `manifest.*.generated`
4. **领域 ID 常量表**：所有稳定 ID 在 `domain/ids.ts` 定义，禁止字符串字面量
5. **系统层禁止游戏特化**：通用系统只做通用骨架，游戏特化下沉到 `/games/<id>/`
6. **单文件不超过 1000 行**：超过时拆分到 `ui/` 或子模块
7. **测试伴随**：新规则必须有测试覆盖
8. **i18n 双语齐全**：新增文案必须同步 `zh-CN` 与 `en`
9. **sys.phase 单一权威**：阶段信息以 `G.sys.phase` 为准，不在 core 中重复维护阶段状态
10. **事件消费用 EventStreamSystem**：UI 动画/音效消费事件用 `getEventStreamEntries(G)`，不用 LogSystem

---

## 参考资料

- 目录骨架与最小模板：references/game-skeleton.md
- 清单生成说明：references/manifest-generation.md
- 项目结构速览：references/project-structure.md

## 架构参考路径（仅用于理解，不照抄）

- **最复杂流程**：`src/games/dicethrone/`（角色系统/骰子/攻防/状态效果/Token响应）
- **中等复杂 + 棋盘战棋**：`src/games/summonerwars/`（网格棋盘/单位管理/阵营牌组/技能系统）
- **中等复杂 + 卡牌区控**：`src/games/smashup/`（多人支持/基地记分/派系混搭/持续效果）
- **框架层组件**：`src/components/game/framework/`
- **引擎系统**：`src/engine/systems/`
- **通用系统**：`src/systems/`

## 缩略图配置模板（thumbnail.tsx）

```tsx
import manifest from './manifest';
import { ManifestGameThumbnail } from '../../components/lobby/thumbnails';

export default function Thumbnail() {
    return <ManifestGameThumbnail manifest={manifest} />;
}
```

- `manifest.ts` 中配置 `thumbnailPath: '<gameId>/thumbnails/cover'`（不含扩展名、不含 `compressed/`）。
- 用户提供图片后，运行 `npm run compress:images -- public/assets/<gameId>/thumbnails` 压缩。
