/**
 * DiceThrone 游戏定义（新引擎架构）
 * 
 * 使用领域内核 + 引擎适配器
 */

import type { ActionLogEntry, ActionLogSegment, Command, GameEvent, MatchState, PlayerId } from '../../engine/types';
import {
    createGameAdapter,
    createActionLogSystem,
    createCheatSystem,
    createEventStreamSystem,
    createFlowSystem,
    createLogSystem,
    createInteractionSystem,
    createRematchSystem,
    createResponseWindowSystem,
    createTutorialSystem,
    createUndoSystem,
} from '../../engine';
import { DiceThroneDomain } from './domain';
import { DICETHRONE_COMMANDS } from './domain/ids';
import type {
    AbilityCard,
    DiceThroneCore,
    TurnPhase,
    DamageDealtEvent,
    AttackResolvedEvent,
    HealAppliedEvent,
    StatusAppliedEvent,
    StatusRemovedEvent,
    AbilityActivatedEvent,
    TokenGrantedEvent,
    TokenConsumedEvent,
    TokenUsedEvent,
} from './domain/types';
import { createDiceThroneEventSystem } from './domain/systems';
import { getNextPhase } from './domain/rules';
import { findPlayerAbility } from './domain/abilityLookup';
import { diceThroneCheatModifier } from './domain/cheatModifier';
import { diceThroneFlowHooks } from './domain/flowHooks';

// ============================================================================
// ActionLog 共享白名单 + 格式化
// ============================================================================

const ACTION_LOG_ALLOWLIST = [
    'PLAY_CARD',
    'PLAY_UPGRADE_CARD',
    // 注意：阶段推进属于明确的规则行为，允许撤回 + 记录。
    'ADVANCE_PHASE',
    'SELECT_ABILITY',
    'USE_TOKEN',
    'SKIP_TOKEN_RESPONSE',
] as const;

const UNDO_ALLOWLIST = [
    'PLAY_CARD',
    'PLAY_UPGRADE_CARD',
    'ADVANCE_PHASE',
] as const;

const DT_NS = 'game-dicethrone';

/** 将 sourceAbilityId 解析为可读的 i18n 来源标签 */
function resolveAbilitySourceLabel(
    sourceAbilityId: string | undefined,
    core: DiceThroneCore,
    _playerId: PlayerId,
): { label: string; isI18n: boolean } | null {
    if (!sourceAbilityId) return null;
    // 系统来源映射
    switch (sourceAbilityId) {
        case 'upkeep-burn': return { label: 'actionLog.damageSource.upkeepBurn', isI18n: true };
        case 'upkeep-poison': return { label: 'actionLog.damageSource.upkeepPoison', isI18n: true };
        case 'retribution-reflect': return { label: 'actionLog.damageSource.retribution', isI18n: true };
    }
    // 从双方玩家技能表中查找（支持变体 ID）
    for (const pid of Object.keys(core.players)) {
        const found = findPlayerAbility(core, pid, sourceAbilityId);
        if (found?.ability.name) {
            return { label: found.ability.name, isI18n: found.ability.name.includes('.') };
        }
    }
    // fallback：用 sourceAbilityId 本身作为文本
    return { label: sourceAbilityId, isI18n: false };
}

