/**
 * DiceThrone 命令执行
 * Command -> Event[] 转换
 */

import type { RandomFn } from '../../../engine/types';
import type {
    DiceThroneCore,
    DiceThroneCommand,
    DiceThroneEvent,
    DiceRolledEvent,
    BonusDieRolledEvent,
    DieLockToggledEvent,
    RollConfirmedEvent,
    AbilityActivatedEvent,
    AttackInitiatedEvent,
    CardDrawnEvent,
    CardDiscardedEvent,
    CardSoldEvent,
    SellUndoneEvent,
    CardReorderedEvent,
    CardPlayedEvent,
    CpChangedEvent,
    PhaseChangedEvent,
    TurnChangedEvent,
    ChoiceRequestedEvent,
    ResponseWindowOpenedEvent,
} from './types';
import {
    getAvailableAbilityIds,
    getRollerId,
    getDieFace,
    getNextPlayerId,
    getNextPhase,
    getUpgradeTargetAbilityId,
    hasRespondableContent,
} from './rules';
import { findPlayerAbility } from './abilityLookup';
import { resolveAttack, resolveOffensivePreDefenseEffects } from './attack';
import { reduce } from './reducer';
import { resourceSystem } from '../../../systems/ResourceSystem';
import { RESOURCE_IDS } from './resources';
import { resolveEffectsToEvents, type EffectContext } from './effects';
import { buildDrawEvents } from './deckEvents';

// ============================================================================
// 辅助函数
// ============================================================================

const now = () => Date.now();

/**
 * 判断该进攻技能是否可被防御（是否进入防御投掷阶段）
 */
const isDefendableAttack = (state: DiceThroneCore, attackerId: string, abilityId: string): boolean => {
    const match = findPlayerAbility(state, attackerId, abilityId);
    if (!match) return true;

    const effects = match.variant?.effects ?? match.ability.effects ?? [];
    const hasDamage = effects.some(e => e.action?.type === 'damage' && (e.action.value ?? 0) > 0);
    if (!hasDamage) return false;

    // 不可防御标签：跳过防御阶段
    if (match.ability.tags?.includes('unblockable')) return false;

    return true;
};

const applyEvents = (state: DiceThroneCore, events: DiceThroneEvent[]): DiceThroneCore => {
    return events.reduce((current, event) => reduce(current, event), state);
};

// ============================================================================
// 命令执行器
// ============================================================================

/**
 * 执行命令，生成事件
 */
