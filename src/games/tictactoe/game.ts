/**
 * 井字棋游戏定义（新引擎架构）
 * 
 * 使用领域内核 + 引擎适配器
 */

import type { ActionLogEntry, Command, GameEvent, MatchState } from '../../engine/types';
import {
    createActionLogSystem,
    createLogSystem,
    createInteractionSystem,
    createRematchSystem,
    createResponseWindowSystem,
    createTutorialSystem,
    createUndoSystem,
} from '../../engine';
import { createGameEngine } from '../../engine/adapter';
import { TicTacToeDomain } from './domain';

// ============================================================================
// ActionLog 共享白名单 + 格式化
// ============================================================================

const ACTION_ALLOWLIST = ['CLICK_CELL'] as const;

function formatTicTacToeActionEntry({
    command,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | null {
    if (command.type !== 'CLICK_CELL') return null;

    const { cellId } = command.payload as { cellId: number };
    const row = Math.floor(cellId / 3) + 1;
    const col = (cellId % 3) + 1;
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;

    return {
        id: `${command.type}-${command.playerId}-${timestamp}`,
        timestamp,
        actorId: command.playerId,
        kind: command.type,
        segments: [{ type: 'text', text: `落子：${row},${col}` }],
    };
}

// 创建系统集合
const systems = [
    createLogSystem(),
    createActionLogSystem({
        commandAllowlist: ACTION_ALLOWLIST,
        formatEntry: formatTicTacToeActionEntry,
    }),
    createUndoSystem({
        snapshotCommandAllowlist: ACTION_ALLOWLIST,
    }),
    createInteractionSystem(),
    createRematchSystem(),
    createResponseWindowSystem(),
    createTutorialSystem(),
];

// 适配器配置
const adapterConfig = {
    domain: TicTacToeDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 2,
    commandTypes: [
        'CLICK_CELL',
    ],
};

// 引擎配置
export const engineConfig = createGameEngine(adapterConfig);

export default engineConfig;
export type { TicTacToeCore as TicTacToeState } from './domain';
