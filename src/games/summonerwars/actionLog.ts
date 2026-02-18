/**
 * SummonerWars - ActionLog 格式化
 * 
 * 使用 i18n segment 延迟翻译，避免服务端无 i18n 环境导致显示 raw key。
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
import type { DiceFace } from './config/dice';
import { DICE_FACE_SPRITE_MAP } from './ui/cardAtlas';

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

const SW_NS = 'game-summonerwars';

/** i18n segment 工厂 */
const i18nSeg = (
    key: string,
    params?: Record<string, string | number>,
    paramI18nKeys?: string[],
): ActionLogSegment => ({
    type: 'i18n' as const,
    ns: SW_NS,
    key,
    ...(params ? { params } : {}),
    ...(paramI18nKeys ? { paramI18nKeys } : {}),
});

const textSegment = (text: string): ActionLogSegment => ({ type: 'text', text });

// ============================================================================
// 辅助函数
// ============================================================================

const formatDelta = (delta: number) => (delta >= 0 ? `+${delta}` : `${delta}`);

const formatAbilityName = (abilityId?: string) => (
    abilityId ? (abilityRegistry.get(abilityId)?.name ?? abilityId) : ''
);

const buildCardSegment = (cardId?: string): ActionLogSegment | null => {
    if (!cardId) return null;
    const meta = getSummonerWarsCardPreviewMeta(cardId);
    if (!meta?.name) return textSegment(cardId);
    const isI18nKey = meta.name.includes('.');
    if (meta.previewRef) {
        return {
            type: 'card',
            cardId,
            previewText: meta.name,
            ...(isI18nKey ? { previewTextNs: SW_NS } : {}),
        };
    }
    if (isI18nKey) {
        return i18nSeg(meta.name);
    }
    return textSegment(meta.name);
};

const withCardSegments = (i18nKey: string, cardId?: string, params?: Record<string, string | number>, paramI18nKeys?: string[]): ActionLogSegment[] => {
    const segments: ActionLogSegment[] = [i18nSeg(i18nKey, params, paramI18nKeys)];
    const cardSegment = buildCardSegment(cardId);
    if (cardSegment) segments.push(cardSegment);
    return segments;
};

const buildPositionKey = (pos?: { row: number; col: number }) => (pos ? `${pos.row},${pos.col}` : '');

