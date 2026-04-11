import { beforeAll, describe, expect, it } from 'vitest';
import type { MatchState } from '../../../engine/types';
import { INTERACTION_COMMANDS, asSimpleChoice } from '../../../engine/systems/InteractionSystem';
import { executePipeline, createInitialSystemState } from '../../../engine/pipeline';
import { initAllAbilities } from '../abilities';
import { SmashUpDomain } from '../domain';
import type { SmashUpCommand, SmashUpCore, TitanState } from '../domain/types';
import { makeBase, makeMinion, makePlayer, makeCard } from './helpers';
import { smashUpSystemsForTest } from '../game';
import { defaultTestRandom } from './testRunner';
import { SMASHUP_FACTION_IDS } from '../domain/ids';

beforeAll(() => {
    initAllAbilities();
});

function runCommandWithFullSystems(initialState: MatchState<SmashUpCore>, command: SmashUpCommand) {
    const playerIds = Object.keys(initialState.core.players);
    const result = executePipeline(
        {
            domain: SmashUpDomain,
            systems: smashUpSystemsForTest,
        },
        initialState,
        command,
        defaultTestRandom,
        playerIds,
    );
    return {
        success: result.success,
        finalState: result.state,
        events: result.events,
        error: result.error,
    };
}

function findOption(choice: any, predicate: (option: any) => boolean): string {
    const option = choice.options.find(predicate);
    if (!option) {
        throw new Error(`找不到匹配选项: ${JSON.stringify(choice.options.map((item: any) => item.id))}`);
    }
    return option.id;
}

describe('pirate_king afterScoring window', () => {
    it('海盗王结算后，若当前回合玩家被限制打行动牌，不应错误打开 afterScoring 响应窗口', () => {
        const state: MatchState<SmashUpCore> = {
            core: {
                turnOrder: ['0', '1'],
                currentPlayerIndex: 1,
                turnNumber: 3,
                players: {
                    '0': makePlayer('0', { factions: ['pirates', 'robots'] as [string, string] }),
                    '1': makePlayer('1', {
                        factions: ['giant_ants', 'wizards'] as [string, string],
                        hand: [makeCard('champ-1', 'giant_ant_we_are_the_champions', 'action', '1')],
                    }),
                },
                bases: [
                    makeBase('base_temple_of_goju', [
                        makeMinion('pow-0', 'robot_zapbot', '0', 10),
                        makeMinion('pow-1', 'test_minion', '1', 10),
                    ]),
                    makeBase('base_the_jungle', [
                        makeMinion('king-0', 'pirate_king', '0', 5),
                    ]),
                ],
                baseDeck: ['base_central_brain'],
                factionSelection: undefined,
                scoringEligibleBases: undefined,
                sleepMarkedPlayers: ['1'],
            },
            sys: {
                ...createInitialSystemState(['0', '1'], smashUpSystemsForTest, undefined),
                phase: 'playCards',
            },
        };

        const advance = runCommandWithFullSystems(state, {
            type: 'ADVANCE_PHASE',
            playerId: '1',
            payload: undefined,
        });
        expect(advance.success).toBe(true);

        const pirateKingChoice = asSimpleChoice(advance.finalState.sys.interaction?.current);
        expect(pirateKingChoice?.sourceId).toBe('pirate_king_move');

        const stayOption = findOption(pirateKingChoice, option => option.value?.move === false);
        const resolvePirateKing = runCommandWithFullSystems(advance.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: stayOption },
        });

        expect(resolvePirateKing.success).toBe(true);
        expect(resolvePirateKing.finalState.sys.responseWindow?.current).toBeFalsy();
        expect(resolvePirateKing.finalState.sys.interaction?.current).toBeFalsy();
        expect(resolvePirateKing.finalState.sys.phase).toBe('playCards');
        expect(resolvePirateKing.finalState.core.currentPlayerIndex).toBe(0);
    });

    it('大副先结算后，海怪克拉肯仍应保留替换基地登场机会', () => {
        const state: MatchState<SmashUpCore> = {
            core: {
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                turnNumber: 3,
                players: {
                    '0': makePlayer('0', {
                        factions: ['pirates', 'aliens'] as [string, string],
                    }),
                    '1': makePlayer('1', {
                        factions: ['robots', 'wizards'] as [string, string],
                    }),
                },
                bases: [
                    makeBase('base_the_homeworld', [
                        makeMinion('mate-0', 'pirate_first_mate_pod', '0', 2),
                        makeMinion('big-0', 'test_big_pirate', '0', 19),
                    ]),
                    makeBase('base_the_mothership'),
                ],
                baseDeck: ['base_factory_436-1337'],
                titans: [{
                    uid: 't-kraken-setaside',
                    defId: 'pirates_the_kraken',
                    faction: SMASHUP_FACTION_IDS.PIRATES,
                    ownerId: '0',
                    controllerId: '0',
                    powerCounters: 0,
                    talentUsed: false,
                    location: { zone: 'setaside' },
                } satisfies TitanState],
                factionSelection: undefined,
                scoringEligibleBases: undefined,
            },
            sys: {
                ...createInitialSystemState(['0', '1'], smashUpSystemsForTest, undefined),
                phase: 'playCards',
            },
        };

        const advance = runCommandWithFullSystems(state, {
            type: 'ADVANCE_PHASE',
            playerId: '0',
            payload: undefined,
        });
        expect(advance.success).toBe(true);

        const firstChoice = asSimpleChoice(advance.finalState.sys.interaction?.current);
        expect(firstChoice?.sourceId).toBe('reaction_queue_choose_next');
        const firstMateTrigger = advance.finalState.core.triggerQueue?.find(trigger => trigger.sourceDefId === 'pirate_first_mate');
        expect(firstMateTrigger).toBeTruthy();

        const resolveFirstMateTrigger = runCommandWithFullSystems(advance.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: firstChoice!.playerId,
            payload: { optionId: firstMateTrigger!.id },
        });
        expect(resolveFirstMateTrigger.success).toBe(true);

        const firstMateChoice = asSimpleChoice(resolveFirstMateTrigger.finalState.sys.interaction?.current);
        expect(firstMateChoice?.sourceId).toBe('pirate_first_mate_choose_base');
        const moveToBase1 = findOption(firstMateChoice, option => option.value?.baseIndex === 1);

        const resolveFirstMateMove = runCommandWithFullSystems(resolveFirstMateTrigger.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: firstMateChoice!.playerId,
            payload: { optionId: moveToBase1 },
        });
        expect(resolveFirstMateMove.success).toBe(true);

        let postFirstMateChoice = asSimpleChoice(resolveFirstMateMove.finalState.sys.interaction?.current);
        expect(postFirstMateChoice).toBeTruthy();
        if (postFirstMateChoice?.sourceId === 'reaction_queue_choose_next') {
            const krakenTrigger = resolveFirstMateMove.finalState.core.triggerQueue?.find(trigger => trigger.sourceDefId === 'pirates_the_kraken');
            expect(krakenTrigger).toBeTruthy();
            const resolveKrakenTrigger = runCommandWithFullSystems(resolveFirstMateMove.finalState, {
                type: INTERACTION_COMMANDS.RESPOND,
                playerId: postFirstMateChoice.playerId,
                payload: { optionId: krakenTrigger!.id },
            });
            expect(resolveKrakenTrigger.success).toBe(true);
            postFirstMateChoice = asSimpleChoice(resolveKrakenTrigger.finalState.sys.interaction?.current);
        }

        expect(postFirstMateChoice?.sourceId).toBe('titan_pirates_the_kraken_play_replacement');
    });
});
