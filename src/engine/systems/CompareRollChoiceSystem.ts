/**
 * CompareRollChoiceSystem：处理 compare-roll-choice 交互。
 *
 * - 有 options 时：使用 SYS_INTERACTION_RESPOND 选择分支
 * - 无 options 时：使用 SYS_INTERACTION_CONFIRM 确认比较结果
 */

import type { GameEvent, MatchState, PlayerId } from '../types';
import { resolveCommandTimestamp } from '../utils';
import type { EngineSystem, HookResult } from './types';
import {
    INTERACTION_COMMANDS,
    INTERACTION_EVENTS,
    resolveInteraction,
    stripNonSerializableFromData,
    type CompareRollChoiceData,
} from './InteractionSystem';

function isSamePlayerId(a: unknown, b: unknown): boolean {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

export interface CompareRollChoiceSystemConfig {
    _placeholder?: never;
}

export function createCompareRollChoiceSystem<TCore>(
    _config: CompareRollChoiceSystemConfig = {},
): EngineSystem<TCore> {
    return {
        id: 'compare-roll-choice',
        name: 'CompareRollChoice 处理',
        priority: 22,

        beforeCommand: ({ state, command }): HookResult<TCore> | void => {
            const current = state.sys.interaction.current;

            if (command.type === INTERACTION_COMMANDS.RESPOND) {
                if (!current || current.kind !== 'compare-roll-choice') return;

                const timestamp = resolveCommandTimestamp(command);
                return handleCompareRollRespond(
                    state,
                    command.playerId,
                    command.payload as { optionId?: string },
                    timestamp,
                );
            }

            if (command.type === INTERACTION_COMMANDS.CONFIRM) {
                if (!current || current.kind !== 'compare-roll-choice') return;

                const timestamp = resolveCommandTimestamp(command);
                return handleCompareRollConfirm(state, command.playerId, timestamp);
            }

            if (current?.kind === 'compare-roll-choice') {
                const hasActiveResponseWindow = !!state.sys.responseWindow?.current;
                if (
                    isSamePlayerId(current.playerId, command.playerId)
                    && !command.type.startsWith('SYS_')
                    && !hasActiveResponseWindow
                ) {
                    return { halt: true, error: '请先完成当前比较掷骰交互' };
                }
            }
        },
    };
}

function handleCompareRollRespond<TCore>(
    state: MatchState<TCore>,
    playerId: PlayerId,
    payload: { optionId?: string },
    timestamp: number,
): HookResult<TCore> {
    const current = state.sys.interaction.current;

    if (!current) {
        return { halt: true, error: '没有待处理的比较掷骰交互' };
    }
    if (!isSamePlayerId(current.playerId, playerId)) {
        return { halt: true, error: '不是你的交互' };
    }
    if (current.kind !== 'compare-roll-choice') {
        return { halt: true, error: '当前交互不是 compare-roll-choice' };
    }

    const data = current.data as CompareRollChoiceData;
    const options = data.options ?? [];
    if (options.length === 0) {
        return { halt: true, error: '当前比较掷骰交互没有可选分支' };
    }
    if (typeof payload.optionId !== 'string') {
        return { halt: true, error: '无效的选择' };
    }

    const selectedOption = options.find((option) => option.id === payload.optionId);
    if (!selectedOption) {
        return { halt: true, error: '无效的选择' };
    }
    if (selectedOption.disabled) {
        return { halt: true, error: '该选项不可用' };
    }

    const newState = resolveInteraction(state);
    const event: GameEvent = {
        type: INTERACTION_EVENTS.RESOLVED,
        payload: {
            interactionId: current.id,
            playerId,
            optionId: selectedOption.id,
            value: selectedOption.value,
            sourceId: data.sourceId,
            interactionData: stripNonSerializableFromData(current.data),
        },
        timestamp,
    };

    return { halt: false, state: newState, events: [event] };
}

function handleCompareRollConfirm<TCore>(
    state: MatchState<TCore>,
    playerId: PlayerId,
    timestamp: number,
): HookResult<TCore> {
    const current = state.sys.interaction.current;

    if (!current) {
        return { halt: true, error: '没有待处理的比较掷骰交互' };
    }
    if (!isSamePlayerId(current.playerId, playerId)) {
        return { halt: true, error: '不是你的交互' };
    }
    if (current.kind !== 'compare-roll-choice') {
        return { halt: true, error: '当前交互不是 compare-roll-choice' };
    }

    const data = current.data as CompareRollChoiceData;
    const options = data.options ?? [];
    if (options.length > 0) {
        return { halt: true, error: '当前比较掷骰交互需要先选择分支' };
    }

    const newState = resolveInteraction(state);
    const event = data.confirmValue !== undefined
        ? buildResolvedEvent(current.id, playerId, data, timestamp)
        : buildConfirmedEvent(current.id, playerId, data, timestamp);

    return { halt: false, state: newState, events: [event] };
}

function buildResolvedEvent(
    interactionId: string,
    playerId: PlayerId,
    data: CompareRollChoiceData,
    timestamp: number,
): GameEvent {
    return {
        type: INTERACTION_EVENTS.RESOLVED,
        payload: {
            interactionId,
            playerId,
            optionId: null,
            value: data.confirmValue,
            sourceId: data.sourceId,
            interactionData: stripNonSerializableFromData(data),
        },
        timestamp,
    };
}

function buildConfirmedEvent(
    interactionId: string,
    playerId: PlayerId,
    data: CompareRollChoiceData,
    timestamp: number,
): GameEvent {
    return {
        type: INTERACTION_EVENTS.CONFIRMED,
        payload: {
            interactionId,
            playerId,
            sourceId: data.sourceId,
            interactionData: stripNonSerializableFromData(data),
        },
        timestamp,
    };
}