/** 构建骰子结果 segment（使用精灵图） */
const buildDiceResultSegment = (diceResults?: DiceFace[]): ActionLogSegment | null => {
    if (!diceResults || diceResults.length === 0) return null;
    
    // 骰子精灵图：3x3 网格，帧索引 0-8
    const SPRITE_COLS = 3;
    const SPRITE_ROWS = 3;
    
    // 将 DiceFace 转换为精灵图位置
    const dice = diceResults.map((face, index) => {
        // 每种面取第一个变体帧索引
        const frameIndex = DICE_FACE_SPRITE_MAP[face]?.[0] ?? 0;
        const col = frameIndex % SPRITE_COLS;
        const row = Math.floor(frameIndex / SPRITE_COLS);
        return { value: index + 1, col, row };
    });
    
    return {
        type: 'diceResult',
        spriteAsset: 'summonerwars/common/dice',
        spriteCols: SPRITE_COLS,
        spriteRows: SPRITE_ROWS,
        dice,
    };
};

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

    const pushEntry = (
        kind: string,
        segments: ActionLogSegment[],
        entryActorId: PlayerId = actorId,
        entryTimestamp: number = timestamp,
        index = entries.length,
    ) => {
        entries.push({
            id: `${kind}-${entryActorId}-${entryTimestamp}-${index}`,
            timestamp: entryTimestamp,
            actorId: entryActorId,
            kind,
            segments,
        });
    };

    // 预扫描被摧毁的单位/建筑，用于后续事件解析
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

    // ========================================================================
    // 命令格式化
    // ========================================================================
    const commandEntry = (() => {
        switch (command.type) {
            case SW_COMMANDS.SUMMON_UNIT: {
                const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [
                        ...withCardSegments('actionLog.summonUnit', payload.cardId),
                        textSegment(' → '),
                        payload.position
                            ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                            : i18nSeg('actionLog.positionUnknown'),
                    ],
                };
            }
            case SW_COMMANDS.MOVE_UNIT: {
                const payload = command.payload as { from?: { row: number; col: number }; to?: { row: number; col: number } };
                const moveEvent = [...events].reverse().find((e) => e.type === SW_EVENTS.UNIT_MOVED) as
                    | { payload?: { unitId?: string } } | undefined;
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [
                        ...withCardSegments('actionLog.moveUnit', moveEvent?.payload?.unitId),
                        textSegment(' '),
                        ...(payload.from
                            ? [i18nSeg('actionLog.position', { row: payload.from.row + 1, col: payload.from.col + 1 })]
                            : [i18nSeg('actionLog.positionUnknown')]),
                        textSegment(' → '),
                        ...(payload.to
                            ? [i18nSeg('actionLog.position', { row: payload.to.row + 1, col: payload.to.col + 1 })]
                            : [i18nSeg('actionLog.positionUnknown')]),
                    ],
                };
            }
            case SW_COMMANDS.DECLARE_ATTACK: {
                const attackEvent = [...events].reverse().find((e) => e.type === SW_EVENTS.UNIT_ATTACKED) as
                    | { payload?: { hits?: number; target?: { row: number; col: number }; attackerId?: string; diceResults?: DiceFace[]; healingMode?: boolean; healAmount?: number } } | undefined;
                const hits = attackEvent?.payload?.hits;
                const diceResults = attackEvent?.payload?.diceResults;
                const isHealing = attackEvent?.payload?.healingMode === true;
                const healAmount = attackEvent?.payload?.healAmount ?? 0;
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(isHealing ? 'actionLog.healAttackUnit' : 'actionLog.attackUnit', attackEvent?.payload?.attackerId),
                    textSegment(' → '),
                    ...(attackEvent?.payload?.target
                        ? [i18nSeg('actionLog.position', { row: attackEvent.payload.target.row + 1, col: attackEvent.payload.target.col + 1 })]
                        : [i18nSeg('actionLog.positionUnknown')]),
                    textSegment(' '),
                ];
                // 添加骰子结果精灵图
                const diceSegment = buildDiceResultSegment(diceResults);
                if (diceSegment) {
                    segments.push(diceSegment);
                    segments.push(textSegment(' '));
                }
                // 治疗模式显示治疗量，攻击模式显示命中数
                if (isHealing) {
                    segments.push(i18nSeg('actionLog.attackHealing', { amount: healAmount }));
                } else {
                    segments.push(
                        hits === undefined
                            ? i18nSeg('actionLog.attackDeclared')
                            : i18nSeg('actionLog.attackHits', { hits })
                    );
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments,
                };
            }
            case SW_COMMANDS.BUILD_STRUCTURE: {
                const payload = command.payload as { cardId?: string; position?: { row: number; col: number } };
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [
                        ...withCardSegments('actionLog.buildStructure', payload.cardId),
                        textSegment(' → '),
                        payload.position
                            ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                            : i18nSeg('actionLog.positionUnknown'),
                    ],
                };
            }
            case SW_COMMANDS.END_PHASE: {
                const phaseEvent = [...events].reverse().find((e) => e.type === SW_EVENTS.PHASE_CHANGED) as
                    | { payload?: { to?: string } } | undefined;
                const phaseSuffix = phaseEvent?.payload?.to
                    ? `：${phaseEvent.payload.to}`
                    : '';
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [
                        phaseEvent?.payload?.to
                            ? i18nSeg('actionLog.endPhase', { phase: `：${phaseEvent.payload.to}` })
                            : i18nSeg('actionLog.endPhase', { phase: '' }),
                    ],
                };
            }
            case FLOW_COMMANDS.ADVANCE_PHASE: {
                const phaseEvent = [...events].reverse().find((e) => e.type === FLOW_EVENTS.PHASE_CHANGED) as
                    | { payload?: { to?: string } } | undefined;
                const phaseLabel = phaseEvent?.payload?.to ?? '';
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [i18nSeg('actionLog.advancePhase', { phase: phaseLabel })],
                };
            }
            case SW_COMMANDS.DISCARD_FOR_MAGIC: {
                const payload = command.payload as { cardIds?: string[] };
                const cardIds = payload.cardIds ?? [];
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.discardForMagic')];
                if (cardIds.length === 0) {
                    segments.push(i18nSeg('actionLog.none'));
                } else {
                    cardIds.forEach((cardId, index) => {
                        const cardSegment = buildCardSegment(cardId);
                        if (cardSegment) segments.push(cardSegment);
                        if (index < cardIds.length - 1) {
                            segments.push(i18nSeg('actionLog.cardSeparator'));
                        }
                    });
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type, segments,
                };
            }
            case SW_COMMANDS.PLAY_EVENT: {
                const payload = command.payload as { cardId?: string };
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: withCardSegments('actionLog.playEvent', payload.cardId),
                };
            }
            case SW_COMMANDS.BLOOD_SUMMON_STEP: {
                const payload = command.payload as { summonCardId?: string; summonPosition?: { row: number; col: number } };
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type,
                    segments: [
                        ...withCardSegments('actionLog.bloodSummon', payload.summonCardId),
                        textSegment(' → '),
                        payload.summonPosition
                            ? i18nSeg('actionLog.position', { row: payload.summonPosition.row + 1, col: payload.summonPosition.col + 1 })
                            : i18nSeg('actionLog.positionUnknown'),
                    ],
                };
            }
            case SW_COMMANDS.FUNERAL_PYRE_HEAL: {
                const payload = command.payload as { cardId?: string; targetPosition?: { row: number; col: number }; skip?: boolean };
                const actionKey = payload.skip ? 'actionLog.funeralPyreSkip' : 'actionLog.funeralPyreHeal';
                const segments: ActionLogSegment[] = withCardSegments(actionKey, payload.cardId);
                if (payload.targetPosition) {
                    segments.push(textSegment(' → '));
                    segments.push(i18nSeg('actionLog.position', { row: payload.targetPosition.row + 1, col: payload.targetPosition.col + 1 }));
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type, segments,
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
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.activateAbility', { abilityName }, ['abilityName'])];
                if (payload.sourceUnitId) {
                    segments.push(i18nSeg('actionLog.activateAbilitySource'));
                    const sourceSegment = buildCardSegment(payload.sourceUnitId);
                    if (sourceSegment) segments.push(sourceSegment);
                }
                if (payload.targetCardId || payload.targetUnitId) {
                    segments.push(i18nSeg('actionLog.activateAbilityTarget'));
                    const targetSegment = buildCardSegment(payload.targetCardId ?? payload.targetUnitId);
                    if (targetSegment) segments.push(targetSegment);
                } else if (payload.targetPosition) {
                    const posStr = `${payload.targetPosition.row + 1},${payload.targetPosition.col + 1}`;
                    segments.push(i18nSeg('actionLog.activateAbilityTargetPosition', { position: posStr }));
                }
                return {
                    id: `${command.type}-${command.playerId}-${timestamp}`,
                    timestamp, actorId, kind: command.type, segments,
                };
            }
            default:
                return null;
        }
    })();

    if (commandEntry) entries.push(commandEntry);

    // ========================================================================
    // 事件格式化
    // ========================================================================
    events.forEach((event, index) => {
        const entryTimestamp = typeof event.timestamp === 'number' ? event.timestamp : timestamp;
        switch (event.type) {
            case SW_EVENTS.UNIT_SUMMONED: {
                const payload = event.payload as { cardId?: string; position?: { row: number; col: number }; fromDiscard?: boolean };
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitSummoned', payload.cardId),
                    textSegment(' → '),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                ];
                if (payload.fromDiscard) {
                    segments.push(i18nSeg('actionLog.unitSummonedFromDiscard'));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_MOVED: {
                const payload = event.payload as { from?: { row: number; col: number }; to?: { row: number; col: number }; unitId?: string };
                const cardId = resolveUnitCardId(payload.from ?? payload.to, payload.unitId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitMoved', cardId),
                    textSegment(' '),
                    ...(payload.from
                        ? [i18nSeg('actionLog.position', { row: payload.from.row + 1, col: payload.from.col + 1 })]
                        : [i18nSeg('actionLog.positionUnknown')]),
                    textSegment(' → '),
                    ...(payload.to
                        ? [i18nSeg('actionLog.position', { row: payload.to.row + 1, col: payload.to.col + 1 })]
                        : [i18nSeg('actionLog.positionUnknown')]),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_DAMAGED: {
                const payload = event.payload as { position?: { row: number; col: number }; damage: number; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitDamaged', cardId, { amount: payload.damage }),
                    textSegment(' ('),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                    textSegment(')'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_HEALED: {
                const payload = event.payload as { position?: { row: number; col: number }; amount: number; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitHealed', cardId, { amount: payload.amount }),
                    textSegment(' ('),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                    textSegment(')'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_DESTROYED: {
                const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
                const cardId = resolveUnitCardId(payload.position, payload.cardId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitDestroyed', cardId),
                    textSegment(' ('),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                    textSegment(')'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_CHARGED: {
                const payload = event.payload as { position?: { row: number; col: number }; delta?: number; newValue?: number; sourceAbilityId?: string };
                const cardId = resolveUnitCardId(payload.position);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.unitCharged', cardId, { amount: formatDelta(payload.delta ?? 0) }),
                ];
                if (payload.newValue !== undefined) {
                    segments.push(i18nSeg('actionLog.unitChargeTotal', { total: payload.newValue }));
                }
                if (payload.sourceAbilityId) {
                    segments.push(i18nSeg('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) }, ['abilityName']));
                }
                if (payload.position) {
                    segments.push(textSegment(' ('));
                    segments.push(i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 }));
                    segments.push(textSegment(')'));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_BUILT: {
                const payload = event.payload as { cardId?: string; position?: { row: number; col: number } };
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.structureBuilt', payload.cardId),
                    textSegment(' → '),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_HEALED: {
                const payload = event.payload as { position?: { row: number; col: number }; amount: number; cardId?: string };
                const cardId = resolveStructureCardId(payload.position, payload.cardId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.structureHealed', cardId, { amount: payload.amount }),
                    textSegment(' ('),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                    textSegment(')'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.STRUCTURE_DESTROYED: {
                const payload = event.payload as { position?: { row: number; col: number }; cardId?: string };
                const cardId = resolveStructureCardId(payload.position, payload.cardId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.structureDestroyed', cardId),
                    textSegment(' ('),
                    payload.position
                        ? i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 })
                        : i18nSeg('actionLog.positionUnknown'),
                    textSegment(')'),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.MAGIC_CHANGED: {
                const payload = event.payload as { playerId?: PlayerId; delta?: number };
                if (payload.delta !== undefined && payload.playerId) {
                    pushEntry(event.type, [
                        i18nSeg('actionLog.magicChanged', { playerId: payload.playerId, delta: formatDelta(payload.delta) }),
                    ], payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.CARD_DRAWN: {
                const payload = event.payload as { playerId?: PlayerId; count?: number };
                if (payload.playerId && payload.count) {
                    pushEntry(event.type, [
                        i18nSeg('actionLog.cardDrawn', { playerId: payload.playerId, count: payload.count }),
                    ], payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.CARD_DISCARDED: {
                const payload = event.payload as { playerId?: PlayerId; cardId?: string };
                if (payload.playerId) {
                    const segments: ActionLogSegment[] = [
                        i18nSeg('actionLog.cardDiscarded', { playerId: payload.playerId }),
                    ];
                    const cardSegment = buildCardSegment(payload.cardId);
                    if (cardSegment) segments.push(cardSegment);
                    pushEntry(event.type, segments, payload.playerId, entryTimestamp, index);
                }
                break;
            }
            case SW_EVENTS.ABILITY_TRIGGERED: {
                const payload = event.payload as { abilityId?: string; abilityName?: string; sourceUnitId?: string };
                const abilityName = payload.abilityName ?? formatAbilityName(payload.abilityId);
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.abilityTriggered', { abilityName }, ['abilityName'])];
                if (payload.sourceUnitId) {
                    segments.push(i18nSeg('actionLog.activateAbilitySource'));
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
                    ...withCardSegments('actionLog.strengthModified', cardId, { multiplier: payload.multiplier }),
                ];
                if (payload.sourceAbilityId) {
                    segments.push(i18nSeg('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) }, ['abilityName']));
                }
                if (payload.position) {
                    segments.push(textSegment(' ('));
                    segments.push(i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 }));
                    segments.push(textSegment(')'));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.DAMAGE_REDUCED: {
                const payload = event.payload as { value: number; sourceAbilityId?: string; sourceUnitId?: string };
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.damageReduced', payload.sourceUnitId, { amount: payload.value }),
                ];
                if (payload.sourceAbilityId) {
                    segments.push(i18nSeg('actionLog.sourceAbility', { abilityName: formatAbilityName(payload.sourceAbilityId) }, ['abilityName']));
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
                const actionKey = event.type === SW_EVENTS.UNIT_PUSHED
                    ? 'actionLog.unitPushed' : 'actionLog.unitPulled';
                const segments: ActionLogSegment[] = [
                    ...withCardSegments(actionKey, cardId),
                    textSegment(' '),
                    ...(payload.targetPosition
                        ? [i18nSeg('actionLog.position', { row: payload.targetPosition.row + 1, col: payload.targetPosition.col + 1 })]
                        : [i18nSeg('actionLog.positionUnknown')]),
                    textSegment(' → '),
                    ...(payload.newPosition
                        ? [i18nSeg('actionLog.position', { row: payload.newPosition.row + 1, col: payload.newPosition.col + 1 })]
                        : [i18nSeg('actionLog.positionUnknown')]),
                ];
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNITS_SWAPPED: {
                const payload = event.payload as { positionA?: { row: number; col: number }; positionB?: { row: number; col: number }; unitIdA?: string; unitIdB?: string };
                const cardA = resolveUnitCardId(payload.positionA, payload.unitIdA);
                const cardB = resolveUnitCardId(payload.positionB, payload.unitIdB);
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.unitsSwapped')];
                const cardSegmentA = buildCardSegment(cardA);
                const cardSegmentB = buildCardSegment(cardB);
                if (cardSegmentA) segments.push(cardSegmentA);
                segments.push(textSegment(' ↔ '));
                if (cardSegmentB) segments.push(cardSegmentB);
                if (payload.positionA && payload.positionB) {
                    segments.push(textSegment(' ('));
                    segments.push(i18nSeg('actionLog.position', { row: payload.positionA.row + 1, col: payload.positionA.col + 1 }));
                    segments.push(textSegment(' ↔ '));
                    segments.push(i18nSeg('actionLog.position', { row: payload.positionB.row + 1, col: payload.positionB.col + 1 }));
                    segments.push(textSegment(')'));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.CONTROL_TRANSFERRED: {
                const payload = event.payload as { targetPosition?: { row: number; col: number }; targetUnitId?: string; newOwner: PlayerId; temporary?: boolean };
                const cardId = resolveUnitCardId(payload.targetPosition, payload.targetUnitId);
                const segments: ActionLogSegment[] = [
                    ...withCardSegments('actionLog.controlTransferred', cardId, { playerId: payload.newOwner }),
                ];
                if (payload.temporary) {
                    segments.push(i18nSeg('actionLog.controlTransferredTemporary'));
                }
                pushEntry(event.type, segments, payload.newOwner, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.EVENT_ATTACHED: {
                const payload = event.payload as { cardId?: string; targetPosition?: { row: number; col: number } };
                const targetCardId = resolveUnitCardId(payload.targetPosition);
                const segments: ActionLogSegment[] = withCardSegments('actionLog.eventAttached', payload.cardId);
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
                    segments.push(...withCardSegments('actionLog.funeralPyreCharged', targetCardId, { amount: '+1' }));
                } else {
                    segments.push(...withCardSegments('actionLog.funeralPyreChargeSet', targetCardId, { total: payload.charges }));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.ABILITIES_COPIED: {
                const payload = event.payload as { sourceUnitId?: string; targetUnitId?: string; targetPosition?: { row: number; col: number } };
                const sourceSegment = buildCardSegment(payload.sourceUnitId);
                const targetSegment = buildCardSegment(payload.targetUnitId ?? resolveUnitCardId(payload.targetPosition));
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.abilitiesCopied')];
                if (sourceSegment) segments.push(sourceSegment);
                segments.push(textSegment(' ← '));
                if (targetSegment) segments.push(targetSegment);
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.UNIT_ATTACHED: {
                const payload = event.payload as { sourceUnitId?: string; targetPosition?: { row: number; col: number } };
                const targetCardId = resolveUnitCardId(payload.targetPosition);
                const segments: ActionLogSegment[] = [i18nSeg('actionLog.unitAttached')];
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
                const segments: ActionLogSegment[] = withCardSegments('actionLog.healingModeSet', cardId);
                if (payload.position) {
                    segments.push(textSegment(' ('));
                    segments.push(i18nSeg('actionLog.position', { row: payload.position.row + 1, col: payload.position.col + 1 }));
                    segments.push(textSegment(')'));
                }
                pushEntry(event.type, segments, actorId, entryTimestamp, index);
                break;
            }
            case SW_EVENTS.HYPNOTIC_LURE_MARKED: {
                const payload = event.payload as { cardId?: string; targetUnitId?: string };
                const segments: ActionLogSegment[] = withCardSegments('actionLog.hypnoticLureMarked', payload.cardId);
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
