import type { GameOverResult, PlayerId } from '../../../engine/types';
import type { ArenaZoneId, MageId } from './ids';

export type MageWarsPhase =
    | 'reset'
    | 'channel'
    | 'upkeep'
    | 'planning'
    | 'deployment'
    | 'initiativeQuickcast'
    | 'creatureAction'
    | 'finalQuickcast';

export const MAGE_WARS_PHASE_ORDER: MageWarsPhase[] = [
    'reset',
    'channel',
    'upkeep',
    'planning',
    'deployment',
    'initiativeQuickcast',
    'creatureAction',
    'finalQuickcast',
];

export interface MageWarsPlayerState {
    id: PlayerId;
    mageId: MageId;
    life: number;
    damage: number;
    mana: number;
    channeling: number;
    baseMeleeDice: number;
    actionReady: boolean;
    quickcastReady: boolean;
    guarding: boolean;
    mageZoneId: ArenaZoneId;
    spellbookCount: number;
    preparedSpellSlots: number;
    preparedSpellCardIds: number[];
    discardSpellCardIds: number[];
}

export interface MageWarsArenaZone {
    id: ArenaZoneId;
    row: number;
    col: number;
    occupantIds: string[];
    conjurationIds: string[];
    fieldCardIds?: number[];
}

export interface MageWarsFoundationStatus {
    intakeComplete: boolean;
    openDesignArtifact: boolean;
    spellFxRequired: true;
    spellFxDriver: 'domain-events';
}

export interface MageWarsCore {
    playerOrder: PlayerId[];
    currentPlayerId: PlayerId;
    turnNumber: number;
    arenaMode: 'apprentice-2x3';
    players: Record<PlayerId, MageWarsPlayerState>;
    arena: MageWarsArenaZone[];
    foundationStatus: MageWarsFoundationStatus;
    gameResult?: GameOverResult;
}
