/**
 * SmashUp - ActionLog 格式化
 */

import type {
    ActionLogEntry,
    ActionLogSegment,
    Command,
    GameEvent,
    MatchState,
    PlayerId,
} from '../../engine/types';
import { FLOW_COMMANDS } from '../../engine';
import { FLOW_EVENTS } from '../../engine/systems/FlowSystem';
import { SU_COMMANDS, SU_EVENTS } from './domain';
import type { SmashUpCore } from './domain/types';
import { getSmashUpCardPreviewMeta } from './ui/cardPreviewHelper';
import i18n from '../../lib/i18n';

// ============================================================================
// ActionLog 共享白名单
// ============================================================================

export const ACTION_ALLOWLIST = [
    SU_COMMANDS.PLAY_MINION,
    SU_COMMANDS.PLAY_ACTION,
    SU_COMMANDS.USE_TALENT,
    SU_COMMANDS.DISCARD_TO_LIMIT,
    FLOW_COMMANDS.ADVANCE_PHASE,
] as const;

const textSegment = (text: string): ActionLogSegment => ({ type: 'text', text });

// ============================================================================
// ActionLog 格式化
// ============================================================================

export function formatSmashUpActionEntry({
    command,
    state: _state,
    events,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | ActionLogEntry[] | null {
    const state = _state as MatchState<SmashUpCore>;
    const { core } = state;
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;
    const actorId = command.playerId;
    const entries: ActionLogEntry[] = [];
    const t = (key: string, params?: Record<string, string | number>) => (
        i18n.t(`game-smashup:${key}`, params)
    );
    const formatPhaseLabel = (phase?: string) => {
        if (!phase) return '';
        return i18n.t(`game-smashup:phases.${phase}`, { defaultValue: phase });
    };
    const formatPlayerLabel = (playerId: PlayerId) => (
        t('actionLog.playerLabel', { playerId })
    );
    const formatLimitType = (limitType: 'minion' | 'action') => (
        t(`actionLog.limitType.${limitType}`)
    );
    const buildCardSegment = (cardId?: string): ActionLogSegment | null => {
        if (!cardId) return null;
        const meta = getSmashUpCardPreviewMeta(cardId);
        if (meta?.previewRef) {
            return { type: 'card', cardId, previewText: meta.name };
        }
        if (meta?.name) {
            return { type: 'text', text: meta.name };
        }
        return { type: 'text', text: cardId };
    };
    const withCardSegments = (prefix: string, cardId?: string): ActionLogSegment[] => {
        const segments: ActionLogSegment[] = [textSegment(prefix)];
        const cardSeg = buildCardSegment(cardId);
        if (cardSeg) segments.push(cardSeg);
        return segments;
    };
    const getBaseDefId = (baseIndex?: number) => (
        baseIndex === undefined ? undefined : core.bases?.[baseIndex]?.defId
    );
    const formatBaseLabel = (baseDefId?: string, baseIndex?: number) => {
        if (baseDefId) {
            const meta = getSmashUpCardPreviewMeta(baseDefId);
            if (meta?.name) return meta.name;
        }
        if (baseIndex !== undefined) {
            return t('actionLog.baseIndex', { index: baseIndex + 1 });
        }
        return t('actionLog.baseUnknown');
    };
    const pushEntry = (
        kind: string,
        segments: ActionLogSegment[],
        entryActorId: PlayerId = actorId,
        entryTimestamp: number = timestamp,
        index = entries.length
    ) => {
        entries.push({
            id: `${kind}-${entryActorId}-${entryTimestamp}-${index}`,
            timestamp: entryTimestamp,
            actorId: entryActorId,
            kind,
            segments,
        });
    };

    const commandEntry = (() => {
        switch (command.type) {
            case SU_COMMANDS.PLAY_MINION: {
                const payload = command.payload as { cardUid?: string; baseIndex?: number };
                const minionEvent = [...events].reverse().find(
                    e => e.type === SU_EVENTS.MINION_PLAYED
                ) as { payload?: { defId?: string; baseIndex?: number } } | undefined;
                const defId = minionEvent?.payload?.defId ?? payload?.cardUid;
                const baseDefId = minionEvent?.payload?.baseIndex !== undefined
                    ? getBaseDefId(minionEvent.payload.baseIndex)
                    : getBaseDefId(payload.baseIndex);
                const baseLabel = formatBaseLabel(baseDefId, minionEvent?.payload?.baseIndex ?? payload.baseIndex);
                const segments = withCardSegments(t('actionLog.playMinion'), defId);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                return { id: `${command.type}-${actorId}-${timestamp}`, timestamp, actorId, kind: command.type, segments };
            }
            case SU_COMMANDS.PLAY_ACTION: {
                const actionEvent = [...events].reverse().find(
                    e => e.type === SU_EVENTS.ACTION_PLAYED
                ) as { payload?: { defId?: string } } | undefined;
                const defId = actionEvent?.payload?.defId ?? (command.payload as { cardUid?: string })?.cardUid;
                return {
                    id: `${command.type}-${actorId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: withCardSegments(t('actionLog.playAction'), defId),
                };
            }
            case SU_COMMANDS.USE_TALENT: {
                const talentEvent = [...events].reverse().find(
                    e => e.type === SU_EVENTS.TALENT_USED
                ) as { payload?: { defId?: string } } | undefined;
                const defId = talentEvent?.payload?.defId ?? (command.payload as { minionUid?: string })?.minionUid;
                return {
                    id: `${command.type}-${actorId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: withCardSegments(t('actionLog.useTalent'), defId),
                };
            }
            case SU_COMMANDS.DISCARD_TO_LIMIT: {
                const payload = command.payload as { cardUids?: string[] };
                const count = payload?.cardUids?.length ?? 0;
                return {
                    id: `${command.type}-${actorId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [textSegment(t('actionLog.discardToLimit', { count }))],
                };
            }
            case FLOW_COMMANDS.ADVANCE_PHASE: {
                const phaseEvent = [...events].reverse().find(
                    e => e.type === FLOW_EVENTS.PHASE_CHANGED
                ) as { payload?: { to?: string } } | undefined;
                const phaseLabel = phaseEvent?.payload?.to
                    ? formatPhaseLabel(phaseEvent.payload.to)
                    : '';
                return {
                    id: `${command.type}-${actorId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [textSegment(t('actionLog.advancePhase', { phase: phaseLabel }))],
                };
            }
            default:
                return null;
        }
    })();

    if (commandEntry) {
        entries.push(commandEntry);
    }

    events.forEach((event, index) => {
        const entryTimestamp = typeof event.timestamp === 'number' ? event.timestamp : timestamp;
        switch (event.type) {
            case SU_EVENTS.MINION_PLAYED: {
                const payload = event.payload as { defId: string; baseIndex: number };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.baseIndex), payload.baseIndex);
                const segments = withCardSegments(t('actionLog.minionPlayed'), payload.defId);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.ACTION_PLAYED: {
                const payload = event.payload as { defId: string };
                pushEntry(event.type, withCardSegments(t('actionLog.actionPlayed'), payload.defId), actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.MINION_DESTROYED: {
                const payload = event.payload as { minionDefId: string; fromBaseIndex: number };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.fromBaseIndex), payload.fromBaseIndex);
                const segments = withCardSegments(t('actionLog.minionDestroyed'), payload.minionDefId);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.MINION_MOVED: {
                const payload = event.payload as { minionDefId: string; fromBaseIndex: number; toBaseIndex: number };
                const fromLabel = formatBaseLabel(getBaseDefId(payload.fromBaseIndex), payload.fromBaseIndex);
                const toLabel = formatBaseLabel(getBaseDefId(payload.toBaseIndex), payload.toBaseIndex);
                const segments = withCardSegments(t('actionLog.minionMoved'), payload.minionDefId);
                segments.push(textSegment(t('actionLog.fromTo', { from: fromLabel, to: toLabel })));
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.MINION_RETURNED: {
                const payload = event.payload as { minionDefId: string; fromBaseIndex: number; toPlayerId: PlayerId };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.fromBaseIndex), payload.fromBaseIndex);
                const segments = withCardSegments(t('actionLog.minionReturned', { player: formatPlayerLabel(payload.toPlayerId) }), payload.minionDefId);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, payload.toPlayerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.POWER_COUNTER_ADDED: {
                const payload = event.payload as { minionUid: string; amount: number; baseIndex: number };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.baseIndex), payload.baseIndex);
                const segments = withCardSegments(t('actionLog.powerCounterAdded', { amount: payload.amount }), payload.minionUid);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.POWER_COUNTER_REMOVED: {
                const payload = event.payload as { minionUid: string; amount: number; baseIndex: number };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.baseIndex), payload.baseIndex);
                const segments = withCardSegments(t('actionLog.powerCounterRemoved', { amount: payload.amount }), payload.minionUid);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.ONGOING_ATTACHED: {
                const payload = event.payload as { defId: string; targetType: 'base' | 'minion'; targetBaseIndex: number; targetMinionUid?: string };
                const segments = withCardSegments(t('actionLog.ongoingAttached'), payload.defId);
                if (payload.targetType === 'base') {
                    const baseLabel = formatBaseLabel(getBaseDefId(payload.targetBaseIndex), payload.targetBaseIndex);
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                } else if (payload.targetMinionUid) {
                    segments.push(textSegment(' → '));
                    const targetSegment = buildCardSegment(payload.targetMinionUid);
                    if (targetSegment) segments.push(targetSegment);
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.ONGOING_DETACHED: {
                const payload = event.payload as { defId: string; reason?: string };
                const segments = withCardSegments(t('actionLog.ongoingDetached'), payload.defId);
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.TALENT_USED: {
                const payload = event.payload as { defId: string; baseIndex: number };
                const baseLabel = formatBaseLabel(getBaseDefId(payload.baseIndex), payload.baseIndex);
                const segments = withCardSegments(t('actionLog.talentUsed'), payload.defId);
                if (baseLabel) {
                    segments.push(textSegment(t('actionLog.onBase', { base: baseLabel })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.BASE_SCORED: {
                const payload = event.payload as { baseDefId: string; rankings: { playerId: PlayerId; vp: number }[] };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.baseScored'))];
                const baseSegment = buildCardSegment(payload.baseDefId);
                if (baseSegment) segments.push(baseSegment);
                payload.rankings.forEach((ranking) => {
                    segments.push(textSegment(' '));
                    segments.push(textSegment(t('actionLog.baseScoredRanking', {
                        player: formatPlayerLabel(ranking.playerId),
                        vp: ranking.vp,
                    })));
                });
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.VP_AWARDED: {
                const payload = event.payload as { playerId: PlayerId; amount: number; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.vpAwarded', {
                    player: formatPlayerLabel(payload.playerId),
                    amount: payload.amount,
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARDS_DRAWN: {
                const payload = event.payload as { playerId: PlayerId; count: number };
                pushEntry(event.type, [textSegment(t('actionLog.cardsDrawn', {
                    player: formatPlayerLabel(payload.playerId),
                    count: payload.count,
                }))], payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARDS_DISCARDED: {
                const payload = event.payload as { playerId: PlayerId; cardUids: string[] };
                pushEntry(event.type, [textSegment(t('actionLog.cardsDiscarded', {
                    player: formatPlayerLabel(payload.playerId),
                    count: payload.cardUids?.length ?? 0,
                }))], payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.TURN_STARTED: {
                const payload = event.payload as { playerId: PlayerId };
                pushEntry(event.type, [textSegment(t('actionLog.turnStarted', {
                    player: formatPlayerLabel(payload.playerId),
                }))], payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.TURN_ENDED: {
                const payload = event.payload as { playerId: PlayerId };
                pushEntry(event.type, [textSegment(t('actionLog.turnEnded', {
                    player: formatPlayerLabel(payload.playerId),
                }))], payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.BASE_REPLACED: {
                const payload = event.payload as { oldBaseDefId: string; newBaseDefId: string; keepCards?: boolean };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.baseReplaced'))];
                const oldSeg = buildCardSegment(payload.oldBaseDefId);
                const newSeg = buildCardSegment(payload.newBaseDefId);
                if (oldSeg) segments.push(oldSeg);
                segments.push(textSegment(' → '));
                if (newSeg) segments.push(newSeg);
                if (payload.keepCards) {
                    segments.push(textSegment(t('actionLog.baseReplacedKeep')));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.DECK_RESHUFFLED: {
                const payload = event.payload as { playerId: PlayerId };
                pushEntry(event.type, [textSegment(t('actionLog.deckReshuffled', {
                    player: formatPlayerLabel(payload.playerId),
                }))], payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.LIMIT_MODIFIED: {
                const payload = event.payload as { playerId: PlayerId; limitType: 'minion' | 'action'; delta: number; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.limitModified', {
                    player: formatPlayerLabel(payload.playerId),
                    limitType: formatLimitType(payload.limitType),
                    delta: payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`,
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARD_TO_DECK_TOP: {
                const payload = event.payload as { ownerId: PlayerId; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.cardToDeckTop', {
                    player: formatPlayerLabel(payload.ownerId),
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.ownerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARD_TO_DECK_BOTTOM: {
                const payload = event.payload as { ownerId: PlayerId; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.cardToDeckBottom', {
                    player: formatPlayerLabel(payload.ownerId),
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.ownerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARD_TRANSFERRED: {
                const payload = event.payload as { fromPlayerId: PlayerId; toPlayerId: PlayerId; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.cardTransferred', {
                    from: formatPlayerLabel(payload.fromPlayerId),
                    to: formatPlayerLabel(payload.toPlayerId),
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.toPlayerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.CARD_RECOVERED_FROM_DISCARD: {
                const payload = event.payload as { playerId: PlayerId; cardUids: string[]; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.cardRecovered', {
                    player: formatPlayerLabel(payload.playerId),
                    count: payload.cardUids?.length ?? 0,
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.HAND_SHUFFLED_INTO_DECK: {
                const payload = event.payload as { playerId: PlayerId; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.handShuffledIntoDeck', {
                    player: formatPlayerLabel(payload.playerId),
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.MADNESS_DRAWN: {
                const payload = event.payload as { playerId: PlayerId; count: number; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.madnessDrawn', {
                    player: formatPlayerLabel(payload.playerId),
                    count: payload.count,
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.MADNESS_RETURNED: {
                const payload = event.payload as { playerId: PlayerId; reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.madnessReturned', {
                    player: formatPlayerLabel(payload.playerId),
                }))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                break;
            }
            case SU_EVENTS.BASE_DECK_REORDERED: {
                const payload = event.payload as { reason?: string };
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.baseDeckReordered'))];
                if (payload.reason) {
                    segments.push(textSegment(t('actionLog.reasonSuffix', { reason: payload.reason })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            default:
                break;
        }
    });

    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0];
    return entries;
}
