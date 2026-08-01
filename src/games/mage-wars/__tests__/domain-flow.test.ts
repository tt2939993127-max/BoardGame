import { describe, expect, it } from 'vitest';
import { createInitialSystemState, executePipeline } from '../../../engine/pipeline';
import { FLOW_COMMANDS } from '../../../engine/systems/FlowSystem';
import type { Command, MatchState, RandomFn } from '../../../engine/types';
import { MageWarsDomain, MAGE_WARS_COMMANDS } from '../domain';
import { getApprenticeSpellbook } from '../domain/data/apprenticeSpellbooks';
import { MAGE_WARS_EVENTS } from '../domain/events';
import { ARENA_ZONE_IDS, MAGE_IDS } from '../domain/ids';
import type { MageWarsCommand, MageWarsCore, MageWarsPhase } from '../domain/types';
import { engineConfig } from '../game';

const playerIds = ['0', '1'];

const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: () => 3,
    range: (min: number) => min,
    shuffle: <T,>(array: T[]) => [...array],
};

const beastmasterSpellIds = (): number[] => getApprenticeSpellbook(MAGE_IDS.BEASTMASTER_APPRENTICE)
    .flatMap((entry) => entry.workshopCardIds);

function setupState(phase?: MageWarsPhase): MatchState<MageWarsCore> {
    const sys = createInitialSystemState(playerIds, engineConfig.systems, 'local:mage-wars-domain-flow');
    return {
        core: MageWarsDomain.setup(playerIds, fixedRandom),
        sys: phase ? { ...sys, phase } : sys,
    };
}

function runCommand(
    state: MatchState<MageWarsCore>,
    command: MageWarsCommand | Command<typeof FLOW_COMMANDS.ADVANCE_PHASE, Record<string, never>>,
) {
    return executePipeline(
        {
            domain: engineConfig.domain,
            systems: engineConfig.systems,
            systemsConfig: engineConfig.systemsConfig,
        },
        state,
        command as unknown as MageWarsCommand,
        fixedRandom,
        playerIds,
    );
}

function validateCommand(
    state: MatchState<MageWarsCore>,
    command: MageWarsCommand,
): string | undefined {
    return MageWarsDomain.validate(state, command).error;
}

function planCommand(spellCardIds: number[]): MageWarsCommand {
    return {
        type: MAGE_WARS_COMMANDS.PLAN_SPELLS,
        playerId: '0',
        payload: { spellCardIds },
    };
}