export function execute(
    state: DiceThroneCore,
    command: DiceThroneCommand,
    random: RandomFn
): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];
    const timestamp = now();

    // 系统命令只由系统层处理，领域层不生成事件
    if (command.type.startsWith('SYS_')) {
        return events;
    }

    switch (command.type) {
        case 'ROLL_DICE': {
            const rollerId = getRollerId(state);
            const results: number[] = [];
            
            state.dice.slice(0, state.rollDiceCount).forEach(die => {
                if (!die.isKept) {
                    results.push(random.d(6));
                }
            });
            
            const event: DiceRolledEvent = {
                type: 'DICE_ROLLED',
                payload: { results, rollerId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            
            // 计算新的可用技能（需要模拟应用事件后的状态）
            // 简化处理：在 afterEvents 系统钩子中更新 availableAbilityIds
            break;
        }

        case 'ROLL_BONUS_DIE': {
            // 已废弃：额外骰子现在在 resolveAttack 中自动投掷
            console.warn('[DiceThrone] ROLL_BONUS_DIE is deprecated - bonus dice are now rolled automatically during attack resolution');
            break;
        }

        case 'TOGGLE_DIE_LOCK': {
            const die = state.dice.find(d => d.id === command.payload.dieId);
            if (die) {
                const event: DieLockToggledEvent = {
                    type: 'DIE_LOCK_TOGGLED',
                    payload: { dieId: die.id, isKept: !die.isKept },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
            }
            break;
        }

        case 'CONFIRM_ROLL': {
            const rollerId = getRollerId(state);
            const availableAbilityIds = getAvailableAbilityIds(state, rollerId);
            
            const event: RollConfirmedEvent = {
                type: 'ROLL_CONFIRMED',
                payload: { playerId: rollerId, availableAbilityIds },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            
            // 防御阶段自动选择唯一技能
            if (state.turnPhase === 'defensiveRoll' && 
                state.pendingAttack && 
                !state.pendingAttack.defenseAbilityId && 
                availableAbilityIds.length === 1) {
                const autoAbilityEvent: AbilityActivatedEvent = {
                    type: 'ABILITY_ACTIVATED',
                    payload: { 
                        abilityId: availableAbilityIds[0], 
                        playerId: state.pendingAttack.defenderId,
                        isDefense: true,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(autoAbilityEvent);
            }
            break;
        }

        case 'SELECT_ABILITY': {
            const { abilityId } = command.payload;
            
            if (state.turnPhase === 'defensiveRoll') {
                // 防御技能选择
                const event: AbilityActivatedEvent = {
                    type: 'ABILITY_ACTIVATED',
                    payload: { 
                        abilityId, 
                        playerId: state.pendingAttack!.defenderId,
                        isDefense: true,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
            } else {
                // 进攻技能选择 -> 发起攻击
                const defenderId = getNextPlayerId(state);
                const isDefendable = isDefendableAttack(state, state.activePlayerId, abilityId);
                
                const event: AttackInitiatedEvent = {
                    type: 'ATTACK_INITIATED',
                    payload: { 
                        attackerId: state.activePlayerId,
                        defenderId,
                        sourceAbilityId: abilityId,
                        isDefendable,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
            }
            break;
        }

        case 'DRAW_CARD': {
            events.push(
                ...buildDrawEvents(state, state.activePlayerId, 1, random, command.type, timestamp)
            );
            break;
        }

        case 'DISCARD_CARD': {
            const event: CardDiscardedEvent = {
                type: 'CARD_DISCARDED',
                payload: { playerId: state.activePlayerId, cardId: command.payload.cardId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'SELL_CARD': {
            const actingPlayerId = (command.playerId || state.activePlayerId);
            const event: CardSoldEvent = {
                type: 'CARD_SOLD',
                payload: { 
                    playerId: actingPlayerId, 
                    cardId: command.payload.cardId,
                    cpGained: 1,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'UNDO_SELL_CARD': {
            if (state.lastSoldCardId) {
                const actingPlayerId = (command.playerId || state.activePlayerId);
                const event: SellUndoneEvent = {
                    type: 'SELL_UNDONE',
                    payload: { playerId: actingPlayerId, cardId: state.lastSoldCardId },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
            }
            break;
        }

        case 'REORDER_CARD_TO_END': {
            const event: CardReorderedEvent = {
                type: 'CARD_REORDERED',
                payload: { playerId: state.activePlayerId, cardId: command.payload.cardId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'PLAY_CARD': {
            const actingPlayerId = (command.playerId || state.activePlayerId);
            const player = state.players[actingPlayerId];
            const card = player?.hand.find(c => c.id === command.payload.cardId);
            if (!card || !player) break;
            
            // 升级卡：自动提取目标技能并执行升级逻辑
            if (card.type === 'upgrade') {
                const targetAbilityId = getUpgradeTargetAbilityId(card);
                if (!targetAbilityId || !card.effects || card.effects.length === 0) {
                    console.warn(`[DiceThrone] 升级卡 ${card.id} 缺少 targetAbilityId 或 effects`);
                    break;
                }
                
                // 计算实际 CP 消耗
                const currentLevel = player.abilityLevels[targetAbilityId] ?? 1;
                const previousUpgradeCost = player.upgradeCardByAbilityId[targetAbilityId]?.cpCost;
                let actualCost = card.cpCost;
                if (previousUpgradeCost !== undefined && currentLevel > 1) {
                    actualCost = Math.max(0, card.cpCost - previousUpgradeCost);
                }
                
                // CP 变化事件
                const cpResult = resourceSystem.modify(
                    player.resources,
                    RESOURCE_IDS.CP,
                    -actualCost
                );
                const cpEvent: CpChangedEvent = {
                    type: 'CP_CHANGED',
                    payload: { 
                        playerId: actingPlayerId, 
                        delta: cpResult.actualDelta,
                        newValue: cpResult.newValue,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(cpEvent);
                
                // 执行升级卡效果（replaceAbility）
                const opponentId = Object.keys(state.players).find(id => id !== actingPlayerId) || actingPlayerId;
                const effectCtx: EffectContext = {
                    attackerId: actingPlayerId,
                    defenderId: opponentId,
                    sourceAbilityId: card.id,
                    state,
                    damageDealt: 0,
                };
                const effectEvents = resolveEffectsToEvents(card.effects, 'immediate', effectCtx, { random });
                events.push(...effectEvents);
                break;
            }
            
            // 普通卡牌
            const event: CardPlayedEvent = {
                type: 'CARD_PLAYED',
                payload: { 
                    playerId: actingPlayerId, 
                    cardId: card.id,
                    cpCost: card.cpCost,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            
            // 通过效果系统执行卡牌效果（数据驱动）
            if (card.effects && card.effects.length > 0) {
                const opponentId = Object.keys(state.players).find(id => id !== actingPlayerId) || actingPlayerId;
                const effectCtx: EffectContext = {
                    attackerId: actingPlayerId,
                    defenderId: opponentId,
                    sourceAbilityId: card.id,
                    state,
                    damageDealt: 0,
                };
                const effectEvents = resolveEffectsToEvents(card.effects, 'immediate', effectCtx, { random });
                events.push(...effectEvents);
            }
            break;
        }

        case 'PLAY_UPGRADE_CARD': {
            const player = state.players[state.activePlayerId];
            const card = player?.hand.find(c => c.id === command.payload.cardId);
            if (card && player) {
                const currentLevel = player.abilityLevels[command.payload.targetAbilityId] ?? 1;
                const previousUpgradeCost = player.upgradeCardByAbilityId[command.payload.targetAbilityId]?.cpCost;
                let actualCost = card.cpCost;
                if (previousUpgradeCost !== undefined && currentLevel > 1) {
                    actualCost = Math.max(0, card.cpCost - previousUpgradeCost);
                }
                
                // CP 变化事件（使用 ResourceSystem 保证边界）
                const cpResult = resourceSystem.modify(
                    player.resources,
                    RESOURCE_IDS.CP,
                    -actualCost
                );
                const cpEvent: CpChangedEvent = {
                    type: 'CP_CHANGED',
                    payload: { 
                        playerId: state.activePlayerId, 
                        delta: cpResult.actualDelta,
                        newValue: cpResult.newValue,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(cpEvent);
                
                // 通过效果系统执行升级卡效果（包含 replaceAbility）
                if (!card.effects || card.effects.length === 0) {
                    console.warn(`[DiceThrone] 升级卡 ${card.id} 缺少 effects 定义，无法执行升级`);
                    break;
                }

                const opponentId = Object.keys(state.players).find(id => id !== state.activePlayerId) || state.activePlayerId;
                const effectCtx: EffectContext = {
                    attackerId: state.activePlayerId,
                    defenderId: opponentId,
                    sourceAbilityId: card.id,
                    state,
                    damageDealt: 0,
                };
                const effectEvents = resolveEffectsToEvents(card.effects, 'immediate', effectCtx, { random });
                events.push(...effectEvents);
            }
            break;
        }

        case 'RESOLVE_CHOICE': {
            // 由 PromptSystem 处理，这里只生成领域事件
            // 实际的 prompt 清理在系统层
            break;
        }

        case 'RESPONSE_PASS': {
            // 由 ResponseWindowSystem 处理，领域层不生成事件
            break;
        }

        case 'ADVANCE_PHASE': {
            if (state.turnPhase === 'offensiveRoll') {
                if (state.pendingAttack) {
                    const preDefenseEvents = resolveOffensivePreDefenseEffects(state);
                    events.push(...preDefenseEvents);

                    const hasChoice = preDefenseEvents.some((event) => event.type === 'CHOICE_REQUESTED');
                    if (hasChoice) {
                        return events;
                    }

                    const stateAfterPreDefense = preDefenseEvents.length > 0
                        ? applyEvents(state, preDefenseEvents)
                        : state;

                    if (state.pendingAttack.isDefendable) {
                        const phaseEvent: PhaseChangedEvent = {
                            type: 'PHASE_CHANGED',
                            payload: {
                                from: state.turnPhase,
                                to: 'defensiveRoll',
                                activePlayerId: state.activePlayerId,
                            },
                            sourceCommandType: command.type,
                            timestamp,
                        };
                        events.push(phaseEvent);
                        return events;
                    }

                    const attackEvents = resolveAttack(stateAfterPreDefense, random, { includePreDefense: false });
                    events.push(...attackEvents);

                    // 如果攻击效果触发了选择，需要等待用户选择后再继续
                    const hasAttackChoice = attackEvents.some((event) => event.type === 'CHOICE_REQUESTED');
                    if (hasAttackChoice) {
                        return events;
                    }

                    const phaseEvent: PhaseChangedEvent = {
                        type: 'PHASE_CHANGED',
                        payload: {
                            from: state.turnPhase,
                            to: 'main2',
                            activePlayerId: state.activePlayerId,
                        },
                        sourceCommandType: command.type,
                        timestamp,
                    };
                    events.push(phaseEvent);
                    return events;
                }

                const phaseEvent: PhaseChangedEvent = {
                    type: 'PHASE_CHANGED',
                    payload: {
                        from: state.turnPhase,
                        to: 'main2',
                        activePlayerId: state.activePlayerId,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(phaseEvent);
                return events;
            }

            if (state.turnPhase === 'defensiveRoll' && state.pendingAttack) {
                // 在攻击结算前检测是否需要打开响应窗口
                // 让进攻方可以打出响应卡（instant/roll）或使用消耗性状态
                const attackerId = state.pendingAttack.attackerId;
                if (hasRespondableContent(state, attackerId, 'preResolve')) {
                    const windowId = `preResolve-${state.pendingAttack.sourceAbilityId}-${timestamp}`;
                    const responseWindowEvent: ResponseWindowOpenedEvent = {
                        type: 'RESPONSE_WINDOW_OPENED',
                        payload: {
                            windowId,
                            responderId: attackerId,
                            windowType: 'preResolve',
                            sourceAbilityId: state.pendingAttack.sourceAbilityId,
                        },
                        sourceCommandType: command.type,
                        timestamp,
                    };
                    events.push(responseWindowEvent);
                    return events;
                }

                const attackEvents = resolveAttack(state, random);
                events.push(...attackEvents);

                // 如果攻击效果触发了选择，需要等待用户选择后再继续
                const hasAttackChoice = attackEvents.some((event) => event.type === 'CHOICE_REQUESTED');
                if (hasAttackChoice) {
                    return events;
                }
            }

            const nextPhase = getNextPhase(state);

            // 阶段切换事件
            const phaseEvent: PhaseChangedEvent = {
                type: 'PHASE_CHANGED',
                payload: { 
                    from: state.turnPhase,
                    to: nextPhase,
                    activePlayerId: state.activePlayerId,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(phaseEvent);

            // income 阶段的收入和抽牌
            if (nextPhase === 'income') {
                const player = state.players[state.activePlayerId];
                if (player) {
                    // CP +1（使用 ResourceSystem 处理上限）
                    const cpResult = resourceSystem.modify(
                        player.resources,
                        RESOURCE_IDS.CP,
                        1
                    );
                    const cpEvent: CpChangedEvent = {
                        type: 'CP_CHANGED',
                        payload: { 
                            playerId: state.activePlayerId, 
                            delta: cpResult.actualDelta,
                            newValue: cpResult.newValue,
                        },
                        sourceCommandType: command.type,
                        timestamp,
                    };
                    events.push(cpEvent);
                    
                    // 抽牌（牌库为空则洗弃牌堆）
                    events.push(
                        ...buildDrawEvents(state, state.activePlayerId, 1, random, command.type, timestamp)
                    );
                }
            }
            
            // discard 阶段结束后切换玩家
            if (state.turnPhase === 'discard') {
                const nextPlayerId = getNextPlayerId(state);
                const turnEvent: TurnChangedEvent = {
                    type: 'TURN_CHANGED',
                    payload: { 
                        previousPlayerId: state.activePlayerId,
                        nextPlayerId,
                        turnNumber: state.turnNumber + 1,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(turnEvent);
            }

            break;
        }

        default: {
            const _exhaustive: never = command;
            console.warn(`Unknown command type: ${(_exhaustive as DiceThroneCommand).type}`);
        }
    }

    return events;
}
