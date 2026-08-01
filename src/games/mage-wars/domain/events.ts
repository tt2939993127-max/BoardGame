import type { GameEvent, PlayerId } from '../../../engine/types';
import type { ArenaZoneId } from './ids';

export const MAGE_WARS_EVENTS = {
    FOUNDATION_READY: 'MW_FOUNDATION_READY',
    SPELLS_PLANNED: 'MW_SPELLS_PLANNED',
    MANA_CHANNELED: 'MW_MANA_CHANNELED',
    SPELL_CAST_RESOLVED: 'MW_SPELL_CAST_RESOLVED',
    MAGE_MOVED: 'MW_MAGE_MOVED',
    GUARD_GAINED: 'MW_GUARD_GAINED',
    ATTACK_DECLARED: 'MW_ATTACK_DECLARED',
    MAGE_DEFEATED: 'MW_MAGE_DEFEATED',
    TURN_ADVANCED: 'MW_TURN_ADVANCED',
    ACTION_READINESS_RESET: 'MW_ACTION_READINESS_RESET',
} as const;

export interface MageWarsFoundationReadyEvent extends GameEvent<typeof MAGE_WARS_EVENTS.FOUNDATION_READY> {
    payload: {
        scope: 'foundation';
    };
}

export interface MageWarsSpellsPlannedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.SPELLS_PLANNED> {
    payload: {
        playerId: PlayerId;
        spellCardIds: number[];
    };
}

export interface MageWarsManaChanneledEvent extends GameEvent<typeof MAGE_WARS_EVENTS.MANA_CHANNELED> {
    payload: {
        playerId: PlayerId;
        amount: number;
    };
}

export interface MageWarsSpellCastResolvedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.SPELL_CAST_RESOLVED> {
    payload: {
        playerId: PlayerId;
        spellCardId: number;
        manaCost: number;
        castMode: 'quickcast' | 'action' | 'deployment';
        targetPlayerId?: PlayerId;
        targetZoneId?: ArenaZoneId;
    };
}

export interface MageWarsMageMovedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.MAGE_MOVED> {
    payload: {
        playerId: PlayerId;
        fromZoneId: ArenaZoneId;
        toZoneId: ArenaZoneId;
    };
}

export interface MageWarsGuardGainedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.GUARD_GAINED> {
    payload: {
        playerId: PlayerId;
    };
}

export interface MageWarsAttackDeclaredEvent extends GameEvent<typeof MAGE_WARS_EVENTS.ATTACK_DECLARED> {
    payload: {
        attackerId: PlayerId;
        defenderId: PlayerId;
        diceResults: number[];
        baseDamage: number;
    };
}

export interface MageWarsDamageDealtEvent extends GameEvent<'DAMAGE_DEALT'> {
    payload: {
        targetId: PlayerId;
        amount: number;
        actualDamage?: number;
        sourceAbilityId?: string;
    };
}

export interface MageWarsMageDefeatedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.MAGE_DEFEATED> {
    payload: {
        defeatedPlayerId: PlayerId;
        winnerId: PlayerId;
    };
}

export interface MageWarsTurnAdvancedEvent extends GameEvent<typeof MAGE_WARS_EVENTS.TURN_ADVANCED> {
    payload: {
        fromPlayerId: PlayerId;
        toPlayerId: PlayerId;
        turnNumber: number;
    };
}

export interface MageWarsActionReadinessResetEvent extends GameEvent<typeof MAGE_WARS_EVENTS.ACTION_READINESS_RESET> {
    payload: {
        playerId: PlayerId;
    };
}

export type MageWarsEvent =
    | MageWarsFoundationReadyEvent
    | MageWarsSpellsPlannedEvent
    | MageWarsManaChanneledEvent
    | MageWarsSpellCastResolvedEvent
    | MageWarsMageMovedEvent
    | MageWarsGuardGainedEvent
    | MageWarsAttackDeclaredEvent
    | MageWarsDamageDealtEvent
    | MageWarsMageDefeatedEvent
    | MageWarsTurnAdvancedEvent
    | MageWarsActionReadinessResetEvent;
