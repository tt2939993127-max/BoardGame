/**
 * 召唤师战争游戏定义（新引擎架构）
 * 
 * 使用领域内核 + 引擎适配器 + FlowSystem
 */

import type { ActionLogEntry, ActionLogSegment, Command, GameEvent, MatchState } from '../../engine/types';
import {
    createActionLogSystem,
    createCheatSystem,
    createEventStreamSystem,
    createFlowSystem,
    createGameAdapter,
    createInteractionSystem,
    createLogSystem,
    createRematchSystem,
    createResponseWindowSystem,
    createTutorialSystem,
    createUndoSystem,
    CHEAT_COMMANDS,
    FLOW_COMMANDS,
    UNDO_COMMANDS,
    type CheatResourceModifier,
} from '../../engine';
import { SummonerWarsDomain, SW_COMMANDS, SW_EVENTS } from './domain';
import type { GamePhase, PlayerId, SummonerWarsCore } from './domain/types';
import { abilityRegistry } from './domain/abilities';
import { summonerWarsFlowHooks } from './domain/flowHooks';
import { registerCardPreviewGetter } from '../../components/game/cardPreviewRegistry';
import { getSummonerWarsCardPreviewMeta, getSummonerWarsCardPreviewRef } from './ui/cardPreviewHelper';

// ============================================================================
// ActionLog 共享白名单 + 格式化
// ============================================================================

const ACTION_ALLOWLIST = [
    SW_COMMANDS.SUMMON_UNIT,
    SW_COMMANDS.MOVE_UNIT,
    SW_COMMANDS.BUILD_STRUCTURE,
    SW_COMMANDS.DECLARE_ATTACK,
    SW_COMMANDS.DISCARD_FOR_MAGIC,
    SW_COMMANDS.END_PHASE,
    SW_COMMANDS.PLAY_EVENT,
    SW_COMMANDS.BLOOD_SUMMON_STEP,
    SW_COMMANDS.ACTIVATE_ABILITY,
] as const;