describe('mage-wars domain flow', () => {
    it('plans at most two spellbook cards for the current mage', () => {
        const state = setupState('planning');
        const spellIds = beastmasterSpellIds();

        const planned = runCommand(state, planCommand(spellIds.slice(0, 2)));

        expect(planned.success).toBe(true);
        expect(planned.state.core.players['0'].preparedSpellCardIds).toEqual(spellIds.slice(0, 2));
        expect(planned.state.core.players['0'].preparedSpellSlots).toBe(2);
        expect(planned.events.map((event) => event.type)).toContain(MAGE_WARS_EVENTS.SPELLS_PLANNED);

        expect(validateCommand(state, planCommand(spellIds.slice(0, 3)))).toBe('tooManyPreparedSpells');
        expect(validateCommand(state, planCommand([999999]))).toBe('spellNotInApprenticeSpellbook');
        expect(validateCommand(state, {
            type: MAGE_WARS_COMMANDS.PLAN_SPELLS,
            playerId: '1',
            payload: { spellCardIds: [spellIds[0]] },
        })).toBe('notCurrentPlayer');
    });

    it('channels mana on channel phase entry and advances turn after final quickcast', () => {
        const resetState = setupState();
        const manaBefore = resetState.core.players['0'].mana;
        const channeling = resetState.core.players['0'].channeling;

        const channelResult = runCommand(resetState, {
            type: FLOW_COMMANDS.ADVANCE_PHASE,
            playerId: '0',
            payload: {},
        });

        expect(channelResult.success).toBe(true);
        expect(channelResult.state.sys.phase).toBe('channel');
        expect(channelResult.state.core.players['0'].mana).toBe(manaBefore + channeling);
        expect(channelResult.events.map((event) => event.type)).toEqual(expect.arrayContaining([
            'SYS_PHASE_CHANGED',
            MAGE_WARS_EVENTS.MANA_CHANNELED,
        ]));

        const finalQuickcastState: MatchState<MageWarsCore> = {
            core: {
                ...channelResult.state.core,
                players: {
                    ...channelResult.state.core.players,
                    '1': {
                        ...channelResult.state.core.players['1'],
                        actionReady: false,
                        quickcastReady: false,
                        guarding: true,
                    },
                },
            },
            sys: { ...channelResult.state.sys, phase: 'finalQuickcast' },
        };

        const nextTurn = runCommand(finalQuickcastState, {
            type: FLOW_COMMANDS.ADVANCE_PHASE,
            playerId: '0',
            payload: {},
        });

        expect(nextTurn.success).toBe(true);
        expect(nextTurn.state.sys.phase).toBe('reset');
        expect(nextTurn.state.core.currentPlayerId).toBe('1');
        expect(nextTurn.state.core.turnNumber).toBe(1);
        expect(nextTurn.state.core.players['1']).toMatchObject({
            actionReady: true,
            quickcastReady: true,
            guarding: false,
        });
        expect(nextTurn.events.map((event) => event.type)).toEqual(expect.arrayContaining([
            MAGE_WARS_EVENTS.TURN_ADVANCED,
            MAGE_WARS_EVENTS.ACTION_READINESS_RESET,
        ]));
    });

    it('moves only to adjacent arena zones and guard consumes the main action', () => {
        const state = setupState('creatureAction');

        expect(validateCommand(state, {
            type: MAGE_WARS_COMMANDS.MOVE_MAGE,
            playerId: '0',
            payload: { toZoneId: ARENA_ZONE_IDS.B3 },
        })).toBe('zoneNotAdjacent');

        const moved = runCommand(state, {
            type: MAGE_WARS_COMMANDS.MOVE_MAGE,
            playerId: '0',
            payload: { toZoneId: ARENA_ZONE_IDS.A2 },
        });

        expect(moved.success).toBe(true);
        expect(moved.state.core.players['0']).toMatchObject({
            mageZoneId: ARENA_ZONE_IDS.A2,
            actionReady: false,
            guarding: false,
        });
        expect(moved.state.core.arena.find((zone) => zone.id === ARENA_ZONE_IDS.A1)?.occupantIds).not.toContain('0');
        expect(moved.state.core.arena.find((zone) => zone.id === ARENA_ZONE_IDS.A2)?.occupantIds).toContain('0');

        const guarded = runCommand(setupState('creatureAction'), {
            type: MAGE_WARS_COMMANDS.GUARD,
            playerId: '0',
            payload: {},
        });

        expect(guarded.success).toBe(true);
        expect(guarded.state.core.players['0']).toMatchObject({
            actionReady: false,
            guarding: true,
        });
        expect(validateCommand(guarded.state, {
            type: MAGE_WARS_COMMANDS.GUARD,
            playerId: '0',
            payload: {},
        })).toBe('actionSpent');
    });

    it('casts only prepared spells and consumes the matching readiness track', () => {
        const [quickSpellId, actionSpellId] = beastmasterSpellIds();
        const planned = runCommand(setupState('planning'), planCommand([quickSpellId, actionSpellId]));
        expect(planned.success).toBe(true);

        const quickcastState: MatchState<MageWarsCore> = {
            core: planned.state.core,
            sys: { ...planned.state.sys, phase: 'initiativeQuickcast' },
        };
        const quickcast = runCommand(quickcastState, {
            type: MAGE_WARS_COMMANDS.CAST_SPELL,
            playerId: '0',
            payload: {
                spellCardId: quickSpellId,
                manaCost: 4,
                targetPlayerId: '1',
            },
        });

        expect(quickcast.success).toBe(true);
        expect(quickcast.state.core.players['0']).toMatchObject({
            mana: planned.state.core.players['0'].mana - 4,
            quickcastReady: false,
            actionReady: true,
        });
        expect(quickcast.state.core.players['0'].preparedSpellCardIds).toEqual([actionSpellId]);
        expect(quickcast.state.core.players['0'].discardSpellCardIds).toEqual([quickSpellId]);

        expect(validateCommand({
            core: planned.state.core,
            sys: { ...planned.state.sys, phase: 'creatureAction' },
        }, {
            type: MAGE_WARS_COMMANDS.CAST_SPELL,
            playerId: '0',
            payload: { spellCardId: 999999, manaCost: 1 },
        })).toBe('spellNotPrepared');

        const actionCast = runCommand({
            core: planned.state.core,
            sys: { ...planned.state.sys, phase: 'creatureAction' },
        }, {
            type: MAGE_WARS_COMMANDS.CAST_SPELL,
            playerId: '0',
            payload: {
                spellCardId: actionSpellId,
                manaCost: 1,
                targetZoneId: ARENA_ZONE_IDS.A1,
            },
        });

        expect(actionCast.success).toBe(true);
        expect(actionCast.state.core.players['0']).toMatchObject({
            actionReady: false,
            quickcastReady: true,
        });
        expect(actionCast.state.core.players['0'].discardSpellCardIds).toEqual([actionSpellId]);
    });

    it('declares same-zone melee attacks through the damage pipeline and closes gameover', () => {
        const baseState = setupState('creatureAction');
        const defenderLife = baseState.core.players['1'].life;
        const state: MatchState<MageWarsCore> = {
            core: {
                ...baseState.core,
                players: {
                    ...baseState.core.players,
                    '1': {
                        ...baseState.core.players['1'],
                        mageZoneId: ARENA_ZONE_IDS.A1,
                        damage: defenderLife - 8,
                    },
                },
                arena: baseState.core.arena.map((zone) => {
                    if (zone.id === ARENA_ZONE_IDS.A1) {
                        return { ...zone, occupantIds: ['0', '1'] };
                    }
                    if (zone.id === ARENA_ZONE_IDS.B3) {
                        return { ...zone, occupantIds: [] };
                    }
                    return zone;
                }),
            },
            sys: baseState.sys,
        };

        expect(validateCommand(baseState, {
            type: MAGE_WARS_COMMANDS.DECLARE_ATTACK,
            playerId: '0',
            payload: { targetPlayerId: '1' },
        })).toBe('targetNotInSameZone');

        const attack = runCommand(state, {
            type: MAGE_WARS_COMMANDS.DECLARE_ATTACK,
            playerId: '0',
            payload: { targetPlayerId: '1' },
        });

        expect(attack.success).toBe(true);
        expect(attack.events.map((event) => event.type)).toEqual(expect.arrayContaining([
            MAGE_WARS_EVENTS.ATTACK_DECLARED,
            'DAMAGE_DEALT',
            MAGE_WARS_EVENTS.MAGE_DEFEATED,
        ]));
        expect(attack.state.core.players['0'].actionReady).toBe(false);
        expect(attack.state.core.players['1'].damage).toBe(defenderLife);
        expect(attack.state.core.gameResult).toEqual({ winner: '0' });
        expect(attack.state.sys.gameover).toEqual({ winner: '0' });
    });
});
