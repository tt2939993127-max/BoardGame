/**
 * 大杀四方 - afterScoring 响应窗口重新计分测试
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import { createInitialSystemState } from '../../../engine/pipeline';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { initAllAbilities } from '../abilities';
import { SmashUpDomain } from '../domain';
import { smashUpSystemsForTest } from '../game';
import type { MinionOnBase, SmashUpCommand, SmashUpCore, SmashUpEvent } from '../domain/types';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';

const PLAYER_IDS: PlayerId[] = ['0', '1'];
const systems = smashUpSystemsForTest;

beforeAll(() => {
    initAllAbilities();
});

function makeMinion(
    uid: string,
    defId: string,
    owner: PlayerId,
    controller: PlayerId,
    basePower: number,
    powerCounters: number,
): MinionOnBase {
    return {
        uid,
        defId,
        owner,
        controller,
        basePower,
        powerModifier: 0,
        tempPowerModifier: 0,
        powerCounters,
        attachedActions: [],
        talentUsed: false,
    };
}

function createRunner(
    setup: (ids: PlayerId[], random: RandomFn) => MatchState<SmashUpCore>,
): GameTestRunner<SmashUpCore, SmashUpCommand, SmashUpEvent> {
    return new GameTestRunner<SmashUpCore, SmashUpCommand, SmashUpEvent>({
        domain: SmashUpDomain,
        systems,
        playerIds: PLAYER_IDS,
        setup,
    });
}

describe('After Scoring 响应窗口 - 重新计分功能', () => {
    it('基本重新计分：afterScoring 改变计分基地力量后应重新计分', () => {
        const runner = createRunner((ids, random) => {
            const core = SmashUpDomain.setup(ids, random);
            const sys = createInitialSystemState(ids, systems, undefined);

            core.factionSelection = undefined;
            sys.phase = 'playCards';

            core.bases = [
                {
                    defId: 'base_the_jungle',
                    minions: [
                        makeMinion('m1', 'alien_invader', '0', '0', 3, 7),
                        makeMinion('m2', 'ninja_shinobi', '1', '1', 2, 2),
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_great_library',
                    minions: [
                        makeMinion('m3', 'robot_microbot_alpha', '0', '0', 2, 0),
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_the_hill',
                    minions: [],
                    ongoingActions: [],
                },
            ];
            core.baseDeck = ['base_secret_garden', 'base_temple_of_goju'];

            core.players['0'].hand = [
                { uid: 'c1', defId: 'giant_ant_we_are_the_champions', type: 'action', owner: '0' },
            ];
            core.players['1'].hand = [];

            return { sys, core };
        });

        const advanceResult = runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        expect(advanceResult.success).toBe(true);
        expect(runner.getState().sys.phase).toBe('scoreBases');
        expect(runner.getState().sys.responseWindow?.current?.windowType).toBe('afterScoring');

        const playResult = runner.dispatch(SU_COMMANDS.PLAY_ACTION, {
            playerId: '0',
            cardUid: 'c1',
            targetBaseIndex: 0,
        });
        expect(playResult.success).toBe(true);

        const sourcePrompt = runner.getState().sys.interaction?.current;
        expect(sourcePrompt?.data?.sourceId).toBe('giant_ant_we_are_the_champions_choose_source');

        const chooseSourceResult = runner.resolveInteraction('0', { optionId: 'minion-0' });
        expect(chooseSourceResult.success).toBe(true);

        const targetPrompt = runner.getState().sys.interaction?.current;
        expect(targetPrompt?.data?.sourceId).toBe('giant_ant_we_are_the_champions_choose_target');
        const targetOption = targetPrompt?.data?.options?.find(
            option => option?.value?.minionUid === 'm3',
        );
        expect(targetOption).toBeDefined();

        const chooseTargetResult = runner.resolveInteraction('0', { optionId: targetOption!.id });
        expect(chooseTargetResult.success).toBe(true);

        const amountPrompt = runner.getState().sys.interaction?.current;
        expect(amountPrompt?.data?.sourceId).toBe('giant_ant_we_are_the_champions_choose_amount');
        expect(amountPrompt?.data?.slider?.max).toBe(7);

        const chooseAmountResult = runner.resolveInteraction('0', {
            optionId: 'confirm-transfer',
            mergedValue: { amount: 7, value: 7 },
        });
        expect(chooseAmountResult.success).toBe(true);

        const allEvents = [
            ...advanceResult.events,
            ...playResult.events,
            ...chooseSourceResult.events,
            ...chooseTargetResult.events,
            ...chooseAmountResult.events,
        ];
        const scoredEvents = allEvents.filter(
            (event): event is Extract<SmashUpEvent, { type: typeof SU_EVENTS.BASE_SCORED }> =>
                event.type === SU_EVENTS.BASE_SCORED,
        );

        expect(scoredEvents).toHaveLength(2);
        expect(scoredEvents[0].payload.rankings[0]?.playerId).toBe('0');
        expect(scoredEvents[1].payload.rankings[0]?.playerId).toBe('1');
        expect(allEvents.filter(event => event.type === SU_EVENTS.BASE_CLEARED)).toHaveLength(1);
        expect(allEvents.filter(event => event.type === SU_EVENTS.BASE_REPLACED)).toHaveLength(1);

        const finalState = runner.getState();
        expect(finalState.sys.responseWindow?.current).toBeUndefined();
        expect(finalState.core.bases[0].defId).toBe('base_secret_garden');
        expect(finalState.core.bases[1].minions.find(minion => minion.uid === 'm3')?.powerCounters).toBe(7);
    });

    it('afterScoring 窗口打开期间不应提前清场换基地，窗口关闭后只补发一次', () => {
        const runner = createRunner((ids, random) => {
            const core = SmashUpDomain.setup(ids, random);
            const sys = createInitialSystemState(ids, systems, undefined);

            core.factionSelection = undefined;
            sys.phase = 'playCards';

            core.bases = [
                {
                    defId: 'base_the_mothership',
                    minions: [
                        makeMinion('m1', 'alien_invader', '0', '0', 3, 10),
                        makeMinion('m2', 'ninja_shinobi', '1', '1', 2, 8),
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_great_library',
                    minions: [],
                    ongoingActions: [],
                },
                {
                    defId: 'base_the_hill',
                    minions: [],
                    ongoingActions: [],
                },
            ];
            core.baseDeck = ['base_secret_garden', 'base_temple_of_goju'];

            core.players['0'].hand = [
                { uid: 'c1', defId: 'giant_ant_we_are_the_champions', type: 'action', owner: '0' },
            ];
            core.players['1'].hand = [];

            return { sys, core };
        });

        const advanceResult = runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        expect(advanceResult.success).toBe(true);
        expect(advanceResult.events.filter(event => event.type === SU_EVENTS.BASE_CLEARED)).toHaveLength(0);
        expect(advanceResult.events.filter(event => event.type === SU_EVENTS.BASE_REPLACED)).toHaveLength(0);

        const stateAfterAdvance = runner.getState();
        expect(stateAfterAdvance.sys.phase).toBe('scoreBases');
        expect(stateAfterAdvance.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        expect(stateAfterAdvance.core.bases[0].defId).toBe('base_the_mothership');
        expect(stateAfterAdvance.core.bases[0].minions.map(minion => minion.uid)).toEqual(['m1', 'm2']);

        const closeWindowResult = runner.dispatch('RESPONSE_PASS', { playerId: '0' });
        expect(closeWindowResult.success).toBe(true);

        const allEvents = [...advanceResult.events, ...closeWindowResult.events];
        expect(allEvents.filter(event => event.type === SU_EVENTS.BASE_CLEARED)).toHaveLength(1);
        expect(allEvents.filter(event => event.type === SU_EVENTS.BASE_REPLACED)).toHaveLength(1);

        const finalState = runner.getState();
        expect(finalState.sys.responseWindow?.current).toBeUndefined();
        expect(finalState.core.bases[0].defId).toBe('base_secret_garden');
    });

    it('无力量变化：afterScoring 窗口无人出牌时不重新计分', () => {
        const runner = createRunner((ids, random) => {
            const core = SmashUpDomain.setup(ids, random);
            const sys = createInitialSystemState(ids, systems, undefined);

            core.factionSelection = undefined;
            sys.phase = 'playCards';

            core.bases = [
                {
                    defId: 'base_the_mothership',
                    minions: [
                        makeMinion('m1', 'alien_invader', '0', '0', 3, 15),
                        makeMinion('m2', 'ninja_shinobi', '1', '1', 2, 10),
                    ],
                    ongoingActions: [],
                },
            ];

            core.players['0'].hand = [];
            core.players['1'].hand = [];

            return { sys, core };
        });

        const result = runner.run({
            name: '无力量变化：不重新计分',
            commands: [
                { type: 'ADVANCE_PHASE', playerId: '0', payload: undefined },
                { type: 'RESPONSE_PASS', playerId: '0', payload: undefined },
                { type: 'RESPONSE_PASS', playerId: '1', payload: undefined },
                { type: 'RESPONSE_PASS', playerId: '0', payload: undefined },
                { type: 'RESPONSE_PASS', playerId: '1', payload: undefined },
            ],
        });

        const scoredCount = result.steps
            .flatMap(step => step.events)
            .filter(eventType => eventType === SU_EVENTS.BASE_SCORED)
            .length;

        expect(scoredCount).toBe(1);
    });
});