function formatSummonerWarsActionEntry({
    command,
    state: _state,
    events,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | null {
    const timestamp = command.timestamp ?? Date.now();
    const actorId = command.playerId;
    const formatCell = (cell?: { row: number; col: number }) => {
        if (!cell) return '未知';
        return `${cell.row + 1},${cell.col + 1}`;
    };
    const buildCardSegment = (cardId?: string): ActionLogSegment | null => {
        if (!cardId) return null;
        const meta = getSummonerWarsCardPreviewMeta(cardId);
        if (meta?.previewRef) {
            return {
                type: 'card',
                cardId,
                previewText: meta.name,
            };
        }
        if (meta?.name) {
            return { type: 'text', text: meta.name };
        }
        return { type: 'text', text: cardId };
    };
    const withCardSegments = (prefix: string, cardId?: string): ActionLogSegment[] => {
        const segments: ActionLogSegment[] = [];
        segments.push({ type: 'text', text: prefix });
        const cardSegment = buildCardSegment(cardId);
        if (cardSegment) segments.push(cardSegment);
        return segments;
    };

    switch (command.type) {
        case SW_COMMANDS.SUMMON_UNIT: {
            const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
            const positionLabel = formatCell(payload.position);
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('召唤单位：', payload.cardId),
                    { type: 'text', text: ` → ${positionLabel}` },
                ],
            };
        }
        case SW_COMMANDS.MOVE_UNIT: {
            const payload = command.payload as { from?: { row: number; col: number }; to?: { row: number; col: number } };
            const fromLabel = formatCell(payload.from);
            const toLabel = formatCell(payload.to);
            const moveEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.UNIT_MOVED) as
                | { payload?: { unitId?: string } }
                | undefined;
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('移动：', moveEvent?.payload?.unitId),
                    { type: 'text', text: ` ${fromLabel} → ${toLabel}` },
                ],
            };
        }
        case SW_COMMANDS.DECLARE_ATTACK: {
            const attackEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.UNIT_ATTACKED) as
                | { payload?: { hits?: number; target?: { row: number; col: number }; attackerId?: string } }
                | undefined;
            const hits = attackEvent?.payload?.hits;
            const targetLabel = formatCell(attackEvent?.payload?.target);
            const detail = hits === undefined ? '发动攻击' : `命中 ${hits}`;
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('攻击：', attackEvent?.payload?.attackerId),
                    { type: 'text', text: ` → ${targetLabel} ${detail}` },
                ],
            };
        }
        case SW_COMMANDS.BUILD_STRUCTURE: {
            const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
            const positionLabel = formatCell(payload.position);
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('建造建筑：', payload.cardId),
                    { type: 'text', text: ` → ${positionLabel}` },
                ],
            };
        }
        case SW_COMMANDS.END_PHASE: {
            const phaseEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.PHASE_CHANGED) as
                | { payload?: { to?: string } }
                | undefined;
            const phaseLabel = phaseEvent?.payload?.to ? `阶段切换：${phaseEvent.payload.to}` : '结束阶段';
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [{ type: 'text', text: phaseLabel }],
            };
        }
        case SW_COMMANDS.DISCARD_FOR_MAGIC: {
            const payload = command.payload as { cardIds?: string[] };
            const cardIds = payload.cardIds ?? [];
            const segments: ActionLogSegment[] = [];
            segments.push({ type: 'text', text: '弃牌换魔力：' });
            if (cardIds.length === 0) {
                segments.push({ type: 'text', text: '无' });
            } else {
                cardIds.forEach((cardId, index) => {
                    const cardSegment = buildCardSegment(cardId);
                    if (cardSegment) {
                        segments.push(cardSegment);
                    }
                    if (index < cardIds.length - 1) {
                        segments.push({ type: 'text', text: '、' });
                    }
                });
            }
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments,
            };
        }
        case SW_COMMANDS.PLAY_EVENT: {
            const payload = command.payload as { cardId?: string };
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('打出事件：', payload.cardId),
                ],
            };
        }
        case SW_COMMANDS.BLOOD_SUMMON_STEP: {
            const payload = command.payload as { summonCardId?: string; summonPosition?: { row: number; col: number } };
            const positionLabel = formatCell(payload.summonPosition);
            return {
                id: `${command.type}-${command.playerId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [
                    ...withCardSegments('血契召唤：', payload.summonCardId),
                    { type: 'text', text: ` → ${positionLabel}` },
                ],
            };
        }
        default: {
            if (command.type === SW_COMMANDS.ACTIVATE_ABILITY) {
                const payload = command.payload as {
                    abilityId: string;
                    sourceUnitId?: string;
                    targetCardId?: string;
                    targetUnitId?: string;
                    targetPosition?: { row: number; col: number };
                };
                const abilityName = abilityRegistry.get(payload.abilityId)?.name ?? payload.abilityId;
                const segments: ActionLogSegment[] = [{ type: 'text', text: `发动技能：${abilityName}` }];

                if (payload.sourceUnitId) {
                    segments.push({ type: 'text', text: '（来源 ' });
                    const sourceSegment = buildCardSegment(payload.sourceUnitId);
                    if (sourceSegment) segments.push(sourceSegment);
                    segments.push({ type: 'text', text: '）' });
                }

                if (payload.targetCardId || payload.targetUnitId) {
                    segments.push({ type: 'text', text: ' 目标：' });
                    const targetSegment = buildCardSegment(payload.targetCardId ?? payload.targetUnitId);
                    if (targetSegment) segments.push(targetSegment);
                } else if (payload.targetPosition) {
                    segments.push({ type: 'text', text: ` 目标位置：${formatCell(payload.targetPosition)}` });
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments,
                };
            }
            return null;
        }
    }
}

// Summoner Wars 作弊系统配置
const normalizePlayerId = (playerId: string): PlayerId | null => {
    if (playerId === '0' || playerId === '1') return playerId;
    return null;
};

const summonerWarsCheatModifier: CheatResourceModifier<SummonerWarsCore> = {
    getResource: (core, playerId, resourceId) => {
        if (resourceId !== 'magic') return undefined;
        const normalizedId = normalizePlayerId(playerId);
        if (!normalizedId) return undefined;
        return core.players[normalizedId]?.magic;
    },
    setResource: (core, playerId, resourceId, value) => {
        if (resourceId !== 'magic') return core;
        const normalizedId = normalizePlayerId(playerId);
        if (!normalizedId) return core;
        const player = core.players[normalizedId];
        if (!player) return core;
        return {
            ...core,
            players: {
                ...core.players,
                [normalizedId]: {
                    ...player,
                    magic: value,
                },
            },
        };
    },
    setPhase: (core, phase) => ({
        ...core,
        phase: phase as GamePhase,
    }),
    dealCardByIndex: (core, playerId, deckIndex) => {
        const normalizedId = normalizePlayerId(playerId);
        if (!normalizedId) return core;
        const player = core.players[normalizedId];
        if (!player || deckIndex < 0 || deckIndex >= player.deck.length) return core;
        const newDeck = [...player.deck];
        const [card] = newDeck.splice(deckIndex, 1);
        return {
            ...core,
            players: {
                ...core.players,
                [normalizedId]: {
                    ...player,
                    deck: newDeck,
                    hand: [...player.hand, card],
                },
            },
        };
    },
    dealCardByAtlasIndex: (core, playerId, atlasIndex) => {
        const normalizedId = normalizePlayerId(playerId);
        if (!normalizedId) return core;
        const player = core.players[normalizedId];
        if (!player) return core;
        // 在牌库中查找匹配精灵图索引的卡牌
        const cardIndex = player.deck.findIndex(c => c.spriteIndex === atlasIndex);
        if (cardIndex === -1) return core;
        const newDeck = [...player.deck];
        const [card] = newDeck.splice(cardIndex, 1);
        return {
            ...core,
            players: {
                ...core.players,
                [normalizedId]: {
                    ...player,
                    deck: newDeck,
                    hand: [...player.hand, card],
                },
            },
        };
    },
    dealCardToDiscard: (core, playerId, atlasIndex) => {
        const normalizedId = normalizePlayerId(playerId);
        if (!normalizedId) return core;
        const player = core.players[normalizedId];
        if (!player) return core;
        // 在牌库中查找匹配精灵图索引的卡牌，移入弃牌堆
        const cardIndex = player.deck.findIndex(c => c.spriteIndex === atlasIndex);
        if (cardIndex === -1) return core;
        const newDeck = [...player.deck];
        const [card] = newDeck.splice(cardIndex, 1);
        return {
            ...core,
            players: {
                ...core.players,
                [normalizedId]: {
                    ...player,
                    deck: newDeck,
                    discard: [...player.discard, card],
                },
            },
        };
    },
};

// 创建系统集合（包含 FlowSystem）
const systems = [
    createFlowSystem<SummonerWarsCore>({ hooks: summonerWarsFlowHooks }),
    createEventStreamSystem(),
    createLogSystem(),
    createActionLogSystem({
        commandAllowlist: ACTION_ALLOWLIST,
        formatEntry: formatSummonerWarsActionEntry,
    }),
    createUndoSystem({
        snapshotCommandAllowlist: ACTION_ALLOWLIST,
    }),
    createRematchSystem(),
    createResponseWindowSystem(),
    createTutorialSystem(),
    createCheatSystem<SummonerWarsCore>(summonerWarsCheatModifier),
];

// 使用适配器创建 Boardgame.io Game
export const SummonerWars = createGameAdapter({
    domain: SummonerWarsDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 2,
    commandTypes: [
        SW_COMMANDS.SELECT_FACTION,
        SW_COMMANDS.SELECT_CUSTOM_DECK,
        SW_COMMANDS.PLAYER_READY,
        SW_COMMANDS.HOST_START_GAME,
        SW_COMMANDS.SUMMON_UNIT,
        SW_COMMANDS.SELECT_UNIT,
        SW_COMMANDS.MOVE_UNIT,
        SW_COMMANDS.BUILD_STRUCTURE,
        SW_COMMANDS.DECLARE_ATTACK,
        SW_COMMANDS.CONFIRM_ATTACK,
        SW_COMMANDS.DISCARD_FOR_MAGIC,
        SW_COMMANDS.END_PHASE,
        SW_COMMANDS.PLAY_EVENT,
        SW_COMMANDS.BLOOD_SUMMON_STEP,
        SW_COMMANDS.ACTIVATE_ABILITY,
        FLOW_COMMANDS.ADVANCE_PHASE,
        UNDO_COMMANDS.REQUEST_UNDO,
        UNDO_COMMANDS.APPROVE_UNDO,
        UNDO_COMMANDS.REJECT_UNDO,
        UNDO_COMMANDS.CANCEL_UNDO,
        CHEAT_COMMANDS.SET_RESOURCE,
        CHEAT_COMMANDS.ADD_RESOURCE,
        CHEAT_COMMANDS.SET_PHASE,
        CHEAT_COMMANDS.DEAL_CARD_BY_INDEX,
        CHEAT_COMMANDS.DEAL_CARD_BY_ATLAS_INDEX,
        CHEAT_COMMANDS.SET_STATE,
    ],
});

export default SummonerWars;

// 导出 ActionLog 格式化函数供测试
export { formatSummonerWarsActionEntry };

// 注册卡牌预览获取函数
registerCardPreviewGetter('summonerwars', getSummonerWarsCardPreviewRef);

// 导出类型
export type { SummonerWarsCore as SummonerWarsState } from './domain';
