/**
 * DiceThrone 命令执行
 * Command -> Event[] 转换
 */

import type { PlayerId, RandomFn } from '../../../engine/types';
import type {
    DiceThroneCore,
    TurnPhase,
    DiceThroneCommand,
    DiceThroneEvent,
    DiceRolledEvent,
    DieLockToggledEvent,
    RollConfirmedEvent,
    AbilityActivatedEvent,
    AttackInitiatedEvent,
    ResponseWindowOpenedEvent,
    DieModifiedEvent,
    DieRerolledEvent,
    StatusRemovedEvent,
    InteractionCompletedEvent,
    InteractionCancelledEvent,
    CharacterSelectedEvent,
    HostStartedEvent,
    PlayerReadyEvent,
    PendingInteraction,
} from './types';
import {
    getRollerId,
    getNextPlayerId,
    getResponderQueue,
} from './rules';
import { findPlayerAbility } from './abilityLookup';

import { DICETHRONE_COMMANDS, STATUS_IDS } from './ids';
import { CHARACTER_DATA_MAP } from './characters';
import { executeCardCommand } from './executeCards';
import { executeTokenCommand } from './executeTokens';

// ============================================================================
// 辅助函数
// ============================================================================

const resolveTimestamp = (command?: DiceThroneCommand): number => {
    return typeof command?.timestamp === 'number' ? command.timestamp : 0;
};

import { getGameMode } from './utils';

/**
 * 判断该进攻技能是否可被防御（是否进入防御投掷阶段）
 * 
 * 设计原则：
 * - 进攻技能默认可防御（进入防御阶段）
 * - 只有明确标记 'unblockable' 的技能才不可防御
 * - 不再基于 hasDamage 判断，因为 custom action 也可能造成伤害（如 thunder-strike-2-roll-damage）
 */
const isDefendableAttack = (state: DiceThroneCore, attackerId: string, abilityId: string): boolean => {
    const match = findPlayerAbility(state, attackerId, abilityId);
    if (!match) {
        return true;
    }

    // 检查 variant 和 ability 的 tags
    const variantTags = match.variant?.tags ?? [];
    const abilityTags = match.ability.tags ?? [];
    const hasUnblockableTag = variantTags.includes('unblockable') || abilityTags.includes('unblockable');

    // 不可防御标签：跳过防御阶段
    if (hasUnblockableTag) return false;

    // 进攻技能默认可防御
    return true;
};

// ============================================================================
// 命令执行器
// ============================================================================

/**
 * 执行命令，生成事件
 */
