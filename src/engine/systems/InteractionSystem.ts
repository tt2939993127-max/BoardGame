/**
 * 统一交互系统（InteractionSystem）
 *
 * 替代 PromptSystem，提供统一的「阻塞式玩家交互」引擎原语。
 * 内置 kind='simple-choice' 覆盖旧 PromptSystem 全部能力；
 * 未来 kind='dt:card-interaction' / 'sw:soul-transfer' 等由各游戏扩展。
 *
 * 状态：sys.interaction.current / sys.interaction.queue
 * 命令：SYS_INTERACTION_RESPOND / TIMEOUT / STEP / CONFIRM / CANCEL
 * 事件：SYS_INTERACTION_RESOLVED / EXPIRED / STEPPED / CONFIRMED / CANCELLED
 */

import type {
    MatchState,
    PlayerId,
    PromptOption,
    PromptMultiConfig,
    GameEvent,
} from '../types';
import type { EngineSystem, HookResult } from './types';
import { SYSTEM_IDS } from './types';

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 交互描述符 — 任何需要玩家输入的交互
 * kind 字段区分交互类型，data 包含 kind 特定数据
 */
export interface InteractionDescriptor<TData = unknown> {
    id: string;
    kind: string;
    playerId: PlayerId;
    data: TData;
}

/**
 * simple-choice 专用数据（等价于旧 PromptState['current'] 的业务字段）
 */
export interface SimpleChoiceData<T = unknown> {
    title: string;
    options: PromptOption<T>[];
    sourceId?: string;
    timeout?: number;
    multi?: PromptMultiConfig;
}

/**
 * 交互系统状态
 */
export interface InteractionState {
    current?: InteractionDescriptor;
    queue: InteractionDescriptor[];
}

// ============================================================================
// 命令 & 事件常量
// ============================================================================

export const INTERACTION_COMMANDS = {
    /** simple-choice 响应（payload: { optionId?, optionIds? }） */
    RESPOND: 'SYS_INTERACTION_RESPOND',
    /** simple-choice 超时 */
    TIMEOUT: 'SYS_INTERACTION_TIMEOUT',
    /** 多步交互推进（P2+） */
    STEP: 'SYS_INTERACTION_STEP',
    /** 多步交互确认（P2+） */
    CONFIRM: 'SYS_INTERACTION_CONFIRM',
    /** 多步交互取消（P2+） */
    CANCEL: 'SYS_INTERACTION_CANCEL',
} as const;

export const INTERACTION_EVENTS = {
    /** 交互已解决（simple-choice 选择完成） */
    RESOLVED: 'SYS_INTERACTION_RESOLVED',
    /** 交互超时 */
    EXPIRED: 'SYS_INTERACTION_EXPIRED',
    /** 多步交互步骤完成（P2+） */
    STEPPED: 'SYS_INTERACTION_STEPPED',
    /** 多步交互确认完成（P2+） */
    CONFIRMED: 'SYS_INTERACTION_CONFIRMED',
    /** 多步交互已取消（P2+） */
    CANCELLED: 'SYS_INTERACTION_CANCELLED',
} as const;

// ============================================================================
// 工厂 & 辅助函数
// ============================================================================

/**
 * 创建 simple-choice 交互（替代旧 createPrompt）
 */
export function createSimpleChoice<T>(
    id: string,
    playerId: PlayerId,
    title: string,
    options: PromptOption<T>[],
    sourceId?: string,
    timeout?: number,
    multi?: PromptMultiConfig,
): InteractionDescriptor<SimpleChoiceData<T>> {
    return {
        id,
        kind: 'simple-choice',
        playerId,
        data: { title, options, sourceId, timeout, multi },
    };
}

/**
 * 将交互加入队列（替代旧 queuePrompt）
 */
export function queueInteraction<TCore>(
    state: MatchState<TCore>,
    interaction: InteractionDescriptor,
): MatchState<TCore> {
    if (!interaction) return state;

    const { current, queue } = state.sys.interaction;

    if (!current) {
        return {
            ...state,
            sys: {
                ...state.sys,
                interaction: { ...state.sys.interaction, current: interaction },
            },
        };
    }

    return {
        ...state,
        sys: {
            ...state.sys,
            interaction: {
                ...state.sys.interaction,
                queue: [...queue, interaction],
            },
        },
    };
}

/**
 * 解决当前交互并弹出下一个
 */
export function resolveInteraction<TCore>(
    state: MatchState<TCore>,
): MatchState<TCore> {
    const { queue } = state.sys.interaction;
    const next = queue[0];
    const newQueue = queue.slice(1);

    return {
        ...state,
        sys: {
            ...state.sys,
            interaction: { current: next, queue: newQueue },
        },
    };
}

/**
 * UI 辅助：从 InteractionDescriptor 提取 simple-choice 扁平数据
 * 返回与旧 PromptState['current'] 兼容的形状，方便 UI 层迁移
 */
