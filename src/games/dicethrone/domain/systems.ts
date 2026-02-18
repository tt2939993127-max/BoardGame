/**
 * DiceThrone 专用系统扩展
 * 处理领域事件到系统状态的映射
 */

import type { GameEvent } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import { INTERACTION_EVENTS, queueInteraction, resolveInteraction, createSimpleChoice } from '../../../engine/systems/InteractionSystem';
import type { PromptOption } from '../../../engine/systems/InteractionSystem';
import type { InteractionDescriptor } from '../../../engine/systems/InteractionSystem';
import type {
    DiceThroneCore,
    DiceThroneEvent,
    ChoiceRequestedEvent,
    ChoiceResolvedEvent,
    InteractionRequestedEvent,
    TokenResponseRequestedEvent,
    BonusDiceRerollRequestedEvent,
    CpChangedEvent,
} from './types';
import { getPlayerPassiveAbilities } from './passiveAbility';
import { findPlayerAbility } from './abilityLookup';
import { RESOURCE_IDS } from './resources';
import { CP_MAX } from './core-types';

// ============================================================================
// DiceThrone 事件处理系统
// ============================================================================

/**
 * 创建 DiceThrone 事件处理系统
 * 负责将领域事件转换为系统状态更新（如 Prompt）
 */
export function createDiceThroneEventSystem(): EngineSystem<DiceThroneCore> {
    return {
        id: 'dicethrone-events',
        name: 'DiceThrone 事件处理',
        priority: 22, // 在 InteractionSystem(20) 之后、FlowSystem(25) 之前，确保 interaction 状态对 autoContinue 可见

        afterEvents: ({ state, events }): HookResult<DiceThroneCore> | void => {
            let newState = state;
            const nextEvents: GameEvent[] = [];

            console.log('[systems.ts] Processing events:', events.map(e => e.type));

            for (const event of events) {
                const dtEvent = event as DiceThroneEvent;
                
                // 处理 CHOICE_REQUESTED 事件 -> 创建 Prompt
                if (dtEvent.type === 'CHOICE_REQUESTED') {
                    const payload = (dtEvent as ChoiceRequestedEvent).payload;
                    const eventTimestamp = typeof dtEvent.timestamp === 'number' ? dtEvent.timestamp : 0;
                    
                    // 将 DiceThrone 的选择选项转换为 PromptOption
                    const promptOptions: PromptOption<{
                        statusId?: string;
                        tokenId?: string;
                        value: number;
                        customId?: string;
                        labelKey?: string;
                    }>[] = payload.options.map((opt, index) => {
                        const label = opt.labelKey
                            ?? (opt.tokenId ? `tokens.${opt.tokenId}.name`
                                : opt.statusId ? `statusEffects.${opt.statusId}.name`
                                    : `choices.option-${index}`);
                        return {
                            id: `option-${index}`,
                            label,
                            value: opt,
                        };
                    });
                    
                    const interaction = createSimpleChoice(
                        `choice-${payload.sourceAbilityId}-${eventTimestamp}`,
                        payload.playerId,
                        payload.titleKey,
                        promptOptions,
                        payload.sourceAbilityId
                    );
                    // 透传 slider 配置到 interaction data
                    if (payload.slider) {
                        (interaction.data as SimpleChoiceData & { slider?: unknown }).slider = payload.slider;
                    }
                    
                    newState = queueInteraction(newState, interaction);
                }

                // ---- INTERACTION_REQUESTED → 转换为 simple-choice ----
                if (dtEvent.type === 'INTERACTION_REQUESTED') {
                    const payload = (dtEvent as InteractionRequestedEvent).payload;
                    const pendingInteraction = payload.interaction;
                    const eventTimestamp = typeof dtEvent.timestamp === 'number' ? dtEvent.timestamp : 0;
                    
                    // 将旧的 PendingInteraction 转换为 simple-choice
                    // 根据 type 生成选项
                    let options: PromptOption[] = [];
                    
                    if (pendingInteraction.type === 'selectStatus') {
                        // 收集所有玩家的所有状态效果作为选项
                        const targetPlayerIds = pendingInteraction.targetPlayerIds || Object.keys(newState.core.players);
                        let optionIndex = 0;
                        for (const targetPlayerId of targetPlayerIds) {
                            const player = newState.core.players[targetPlayerId];
                            if (player) {
                                Object.entries(player.statusEffects).forEach(([statusId, stacks]) => {
                                    if (stacks > 0) {
                                        options.push({
                                            id: `option-${optionIndex++}`,
                                            label: `statusEffects.${statusId}.name`,
                                            value: { playerId: targetPlayerId, statusId },
                                        });
                                    }
                                });
                            }
                        }
                    } else if (pendingInteraction.type === 'selectPlayer') {
                        // 选择玩家
                        const targetPlayerIds = pendingInteraction.targetPlayerIds || Object.keys(newState.core.players);
                        options = targetPlayerIds.map((playerId, index) => ({
                            id: `option-${index}`,
                            label: `players.${playerId}.name`,
                            value: { playerId },
                        }));
                    } else if (pendingInteraction.type === 'selectTargetStatus') {
                        // 选择要转移的状态（从所有玩家收集）
                        const targetPlayerIds = pendingInteraction.targetPlayerIds || Object.keys(newState.core.players);
                        let optionIndex = 0;
                        for (const fromPlayerId of targetPlayerIds) {
                            const player = newState.core.players[fromPlayerId];
                            if (player) {
                                Object.entries(player.statusEffects).forEach(([statusId, stacks]) => {
                                    if (stacks > 0) {
                                        // 为每个状态生成"转移到哪个玩家"的选项
                                        const otherPlayerIds = targetPlayerIds.filter(pid => pid !== fromPlayerId);
                                        for (const toPlayerId of otherPlayerIds) {
                                            options.push({
                                                id: `option-${optionIndex++}`,
                                                label: `statusEffects.${statusId}.name`,
                                                value: { fromPlayerId, toPlayerId, statusId },
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    }
                    
                    // 创建 simple-choice 交互
                    // 如果没有可选选项（如场上无状态效果），直接跳过交互
                    if (options.length === 0) {
                        // 无可选项，不创建交互，生成 INTERACTION_COMPLETED 事件通知领域层
                        nextEvents.push({
                            type: 'INTERACTION_COMPLETED',
                            payload: {
                                interactionId: `dt-interaction-${pendingInteraction.id}`,
                                sourceCardId: pendingInteraction.sourceCardId ?? '',
                            },
                            sourceCommandType: 'INTERACTION_AUTO_SKIP',
                            timestamp: eventTimestamp,
                        } as DiceThroneEvent);
                    } else {
                        // 卡牌打出的交互支持取消（返还卡牌和 CP）
                        const hasSourceCard = Boolean(pendingInteraction.sourceCardId);
                        const interaction = createSimpleChoice(
                            `dt-interaction-${pendingInteraction.id}`,
                            pendingInteraction.playerId,
                            pendingInteraction.titleKey,
                            options,
                            {
                                sourceId: pendingInteraction.sourceCardId,
                                autoCancelOption: hasSourceCard,
                            }
                        );
                        
                        // 保存原始 interactionData 以便兼容层使用
                        (interaction.data as any).originalInteractionData = pendingInteraction;
                        
                        newState = queueInteraction(newState, interaction);
                    }
                }

                // ---- INTERACTION_COMPLETED / INTERACTION_CANCELLED → resolve ----
                if (dtEvent.type === 'INTERACTION_COMPLETED' || dtEvent.type === 'INTERACTION_CANCELLED') {
                    newState = resolveInteraction(newState);
                }

                // ---- TOKEN_RESPONSE_REQUESTED → queue/update dt:token-response ----
                // 业务数据仅存 core.pendingDamage；sys.interaction 只做阻塞标记
                if (dtEvent.type === 'TOKEN_RESPONSE_REQUESTED') {
                    const payload = (dtEvent as TokenResponseRequestedEvent).payload;
                    const current = newState.sys.interaction.current;
                    if (current && current.kind === 'dt:token-response') {
                        // 同一伤害响应内的阶段切换（攻击方加伤 → 防御方减伤），原地更新 playerId
                        newState = {
                            ...newState,
                            sys: {
                                ...newState.sys,
                                interaction: {
                                    ...newState.sys.interaction,
                                    current: {
                                        ...current,
                                        id: `dt-token-response-${payload.pendingDamage.id}`,
                                        playerId: payload.pendingDamage.responderId,
                                        data: null,
                                    },
                                },
                            },
                        };
                    } else {
                        const interaction: InteractionDescriptor = {
                            id: `dt-token-response-${payload.pendingDamage.id}`,
                            kind: 'dt:token-response',
                            playerId: payload.pendingDamage.responderId,
                            data: null,
                        };
                        newState = queueInteraction(newState, interaction);
                    }
                }

                // ---- TOKEN_RESPONSE_CLOSED → resolve ----
                if (dtEvent.type === 'TOKEN_RESPONSE_CLOSED') {
                    newState = resolveInteraction(newState);
                }

                // ---- BONUS_DICE_REROLL_REQUESTED → queue dt:bonus-dice ----
                // 业务数据仅存 core.pendingBonusDiceSettlement；sys.interaction 只做阻塞标记
                if (dtEvent.type === 'BONUS_DICE_REROLL_REQUESTED') {
                    const payload = (dtEvent as BonusDiceRerollRequestedEvent).payload;
                    const interaction: InteractionDescriptor = {
                        id: `dt-bonus-dice-${payload.settlement.id}`,
                        kind: 'dt:bonus-dice',
                        playerId: payload.settlement.attackerId,
                        data: null,
                    };
                    newState = queueInteraction(newState, interaction);
                }

                // ---- BONUS_DICE_SETTLED → resolve ----
                if (dtEvent.type === 'BONUS_DICE_SETTLED') {
                    newState = resolveInteraction(newState);
                }

                // ---- SYS_INTERACTION_CANCELLED → 生成领域 INTERACTION_CANCELLED 事件（返还卡牌） ----
                if (event.type === INTERACTION_EVENTS.CANCELLED) {
                    const payload = event.payload as {
                        interactionId: string;
                        playerId: string;
                        sourceId?: string;
                        interactionData?: any;
                    };
                    
                    // 从 interactionData 中提取卡牌信息
                    // simple-choice 的 data 中有 originalInteractionData（PendingInteraction）
                    // dt:card-interaction 的 data 直接就是 PendingInteraction
                    const interactionData = payload.interactionData;
                    let cpCost = 0;
                    let sourceCardId = '';
                    
                    if (interactionData && typeof interactionData === 'object') {
                        const original = interactionData.originalInteractionData;
                        if (original && typeof original === 'object') {
                            // simple-choice 兼容层：从 originalInteractionData 提取
                            sourceCardId = original.sourceCardId ?? '';
                        } else {
                            // dt:card-interaction：直接从 data 提取
                            sourceCardId = interactionData.sourceCardId ?? '';
                        }
                        // cpCost 不在交互数据中，从弃牌堆的卡牌定义获取
                        if (sourceCardId) {
                            const player = newState.core.players[payload.playerId];
                            const card = player?.discard.find((c: any) => c.id === sourceCardId);
                            cpCost = card?.cpCost ?? 0;
                        }
                    }
                    
                    // 生成领域 INTERACTION_CANCELLED 事件（reducer 会返还卡牌和 CP）
                    if (sourceCardId || cpCost > 0) {
                        const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;
                        nextEvents.push({
                            type: 'INTERACTION_CANCELLED',
                            payload: {
                                playerId: payload.playerId,
                                sourceCardId,
                                cpCost,
                            },
                            sourceCommandType: 'SYS_INTERACTION_CANCEL', // 已迁移到 InteractionSystem
                            timestamp: eventTimestamp,
                        } as DiceThroneEvent);
                    }
                }

                // ---- SYS_INTERACTION_RESOLVED → 处理旧交互类型（兼容层） ----
                // 旧的 selectStatus/selectPlayer/selectTargetStatus 交互需要转换为业务命令
                if (event.type === INTERACTION_EVENTS.RESOLVED) {
                    const payload = event.payload as {
                        interactionId: string;
                        playerId: string;
                        optionId: string | null;
                        value: any;
                        sourceId?: string;
                        interactionData?: any;
                    };
                    
                    const interactionData = payload.interactionData;
                    const originalInteractionData = interactionData?.originalInteractionData;
                    
                    console.log('[systems.ts] SYS_INTERACTION_RESOLVED compatibility layer:', {
                        interactionData,
                        originalInteractionData,
                        interactionType: originalInteractionData?.type,
                        value: payload.value,
                    });
                    
                    if (originalInteractionData && typeof originalInteractionData === 'object') {
                        const interactionType = originalInteractionData.type;
                        const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;
                        
                        // 检查是否选择了取消选项（autoCancelOption 生成的 __cancel__ 选项）
                        const isCancelled = payload.value && typeof payload.value === 'object' && (payload.value as any).__cancel__ === true;
                        if (isCancelled) {
                            // 取消：生成 INTERACTION_CANCELLED 事件返还卡牌和 CP
                            const sourceCardId = originalInteractionData.sourceCardId ?? '';
                            let cpCost = 0;
                            if (sourceCardId) {
                                const player = newState.core.players[payload.playerId];
                                const card = player?.discard.find((c: any) => c.id === sourceCardId);
                                cpCost = card?.cpCost ?? 0;
                            }
                            if (sourceCardId || cpCost > 0) {
                                nextEvents.push({
                                    type: 'INTERACTION_CANCELLED',
                                    payload: {
                                        playerId: payload.playerId,
                                        sourceCardId,
                                        cpCost,
                                    },
                                    sourceCommandType: 'INTERACTION_RESOLVED_CANCEL',
                                    timestamp: eventTimestamp,
                                } as DiceThroneEvent);
                            }
                        } else {
                        // selectStatus: 选择状态后执行 REMOVE_STATUS
                        if (interactionType === 'selectStatus' && payload.value) {
                            console.log('[systems.ts] Handling selectStatus interaction');
                            const { playerId: targetPlayerId, statusId } = payload.value;
                            if (targetPlayerId && statusId) {
                                // 直接生成 STATUS_REMOVED 事件（不通过命令）
                                const targetPlayer = newState.core.players[targetPlayerId];
                                if (targetPlayer) {
                                    const currentStacks = targetPlayer.statusEffects[statusId] ?? 0;
                                    console.log('[systems.ts] Generating STATUS_REMOVED event:', {
                                        targetPlayerId,
                                        statusId,
                                        currentStacks,
                                    });
                                    if (currentStacks > 0) {
                                        nextEvents.push({
                                            type: 'STATUS_REMOVED',
                                            payload: { targetId: targetPlayerId, statusId, stacks: currentStacks },
                                            sourceCommandType: 'INTERACTION_RESOLVED',
                                            timestamp: eventTimestamp,
                                        } as DiceThroneEvent);
                                    }
                                }
                            }
                        }
                        
                        // selectPlayer: 选择玩家后执行 REMOVE_STATUS（移除所有状态）
                        if (interactionType === 'selectPlayer' && payload.value) {
                            const { playerId: targetPlayerId } = payload.value;
                            if (targetPlayerId) {
                                const targetPlayer = newState.core.players[targetPlayerId];
                                if (targetPlayer) {
                                    // 移除所有状态效果
                                    Object.entries(targetPlayer.statusEffects).forEach(([statusId, stacks]) => {
                                        if (stacks > 0) {
                                            nextEvents.push({
                                                type: 'STATUS_REMOVED',
                                                payload: { targetId: targetPlayerId, statusId, stacks },
                                                sourceCommandType: 'INTERACTION_RESOLVED',
                                                timestamp: eventTimestamp,
                                            } as DiceThroneEvent);
                                        }
                                    });
                                }
                            }
                        }
                        
                        // selectTargetStatus: 选择状态后执行 TRANSFER_STATUS
                        if (interactionType === 'selectTargetStatus' && payload.value) {
                            const { fromPlayerId, toPlayerId, statusId } = payload.value;
                            if (fromPlayerId && toPlayerId && statusId) {
                                const fromPlayer = newState.core.players[fromPlayerId];
                                const toPlayer = newState.core.players[toPlayerId];
                                if (fromPlayer && toPlayer) {
                                    const fromStacks = fromPlayer.statusEffects[statusId] ?? 0;
                                    if (fromStacks > 0) {
                                        // 移除源玩家的状态
                                        nextEvents.push({
                                            type: 'STATUS_REMOVED',
                                            payload: { targetId: fromPlayerId, statusId, stacks: fromStacks },
                                            sourceCommandType: 'INTERACTION_RESOLVED',
                                            timestamp: eventTimestamp,
                                        } as DiceThroneEvent);
                                        // 给目标玩家添加状态
                                        const toStacks = toPlayer.statusEffects[statusId] ?? 0;
                                        nextEvents.push({
                                            type: 'STATUS_APPLIED',
                                            payload: { targetId: toPlayerId, statusId, stacks: fromStacks, newTotal: toStacks + fromStacks },
                                            sourceCommandType: 'INTERACTION_RESOLVED',
                                            timestamp: eventTimestamp,
                                        } as DiceThroneEvent);
                                    }
                                }
                            }
                        }
                        } // 关闭 isCancelled else 块
                    }
                }

                // 处理 Prompt 响应 -> 生成 CHOICE_RESOLVED 领域事件
                const resolvedEvent = handlePromptResolved(event);
                if (resolvedEvent) {
                    nextEvents.push(resolvedEvent);
                }

                // ---- 被动能力触发器：ABILITY_ACTIVATED + pray 面 → 获得 CP ----
                if (dtEvent.type === 'ABILITY_ACTIVATED') {
                    const { abilityId, playerId, isDefense } = dtEvent.payload;
                    // 仅在自己的进攻阶段触发（非防御技能）
                    const phase = newState.sys.phase as string;
                    if (!isDefense && phase === 'offensiveRoll' && playerId === newState.core.activePlayerId) {
                        const passives = getPlayerPassiveAbilities(newState.core, playerId);
                        for (const passive of passives) {
                            if (!passive.trigger || passive.trigger.on !== 'abilityActivatedWithFace') continue;
                            // 检查激活的技能是否使用了所需骰面
                            const match = findPlayerAbility(newState.core, playerId, abilityId);
                            if (!match) continue;
                            const trigger = match.variant?.trigger ?? match.ability.trigger;
                            if (!trigger) continue;
                            // 检查 trigger 中是否包含所需骰面
                            let hasFace = false;
                            if (trigger.type === 'diceSet' && trigger.faces) {
                                hasFace = (trigger.faces[passive.trigger.requiredFace] ?? 0) > 0;
                            } else if (trigger.type === 'allSymbolsPresent' && trigger.symbols) {
                                hasFace = trigger.symbols.includes(passive.trigger.requiredFace);
                            } else if (trigger.type === 'smallStraight' || trigger.type === 'largeStraight') {
                                // 顺子不声明骰面，需要检查实际骰面中是否包含所需面
                                const activeDice = newState.core.dice.slice(0, newState.core.rollDiceCount);
                                hasFace = activeDice.some(d => d.symbol === passive.trigger!.requiredFace);
                            }
                            if (hasFace) {
                                const player = newState.core.players[playerId];
                                const currentCp = player?.resources[RESOURCE_IDS.CP] ?? 0;
                                const newCp = Math.min(currentCp + passive.trigger.grantCp, CP_MAX);
                                nextEvents.push({
                                    type: 'CP_CHANGED',
                                    payload: {
                                        playerId,
                                        delta: passive.trigger.grantCp,
                                        newValue: newCp,
                                        sourceAbilityId: passive.id,
                                    },
                                    sourceCommandType: 'PASSIVE_TRIGGER',
                                    timestamp: typeof dtEvent.timestamp === 'number' ? dtEvent.timestamp + 1 : 1,
                                } as CpChangedEvent);
                            }
                        }
                    }
                }
            }

            if (newState !== state || nextEvents.length > 0) {
                return {
                    state: newState,
                    events: nextEvents.length > 0 ? nextEvents : undefined,
                };
            }
        },
    };
}

/**
 * 处理 Prompt 响应事件，生成领域事件
 * 在 pipeline 层通过 domain.execute 处理 RESOLVE_CHOICE 命令时调用
 */
export function handlePromptResolved(
    event: GameEvent
): ChoiceResolvedEvent | null {
    if (event.type !== INTERACTION_EVENTS.RESOLVED) return null;
    const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;
    
    const payload = event.payload as {
        interactionId: string;
        playerId: string;
        optionId: string | null;
        value: { statusId?: string; tokenId?: string; value: number; customId?: string };
        sourceId?: string;
    };
    
    return {
        type: 'CHOICE_RESOLVED',
        payload: {
            playerId: payload.playerId,
            statusId: payload.value.statusId,
            tokenId: payload.value.tokenId,
            value: payload.value.value,
            customId: payload.value.customId,
            sourceAbilityId: payload.sourceId,
        },
        sourceCommandType: 'RESOLVE_CHOICE',
        timestamp: eventTimestamp,
    };
}
