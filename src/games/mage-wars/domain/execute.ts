import type { MatchState, RandomFn } from '../../../engine/types';
import { createDamageCalculation } from '../../../engine/primitives/damageCalculation';
import { MAGE_WARS_COMMANDS } from './commands';
import { MAGE_WARS_EVENTS } from './events';
import type { MageWarsCommand, MageWarsCore, MageWarsEvent, MageWarsPhase } from './types';

function resolveTimestamp(command: MageWarsCommand): number {
    return command.timestamp ?? 0;
}

function resolveCastMode(phase: MageWarsPhase): 'quickcast' | 'action' | 'deployment' {
    if (phase === 'initiativeQuickcast' || phase === 'finalQuickcast') return 'quickcast';
    if (phase === 'deployment') return 'deployment';
    return 'action';
}

export function executeCommand(
    state: MatchState<MageWarsCore>,
    command: MageWarsCommand,
    random: RandomFn,
): MageWarsEvent[] {
    const player = state.core.players[command.playerId];
    const timestamp = resolveTimestamp(command);
    if (!player) return [];

    switch (command.type) {
        case MAGE_WARS_COMMANDS.PLAN_SPELLS:
            return [{
                type: MAGE_WARS_EVENTS.SPELLS_PLANNED,
                payload: {
                    playerId: command.playerId,
                    spellCardIds: command.payload.spellCardIds,
                },
                sourceCommandType: command.type,
                timestamp,
            }];

        case MAGE_WARS_COMMANDS.CAST_SPELL:
            return [{
                type: MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED,
                payload: {
                    playerId: command.playerId,
                    spellCardId: command.payload.spellCardId,
                    manaCost: command.payload.manaCost,
                    castMode: resolveCastMode(state.sys.phase as MageWarsPhase),
                    targetPlayerId: command.payload.targetPlayerId,
                    targetZoneId: command.payload.targetZoneId,
                },
                sourceCommandType: command.type,
                timestamp,
            }];

        case MAGE_WARS_COMMANDS.MOVE_MAGE:
            return [{
                type: MAGE_WARS_EVENTS.MAGE_MOVED,
                payload: {
                    playerId: command.playerId,
                    fromZoneId: player.mageZoneId,
                    toZoneId: command.payload.toZoneId,
                },
                sourceCommandType: command.type,
                timestamp,
            }];

        case MAGE_WARS_COMMANDS.GUARD:
            return [{
                type: MAGE_WARS_EVENTS.GUARD_GAINED,
                payload: {
                    playerId: command.playerId,
                },
                sourceCommandType: command.type,
                timestamp,
            }];

        case MAGE_WARS_COMMANDS.DECLARE_ATTACK: {
            const defender = state.core.players[command.payload.targetPlayerId];
            if (!defender) return [];
            const diceResults = Array.from(
                { length: player.baseMeleeDice },
                () => random.d(3),
            );
            const baseDamage = diceResults.reduce((total, result) => total + result, 0);
            const damageEvents = createDamageCalculation({
                state,
                source: { playerId: command.playerId, abilityId: 'mage-basic-melee' },
                target: { playerId: defender.id },
                baseDamage,
                autoCollectTokens: false,
                autoCollectStatus: false,
                autoCollectBonusDamage: false,
                damageScope: 'attack',
                timestamp,
            }).toEvents() as MageWarsEvent[];
            const damageAmount = damageEvents.reduce((total, event) => {
                if (event.type !== 'DAMAGE_DEALT') return total;
                return total + (event.payload.actualDamage ?? event.payload.amount);
            }, 0);
            const events: MageWarsEvent[] = [{
                type: MAGE_WARS_EVENTS.ATTACK_DECLARED,
                payload: {
                    attackerId: command.playerId,
                    defenderId: defender.id,
                    diceResults,
                    baseDamage,
                },
                sourceCommandType: command.type,
                timestamp,
            }, ...damageEvents];
            if (defender.damage + damageAmount >= defender.life) {
                events.push({
                    type: MAGE_WARS_EVENTS.MAGE_DEFEATED,
                    payload: {
                        defeatedPlayerId: defender.id,
                        winnerId: command.playerId,
                    },
                    sourceCommandType: command.type,
                    timestamp,
                });
            }
            return events;
        }

        default:
            return [];
    }
}