export function execute(
    matchState: { core: DiceThroneCore; sys?: { phase?: string; responseWindow?: { current?: { windowType: string } }; interaction?: { current?: { kind: string; data: unknown } | null } } },
    command: DiceThroneCommand,
    random: RandomFn
): DiceThroneEvent[] {
    const state = matchState.core;
    const phase = (matchState.sys?.phase ?? 'setup') as TurnPhase;
    // 从 sys.interaction 读取 pendingInteraction（单一权威）
    const sysInteraction = matchState.sys?.interaction?.current;
    const pendingInteraction = sysInteraction?.kind === 'dt:card-interaction'
        ? sysInteraction.data as PendingInteraction
        : undefined;
    const events: DiceThroneEvent[] = [];
    const timestamp = resolveTimestamp(command);

    // 系统命令由系统层处理（如 CheatSystem），领域层不生成事件
    if (command.type.startsWith('SYS_')) {
        return events;
    }

    switch (command.type) {
        case 'ROLL_DICE': {
            const rollerId = getRollerId(state, phase);
            const results: number[] = [];
            const isTutorialMode = getGameMode() === 'tutorial';
            const fixedValue = 1;
            
            state.dice.slice(0, state.rollDiceCount).forEach(die => {
                if (!die.isKept) {
                    results.push(isTutorialMode ? fixedValue : random.d(6));
                }
            });
            
            const event: DiceRolledEvent = {
                type: 'DICE_ROLLED',
                payload: { results, rollerId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'SELECT_CHARACTER': {
            const { characterId, initialDeckCardIds: presetDeckIds } = command.payload;
            const data = CHARACTER_DATA_MAP[characterId];
            if (!data || !random) break;

            const initialDeck = data.getStartingDeck(random);
            const initialDeckCardIds = presetDeckIds && presetDeckIds.length > 0
                ? presetDeckIds
                : initialDeck.map(c => c.id);

            const selectedEvent: CharacterSelectedEvent = {
                type: 'CHARACTER_SELECTED',
                payload: {
                    playerId: command.playerId,
                    characterId,
                    initialDeckCardIds,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(selectedEvent);
            break;
        }

        case 'HOST_START_GAME': {
            const hostEvent: HostStartedEvent = {
                type: 'HOST_STARTED',
                payload: {
                    playerId: command.playerId,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(hostEvent);
            break;
        }

        case 'PLAYER_READY': {
            const readyEvent: PlayerReadyEvent = {
                type: 'PLAYER_READY',
                payload: {
                    playerId: command.playerId,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(readyEvent);
            break;
        }

        case 'TOGGLE_DIE_LOCK': {
            const payload = command.payload as { dieId: number };
            const die = state.dice.find(d => d.id === payload.dieId);
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
            const rollerId = getRollerId(state, phase);
            
            const event: RollConfirmedEvent = {
                type: 'ROLL_CONFIRMED',
                payload: { playerId: rollerId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            
            // 确认骰面后，打开响应窗口
            // - 排除 rollerId（当前投掷方），因为他们可以主动出牌
            // - triggerId 是对手（优先响应）
            // 例如：防御阶段防御方确认骰面，攻击方可以响应（强制重投等）
            const playerIds = Object.keys(state.players);
            const opponentId = playerIds.find(pid => pid !== rollerId) || rollerId;
            const responderQueue = getResponderQueue(state, 'afterRollConfirmed', opponentId, undefined, rollerId, phase);
            if (responderQueue.length > 0) {
                const windowId = `afterRollConfirmed-${timestamp}`;
                const responseWindowEvent: ResponseWindowOpenedEvent = {
                    type: 'RESPONSE_WINDOW_OPENED',
                    payload: {
                        windowId,
                        responderQueue,
                        windowType: 'afterRollConfirmed',
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(responseWindowEvent);
                return events; // 等待响应窗口关闭
            }
            break;
        }

        case 'SELECT_ABILITY': {
            const { abilityId } = command.payload as { abilityId: string };
            
            if (phase === 'defensiveRoll') {
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
                // 进攻技能选择 -> 发起放击
                // 1. 先触发技能激活事件（用于特写展示）
                const abilityActivatedEvent: AbilityActivatedEvent = {
                    type: 'ABILITY_ACTIVATED',
                    payload: { 
                        abilityId, 
                        playerId: state.activePlayerId,
                        isDefense: false,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(abilityActivatedEvent);
                
                // 2. 再发起放击事件
                const defenderId = getNextPlayerId(state);
                const isDefendable = isDefendableAttack(state, state.activePlayerId, abilityId);
                
                // 检查是否为终极技能
                const match = findPlayerAbility(state, state.activePlayerId, abilityId);
                const isUltimate = match?.ability?.tags?.includes('ultimate') ?? false;
                
                const attackEvent: AttackInitiatedEvent = {
                    type: 'ATTACK_INITIATED',
                    payload: { 
                        attackerId: state.activePlayerId,
                        defenderId,
                        sourceAbilityId: abilityId,
                        isDefendable,
                        isUltimate,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(attackEvent);
            }
            break;
        }

        case 'DRAW_CARD':
        case 'DISCARD_CARD':
        case 'SELL_CARD':
        case 'UNDO_SELL_CARD':
        case 'REORDER_CARD_TO_END':
        case 'PLAY_CARD':
        case 'PLAY_UPGRADE_CARD':
            return executeCardCommand(matchState, command, random, phase, timestamp);

        case 'RESOLVE_CHOICE': {
            // 由 InteractionSystem 处理，这里只生成领域事件
            // 实际的交互清理在系统层
            break;
        }

        case 'RESPONSE_PASS': {
            // 由 ResponseWindowSystem 处理，领域层不生成事件
            break;
        }

        case 'ADVANCE_PHASE': {
            // 阶段推进完全由 FlowSystem 通过 FlowHooks 处理
            // - onPhaseExit: 处理阶段退出逻辑（攻击结算、回合切换等）
            // - onPhaseEnter: 处理阶段进入逻辑（收入、抽牌等）
            // 领域层不再生成 PHASE_CHANGED 事件
            break;
        }

        case 'MODIFY_DIE': {
            const { dieId, newValue } = command.payload as { dieId: number; newValue: number };
            const die = state.dice.find(d => d.id === dieId);
            if (die) {
                const event: DieModifiedEvent = {
                    type: 'DIE_MODIFIED',
                    payload: { dieId, oldValue: die.value, newValue, playerId: command.playerId },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
                
                // 规则 3.3 步骤 3：如果骰面被修改且已选择技能，触发重选
                // 注意：终极技能不受影响（行动锁定）
                if (phase === 'offensiveRoll' && 
                    state.pendingAttack && 
                    !state.pendingAttack.isUltimate) {
                    events.push({
                        type: 'ABILITY_RESELECTION_REQUIRED',
                        payload: {
                            playerId: state.activePlayerId,
                            previousAbilityId: state.pendingAttack.sourceAbilityId,
                            reason: 'dieModified',
                        },
                        sourceCommandType: command.type,
                        timestamp,
                    } as DiceThroneEvent);
                }
            }
            break;
        }

        case 'REROLL_DIE': {
            const { dieId } = command.payload as { dieId: number };
            const die = state.dice.find(d => d.id === dieId);
            const newValue = random.d(6);
            const event: DieRerolledEvent = {
                type: 'DIE_REROLLED',
                payload: { dieId, oldValue: die?.value ?? newValue, newValue, playerId: command.playerId },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            
            // 规则 3.3 步骤 3：如果骰面被重掷且已选择技能，触发重选
            // 注意：终极技能不受影响（行动锁定）
            if (phase === 'offensiveRoll' && 
                state.pendingAttack && 
                !state.pendingAttack.isUltimate) {
                events.push({
                    type: 'ABILITY_RESELECTION_REQUIRED',
                    payload: {
                        playerId: state.activePlayerId,
                        previousAbilityId: state.pendingAttack.sourceAbilityId,
                        reason: 'dieRerolled',
                    },
                    sourceCommandType: command.type,
                    timestamp,
                } as DiceThroneEvent);
            }
            break;
        }

        case 'REMOVE_STATUS': {
            const { targetPlayerId, statusId } = command.payload as { targetPlayerId: PlayerId; statusId?: string };
            const targetPlayer = state.players[targetPlayerId];
            if (targetPlayer) {
                if (statusId) {
                    // 移除单个状态
                    const currentStacks = targetPlayer.statusEffects[statusId] ?? 0;
                    if (currentStacks > 0) {
                        const event: StatusRemovedEvent = {
                            type: 'STATUS_REMOVED',
                            payload: { targetId: targetPlayerId, statusId, stacks: currentStacks },
                            sourceCommandType: command.type,
                            timestamp,
                        };
                        events.push(event);
                    }
                    // 也检查 tokens
                    const tokenAmount = targetPlayer.tokens[statusId] ?? 0;
                    if (tokenAmount > 0) {
                        events.push({
                            type: 'TOKEN_CONSUMED',
                            payload: { playerId: targetPlayerId, tokenId: statusId, amount: tokenAmount, newTotal: 0 },
                            sourceCommandType: command.type,
                            timestamp,
                        } as DiceThroneEvent);
                    }
                } else {
                    // 移除所有状态
                    Object.entries(targetPlayer.statusEffects).forEach(([sid, stacks]) => {
                        if (stacks > 0) {
                            events.push({
                                type: 'STATUS_REMOVED',
                                payload: { targetId: targetPlayerId, statusId: sid, stacks },
                                sourceCommandType: command.type,
                                timestamp,
                            } as StatusRemovedEvent);
                        }
                    });
                    Object.entries(targetPlayer.tokens).forEach(([tid, amount]) => {
                        if (amount > 0) {
                            events.push({
                                type: 'TOKEN_CONSUMED',
                                payload: { playerId: targetPlayerId, tokenId: tid, amount, newTotal: 0 },
                                sourceCommandType: command.type,
                                timestamp,
                            } as DiceThroneEvent);
                        }
                    });
                }
            }
            break;
        }

        case 'TRANSFER_STATUS': {
            const { fromPlayerId, toPlayerId, statusId } = command.payload as { fromPlayerId: PlayerId; toPlayerId: PlayerId; statusId: string };
            const fromPlayer = state.players[fromPlayerId];
            const toPlayer = state.players[toPlayerId];
            if (fromPlayer && toPlayer) {
                // 检查是 statusEffects 还是 tokens
                const fromStacks = fromPlayer.statusEffects[statusId] ?? 0;
                const fromTokens = fromPlayer.tokens[statusId] ?? 0;
                
                if (fromStacks > 0) {
                    // 移除源玩家的状态
                    events.push({
                        type: 'STATUS_REMOVED',
                        payload: { targetId: fromPlayerId, statusId, stacks: fromStacks },
                        sourceCommandType: command.type,
                        timestamp,
                    } as StatusRemovedEvent);
                    // 给目标玩家添加状态
                    const toStacks = toPlayer.statusEffects[statusId] ?? 0;
                    events.push({
                        type: 'STATUS_APPLIED',
                        payload: { targetId: toPlayerId, statusId, stacks: fromStacks, newTotal: toStacks + fromStacks },
                        sourceCommandType: command.type,
                        timestamp,
                    } as DiceThroneEvent);
                } else if (fromTokens > 0) {
                    // 移除源玩家的 token
                    events.push({
                        type: 'TOKEN_CONSUMED',
                        payload: { playerId: fromPlayerId, tokenId: statusId, amount: fromTokens, newTotal: 0 },
                        sourceCommandType: command.type,
                        timestamp,
                    } as DiceThroneEvent);
                    // 给目标玩家添加 token
                    const toTokens = toPlayer.tokens[statusId] ?? 0;
                    events.push({
                        type: 'TOKEN_GRANTED',
                        payload: { targetId: toPlayerId, tokenId: statusId, amount: fromTokens, newTotal: toTokens + fromTokens },
                        sourceCommandType: command.type,
                        timestamp,
                    } as DiceThroneEvent);
                }
            }
            break;
        }

        case 'CONFIRM_INTERACTION': {
            const interaction = pendingInteraction;
            if (!interaction) break;

            // 处理 selectDie 类型交互的批量重掷
            const payload = command.payload as { interactionId: string; selectedDiceIds?: number[] };
            if (interaction.type === 'selectDie' && payload.selectedDiceIds) {
                for (const dieId of payload.selectedDiceIds) {
                    const die = state.dice.find(d => d.id === dieId);
                    const newValue = random.d(6);
                    const rerollEvent: DieRerolledEvent = {
                        type: 'DIE_REROLLED',
                        payload: {
                            dieId,
                            oldValue: die?.value ?? newValue,
                            newValue,
                            playerId: command.playerId,
                        },
                        sourceCommandType: command.type,
                        timestamp,
                    };
                    events.push(rerollEvent);
                }
            }

            const event: InteractionCompletedEvent = {
                type: 'INTERACTION_COMPLETED',
                payload: {
                    interactionId: payload.interactionId,
                    sourceCardId: interaction.sourceCardId,
                },
                sourceCommandType: command.type,
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'CANCEL_INTERACTION': {
            // 从 sys.interaction 获取卡牌信息
            const interaction = pendingInteraction;
            if (interaction) {
                // 查找卡牌的 CP 成本
                const player = state.players[interaction.playerId];
                const card = player?.discard.find(c => c.id === interaction.sourceCardId);
                const cpCost = card?.cpCost ?? 0;
                
                const event: InteractionCancelledEvent = {
                    type: 'INTERACTION_CANCELLED',
                    payload: {
                        interactionId: interaction.id,
                        sourceCardId: interaction.sourceCardId,
                        cpCost,
                        playerId: interaction.playerId,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                };
                events.push(event);
            }
            break;
        }

        case 'USE_TOKEN':
        case 'SKIP_TOKEN_RESPONSE':
        case 'USE_PURIFY':
        case DICETHRONE_COMMANDS.PAY_TO_REMOVE_KNOCKDOWN:
        case 'REROLL_BONUS_DIE':
        case 'SKIP_BONUS_DICE_REROLL':
            return executeTokenCommand(state, command, random, timestamp);

         default: {
            console.warn(`Unknown command type: ${(command as DiceThroneCommand).type}`);
        }
    }
 
    return events;
}