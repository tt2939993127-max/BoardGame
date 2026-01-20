export interface HeroState {
    id: string; // 'barbarian' | 'moon_elf'
    health: number;
    cp: number; // Combat Points
    hand: string[]; // Card IDs
    deck: string[];
    discard: string[];
    statusEffects: Record<string, number>; // stack count
}

export interface Die {
    id: number;
    value: number; // 1-6
    isKept: boolean;
    type: 'attack' | 'defense' | 'basic'; // For metadata
}

export interface DiceThroneState {
    players: Record<string, HeroState>;
    dice: Die[];
    rollCount: number; // 0-3
    turnPhase: 'upkeep' | 'income' | 'main1' | 'roll' | 'target' | 'defend' | 'main2' | 'discard';
    activePlayer: string;
}