function formatDiceThroneActionEntry({
    command,
    state,
    events,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | ActionLogEntry[] | null {
    const core = (state as MatchState<DiceThroneCore>).core;
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;
    const entries: ActionLogEntry[] = [];
    const tokenDefinitions = core.tokenDefinitions ?? [];

    // i18n segment 工厂：延迟翻译，渲染时由客户端 useTranslation 翻译
    const i18nSeg = (
        key: string,
        params?: Record<string, string | number>,
        paramI18nKeys?: string[],
    ) => ({
        type: 'i18n' as const,
        ns: DT_NS,
        key,
        ...(params ? { params } : {}),
        ...(paramI18nKeys ? { paramI18nKeys } : {}),
    });

    const getTokenI18nKey = (tokenId: string): string => {
        const def = tokenDefinitions.find(item => item.id === tokenId);
        if (!def?.name) return tokenId;
        // 如果 name 包含 '.'，说明是 i18n key（如 'token.shield.name'）
        if (def.name.includes('.')) return def.name;
        return def.name;
    };

    const getAbilityI18nKey = (rawName?: string): string => {
        if (!rawName) return '';
        // 如果包含 '.'，说明是 i18n key
        if (rawName.includes('.')) return rawName;
        return rawName;
    };

    if (command.type === 'PLAY_CARD' || command.type === 'PLAY_UPGRADE_CARD') {
        const cardId = (command.payload as { cardId: string }).cardId;
        const card = findDiceThroneCard(core, cardId, command.playerId);
        if (!card || !card.previewRef) return null;

        const actionKey = command.type === 'PLAY_UPGRADE_CARD'
            ? 'actionLog.playUpgradeCard'
            : 'actionLog.playCard';

        // card segment：如果 card.name 是 i18n key（含 .），存原始 key + ns，渲染时翻译
        const isI18nKey = card.name?.includes('.');
        const cardSegment: ActionLogSegment = {
            type: 'card',
            cardId: card.id,
            previewText: card.name ?? cardId,
            ...(isI18nKey ? { previewTextNs: DT_NS } : {}),
        };

        entries.push({
            id: `${command.type}-${command.playerId}-${timestamp}`,
            timestamp,
            actorId: command.playerId,
            kind: command.type,
            segments: [
                i18nSeg(actionKey),
                cardSegment,
            ],
        });
    }

    if (command.type === 'ADVANCE_PHASE') {
        const phaseChanged = [...events]
            .reverse()
            .find(event => event.type === 'SYS_PHASE_CHANGED') as
            | { payload?: { to?: string } }
            | undefined;
        const currentPhase = (state as MatchState<DiceThroneCore>).sys?.phase as TurnPhase | undefined;
        const nextPhase = phaseChanged?.payload?.to ?? (currentPhase ? getNextPhase(core, currentPhase) : undefined);
        const phaseI18nKey = nextPhase ? `phase.${nextPhase}.label` : '';
        entries.push({
            id: `${command.type}-${command.playerId}-${timestamp}`,
            timestamp,
            actorId: command.playerId,
            kind: command.type,
            segments: [i18nSeg('actionLog.advancePhase', { phase: phaseI18nKey }, ['phase'])],
        });
    }

    if (command.type === 'SELECT_ABILITY') {
        const abilityEvent = events.find(
            event => event.type === 'ABILITY_ACTIVATED'
        ) as AbilityActivatedEvent | undefined;
        const abilityId = abilityEvent?.payload.abilityId
            ?? (command.payload as { abilityId?: string }).abilityId;
        const playerId = abilityEvent?.payload.playerId ?? command.playerId;
        if (abilityId && playerId) {
            const rawAbilityName = findPlayerAbility(core, playerId, abilityId)?.ability.name ?? abilityId;
            const abilityNameKey = getAbilityI18nKey(rawAbilityName) || abilityId;
            const isI18nKey = abilityNameKey.includes('.');
            const actionKey = abilityEvent?.payload.isDefense
                ? 'actionLog.abilityActivatedDefense'
                : 'actionLog.abilityActivated';
            entries.push({
                id: `${command.type}-${playerId}-${timestamp}`,
                timestamp,
                actorId: playerId,
                kind: command.type,
                segments: [i18nSeg(
                    actionKey,
                    { abilityName: abilityNameKey },
                    isI18nKey ? ['abilityName'] : undefined,
                )],
            });
        }
    }

    const attackResolved = [...events].reverse().find(
        (event): event is AttackResolvedEvent => event.type === 'ATTACK_RESOLVED'
    );

    events.forEach((event, index) => {
        const entryTimestamp = typeof event.timestamp === 'number' ? event.timestamp : timestamp;

        if (event.type === 'DAMAGE_DEALT') {
            const damageEvent = event as DamageDealtEvent;
            const { targetId, amount, actualDamage, sourceAbilityId, modifiers } = damageEvent.payload;
            let actorId = targetId;
            if (attackResolved) {
                if (targetId === attackResolved.payload.defenderId) {
                    actorId = attackResolved.payload.attackerId;
                } else if (sourceAbilityId === 'retribution-reflect') {
                    actorId = attackResolved.payload.defenderId;
                }
            }
            const dealt = actualDamage ?? amount ?? 0;
            const isSelfDamage = actorId === targetId;

            // 解析来源技能名
            const effectiveSourceId = sourceAbilityId ?? attackResolved?.payload.sourceAbilityId;
            const source = resolveAbilitySourceLabel(effectiveSourceId, core, actorId);

            let segments: ReturnType<typeof i18nSeg>[];
            if (isSelfDamage) {
                if (source) {
                    segments = [i18nSeg('actionLog.damageTaken', {
                        amount: dealt, source: source.label,
                    }, source.isI18n ? ['source'] : undefined)];
                } else {
                    segments = [i18nSeg('actionLog.damageTakenPlain', { amount: dealt })];
                }
            } else {
                if (source) {
                    segments = [i18nSeg('actionLog.damageDealt', {
                        amount: dealt, targetPlayerId: targetId, source: source.label,
                    }, source.isI18n ? ['source'] : undefined)];
                } else {
                    segments = [i18nSeg('actionLog.damageDealtPlain', {
                        amount: dealt, targetPlayerId: targetId,
                    })];
                }
            }
            
            // 如果有修改器，显示详细的伤害计算过程
            if (modifiers && modifiers.length > 0 && amount !== dealt) {
                const modifierParts: string[] = [];
                modifiers.forEach(mod => {
                    const modValue = mod.value;
                    const modLabel = mod.sourceName || mod.sourceId || mod.type;
                    modifierParts.push(`${modLabel} ${modValue > 0 ? '+' : ''}${modValue}`);
                });
                segments.push(i18nSeg('actionLog.damageModifiers', {
                    original: amount,
                    modifiers: modifierParts.join(', '),
                }));
            } else if (amount !== undefined && actualDamage !== undefined && amount !== actualDamage) {
                // 兼容旧逻辑：如果没有 modifiers 但伤害不同，显示原始伤害
                segments.push(i18nSeg('actionLog.damageOriginal', { amount }));
            }
            entries.push({
                id: `DAMAGE_DEALT-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId,
                kind: 'DAMAGE_DEALT',
                segments,
            });
            return;
        }

        if (event.type === 'HEAL_APPLIED') {
            const healEvent = event as HealAppliedEvent;
            const { targetId, amount } = healEvent.payload;
            entries.push({
                id: `HEAL_APPLIED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'HEAL_APPLIED',
                segments: [i18nSeg('actionLog.healApplied', { targetPlayerId: targetId, amount })],
            });
            return;
        }

        if (event.type === 'STATUS_APPLIED') {
            const statusEvent = event as StatusAppliedEvent;
            const { targetId, statusId, stacks, newTotal } = statusEvent.payload;
            const tokenKey = getTokenI18nKey(statusId);
            const isI18nKey = tokenKey.includes('.');
            entries.push({
                id: `STATUS_APPLIED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'STATUS_APPLIED',
                segments: [
                    i18nSeg('actionLog.statusApplied', {
                        targetPlayerId: targetId,
                        statusLabel: tokenKey,
                    }, isI18nKey ? ['statusLabel'] : undefined),
                    i18nSeg('actionLog.statusAppliedDelta', { stacks, total: newTotal }),
                ],
            });
            return;
        }

        if (event.type === 'STATUS_REMOVED') {
            const statusEvent = event as StatusRemovedEvent;
            const { targetId, statusId, stacks } = statusEvent.payload;
            const tokenKey = getTokenI18nKey(statusId);
            const isI18nKey = tokenKey.includes('.');
            entries.push({
                id: `STATUS_REMOVED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'STATUS_REMOVED',
                segments: [
                    i18nSeg('actionLog.statusRemoved', {
                        targetPlayerId: targetId,
                        statusLabel: tokenKey,
                    }, isI18nKey ? ['statusLabel'] : undefined),
                    i18nSeg('actionLog.statusRemovedDelta', { stacks }),
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_GRANTED') {
            const tokenEvent = event as TokenGrantedEvent;
            const { targetId, tokenId, amount, newTotal } = tokenEvent.payload;
            const tokenKey = getTokenI18nKey(tokenId);
            const isI18nKey = tokenKey.includes('.');
            entries.push({
                id: `TOKEN_GRANTED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'TOKEN_GRANTED',
                segments: [
                    i18nSeg('actionLog.tokenGranted', {
                        targetPlayerId: targetId,
                        tokenLabel: tokenKey,
                        amount,
                    }, isI18nKey ? ['tokenLabel'] : undefined),
                    i18nSeg('actionLog.tokenTotal', { total: newTotal }),
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_CONSUMED') {
            const tokenEvent = event as TokenConsumedEvent;
            const { playerId, tokenId, amount, newTotal } = tokenEvent.payload;
            const tokenKey = getTokenI18nKey(tokenId);
            const isI18nKey = tokenKey.includes('.');
            entries.push({
                id: `TOKEN_CONSUMED-${playerId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: playerId,
                kind: 'TOKEN_CONSUMED',
                segments: [
                    i18nSeg('actionLog.tokenConsumed', { tokenLabel: tokenKey, amount }, isI18nKey ? ['tokenLabel'] : undefined),
                    i18nSeg('actionLog.tokenRemaining', { total: newTotal }),
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_USED') {
            const tokenEvent = event as TokenUsedEvent;
            const { playerId, tokenId, effectType, damageModifier, evasionRoll } = tokenEvent.payload;
            const tokenKey = getTokenI18nKey(tokenId);
            const isTokenI18n = tokenKey.includes('.');
            const effectLabelKey = `actionLog.tokenEffect.${effectType}`;
            const paramI18nKeys = ['effectLabel'];
            if (isTokenI18n) paramI18nKeys.push('tokenLabel');
            const segments = [
                i18nSeg('actionLog.tokenUsed', { tokenLabel: tokenKey, effectLabel: effectLabelKey }, paramI18nKeys),
            ];
            if (typeof damageModifier === 'number') {
                segments.push(i18nSeg('actionLog.tokenModifier', { amount: damageModifier }));
            }
            if (evasionRoll) {
                const resultKey = evasionRoll.success ? 'actionLog.tokenEvasionSuccess' : 'actionLog.tokenEvasionFail';
                segments.push(i18nSeg('actionLog.tokenEvasion', {
                    value: evasionRoll.value,
                    result: resultKey,
                }, ['result']));
            }
            entries.push({
                id: `TOKEN_USED-${playerId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: playerId,
                kind: 'TOKEN_USED',
                segments,
            });
        }
    });

    if (entries.length === 0) return null;
    return entries.length === 1 ? entries[0] : entries;
}

function findDiceThroneCard(
    core: DiceThroneCore,
    cardId: string,
    playerId?: PlayerId
): AbilityCard | undefined {
    if (playerId && core.players[playerId]) {
        const player = core.players[playerId];
        return (
            player.hand.find(card => card.id === cardId)
            ?? player.deck.find(card => card.id === cardId)
            ?? player.discard.find(card => card.id === cardId)
        );
    }

    for (const player of Object.values(core.players)) {
        const found = player.hand.find(card => card.id === cardId)
            ?? player.deck.find(card => card.id === cardId)
            ?? player.discard.find(card => card.id === cardId);
        if (found) return found;
    }

    return undefined;
}

// 创建系统集合（默认系统 + FlowSystem + DiceThrone 专用系统 + 作弊系统）
// FlowSystem 配置由 FlowHooks 提供，符合设计规范
// 注意：撤销快照保留 1 个 + 极度缩减日志（maxEntries: 20）以避免 MongoDB 16MB 限制
const systems = [
    createFlowSystem<DiceThroneCore>({ hooks: diceThroneFlowHooks }),
    createEventStreamSystem(),
    createLogSystem({ maxEntries: 20 }),  // 极度减少，不考虑回放
    createActionLogSystem({
        commandAllowlist: ACTION_LOG_ALLOWLIST,
        formatEntry: formatDiceThroneActionEntry,
    }),
    createUndoSystem({
        maxSnapshots: 3,
        // 只对白名单命令做撤回快照，避免 UI/系统行为导致“一进局就可撤回”。
        snapshotCommandAllowlist: UNDO_ALLOWLIST,
    }),
    createInteractionSystem(),
    createRematchSystem(),
    createResponseWindowSystem({
        allowedCommands: [
            'PLAY_CARD',
            'USE_TOKEN', 'SKIP_TOKEN_RESPONSE',
            'MODIFY_DIE', 'REROLL_DIE',
            'REMOVE_STATUS', 'TRANSFER_STATUS',
            'CONFIRM_INTERACTION', 'CANCEL_INTERACTION',
        ],
        responderExemptCommands: ['USE_TOKEN', 'SKIP_TOKEN_RESPONSE'],
        responseAdvanceEvents: [
            { eventType: 'CARD_PLAYED' },
        ],
        interactionLock: {
            requestEvent: 'INTERACTION_REQUESTED',
            resolveEvents: ['INTERACTION_COMPLETED', 'INTERACTION_CANCELLED'],
        },
    }),
    createTutorialSystem(),
    createDiceThroneEventSystem(),
    createCheatSystem<DiceThroneCore>(diceThroneCheatModifier),
];

// 导出系统配置供测试使用
export { systems as diceThroneSystemsForTest };

// 所有业务命令类型（系统命令由 adapter 自动合并，无需手动添加）
const COMMAND_TYPES = [
    // 骰子操作
    'ROLL_DICE',
    'TOGGLE_DIE_LOCK',
    'CONFIRM_ROLL',
    // 技能选择
    'SELECT_ABILITY',
    // 卡牌操作
    'DRAW_CARD',
    'DISCARD_CARD',
    'SELL_CARD',
    'UNDO_SELL_CARD',
    'REORDER_CARD_TO_END',
    'PLAY_CARD',
    'PLAY_UPGRADE_CARD',
    // 选择与阶段
    'RESOLVE_CHOICE',
    // 卡牌交互（骰子修改、状态移除/转移）
    'MODIFY_DIE',
    'REROLL_DIE',
    'REMOVE_STATUS',
    'TRANSFER_STATUS',
    'CONFIRM_INTERACTION',
    'CANCEL_INTERACTION',
    // 选角相关
    'SELECT_CHARACTER',
    'HOST_START_GAME',
    'PLAYER_READY',
    // Token 响应系统
    'USE_TOKEN',
    'SKIP_TOKEN_RESPONSE',
    'USE_PURIFY',
    // 击倒移除
    DICETHRONE_COMMANDS.PAY_TO_REMOVE_KNOCKDOWN,
    // 奖励骰重掷
    'REROLL_BONUS_DIE',
    'SKIP_BONUS_DICE_REROLL',
];

// 使用适配器创建 Boardgame.io Game
export const DiceThroneGame = createGameAdapter({
    domain: DiceThroneDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 2, // 固定 2 人游戏
    commandTypes: COMMAND_TYPES,
});

export default DiceThroneGame;

// 导出 ActionLog 格式化函数供测试
export { formatDiceThroneActionEntry };

// 注册卡牌预览获取函数
import { registerCardPreviewGetter } from '../../components/game/registry/cardPreviewRegistry';
import { getDiceThroneCardPreviewRef } from './ui/cardPreviewHelper';
registerCardPreviewGetter('dicethrone', getDiceThroneCardPreviewRef);

// 注册关键图片解析器
import { registerCriticalImageResolver } from '../../core';
import { diceThroneCriticalImageResolver } from './criticalImageResolver';
registerCriticalImageResolver('dicethrone', diceThroneCriticalImageResolver);

// 导出类型（兼容）
export type { DiceThroneCore } from './domain';
