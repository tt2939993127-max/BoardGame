import type { MatchState, ValidationResult } from '../../../engine/types';
import { getApprenticeSpellbook } from './data/apprenticeSpellbooks';
import { MAGE_WARS_COMMANDS } from './commands';
import type { MageWarsCommand, MageWarsCore, MageWarsPhase, MageWarsPlayerState } from './types';
import { areAdjacentZones, getArenaZone, isArenaZoneId, isSpellPrepared } from './utils';

const QUICKCAST_PHASES: MageWarsPhase[] = ['initiativeQuickcast', 'finalQuickcast'];
const CAST_PHASES: MageWarsPhase[] = ['deployment', 'initiativeQuickcast', 'creatureAction', 'finalQuickcast'];

function invalid(error: string): ValidationResult {
    return { valid: false, error };
}

function hasSpellbookCard(player: MageWarsPlayerState, spellCardId: number): boolean {
    return getApprenticeSpellbook(player.mageId).some((entry) => entry.workshopCardIds.includes(spellCardId));
}

function validateActor(state: MatchState<MageWarsCore>, command: MageWarsCommand) {
    const player = state.core.players[command.playerId];
    if (!player) return { result: invalid('unknownPlayer') };
    if (state.core.gameResult || state.sys.gameover) return { result: invalid('gameOver') };
    if (state.core.currentPlayerId !== command.playerId) return { result: invalid('notCurrentPlayer') };
    return { player };
}

export function validateCommand(
    state: MatchState<MageWarsCore>,
    command: MageWarsCommand,
): ValidationResult {
    const actor = validateActor(state, command);
    if (actor.result) return actor.result;
    const player = actor.player;
    const phase = state.sys.phase as MageWarsPhase;

    switch (command.type) {
        case MAGE_WARS_COMMANDS.PLAN_SPELLS: {
            const spellCardIds = command.payload.spellCardIds;
            if (phase !== 'planning') return invalid('wrongPhase');
            if (spellCardIds.length > 2) return invalid('tooManyPreparedSpells');
            if (new Set(spellCardIds).size !== spellCardIds.length) return invalid('duplicatePreparedSpell');
            if (!spellCardIds.every((spellCardId) => hasSpellbookCard(player, spellCardId))) {
                return invalid('spellNotInApprenticeSpellbook');
            }
            return { valid: true };
        }

        case MAGE_WARS_COMMANDS.CAST_SPELL: {
            if (!CAST_PHASES.includes(phase)) return invalid('wrongPhase');
            if (!isSpellPrepared(player, command.payload.spellCardId)) return invalid('spellNotPrepared');
            if (!hasSpellbookCard(player, command.payload.spellCardId)) return invalid('spellNotInApprenticeSpellbook');
            if (!Number.isInteger(command.payload.manaCost) || command.payload.manaCost < 0) {
                return invalid('invalidManaCost');
            }
            if (player.mana < command.payload.manaCost) return invalid('insufficientMana');
            if (QUICKCAST_PHASES.includes(phase) && !player.quickcastReady) return invalid('quickcastSpent');
            if (phase === 'creatureAction' && !player.actionReady) return invalid('actionSpent');
            if (command.payload.targetZoneId && !getArenaZone(state.core, command.payload.targetZoneId)) {
                return invalid('invalidTargetZone');
            }
            if (command.payload.targetPlayerId && !state.core.players[command.payload.targetPlayerId]) {
                return invalid('invalidTargetPlayer');
            }
            return { valid: true };
        }

        case MAGE_WARS_COMMANDS.MOVE_MAGE: {
            const { toZoneId } = command.payload;
            if (phase !== 'creatureAction') return invalid('wrongPhase');
            if (!player.actionReady) return invalid('actionSpent');
            if (!isArenaZoneId(toZoneId) || !getArenaZone(state.core, toZoneId)) return invalid('invalidZone');
            if (!areAdjacentZones(state.core, player.mageZoneId, toZoneId)) return invalid('zoneNotAdjacent');
            return { valid: true };
        }

        case MAGE_WARS_COMMANDS.GUARD: {
            if (phase !== 'creatureAction') return invalid('wrongPhase');
            if (!player.actionReady) return invalid('actionSpent');
            return { valid: true };
        }

        case MAGE_WARS_COMMANDS.DECLARE_ATTACK: {
            const defender = state.core.players[command.payload.targetPlayerId];
            if (phase !== 'creatureAction') return invalid('wrongPhase');
            if (!player.actionReady) return invalid('actionSpent');
            if (!defender) return invalid('invalidTargetPlayer');
            if (defender.id === player.id) return invalid('cannotAttackSelf');
            if (defender.damage >= defender.life) return invalid('targetAlreadyDefeated');
            if (defender.mageZoneId !== player.mageZoneId) return invalid('targetNotInSameZone');
            return { valid: true };
        }

        default:
            return invalid('unsupportedCommand');
    }
}