export function asSimpleChoice(
    interaction?: InteractionDescriptor,
): (SimpleChoiceData & { id: string; playerId: PlayerId }) | undefined {
    if (!interaction || interaction.kind !== 'simple-choice') return undefined;
    const data = interaction.data as SimpleChoiceData;
    return { ...data, id: interaction.id, playerId: interaction.playerId };
}

// ============================================================================
// 系统配置
// ============================================================================

export interface InteractionSystemConfig {
    /** 默认超时时间（毫秒） */
    defaultTimeout?: number;
}

// ============================================================================
// 内部工具
// ============================================================================

const resolveCommandTimestamp = (command: { timestamp?: number }): number =>
    typeof command.timestamp === 'number' ? command.timestamp : 0;

// ============================================================================
// 创建交互系统
// ============================================================================

export function createInteractionSystem<TCore>(
    config: InteractionSystemConfig = {},
): EngineSystem<TCore> {
    void config;
    return {
        id: SYSTEM_IDS.PROMPT, // 复用 PROMPT 的 system ID 以保持 priority 兼容
        name: '交互系统',
        priority: 20,

        setup: (): Partial<{ interaction: InteractionState }> => ({
            interaction: { queue: [] },
        }),

        beforeCommand: ({ state, command }): HookResult<TCore> | void => {
            // ---- simple-choice 响应 ----
            if (command.type === INTERACTION_COMMANDS.RESPOND) {
                const ts = resolveCommandTimestamp(command);
                return handleSimpleChoiceRespond(
                    state,
                    command.playerId,
                    command.payload as { optionId?: string; optionIds?: string[] },
                    ts,
                );
            }

            // ---- simple-choice 超时 ----
            if (command.type === INTERACTION_COMMANDS.TIMEOUT) {
                const ts = resolveCommandTimestamp(command);
                return handleSimpleChoiceTimeout(state, ts);
            }

            // ---- 阻塞逻辑 ----
            const current = state.sys.interaction.current;
            if (current) {
                if (current.kind === 'simple-choice') {
                    // simple-choice: 阻塞该玩家的所有非系统命令
                    if (current.playerId === command.playerId && !command.type.startsWith('SYS_')) {
                        return { halt: true, error: '请先完成当前选择' };
                    }
                } else {
                    // 其他 kind（dt:card-interaction 等）: 只阻塞 ADVANCE_PHASE（任何玩家）
                    if (command.type === 'ADVANCE_PHASE') {
                        return { halt: true, error: '请先完成当前交互' };
                    }
                }
            }
        },

        playerView: (state, playerId): Partial<{ interaction: InteractionState }> => {
            const { current, queue } = state.sys.interaction;

            const filteredCurrent =
                current?.playerId === playerId ? current : undefined;
            const filteredQueue = queue.filter((i) => i?.playerId === playerId);

            return {
                interaction: { current: filteredCurrent, queue: filteredQueue },
            };
        },
    };
}

// ============================================================================
// simple-choice 处理函数（移植自 PromptSystem）
// ============================================================================

function handleSimpleChoiceRespond<TCore>(
    state: MatchState<TCore>,
    playerId: PlayerId,
    payload: { optionId?: string; optionIds?: string[] },
    timestamp: number,
): HookResult<TCore> {
    const current = state.sys.interaction.current;

    if (!current) {
        return { halt: true, error: '没有待处理的选择' };
    }
    if (current.playerId !== playerId) {
        return { halt: true, error: '不是你的选择回合' };
    }
    if (current.kind !== 'simple-choice') {
        return { halt: true, error: '当前交互不是 simple-choice' };
    }

    const data = current.data as SimpleChoiceData;
    const isMulti = !!data.multi;
    let selectedOptions: PromptOption[] = [];
    let selectedOptionIds: string[] = [];

    if (isMulti) {
        const optionIds = Array.isArray(payload.optionIds)
            ? payload.optionIds
            : typeof payload.optionId === 'string'
              ? [payload.optionId]
              : [];
        const uniqueIds = Array.from(new Set(optionIds)).filter(
            (id) => typeof id === 'string',
        );
        const optionsById = new Map(data.options.map((o) => [o.id, o]));
        if (uniqueIds.find((id) => !optionsById.has(id))) {
            return { halt: true, error: '无效的选择' };
        }
        if (uniqueIds.find((id) => optionsById.get(id)?.disabled)) {
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
        const selectedOption = data.options.find(
            (o) => o.id === payload.optionId,
        );
        if (!selectedOption) {
            return { halt: true, error: '无效的选择' };
        }
        if (selectedOption.disabled) {
            return { halt: true, error: '该选项不可用' };
        }
        selectedOptionIds = [selectedOption.id];
        selectedOptions = [selectedOption];
    }

    const newState = resolveInteraction(state);

    const event: GameEvent = {
        type: INTERACTION_EVENTS.RESOLVED,
        payload: {
            interactionId: current.id,
            playerId,
            optionId:
                selectedOptionIds.length > 0 ? selectedOptionIds[0] : null,
            optionIds: isMulti ? selectedOptionIds : undefined,
            value: isMulti
                ? selectedOptions.map((o) => o.value)
                : selectedOptions[0]?.value,
            sourceId: data.sourceId,
            interactionData: current.data,
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
