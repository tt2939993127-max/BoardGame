/**
 * SummonerWars - ActionLog 格式化
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
import { SW_COMMANDS, SW_EVENTS } from './domain';
import type { SummonerWarsCore } from './domain/types';
import { abilityRegistry } from './domain/abilities';
import { getSummonerWarsCardPreviewMeta } from './ui/cardPreviewHelper';
import i18n from '../../lib/i18n';

// ============================================================================
// ActionLog 共享白名单
// ============================================================================

export const ACTION_ALLOWLIST = [
    SW_COMMANDS.SUMMON_UNIT,
    SW_COMMANDS.MOVE_UNIT,
    SW_COMMANDS.BUILD_STRUCTURE,
    SW_COMMANDS.DECLARE_ATTACK,
    SW_COMMANDS.DISCARD_FOR_MAGIC,
    SW_COMMANDS.END_PHASE,
    SW_COMMANDS.PLAY_EVENT,
    SW_COMMANDS.BLOOD_SUMMON_STEP,
    SW_COMMANDS.ACTIVATE_ABILITY,
    SW_COMMANDS.FUNERAL_PYRE_HEAL,
    FLOW_COMMANDS.ADVANCE_PHASE,
] as const;

const textSegment = (text: string): ActionLogSegment => ({ type: 'text', text });

// ============================================================================
// ActionLog 格式化
// ============================================================================

export function formatSummonerWarsActionEntry({
    command,
    state: _state,
    events,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | ActionLogEntry[] | null {
    const state = _state as MatchState<SummonerWarsCore>;
    const { core } = state;
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;
    const actorId = command.playerId;
    const entries: ActionLogEntry[] = [];
    const t = (key: string, params?: Record<string, string | number>) => (
        i18n.t(`game-summonerwars:${key}`, params)
    );
    const formatCell = (cell?: { row: number; col: number }) => {
        if (!cell) return t('actionLog.positionUnknown');
        return t('actionLog.position', { row: cell.row + 1, col: cell.col + 1 });
    };
    const formatDelta = (delta: number) => (delta >= 0 ? `+${delta}` : `${delta}`);
    const formatAbilityName = (abilityId?: string) => (
        abilityId ? (abilityRegistry.get(abilityId)?.name ?? abilityId) : ''
    );
    const formatPlayerLabel = (playerId: PlayerId) => (
        t('actionLog.playerLabel', { playerId })
    );
    const buildCardSegment = (cardId?: string): ActionLogSegment | null => {
        if (!cardId) return null;
        const meta = getSummonerWarsCardPreviewMeta(cardId);
        if (meta?.previewRef) {
            return {
                type: 'card',
                cardId,
                previewText: meta.name,
            };
        }
        if (meta?.name) {
            return { type: 'text', text: meta.name };
        }
        return { type: 'text', text: cardId };
    };
    const withCardSegments = (prefix: string, cardId?: string): ActionLogSegment[] => {
        const segments: ActionLogSegment[] = [];
        segments.push(textSegment(prefix));
        const cardSegment = buildCardSegment(cardId);
        if (cardSegment) segments.push(cardSegment);
        return segments;
    };
    const formatPhaseLabel = (phase?: string) => {
        if (!phase) return '';
        return i18n.t(`game-summonerwars:phase.${phase}`, { defaultValue: phase });
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
    const buildPositionKey = (pos?: { row: number; col: number }) => (pos ? `${pos.row},${pos.col}` : '');
    const destroyedUnitByPosition = new Map<string, string>();
    const destroyedStructureByPosition = new Map<string, string>();
    events.forEach((event) => {
        if (event.type === SW_EVENTS.UNIT_DESTROYED) {
            const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
            const key = buildPositionKey(payload.position);
            if (key && payload.cardId) destroyedUnitByPosition.set(key, payload.cardId);
        }
        if (event.type === SW_EVENTS.STRUCTURE_DESTROYED) {
            const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
            const key = buildPositionKey(payload.position);
            if (key && payload.cardId) destroyedStructureByPosition.set(key, payload.cardId);
        }
    });
    const resolveUnitCardId = (pos?: { row: number; col: number }, fallbackId?: string) => {
        if (fallbackId) return fallbackId;
        if (!pos) return undefined;
        const fromBoard = core.board?.[pos.row]?.[pos.col]?.unit?.cardId;
        if (fromBoard) return fromBoard;
        return destroyedUnitByPosition.get(buildPositionKey(pos));
    };
    const resolveStructureCardId = (pos?: { row: number; col: number }, fallbackId?: string) => {
        if (fallbackId) return fallbackId;
        if (!pos) return undefined;
        const fromBoard = core.board?.[pos.row]?.[pos.col]?.structure?.cardId;
        if (fromBoard) return fromBoard;
        return destroyedStructureByPosition.get(buildPositionKey(pos));
    };

    const commandEntry = (() => {
        switch (command.type) {
            case SW_COMMANDS.SUMMON_UNIT: {
                const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
                const positionLabel = formatCell(payload.position);
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.summonUnit'), payload.cardId),
                        textSegment(` → ${positionLabel}`),
                    ],
                };
            }
            case SW_COMMANDS.MOVE_UNIT: {
                const payload = command.payload as { from?: { row: number; col: number }; to?: { row: number; col: number } };
                const fromLabel = formatCell(payload.from);
                const toLabel = formatCell(payload.to);
                const moveEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.UNIT_MOVED) as
                    | { payload?: { unitId?: string } }
                    | undefined;
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.moveUnit'), moveEvent?.payload?.unitId),
                        textSegment(` ${fromLabel} → ${toLabel}`),
                    ],
                };
            }
            case SW_COMMANDS.DECLARE_ATTACK: {
                const attackEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.UNIT_ATTACKED) as
                    | { payload?: { hits?: number; target?: { row: number; col: number }; attackerId?: string } }
                    | undefined;
                const hits = attackEvent?.payload?.hits;
                const targetLabel = formatCell(attackEvent?.payload?.target);
                const detail = hits === undefined
                    ? t('actionLog.attackDeclared')
                    : t('actionLog.attackHits', { hits });
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.attackUnit'), attackEvent?.payload?.attackerId),
                        textSegment(` → ${targetLabel} ${detail}`),
                    ],
                };
            }
            case SW_COMMANDS.BUILD_STRUCTURE: {
                const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
                const positionLabel = formatCell(payload.position);
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.buildStructure'), payload.cardId),
                        textSegment(` → ${positionLabel}`),
                    ],
                };
            }
            case SW_COMMANDS.END_PHASE: {
                const phaseEvent = [...events].reverse().find((event) => event.type === SW_EVENTS.PHASE_CHANGED) as
                    | { payload?: { to?: string } }
                    | undefined;
                const phaseSuffix = phaseEvent?.payload?.to
                    ? `：${formatPhaseLabel(phaseEvent.payload.to)}`
                    : '';
                const phaseLabel = t('actionLog.endPhase', { phase: phaseSuffix });
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [textSegment(phaseLabel)],
                };
            }
            case FLOW_COMMANDS.ADVANCE_PHASE: {
                const phaseEvent = [...events].reverse().find((event) => event.type === FLOW_EVENTS.PHASE_CHANGED) as
                    | { payload?: { to?: string } }
                    | undefined;
                const phaseLabel = phaseEvent?.payload?.to
                    ? formatPhaseLabel(phaseEvent.payload.to)
                    : '';
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [textSegment(t('actionLog.advancePhase', { phase: phaseLabel }))],
                };
            }
            case SW_COMMANDS.DISCARD_FOR_MAGIC: {
                const payload = command.payload as { cardIds?: string[] };
                const cardIds = payload.cardIds ?? [];
                const segments: ActionLogSegment[] = [];
                segments.push(textSegment(t('actionLog.discardForMagic')));
                if (cardIds.length === 0) {
                    segments.push(textSegment(t('actionLog.none')));
                } else {
                    cardIds.forEach((cardId, index) => {
                        const cardSegment = buildCardSegment(cardId);
                        if (cardSegment) {
                            segments.push(cardSegment);
                        }
                        if (index < cardIds.length - 1) {
                            segments.push(textSegment(t('actionLog.cardSeparator')));
                        }
                    });
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments,
                };
            }
            case SW_COMMANDS.PLAY_EVENT: {
                const payload = command.payload as { cardId?: string };
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.playEvent'), payload.cardId),
                    ],
                };
            }
            case SW_COMMANDS.BLOOD_SUMMON_STEP: {
                const payload = command.payload as { summonCardId?: string; summonPosition?: { row: number; col: number } };
                const positionLabel = formatCell(payload.summonPosition);
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments: [
                        ...withCardSegments(t('actionLog.bloodSummon'), payload.summonCardId),
                        textSegment(` → ${positionLabel}`),
                    ],
                };
            }
            case SW_COMMANDS.FUNERAL_PYRE_HEAL: {
                const payload = command.payload as { cardId?: string; targetPosition?: { row: number; col: number }; skip?: boolean };
                const positionLabel = payload.targetPosition ? formatCell(payload.targetPosition) : '';
                const actionText = payload.skip ? t('actionLog.funeralPyreSkip') : t('actionLog.funeralPyreHeal');
                const segments: ActionLogSegment[] = [...withCardSegments(actionText, payload.cardId)];
                if (payload.targetPosition) {
                    segments.push(textSegment(` → ${positionLabel}`));
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments,
                };
            }
            case SW_COMMANDS.ACTIVATE_ABILITY: {
                const payload = command.payload as {
                    abilityId: string;
                    sourceUnitId?: string;
                    targetCardId?: string;
                    targetUnitId?: string;
                    targetPosition?: { row: number; col: number };
                };
                const abilityName = formatAbilityName(payload.abilityId) || payload.abilityId;
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.activateAbility', { abilityName }))];

                if (payload.sourceUnitId) {
                    segments.push(textSegment(t('actionLog.activateAbilitySource')));
                    const sourceSegment = buildCardSegment(payload.sourceUnitId);
                    if (sourceSegment) segments.push(sourceSegment);
                }

                if (payload.targetCardId || payload.targetUnitId) {
                    segments.push(textSegment(t('actionLog.activateAbilityTarget')));
                    const targetSegment = buildCardSegment(payload.targetCardId ?? payload.targetUnitId);
                    if (targetSegment) segments.push(targetSegment);
                } else if (payload.targetPosition) {
                    segments.push(textSegment(
                        t('actionLog.activateAbilityTargetPosition', { position: formatCell(payload.targetPosition) })
                    ));
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp,
                    actorId,
                    kind: command.type,
                    segments,
                };
            }
            default: {
                return null;
            }
        }
    })();

    if (commandEntry) {
        entries.push(commandEntry);
    }

    events.forEach((event, index) => {
        const entryTimestamp = typeof event.timestamp === 'number' ? event.timestamp : timestamp;
        switch (event.type) {
            case SW_EVENTS.UNIT_SUMMONED: {
                const payload = event.payload as { cardId?: string; position?: { row: number; col: number }; fromDiscard?: boolean };
                const positionLabel = formatCell(payload.position);
                const segments = [
                    ...withCardSegments(t('actionLog.unitSummoned'), payload.cardId),
                    textSegment(` → ${positionLabel}`),
                ];
                if (payload.fromDiscard) {
                    segments.push(textSegment(t('actionLog.unitSummonedFromDiscard')));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_MOVED: {
                const payload = event.payload as { from?: { row: number; col: number }; to?: { row: number; col: number }; unitId?: string };
                const cardId = resolveUnitCardId(payload.from ?? payload.to, payload.unitId);
                const fromLabel = formatCell(payload.from);
                const toLabel = formatCell(payload.to);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.unitMoved'), cardId),
                    textSegment(` ${fromLabel} → ${toLabel}`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_DAMAGED: {
                const payload = event.payload as { position?: { row: number; col: number }; damage: number; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.unitDamaged', { amount: payload.damage }), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_HEALED: {
                const payload = event.payload as { position?: { row: number; col: number }; amount: number; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.unitHealed', { amount: payload.amount }), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_DESTROYED: {
                const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.unitDestroyed'), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_CHARGED: {
                const payload = event.payload as { position?: { row: number; col: number }; delta?: number; newValue?: number; sourceAbilityId?: string };
                const cardId = resolveUnitCardId(payload.position);
                const segments = [
                    ...withCardSegments(t('actionLog.unitCharged', { amount: formatDelta(payload.delta ?? 0) }), cardId),
                ];
                if (payload.newValue !== undefined) {
                    segments.push(textSegment(t('actionLog.unitChargeTotal', { total: payload.newValue })));
                }
                if (payload.sourceAbilityId) {
                    segments.push(textSegment(t('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) })));
                }
                if (payload.position) {
                    segments.push(textSegment(` (${formatCell(payload.position)})`));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_BUILT: {
                const payload = event.payload as { cardId?: string; position?: { row: number; col: number } };
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.structureBuilt'), payload.cardId),
                    textSegment(` → ${positionLabel}`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_DAMAGED: {
                const payload = event.payload as { position?: { row: number; col: number }; damage: number; cardId?: string };
                const cardId = resolveStructureCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.structureDamaged', { amount: payload.damage }), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_HEALED: {
                const payload = event.payload as { position?: { row: number; col: number }; amount: number; cardId?: string };
                const cardId = resolveStructureCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.structureHealed', { amount: payload.amount }), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_DESTROYED: {
                const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
                const cardId = resolveStructureCardId(payload.position, payload.cardId);
                const positionLabel = formatCell(payload.position);
                pushEntry(event.type, [
                    ...withCardSegments(t('actionLog.structureDestroyed'), cardId),
                    textSegment(` (${positionLabel})`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.MAGIC_CHANGED: {
                const payload = event.payload as { playerId?: PlayerId; delta?: number };
                if (payload.delta !== undefined && payload.playerId) {
                    pushEntry(event.type, [textSegment(t('actionLog.magicChanged', {
                        player: formatPlayerLabel(payload.playerId),
                        delta: formatDelta(payload.delta),
                    }))], payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.CARD_DRAWN: {
                const payload = event.payload as { playerId?: PlayerId; count?: number };
                if (payload.playerId && payload.count) {
                    pushEntry(event.type, [textSegment(t('actionLog.cardDrawn', {
                        player: formatPlayerLabel(payload.playerId),
                        count: payload.count,
                    }))], payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.CARD_DISCARDED: {
                const payload = event.payload as { playerId?: PlayerId; cardId?: string };
                if (payload.playerId) {
                    const segments: ActionLogSegment[] = [textSegment(t('actionLog.cardDiscarded', {
                        player: formatPlayerLabel(payload.playerId),
                    }))];
                    const cardSegment = buildCardSegment(payload.cardId);
                    if (cardSegment) segments.push(cardSegment);
                    pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.ABILITY_TRIGGERED: {
                const payload = event.payload as { abilityId?: string; abilityName?: string; sourceUnitId?: string };
                const abilityName = payload.abilityName ?? formatAbilityName(payload.abilityId);
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.abilityTriggered', { abilityName }))];
                if (payload.sourceUnitId) {
                    const sourceSegment = buildCardSegment(payload.sourceUnitId);
                    if (sourceSegment) segments.push(sourceSegment);
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRENGTH_MODIFIED: {
                const payload = event.payload as { position?: { row: number; col: number }; multiplier: number; sourceAbilityId?: string };
                const cardId = resolveUnitCardId(payload.position);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.strengthModified', { multiplier: payload.multiplier }), cardId),
                ];
                if (payload.sourceAbilityId) {
                    segments.push(textSegment(t('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) })));
                }
                if (payload.position) {
                    segments.push(textSegment(` (${formatCell(payload.position)})`));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.DAMAGE_REDUCED: {
                const payload = event.payload as { value: number; sourceAbilityId?: string; sourceUnitId?: string };
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.damageReduced', { amount: payload.value }), payload.sourceUnitId),
                ];
                if (payload.sourceAbilityId) {
                    segments.push(textSegment(t('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) })));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_PUSHED:
            case SW_EVENTS.UNIT_PULLED: {
                const payload = event.payload as { targetPosition?: { row: number; col: number }; newPosition?: { row: number; col: number }; isStructure?: boolean };
                const cardId = payload.isStructure
                    ? resolveStructureCardId(payload.targetPosition)
                    : resolveUnitCardId(payload.targetPosition);
                const fromLabel = formatCell(payload.targetPosition);
                const toLabel = formatCell(payload.newPosition);
                const actionKey = event.type === SW_EVENTS.UNIT_PUSHED
                    ? 'actionLog.unitPushed'
                    : 'actionLog.unitPulled';
                pushEntry(event.type, [
                    ...withCardSegments(t(actionKey), cardId),
                    textSegment(` ${fromLabel} → ${toLabel}`),
                ], actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNITS_SWAPPED: {
                const payload = event.payload as { positionA?: { row: number; col: number }; positionB?: { row: number; col: number }; unitIdA?: string; unitIdB?: string };
                const cardA = resolveUnitCardId(payload.positionA, payload.unitIdA);
                const cardB = resolveUnitCardId(payload.positionB, payload.unitIdB);
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.unitsSwapped'))];
                const cardSegmentA = buildCardSegment(cardA);
                const cardSegmentB = buildCardSegment(cardB);
                if (cardSegmentA) segments.push(cardSegmentA);
                segments.push(textSegment(' ↔ '));
                if (cardSegmentB) segments.push(cardSegmentB);
                if (payload.positionA && payload.positionB) {
                    segments.push(textSegment(` (${formatCell(payload.positionA)} ↔ ${formatCell(payload.positionB)})`));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.CONTROL_TRANSFERRED: {
                const payload = event.payload as { targetPosition?: { row: number; col: number }; targetUnitId?: string; newOwner: PlayerId; temporary?: boolean };
                const cardId = resolveUnitCardId(payload.targetPosition, payload.targetUnitId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.controlTransferred', { player: formatPlayerLabel(payload.newOwner) }), cardId),
                ];
                if (payload.temporary) {
                    segments.push(textSegment(t('actionLog.controlTransferredTemporary')));
                }
                pushEntry(event.type, segments, payload.newOwner, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.EVENT_ATTACHED: {
                const payload = event.payload as { cardId?: string; targetPosition?: { row: number; col: number } };
                const targetCardId = resolveUnitCardId(payload.targetPosition);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.eventAttached'), payload.cardId),
                ];
                if (targetCardId) {
                    segments.push(textSegment(' → '));
                    const targetSegment = buildCardSegment(targetCardId);
                    if (targetSegment) segments.push(targetSegment);
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.FUNERAL_PYRE_CHARGED: {
                const payload = event.payload as { cardId?: string; eventCardId?: string; charges?: number };
                const targetCardId = payload.eventCardId ?? payload.cardId;
                const segments: ActionLogSegment[] = [];
                if (payload.charges === undefined) {
                    segments.push(...withCardSegments(t('actionLog.funeralPyreCharged', { amount: '+1' }), targetCardId));
                } else {
                    segments.push(...withCardSegments(t('actionLog.funeralPyreChargeSet', { total: payload.charges }), targetCardId));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.ABILITIES_COPIED: {
                const payload = event.payload as { sourceUnitId?: string; targetUnitId?: string; targetPosition?: { row: number; col: number } };
                const sourceSegment = buildCardSegment(payload.sourceUnitId);
                const targetSegment = buildCardSegment(payload.targetUnitId ?? resolveUnitCardId(payload.targetPosition));
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.abilitiesCopied'))];
                if (sourceSegment) segments.push(sourceSegment);
                segments.push(textSegment(' ← '));
                if (targetSegment) segments.push(targetSegment);
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_ATTACHED: {
                const payload = event.payload as { sourceUnitId?: string; targetPosition?: { row: number; col: number } };
                const targetCardId = resolveUnitCardId(payload.targetPosition);
                const segments: ActionLogSegment[] = [textSegment(t('actionLog.unitAttached'))];
                const sourceSegment = buildCardSegment(payload.sourceUnitId);
                if (sourceSegment) segments.push(sourceSegment);
                if (targetCardId) {
                    segments.push(textSegment(' → '));
                    const targetSegment = buildCardSegment(targetCardId);
                    if (targetSegment) segments.push(targetSegment);
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.HEALING_MODE_SET: {
                const payload = event.payload as { unitId?: string; position?: { row: number; col: number } };
                const cardId = resolveUnitCardId(payload.position, payload.unitId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.healingModeSet'), cardId),
                ];
                if (payload.position) {
                    segments.push(textSegment(` (${formatCell(payload.position)})`));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.HYPNOTIC_LURE_MARKED: {
                const payload = event.payload as { cardId?: string; targetUnitId?: string };
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(t('actionLog.hypnoticLureMarked'), payload.cardId),
                ];
                if (payload.targetUnitId) {
                    segments.push(textSegment(' → '));
                    const targetSegment = buildCardSegment(payload.targetUnitId);
                    if (targetSegment) segments.push(targetSegment);
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
