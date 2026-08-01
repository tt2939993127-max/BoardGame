import type { PlayerId } from '../../../engine/types';
import type { ArenaZoneId } from './ids';
import { ARENA_ZONE_IDS } from './ids';
import type { MageWarsCore, MageWarsPlayerState } from './types';

export function getOpponentId(core: MageWarsCore, playerId: PlayerId): PlayerId {
    return core.playerOrder.find((candidate) => candidate !== playerId) ?? playerId;
}

export function updatePlayer(
    core: MageWarsCore,
    playerId: PlayerId,
    updater: (player: MageWarsPlayerState) => MageWarsPlayerState,
): MageWarsCore {
    const player = core.players[playerId];
    if (!player) return core;

    const nextPlayer = updater(player);
    if (nextPlayer === player) return core;

    return {
        ...core,
        players: {
            ...core.players,
            [playerId]: nextPlayer,
        },
    };
}

export function getArenaZone(core: MageWarsCore, zoneId: ArenaZoneId) {
    return core.arena.find((zone) => zone.id === zoneId);
}

export function isArenaZoneId(value: unknown): value is ArenaZoneId {
    return typeof value === 'string'
        && (Object.values(ARENA_ZONE_IDS) as string[]).includes(value);
}

export function areAdjacentZones(core: MageWarsCore, leftId: ArenaZoneId, rightId: ArenaZoneId): boolean {
    if (leftId === rightId) return false;
    const left = getArenaZone(core, leftId);
    const right = getArenaZone(core, rightId);
    if (!left || !right) return false;
    return Math.abs(left.row - right.row) + Math.abs(left.col - right.col) === 1;
}

export function isSpellPrepared(player: MageWarsPlayerState, spellCardId: number): boolean {
    return player.preparedSpellCardIds.includes(spellCardId);
}

export function moveArenaOccupant(
    core: MageWarsCore,
    playerId: PlayerId,
    fromZoneId: ArenaZoneId,
    toZoneId: ArenaZoneId,
): MageWarsCore {
    return {
        ...core,
        arena: core.arena.map((zone) => {
            if (zone.id === fromZoneId) {
                return {
                    ...zone,
                    occupantIds: zone.occupantIds.filter((occupantId) => occupantId !== playerId),
                };
            }
            if (zone.id === toZoneId) {
                return zone.occupantIds.includes(playerId)
                    ? zone
                    : { ...zone, occupantIds: [...zone.occupantIds, playerId] };
            }
            return zone;
        }),
    };
}
