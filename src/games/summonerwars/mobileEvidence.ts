import { createInitialSystemState } from '../../engine/pipeline';
import type { MatchState, RandomFn } from '../../engine/types';
import { createDeckByFactionId } from './config/factions';
import { SummonerWarsDomain } from './domain';
import { SW_SELECTION_EVENTS } from './domain/types';
import type { FactionId, PlayerId, SummonerWarsCore } from './domain/types';

type TestHarness = Window['__BG_TEST_HARNESS__'];

interface MobileEvidenceOptions {
    faction0?: FactionId;
    faction1?: FactionId;
}

function createDeterministicRandom(randomValue = 0.5): RandomFn {
    return {
        shuffle: <T>(arr: T[]) => arr,
        random: () => randomValue,
        d: (max: number) => Math.ceil(max * randomValue) || 1,
        range: (min: number, max: number) => Math.floor(min + (max - min) * randomValue),
    };
}

function createInitializedCore(
    playerIds: PlayerId[],
    random: RandomFn,
    options?: MobileEvidenceOptions,
): SummonerWarsCore {
    const faction0 = options?.faction0 ?? 'necromancer';
    const faction1 = options?.faction1 ?? 'paladin';

    let core = SummonerWarsDomain.setup(playerIds, random);

    core = SummonerWarsDomain.reduce(core, {
        type: SW_SELECTION_EVENTS.FACTION_SELECTED,
        payload: { playerId: '0', factionId: faction0 },
        timestamp: 0,
    });
    core = SummonerWarsDomain.reduce(core, {
        type: SW_SELECTION_EVENTS.FACTION_SELECTED,
        payload: { playerId: '1', factionId: faction1 },
        timestamp: 0,
    });
    core = SummonerWarsDomain.reduce(core, {
        type: SW_SELECTION_EVENTS.PLAYER_READY,
        payload: { playerId: '1' },
        timestamp: 0,
    });
    core = SummonerWarsDomain.reduce(core, {
        type: SW_SELECTION_EVENTS.HOST_STARTED,
        payload: { playerId: '0' },
        timestamp: 0,
    });

    const shuffledDecks: Record<PlayerId, unknown[]> = {
        '0': [],
        '1': [],
    };
    for (const playerId of playerIds) {
        const factionId = playerId === '0' ? faction0 : faction1;
        const deckData = createDeckByFactionId(factionId);
        const deckWithIds = deckData.deck.map((card, index) => ({
            ...card,
            id: `${card.id}-${playerId}-${index}`,
        }));
        shuffledDecks[playerId] = random.shuffle(deckWithIds);
    }

    core = SummonerWarsDomain.reduce(core, {
        type: SW_SELECTION_EVENTS.SELECTION_COMPLETE,
        payload: {
            factions: { '0': faction0, '1': faction1 },
            shuffledDecks,
        },
        timestamp: 0,
    });

    return {
        ...core,
        currentPlayer: '0',
        phase: 'summon',
    };
}

export function createSummonerWarsMobileEvidenceActionLogEntries(timestamp = Date.now()) {
    return [
        {
            id: 'mobile-log-entry-1',
            timestamp: timestamp - 1000,
            actorId: '0',
            kind: 'TEST_LOG',
            segments: [
                {
                    type: 'text',
                    text: 'Summoned a unit adjacent to the gate and spent extra magic to secure the front line.',
                },
            ],
        },
        {
            id: 'mobile-log-entry-2',
            timestamp,
            actorId: '1',
            kind: 'TEST_LOG',
            segments: [
                {
                    type: 'text',
                    text: 'Moved the champion to the exposed flank, then prepared a counterattack from long range.',
                },
            ],
        },
    ];
}

export function createSummonerWarsMobileEvidenceState(
    options?: MobileEvidenceOptions,
): MatchState<SummonerWarsCore> {
    const playerIds: PlayerId[] = ['0', '1'];
    const random = createDeterministicRandom();
    const core = createInitializedCore(playerIds, random, options);
    const sys = createInitialSystemState(playerIds, []);

    return {
        core: {
            ...core,
            turnNumber: Math.max(core.turnNumber, 3),
        },
        sys: {
            ...sys,
            phase: core.phase,
            turnNumber: Math.max(core.turnNumber, 3),
            tutorial: {
                ...sys.tutorial,
                active: false,
                steps: [],
                step: undefined,
                stepIndex: 0,
                pendingAnimationAdvance: false,
            },
        },
    };
}

export function withSummonerWarsMobileEvidenceActionLog(
    state: MatchState<SummonerWarsCore>,
    timestamp = Date.now(),
): MatchState<SummonerWarsCore> {
    return {
        ...state,
        sys: {
            ...state.sys,
            actionLog: {
                ...state.sys.actionLog,
                maxEntries: state.sys.actionLog?.maxEntries ?? 50,
                entries: createSummonerWarsMobileEvidenceActionLogEntries(timestamp),
            },
        },
    };
}

export function injectSummonerWarsMobileEvidenceScene(
    harness: TestHarness,
    options?: MobileEvidenceOptions,
) {
    if (!harness?.state?.isRegistered?.()) {
        throw new Error('TestHarness 状态注入器未就绪');
    }

    harness.state.set(createSummonerWarsMobileEvidenceState(options));
}
