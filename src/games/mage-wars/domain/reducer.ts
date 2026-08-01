import type { MageWarsCore, MageWarsEvent } from './types';
import { MAGE_WARS_EVENTS } from './events';
import { moveArenaOccupant, updatePlayer } from './utils';

function removePreparedSpell(preparedSpellCardIds: number[], spellCardId: number): number[] {
    let removed = false;
    return preparedSpellCardIds.filter((candidate) => {
        if (!removed && candidate === spellCardId) {
            removed = true;
            return false;
        }
        return true;
    });
}

export function reduceEvent(core: MageWarsCore, event: MageWarsEvent): MageWarsCore {
    switch (event.type) {
        case MAGE_WARS_EVENTS.SPELLS_PLANNED:
            return updatePlayer(core, event.payload.playerId, (player) => ({
                ...player,
                preparedSpellCardIds: [...event.payload.spellCardIds],
                preparedSpellSlots: event.payload.spellCardIds.length,
            }));

        case MAGE_WARS_EVENTS.MANA_CHANNELED:
            return updatePlayer(core, event.payload.playerId, (player) => ({
                ...player,
                mana: player.mana + event.payload.amount,
            }));

        case MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED:
            return updatePlayer(core, event.payload.playerId, (player) => {
                const preparedSpellCardIds = removePreparedSpell(
                    player.preparedSpellCardIds,
                    event.payload.spellCardId,
                );
                return {
                    ...player,
                    mana: Math.max(0, player.mana - event.payload.manaCost),
                    preparedSpellCardIds,
                    preparedSpellSlots: preparedSpellCardIds.length,
                    discardSpellCardIds: [event.payload.spellCardId, ...(player.discardSpellCardIds ?? [])],
                    quickcastReady: event.payload.castMode === 'quickcast' ? false : player.quickcastReady,
                    actionReady: event.payload.castMode === 'action' ? false : player.actionReady,
                    guarding: event.payload.castMode === 'action' ? false : player.guarding,
                };
            });

        case MAGE_WARS_EVENTS.MAGE_MOVED: {
            const moved = moveArenaOccupant(
                core,
                event.payload.playerId,
                event.payload.fromZoneId,
                event.payload.toZoneId,
            );
            return updatePlayer(moved, event.payload.playerId, (player) => ({
                ...player,
                mageZoneId: event.payload.toZoneId,
                actionReady: false,
                guarding: false,
            }));
        }

        case MAGE_WARS_EVENTS.GUARD_GAINED:
            return updatePlayer(core, event.payload.playerId, (player) => ({
                ...player,
                actionReady: false,
                guarding: true,
            }));

        case MAGE_WARS_EVENTS.ATTACK_DECLARED:
            return updatePlayer(core, event.payload.attackerId, (player) => ({
                ...player,
                actionReady: false,
                guarding: false,
            }));

        case 'DAMAGE_DEALT':
            return updatePlayer(core, event.payload.targetId, (player) => ({
                ...player,
                damage: Math.min(
                    player.life,
                    player.damage + (event.payload.actualDamage ?? event.payload.amount),
                ),
            }));

        case MAGE_WARS_EVENTS.MAGE_DEFEATED:
            return {
                ...core,
                gameResult: {
                    winner: event.payload.winnerId,
                },
            };

        case MAGE_WARS_EVENTS.TURN_ADVANCED:
            return {
                ...core,
                currentPlayerId: event.payload.toPlayerId,
                turnNumber: event.payload.turnNumber,
            };

        case MAGE_WARS_EVENTS.ACTION_READINESS_RESET:
            return updatePlayer(core, event.payload.playerId, (player) => ({
                ...player,
                actionReady: true,
                quickcastReady: true,
                guarding: false,
            }));

        default:
            return core;
    }
}
