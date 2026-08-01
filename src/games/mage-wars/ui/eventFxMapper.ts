import type { FxCellCoord, FxContext, FxParams } from '../../../engine/fx';
import type { EventStreamEntry, PlayerId } from '../../../engine/types';
import type { MageWarsCore, MageWarsEvent } from '../domain';
import { MAGE_WARS_EVENTS } from '../domain/events';
import type { ArenaZoneId } from '../domain/ids';
import { MW_FX, type MageWarsFxCue } from './fxCues';

export interface MageWarsFxInstruction {
    sourceEventId: number;
    cue: MageWarsFxCue;
    ctx: FxContext;
    params?: FxParams;
}

function resolveZoneCell(core: MageWarsCore, zoneId?: ArenaZoneId): FxCellCoord | null {
    if (!zoneId) return null;
    const zone = core.arena.find((candidate) => candidate.id === zoneId);
    return zone ? { row: zone.row, col: zone.col } : null;
}

export function resolvePlayerCell(core: MageWarsCore, playerId?: PlayerId): FxCellCoord | null {
    if (!playerId) return null;
    return resolveZoneCell(core, core.players[playerId]?.mageZoneId);
}

function resolveIntensity(amount: number | undefined): FxContext['intensity'] {
    return amount !== undefined && amount >= 6 ? 'strong' : 'normal';
}

export function mapMageWarsEventToFx(
    entry: EventStreamEntry,
    core: MageWarsCore,
): MageWarsFxInstruction | null {
    const event = entry.event as MageWarsEvent;

    if (event.type === MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED) {
        const payload = event.payload;
        const source = resolvePlayerCell(core, payload.playerId);
        const target = resolveZoneCell(core, payload.targetZoneId)
            ?? resolvePlayerCell(core, payload.targetPlayerId)
            ?? source;
        if (!target) return null;

        return {
            sourceEventId: entry.id,
            cue: MW_FX.SPELL_CAST,
            ctx: {
                cell: target,
                intensity: payload.castMode === 'quickcast' ? 'normal' : 'strong',
            },
            params: {
                source,
                spellCardId: payload.spellCardId,
                castMode: payload.castMode,
                playerId: payload.playerId,
                targetPlayerId: payload.targetPlayerId,
                targetZoneId: payload.targetZoneId,
            },
        };
    }

    if (event.type === MAGE_WARS_EVENTS.ATTACK_DECLARED) {
        const payload = event.payload;
        const source = resolvePlayerCell(core, payload.attackerId);
        const target = resolvePlayerCell(core, payload.defenderId);
        if (!target) return null;

        return {
            sourceEventId: entry.id,
            cue: MW_FX.ATTACK_IMPACT,
            ctx: {
                cell: target,
                intensity: resolveIntensity(payload.baseDamage),
            },
            params: {
                source,
                attackerId: payload.attackerId,
                defenderId: payload.defenderId,
                diceResults: payload.diceResults,
                damageAmount: payload.baseDamage,
            },
        };
    }

    if (event.type === 'DAMAGE_DEALT') {
        const payload = event.payload;
        const target = resolvePlayerCell(core, payload.targetId);
        if (!target) return null;

        const damageAmount = payload.actualDamage ?? payload.amount;
        return {
            sourceEventId: entry.id,
            cue: MW_FX.DAMAGE_IMPACT,
            ctx: {
                cell: target,
                intensity: resolveIntensity(damageAmount),
            },
            params: {
                targetId: payload.targetId,
                damageAmount,
                sourceAbilityId: payload.sourceAbilityId,
            },
        };
    }

    return null;
}
