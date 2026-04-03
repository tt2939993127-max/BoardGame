/**
 * SimpleChoiceSystem：处理 simple-choice 交互。
 *
 * InteractionSystem 只负责队列、通用阻塞和 playerView，
 * 这里负责 simple-choice 的具体响应与超时逻辑。
 */

import type { GameEvent, MatchState, PlayerId } from '../types';
import { resolveCommandTimestamp } from '../utils';
import {
    getFreshSimpleChoiceOptions,
    getSimpleChoiceResponseValidationMode,
    INTERACTION_COMMANDS,
    INTERACTION_EVENTS,
    resolveInteraction,
    stripNonSerializableFromData,
    type PromptOption,
    type SimpleChoiceData,
} from './InteractionSystem';
import type { EngineSystem, HookResult } from './types';

function isSamePlayerId(a: unknown, b: unknown): boolean {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export interface SimpleChoiceSystemConfig {
    defaultTimeout?: number;
}

export function createSimpleChoiceSystem<TCore>(
    _config: SimpleChoiceSystemConfig = {},
): EngineSystem<TCore> {
    return {
        id: 'simple-choice',
        name: 'SimpleChoice 响应处理',
        priority: 21,

        beforeCommand: ({ state, command }): HookResult<TCore> | void => {
            const current = state.sys.interaction.current;

            if (command.type === INTERACTION_COMMANDS.RESPOND) {
                if (!current) {
                    return { halt: true, error: '没有待处理的选择' };
                }
                if (current.kind !== 'simple-choice') return;

                const timestamp = resolveCommandTimestamp(command);
                return handleSimpleChoiceRespond(
                    state,
                    command.playerId,
                    command.payload as { optionId?: string; optionIds?: string[]; mergedValue?: unknown },
                    timestamp,
                );
            }

            if (command.type === INTERACTION_COMMANDS.TIMEOUT) {
                if (!current || current.kind !== 'simple-choice') return;
                const timestamp = resolveCommandTimestamp(command);
                return handleSimpleChoiceTimeout(state, timestamp);
            }

            if (current?.kind === 'simple-choice') {
                const hasActiveResponseWindow = !!state.sys.responseWindow?.current;
                if (
                    isSamePlayerId(current.playerId, command.playerId)
                    && !command.type.startsWith('SYS_')
                    && !hasActiveResponseWindow
                ) {
                    return { halt: true, error: '请先完成当前选择' };
                }
            }
        },

        afterEvents: ({ state, events }): HookResult<TCore> | void => {
            const current = state.sys.interaction.current;
            if (!current || current.kind !== 'simple-choice') return;

            const data = current.data as SimpleChoiceData;
            if (data.autoResolveIfSingle !== true || data.multi) return;

            const availableOptions = getFreshSimpleChoiceOptions(state, current as any);
            if (availableOptions.length !== 1) return;

            const onlyOption = availableOptions[0];
            if (!onlyOption || onlyOption.disabled) return;

            const newState = resolveInteraction(state);
            const timestamp = events[events.length - 1]?.timestamp ?? 0;

            const event: GameEvent = {
                type: INTERACTION_EVENTS.RESOLVED,
                payload: {
                    interactionId: current.id,
                    playerId: current.playerId,
                    optionId: onlyOption.id,
                    optionIds: undefined,
                    value: onlyOption.value,
                    sourceId: data.sourceId,
                    interactionData: stripNonSerializableFromData({
                        ...current.data,
                        options: availableOptions,
                    }),
                },
                timestamp,
            };

            return { halt: false, state: newState, events: [event] };
        },
    };
}

function handleSimpleChoiceRespond<TCore>(
    state: MatchState<TCore>,
    playerId: PlayerId,
    payload: { optionId?: string; optionIds?: string[]; mergedValue?: unknown },
    timestamp: number,
): HookResult<TCore> {
    const current = state.sys.interaction.current;

    if (!current) {
        return { halt: true, error: '没有待处理的选择' };
    }
    if (!isSamePlayerId(current.playerId, playerId)) {
        return { halt: true, error: '不是你的选择回合' };
    }
    if (current.kind !== 'simple-choice') {
        return { halt: true, error: '当前交互不是 simple-choice' };
    }

    const data = current.data as SimpleChoiceData;
    const isMulti = !!data.multi;
    const responseValidationMode = getSimpleChoiceResponseValidationMode(data);
    const availableOptions = responseValidationMode === 'live'
        ? getFreshSimpleChoiceOptions(state, current as any)
        : data.options;

    let selectedOptions: PromptOption[] = [];
    let selectedOptionIds: string[] = [];

    if (isMulti) {
        const optionIds = Array.isArray(payload.optionIds)
            ? payload.optionIds
            : typeof payload.optionId === 'string'
                ? [payload.optionId]
                : [];
        const uniqueIds = Array.from(new Set(optionIds)).filter(
            (id): id is string => typeof id === 'string',
        );
        const optionsById = new Map(availableOptions.map((option) => [option.id, option]));

        if (uniqueIds.some((id) => !optionsById.has(id))) {
            return { halt: true, error: '无效的选择' };
        }
        if (uniqueIds.some((id) => optionsById.get(id)?.disabled)) {
            return { halt: true, error: '该选项不可用' };
        }

        const minSelections = data.multi?.min ?? 1;
        const maxSelections = data.multi?.max;
        if (uniqueIds.length < minSelections) {
            return { halt: true, error: `至少选择 ${minSelections} 项` };
        }
        if (maxSelections !== undefined && uniqueIds.length > maxSelections) {
            return { halt: true, error: `最多选择 ${maxSelections} 项` };
        }

        selectedOptionIds = uniqueIds;
        selectedOptions = uniqueIds.map((id) => optionsById.get(id)!);
    } else {
        if (typeof payload.optionId !== 'string') {
            return { halt: true, error: '无效的选择' };
        }

        const selectedOption = availableOptions.find((option) => option.id === payload.optionId);
        if (!selectedOption) {
            return { halt: true, error: '无效的选择' };
        }
        if (selectedOption.disabled) {
            return { halt: true, error: '该选项不可用' };
        }

        selectedOptionIds = [selectedOption.id];
        selectedOptions = [selectedOption];
    }

    let resolvedValue: unknown;
    if (payload.mergedValue !== undefined) {
        const mergedValue = payload.mergedValue;

        if (data.slider) {
            if (isMulti) {
                return { halt: true, error: '非法的选择值' };
            }

            const selectedOptionValue = selectedOptions[0]?.value;
            if (!isObjectLike(selectedOptionValue) || !isObjectLike(mergedValue)) {
                return { halt: true, error: '非法的选择值' };
            }

            const selectedNumericValue = selectedOptionValue.value;
            const mergedNumericValue = mergedValue.value;
            if (
                typeof selectedNumericValue !== 'number'
                || !Number.isFinite(selectedNumericValue)
                || typeof mergedNumericValue !== 'number'
                || !Number.isFinite(mergedNumericValue)
                || !Number.isInteger(mergedNumericValue)
                || mergedNumericValue < 1
                || mergedNumericValue > selectedNumericValue
            ) {
                return { halt: true, error: '非法的选择值' };
            }

            const resolvedSliderValue: Record<string, unknown> = {
                ...selectedOptionValue,
                value: mergedNumericValue,
            };
            if (typeof selectedOptionValue.amount === 'number' && Number.isFinite(selectedOptionValue.amount)) {
                resolvedSliderValue.amount = mergedNumericValue;
            }
            resolvedValue = resolvedSliderValue;
        } else if (isMulti) {
            resolvedValue = mergedValue;
        } else {
            const selectedOptionValue = selectedOptions[0]?.value;
            if (!isObjectLike(selectedOptionValue) || !isObjectLike(mergedValue)) {
                return { halt: true, error: '非法的选择值' };
            }

            for (const [key, nextValue] of Object.entries(mergedValue)) {
                if (key in selectedOptionValue && !Object.is(selectedOptionValue[key], nextValue)) {
                    return { halt: true, error: '非法的选择值' };
                }
            }

            resolvedValue = {
                ...selectedOptionValue,
                ...mergedValue,
            };
        }
    } else {
        resolvedValue = isMulti
            ? selectedOptions.map((option) => option.value)
            : selectedOptions[0]?.value;
    }

    const newState = resolveInteraction(state);
    const interactionDataForEvent = responseValidationMode === 'live'
        ? { ...current.data, options: availableOptions }
        : current.data;

    const event: GameEvent = {
        type: INTERACTION_EVENTS.RESOLVED,
        payload: {
            interactionId: current.id,
            playerId,
            optionId: selectedOptionIds.length > 0 ? selectedOptionIds[0] : null,
            optionIds: isMulti ? selectedOptionIds : undefined,
            value: resolvedValue,
            sourceId: data.sourceId,
            interactionData: stripNonSerializableFromData(interactionDataForEvent),
        },
        timestamp,
    };

    return { halt: false, state: newState, events: [event] };
}

function handleSimpleChoiceTimeout<TCore>(
    state: MatchState<TCore>,
    timestamp: number,
): HookResult<TCore> {
    const current = state.sys.interaction.current;

    if (!current) {
        return { halt: true, error: '没有待处理的选择' };
    }
    if (current.kind !== 'simple-choice') {
        return { halt: true, error: '当前交互不是 simple-choice' };
    }

    const data = current.data as SimpleChoiceData;
    const newState = resolveInteraction(state);

    const event: GameEvent = {
        type: INTERACTION_EVENTS.EXPIRED,
        payload: {
            interactionId: current.id,
            playerId: current.playerId,
            sourceId: data.sourceId,
        },
        timestamp,
    };

    return { state: newState, events: [event] };
}
