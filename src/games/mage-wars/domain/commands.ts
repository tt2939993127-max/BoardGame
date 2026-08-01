import type { Command, PlayerId } from '../../../engine/types';
import type { ArenaZoneId } from './ids';

export const MAGE_WARS_COMMANDS = {
    PLAN_SPELLS: 'mw:plan_spells',
    CAST_SPELL: 'mw:cast_spell',
    MOVE_MAGE: 'mw:move_mage',
    GUARD: 'mw:guard',
    DECLARE_ATTACK: 'mw:declare_attack',
} as const;

export interface MageWarsPlanSpellsCommand extends Command<typeof MAGE_WARS_COMMANDS.PLAN_SPELLS> {
    payload: {
        spellCardIds: number[];
    };
}

export interface MageWarsCastSpellCommand extends Command<typeof MAGE_WARS_COMMANDS.CAST_SPELL> {
    payload: {
        spellCardId: number;
        manaCost: number;
        targetPlayerId?: PlayerId;
        targetZoneId?: ArenaZoneId;
    };
}

export interface MageWarsMoveMageCommand extends Command<typeof MAGE_WARS_COMMANDS.MOVE_MAGE> {
    payload: {
        toZoneId: ArenaZoneId;
    };
}

export interface MageWarsGuardCommand extends Command<typeof MAGE_WARS_COMMANDS.GUARD> {
    payload: Record<string, never>;
}

export interface MageWarsDeclareAttackCommand extends Command<typeof MAGE_WARS_COMMANDS.DECLARE_ATTACK> {
    payload: {
        targetPlayerId: PlayerId;
    };
}

export type MageWarsCommand =
    | MageWarsPlanSpellsCommand
    | MageWarsCastSpellCommand
    | MageWarsMoveMageCommand
    | MageWarsGuardCommand
    | MageWarsDeclareAttackCommand;
