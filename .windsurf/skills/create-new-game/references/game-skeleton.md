# 新游戏目录骨架（基于真实游戏模式）

## 完整目录结构

```
src/games/<gameId>/
  manifest.ts          # 清单元数据（必须）
  game.ts              # 引擎适配器组装（必须）
  Board.tsx            # UI 主板（必须）
  thumbnail.tsx        # 缩略图组件（必须）
  tutorial.ts          # 教学配置（必须，可占位）
  audio.config.ts      # 音频配置（必须，可占位）
  domain/
    index.ts           # 领域内核入口
    types.ts           # 核心状态/命令/事件类型
    ids.ts             # 领域 ID 常量表
    commands.ts        # 命令校验（或 validate.ts）
    execute.ts         # 命令执行 → 生成事件
    reducer.ts         # 事件 → 状态更新
    flowHooks.ts       # FlowSystem 钩子（中大型游戏独立文件）
  rule/
    <游戏名>规则.md     # 规则文档
  ui/                  # 游戏 UI 子模块（Board.tsx 超过 300 行时拆分）
  config/ 或 data/     # 静态数据配置（按游戏复杂度选择）
  __tests__/
    helpers.ts         # 测试辅助函数（工厂方法）
    smoke.test.ts      # 冒烟测试
    flow.test.ts       # FlowHooks 测试
    validate.test.ts   # 命令校验测试
```

## manifest.ts（参考真实游戏）
```ts
import type { GameManifestEntry } from '../manifest.types';

const entry: GameManifestEntry = {
    id: '<gameId>',
    type: 'game',
    enabled: true,
    titleKey: 'games.<gameId>.title',
    descriptionKey: 'games.<gameId>.description',
    category: 'strategy',
    playersKey: 'games.<gameId>.players',
    icon: '🎮',
    thumbnailPath: '<gameId>/thumbnails/cover',
    allowLocalMode: false,
    playerOptions: [2],
    tags: [],
    bestPlayers: [2],
};

export const <GAME_ID>_MANIFEST: GameManifestEntry = entry;
export default entry;
```

## game.ts（参考 smashup 简洁风格）
```ts
import { createDefaultSystems, createGameAdapter, createFlowSystem, createCheatSystem, CHEAT_COMMANDS } from '../../engine';
import { FLOW_COMMANDS } from '../../engine/systems/FlowSystem';
import { UNDO_COMMANDS } from '../../engine';
import { <GameId>Domain, XX_COMMANDS } from './domain';
import type { <GameId>Core } from './domain/types';
import { flowHooks } from './domain/flowHooks';

const systems = [
    createFlowSystem<<GameId>Core>({ hooks: flowHooks }),
    ...createDefaultSystems<<GameId>Core>(),
    createCheatSystem<<GameId>Core>(cheatModifier),
];

export const <GameId> = createGameAdapter<<GameId>Core>({
    domain: <GameId>Domain,
    systems,
    minPlayers: 2,
    maxPlayers: 2,
    commandTypes: [
        ...Object.values(XX_COMMANDS),
        FLOW_COMMANDS.ADVANCE_PHASE,
        UNDO_COMMANDS.REQUEST_UNDO,
        UNDO_COMMANDS.APPROVE_UNDO,
        UNDO_COMMANDS.REJECT_UNDO,
        UNDO_COMMANDS.CANCEL_UNDO,
        CHEAT_COMMANDS.SET_RESOURCE,
        CHEAT_COMMANDS.SET_STATE,
    ],
});

export default <GameId>;
```

## domain/index.ts（参考 summonerwars 模式）
```ts
import type { DomainCore } from '../../../engine/types';
import type { <GameId>Core, PlayerId, PlayerState } from './types';
import { executeCommand } from './execute';
import { reduceEvent } from './reducer';
import { validateCommand } from './validate';

export type { <GameId>Core } from './types';
export { XX_COMMANDS, XX_EVENTS } from './types';

function createPlayerState(pid: PlayerId): PlayerState {
    return { id: pid, /* ...初始字段 */ };
}

export const <GameId>Domain: DomainCore<<GameId>Core> = {
    gameId: '<gameId>',
    setup: (playerIds, random) => {
        const players = Object.fromEntries(
            playerIds.map(pid => [pid, createPlayerState(pid)])
        );
        return { players, turnNumber: 1, /* ...其他初始状态 */ };
    },
    execute: (state, command, random) => executeCommand(state, command, random),
    reduce: (core, event) => reduceEvent(core, event),
    validate: (state, command) => validateCommand(state, command),
    isGameOver: (core) => {
        // 检查胜利条件
        return core.gameResult;
    },
};
```

## domain/types.ts（核心类型骨架）
```ts
import type { Command, GameEvent, PlayerId } from '../../../engine/types';

// 阶段定义
export type GamePhase = 'factionSelect' | 'phase1' | 'phase2' | ...;
export const PHASE_ORDER: GamePhase[] = ['phase1', 'phase2', ...];

// 命令/事件常量（禁止字符串字面量）
export const XX_COMMANDS = { DO_SOMETHING: 'DO_SOMETHING' } as const;
export const XX_EVENTS = { SOMETHING_DONE: 'SOMETHING_DONE' } as const;

// 核心状态
export interface PlayerState { id: PlayerId; /* ... */ }
export interface <GameId>Core {
    players: Record<PlayerId, PlayerState>;
    turnNumber: number;
    gameResult?: { winner?: string; draw?: boolean };
    /* ... */
}
```

> 说明：以上模式基于 dicethrone/summonerwars/smashup 三个真实游戏提炼。所有游戏都使用 FlowSystem 管理阶段。阶段以 `G.sys.phase` 为单一权威来源。
