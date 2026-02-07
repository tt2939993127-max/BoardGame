import { STATUS_IDS, TOKEN_IDS, DICETHRONE_STATUS_ATLAS_IDS } from './ids';

export type StatusEffectMeta = {
    color?: string;
    icon?: string;
    frameId?: string;
    atlasId?: string;
};

/** 被动状态效果元数据 (Unified Registry) */
export const STATUS_EFFECT_META: Record<string, StatusEffectMeta> = {
    // Common / Shared (Temporarily using Monk atlas for shared)
    [STATUS_IDS.KNOCKDOWN]: {
        frameId: 'pyro-status-3',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.PYROMANCER,
    },
    [STATUS_IDS.STUN]: {
        frameId: 'pyro-status-1',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.PYROMANCER,
    },

    // Barbarian
    [STATUS_IDS.CONCUSSION]: {
        frameId: 'vulnerable',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.BARBARIAN,
    },
    [STATUS_IDS.DAZE]: {
        frameId: 'stun',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.BARBARIAN,
    },

    // Pyromancer
    [STATUS_IDS.BURN]: {
        frameId: 'pyro-status-4',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.PYROMANCER,
    },
};

/** Token 元数据 (Unified Registry) */
export const TOKEN_META: Record<string, StatusEffectMeta> = {
    // Monk
    [TOKEN_IDS.TAIJI]: {
        frameId: 'tai-chi',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.MONK,
    },
    [TOKEN_IDS.EVASIVE]: {
        frameId: 'dodge',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.MONK,
    },
    [TOKEN_IDS.PURIFY]: {
        frameId: TOKEN_IDS.PURIFY,
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.MONK,
    },

    // Pyromancer
    [TOKEN_IDS.FIRE_MASTERY]: {
        frameId: 'pyro-status-2', // Mapped from rename
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.PYROMANCER,
    },
};
