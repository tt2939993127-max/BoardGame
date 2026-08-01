import type { DomainCore, PlayerId, RandomFn } from '../../../engine/types';
import {
    ARENA_ZONE_IDS,
    MAGE_WARS_GAME_ID,
    type ArenaZoneId,
} from './ids';
import {
    APPRENTICE_MAGE_ORDER,
    getApprenticeMageSetup,
    getApprenticeSpellbookCount,
} from './data/apprenticeSpellbooks';
import { executeCommand } from './execute';
import { reduceEvent } from './reducer';
import { validateCommand } from './validate';
import type { MageWarsCore, MageWarsCommand, MageWarsEvent, MageWarsPlayerState } from './types';

function normalizePlayerIds(playerIds: PlayerId[]): PlayerId[] {
    return playerIds.length >= 2 ? playerIds.slice(0, 2) : ['0', '1'];
}

function createPlayerState(playerId: PlayerId, seatIndex: number, mageZoneId: ArenaZoneId): MageWarsPlayerState {
    const mageId = APPRENTICE_MAGE_ORDER[seatIndex] ?? APPRENTICE_MAGE_ORDER[0];
    const setup = getApprenticeMageSetup(mageId);

    return {
        id: playerId,
        mageId,
        life: setup.startingLife,
        damage: 0,
        mana: setup.startingMana,
        channeling: setup.channeling,
        baseMeleeDice: setup.baseMeleeDice,
        actionReady: true,
        quickcastReady: true,
        guarding: false,
        mageZoneId,
        spellbookCount: getApprenticeSpellbookCount(mageId),
        preparedSpellSlots: 0,
        preparedSpellCardIds: [],
        discardSpellCardIds: [],
    };
}

function createApprenticeArena(playerIds: PlayerId[]) {
    const zoneCoords: Array<{ id: ArenaZoneId; row: number; col: number }> = [
        { id: ARENA_ZONE_IDS.A1, row: 0, col: 0 },
        { id: ARENA_ZONE_IDS.B1, row: 0, col: 1 },
        { id: ARENA_ZONE_IDS.A2, row: 1, col: 0 },
        { id: ARENA_ZONE_IDS.B2, row: 1, col: 1 },
        { id: ARENA_ZONE_IDS.A3, row: 2, col: 0 },
        { id: ARENA_ZONE_IDS.B3, row: 2, col: 1 },
    ];

    return zoneCoords.map(({ id, row, col }) => ({
        id,
        row,
        col,
        occupantIds: [
            ...(id === ARENA_ZONE_IDS.A1 && playerIds[0] ? [playerIds[0]] : []),
            ...(id === ARENA_ZONE_IDS.B3 && playerIds[1] ? [playerIds[1]] : []),
        ],
        conjurationIds: [],
    }));
}

function resolveStartingZoneId(seatIndex: number): ArenaZoneId {
    return seatIndex === 0 ? ARENA_ZONE_IDS.A1 : ARENA_ZONE_IDS.B3;
}

export const MageWarsDomain: DomainCore<MageWarsCore, MageWarsCommand, MageWarsEvent> = {
    gameId: MAGE_WARS_GAME_ID,

    setup: (playerIds: PlayerId[], _random: RandomFn): MageWarsCore => {
        const normalizedPlayerIds = normalizePlayerIds(playerIds);
        const players = Object.fromEntries(
            normalizedPlayerIds.map((playerId, index) => [
                playerId,
                createPlayerState(playerId, index, resolveStartingZoneId(index)),
            ]),
        ) as Record<PlayerId, MageWarsPlayerState>;

        return {
            playerOrder: normalizedPlayerIds,
            currentPlayerId: normalizedPlayerIds[0],
            turnNumber: 1,
            arenaMode: 'apprentice-2x3',
            players,
            arena: createApprenticeArena(normalizedPlayerIds),
            foundationStatus: {
                intakeComplete: true,
                openDesignArtifact: true,
                spellFxRequired: true,
                spellFxDriver: 'domain-events',
            },
            gameResult: undefined,
        };
    },

    validate: validateCommand,
    execute: executeCommand,
    reduce: reduceEvent,
    isGameOver: (core) => {
        if (core.gameResult) return core.gameResult;
        const defeated = core.playerOrder.filter((playerId) => {
            const player = core.players[playerId];
            return player && player.damage >= player.life;
        });
        if (defeated.length === 0) return undefined;
        if (defeated.length > 1) return { draw: true };
        return { winner: core.playerOrder.find((playerId) => playerId !== defeated[0]) };
    },
};

export type {
    MageWarsCommand,
    MageWarsCore,
    MageWarsEvent,
    MageWarsPlayerState,
} from './types';

export {
    MAGE_WARS_COMMANDS,
    MAGE_WARS_EVENTS,
} from './types';
