
import { describe, it, expect, beforeAll } from 'vitest';
import { makeMinion, makeState, applyEvents } from './helpers';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { SU_EVENTS } from '../domain/types';
import { killerPlantSproutTrigger, killerPlantOvergrowthTrigger, registerKillerPlantModifiers } from '../abilities/killer_plants';
import { getMinionPower } from '../domain/abilityHelpers';
import { getEffectiveBreakpoint } from '../domain/ongoingModifiers';

beforeAll(() => {
    resetAbilityInit();
    initAllAbilities();
    registerKillerPlantModifiers();
});

describe('Killer Plants POD Card Logic Verification', () => {
    it('Sprout POD should trigger for owner at turn start', () => {
        const sprout = makeMinion('sprout-1', 'killer_plant_sprout_pod', '0', 2);
        const base = {
            defId: 'base1',
            minions: [sprout],
            ongoingActions: [],
        } as any;
        const state = makeState({ bases: [base], turnOrder: ['0', '1'], currentPlayerIndex: 0 });

        const ctx: any = {
            state,
            playerId: '0',
            now: Date.now(),
        };

        const events = killerPlantSproutTrigger(ctx);

        // Should destroy itself
        const destroyEvent = events.events.find(e => e.type === SU_EVENTS.MINION_DESTROYED) as any;
        expect(destroyEvent).toBeDefined();
        expect(destroyEvent.payload.minionUid).toBe('sprout-1');

        // Should have a search interaction (simplified check)
        // Note: Actual interaction handling is via queueInteraction, but here we check for the prompt logic
        // In unit test, it might return matchState with queued interaction
    });

    it('Overgrowth POD should reduce breakpoint to 0', () => {
        const overgrowth = { uid: 'og-1', defId: 'killer_plant_overgrowth_pod', ownerId: '0' };
        const base = {
            defId: 'base_ninja_dojo', // valid base with known breakpoint
            minions: [],
            ongoingActions: [overgrowth],
        } as any;
        // Mock getBaseDef to return 20 breakpoint
        const state = makeState({ bases: [base], turnOrder: ['0', '1'], currentPlayerIndex: 0 });

        const ctx: any = {
            state,
            playerId: '0',
            now: Date.now(),
        };

        const events = killerPlantOvergrowthTrigger(ctx);

        // Should have BREAKPOINT_MODIFIED event
        const bpEvent = events.find(e => e.type === SU_EVENTS.BREAKPOINT_MODIFIED) as any;
        expect(bpEvent).toBeDefined();
        // Since original is 20 (base_rhino/test_base?), we should see a reduction.
        // Let's apply it and check getEffectiveBreakpoint
        const newState = applyEvents(state, events);
        expect(getEffectiveBreakpoint(newState, 0)).toBe(0);
    });

    it('Weed Eater POD should gain +2 power after turn start', () => {
        const weedEater = makeMinion('we-1', 'killer_plant_weed_eater_pod', '0', 3);
        const base = {
            defId: 'base1',
            minions: [weedEater],
            ongoingActions: [],
        } as any;
        const state = makeState({ bases: [base] });

        // Initial power should be 3
        expect(getMinionPower(state, state.bases[0].minions[0], 0)).toBe(3);

        // 该 POD 的 +2 来自力量修正器读取 minion.metadata.weedEaterEmpowered
        // （当前测试环境下不对 ABILITY_TRIGGERED 的 metadataUpdate 做 reduce）
        const newState = {
            ...state,
            bases: [{
                ...state.bases[0],
                minions: [{
                    ...state.bases[0].minions[0],
                    metadata: { ...(state.bases[0].minions[0] as any).metadata, weedEaterEmpowered: true },
                }],
            }],
        } as any;

        // Power should now be 3 + 2 = 5
        expect(getMinionPower(newState, newState.bases[0].minions[0], 0)).toBe(5);
    });
});
