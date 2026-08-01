export const MAGE_WARS_GAME_ID = 'mage-wars' as const;

export const MAGE_IDS = {
    BEASTMASTER_APPRENTICE: 'beastmaster_apprentice',
    PRIESTESS_APPRENTICE: 'priestess_apprentice',
    WARLOCK_APPRENTICE: 'warlock_apprentice',
    WIZARD_APPRENTICE: 'wizard_apprentice',
} as const;

export const ARENA_ZONE_IDS = {
    A1: 'a1',
    A2: 'a2',
    A3: 'a3',
    B1: 'b1',
    B2: 'b2',
    B3: 'b3',
} as const;

export type MageId = typeof MAGE_IDS[keyof typeof MAGE_IDS];
export type ArenaZoneId = typeof ARENA_ZONE_IDS[keyof typeof ARENA_ZONE_IDS];
