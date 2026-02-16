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

                // ---- INTERACTION_REQUESTED → queue dt:card-interaction ----
                if (dtEvent.type === 'INTERACTION_REQUESTED') {
                    const payload = (dtEvent as InteractionRequestedEvent).payload;
                    const interaction: InteractionDescriptor = {
                        id: `dt-interaction-${payload.interaction.id}`,
                        kind: 'dt:card-interaction',
                        playerId: payload.interaction.playerId,
                        data: payload.interaction,
                    };
                    newState = queueInteraction(newState, interaction);
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
