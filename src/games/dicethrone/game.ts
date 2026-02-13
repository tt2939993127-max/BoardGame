/**
 * DiceThrone 游戏定义（新引擎架构）
 * 
 * 使用领域内核 + 引擎适配器
 */

import type { ActionLogEntry, Command, GameEvent, MatchState, PlayerId } from '../../engine/types';
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
import i18n from '../../lib/i18n';

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
    const t = (key: string, params?: Record<string, string | number>) => (
        i18n.t(`game-dicethrone:${key}`, params)
    );
    const formatI18nText = (value?: string) => {
        if (!value) return '';
        if (!value.includes('.')) return value;
        return i18n.t(`game-dicethrone:${value}`);
    };
    const formatTokenLabel = (tokenId: string) => {
        const def = tokenDefinitions.find(item => item.id === tokenId);
        if (!def) return tokenId;
        return formatI18nText(def.name) || tokenId;
    };
    const formatPlayerLabel = (playerId: PlayerId) => t('actionLog.playerLabel', { playerId });
    const formatAbilityLabel = (value?: string) => formatI18nText(value) || value || '';

    if (command.type === 'PLAY_CARD' || command.type === 'PLAY_UPGRADE_CARD') {
        const cardId = (command.payload as { cardId: string }).cardId;
        const card = findDiceThroneCard(core, cardId, command.playerId);
        if (!card || !card.previewRef) return null;

        const actionText = command.type === 'PLAY_UPGRADE_CARD'
            ? t('actionLog.playUpgradeCard')
            : t('actionLog.playCard');

        entries.push({
            id: `${command.type}-${command.playerId}-${timestamp}`,
            timestamp,
            actorId: command.playerId,
            kind: command.type,
            segments: [
                { type: 'text', text: actionText },
                {
                    type: 'card',
                    cardId: card.id,
                    previewText: formatI18nText(card.name),
                },
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
        const phaseLabel = nextPhase
            ? t('actionLog.advancePhase', {
                phase: i18n.t(`game-dicethrone:phase.${nextPhase}.label`, { defaultValue: nextPhase }),
            })
            : t('actionLog.advancePhase', { phase: '' });
        entries.push({
            id: `${command.type}-${command.playerId}-${timestamp}`,
            timestamp,
            actorId: command.playerId,
            kind: command.type,
            segments: [{ type: 'text', text: phaseLabel }],
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
            const abilityName = formatAbilityLabel(rawAbilityName) || abilityId;
            const abilityText = abilityEvent?.payload.isDefense
                ? t('actionLog.abilityActivatedDefense', { abilityName })
                : t('actionLog.abilityActivated', { abilityName });
            entries.push({
                id: `${command.type}-${playerId}-${timestamp}`,
                timestamp,
                actorId: playerId,
                kind: command.type,
                segments: [{ type: 'text', text: abilityText }],
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
            const { targetId, amount, actualDamage, sourceAbilityId } = damageEvent.payload;
            let actorId = targetId;
            if (attackResolved) {
                if (targetId === attackResolved.payload.defenderId) {
                    actorId = attackResolved.payload.attackerId;
                } else if (sourceAbilityId === 'retribution-reflect') {
                    actorId = attackResolved.payload.defenderId;
                }
            }
            const dealt = actualDamage ?? amount ?? 0;
            const segments = [
                { type: 'text' as const, text: actorId === targetId
                    ? t('actionLog.damageTaken', { amount: dealt })
                    : t('actionLog.damageDealt', { amount: dealt })
                },
            ];
            if (amount !== undefined && actualDamage !== undefined && amount !== actualDamage) {
                segments.push({ type: 'text' as const, text: t('actionLog.damageOriginal', { amount }) });
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
                segments: [{
                    type: 'text' as const,
                    text: t('actionLog.healApplied', { targetLabel: formatPlayerLabel(targetId), amount }),
                }],
            });
            return;
        }

        if (event.type === 'STATUS_APPLIED') {
            const statusEvent = event as StatusAppliedEvent;
            const { targetId, statusId, stacks, newTotal } = statusEvent.payload;
            const statusLabel = formatTokenLabel(statusId);
            entries.push({
                id: `STATUS_APPLIED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'STATUS_APPLIED',
                segments: [
                    { type: 'text' as const, text: t('actionLog.statusApplied', {
                        targetLabel: formatPlayerLabel(targetId),
                        statusLabel,
                    }) },
                    { type: 'text' as const, text: t('actionLog.statusAppliedDelta', { stacks, total: newTotal }) },
                ],
            });
            return;
        }

        if (event.type === 'STATUS_REMOVED') {
            const statusEvent = event as StatusRemovedEvent;
            const { targetId, statusId, stacks } = statusEvent.payload;
            const statusLabel = formatTokenLabel(statusId);
            entries.push({
                id: `STATUS_REMOVED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'STATUS_REMOVED',
                segments: [
                    { type: 'text' as const, text: t('actionLog.statusRemoved', {
                        targetLabel: formatPlayerLabel(targetId),
                        statusLabel,
                    }) },
                    { type: 'text' as const, text: t('actionLog.statusRemovedDelta', { stacks }) },
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_GRANTED') {
            const tokenEvent = event as TokenGrantedEvent;
            const { targetId, tokenId, amount, newTotal } = tokenEvent.payload;
            const tokenLabel = formatTokenLabel(tokenId);
            entries.push({
                id: `TOKEN_GRANTED-${targetId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: command.playerId,
                kind: 'TOKEN_GRANTED',
                segments: [
                    { type: 'text' as const, text: t('actionLog.tokenGranted', {
                        targetLabel: formatPlayerLabel(targetId),
                        tokenLabel,
                        amount,
                    }) },
                    { type: 'text' as const, text: t('actionLog.tokenTotal', { total: newTotal }) },
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_CONSUMED') {
            const tokenEvent = event as TokenConsumedEvent;
            const { playerId, tokenId, amount, newTotal } = tokenEvent.payload;
            const tokenLabel = formatTokenLabel(tokenId);
            entries.push({
                id: `TOKEN_CONSUMED-${playerId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: playerId,
                kind: 'TOKEN_CONSUMED',
                segments: [
                    { type: 'text' as const, text: t('actionLog.tokenConsumed', { tokenLabel, amount }) },
                    { type: 'text' as const, text: t('actionLog.tokenRemaining', { total: newTotal }) },
                ],
            });
            return;
        }

        if (event.type === 'TOKEN_USED') {
            const tokenEvent = event as TokenUsedEvent;
            const { playerId, tokenId, effectType, damageModifier, evasionRoll } = tokenEvent.payload;
            const tokenLabel = formatTokenLabel(tokenId);
            const effectLabel = effectType === 'damageBoost'
                ? t('actionLog.tokenEffect.damageBoost')
                : effectType === 'damageReduction'
                    ? t('actionLog.tokenEffect.damageReduction')
                    : effectType === 'evasionAttempt'
                        ? t('actionLog.tokenEffect.evasionAttempt')
                        : t('actionLog.tokenEffect.removeDebuff');
            const segments: Array<{ type: 'text'; text: string }> = [
                { type: 'text', text: t('actionLog.tokenUsed', { tokenLabel, effectLabel }) },
            ];
            if (typeof damageModifier === 'number') {
                segments.push({ type: 'text', text: t('actionLog.tokenModifier', { amount: damageModifier }) });
            }
            if (evasionRoll) {
                segments.push({
                    type: 'text',
                    text: t('actionLog.tokenEvasion', {
                        value: evasionRoll.value,
                        result: evasionRoll.success
                            ? t('actionLog.tokenEvasionSuccess')
                            : t('actionLog.tokenEvasionFail'),
                    }),
                });
            }
            entries.push({
                id: `TOKEN_USED-${playerId}-${entryTimestamp}-${index}`,
                timestamp: entryTimestamp,
                actorId: playerId,
                kind: 'TOKEN_USED',
                segments: segments.map(segment => ({ ...segment, type: 'text' as const })),
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
