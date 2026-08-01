import { describe, expect, it } from 'vitest';
import type { EventStreamEntry, RandomFn } from '../../../engine/types';
import { MageWarsDomain } from '../domain';
import { MAGE_WARS_EVENTS } from '../domain/events';
import { ARENA_ZONE_IDS } from '../domain/ids';
import { mapMageWarsEventToFx } from '../ui/eventFxMapper';
import { MW_FX } from '../ui/fxCues';

const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: () => 3,
    range: (min: number) => min,
    shuffle: <T,>(array: T[]) => [...array],
};

function createEntry(event: EventStreamEntry['event'], id = 1): EventStreamEntry {
    return { id, event };
}

describe('mage-wars event FX mapper', () => {
    it('maps spell cast events to the target mage zone', () => {
        const core = MageWarsDomain.setup(['0', '1'], fixedRandom);

        const instruction = mapMageWarsEventToFx(createEntry({
            type: MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED,
            payload: {
                playerId: '0',
                spellCardId: 1700,
                manaCost: 4,
                castMode: 'quickcast',
                targetPlayerId: '1',
            },
            timestamp: 1,
        }), core);

        expect(instruction).toMatchObject({
            sourceEventId: 1,
            cue: MW_FX.SPELL_CAST,
            ctx: {
                cell: { row: 2, col: 1 },
                intensity: 'normal',
            },
            params: {
                source: { row: 0, col: 0 },
                spellCardId: 1700,
                targetPlayerId: '1',
            },
        });
    });

    it('maps zone-targeted action casts to the explicit target zone', () => {
        const core = MageWarsDomain.setup(['0', '1'], fixedRandom);

        const instruction = mapMageWarsEventToFx(createEntry({
            type: MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED,
            payload: {
                playerId: '0',
                spellCardId: 1710,
                manaCost: 6,
                castMode: 'action',
                targetZoneId: ARENA_ZONE_IDS.A2,
            },
            timestamp: 1,
        }), core);

        expect(instruction).toMatchObject({
            cue: MW_FX.SPELL_CAST,
            ctx: {
                cell: { row: 1, col: 0 },
                intensity: 'strong',
            },
            params: {
                source: { row: 0, col: 0 },
                targetZoneId: ARENA_ZONE_IDS.A2,
            },
        });
    });

    it('maps attack and damage events to defender impact cues', () => {
        const core = MageWarsDomain.setup(['0', '1'], fixedRandom);

        const attackInstruction = mapMageWarsEventToFx(createEntry({
            type: MAGE_WARS_EVENTS.ATTACK_DECLARED,
            payload: {
                attackerId: '0',
                defenderId: '1',
                diceResults: [3, 3, 3],
                baseDamage: 9,
            },
            timestamp: 1,
        }), core);

        expect(attackInstruction).toMatchObject({
            cue: MW_FX.ATTACK_IMPACT,
            ctx: {
                cell: { row: 2, col: 1 },
                intensity: 'strong',
            },
            params: {
                source: { row: 0, col: 0 },
                damageAmount: 9,
            },
        });

        const damageInstruction = mapMageWarsEventToFx(createEntry({
            type: 'DAMAGE_DEALT',
            payload: {
                targetId: '1',
                amount: 5,
                actualDamage: 4,
                sourceAbilityId: 'mage-basic-melee',
            },
            timestamp: 2,
        }), core);

        expect(damageInstruction).toMatchObject({
            sourceEventId: 1,
            cue: MW_FX.DAMAGE_IMPACT,
            ctx: {
                cell: { row: 2, col: 1 },
                intensity: 'normal',
            },
            params: {
                targetId: '1',
                damageAmount: 4,
                sourceAbilityId: 'mage-basic-melee',
            },
        });
    });
});
