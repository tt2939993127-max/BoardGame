import { describe, it, expect } from 'vitest';
import { smashUpCriticalImageResolver } from '../criticalImageResolver';

const BASE_ATLAS_PATHS = [
    'smashup/base/base1',
    'smashup/base/base2',
    'smashup/base/base3',
    'smashup/base/base4',
];

const CARD_ATLAS_PATHS = [
    'smashup/cards/cards1',
    'smashup/cards/cards2',
    'smashup/cards/cards3',
    'smashup/cards/cards4',
];

describe('smashUpCriticalImageResolver', () => {
    it('无 core 时返回所有卡牌图集为关键、所有基地图集为暖', () => {
        const result = smashUpCriticalImageResolver(undefined);
        expect(result.critical).toEqual(CARD_ATLAS_PATHS);
        expect(result.warm).toEqual(BASE_ATLAS_PATHS);
    });

    it('有 core 时仍返回所有卡牌图集为关键（派系选择界面需要全部展示）', () => {
        const state = {
            core: {
                players: {
                    '0': { id: '0', factions: ['pirates', 'ninjas'] },
                    '1': { id: '1', factions: ['aliens', 'dinosaurs'] },
                },
            },
        };
        const result = smashUpCriticalImageResolver(state);
        expect(result.critical).toEqual(CARD_ATLAS_PATHS);
        expect(result.warm).toEqual(BASE_ATLAS_PATHS);
    });

    it('关键列表包含全部 4 个卡牌图集', () => {
        const result = smashUpCriticalImageResolver(undefined);
        for (const atlas of CARD_ATLAS_PATHS) {
            expect(result.critical).toContain(atlas);
        }
        expect(result.critical).toHaveLength(4);
    });

    it('暖列表包含全部 4 个基地图集', () => {
        const result = smashUpCriticalImageResolver(undefined);
        for (const base of BASE_ATLAS_PATHS) {
            expect(result.warm).toContain(base);
        }
        expect(result.warm).toHaveLength(4);
    });

    it('关键列表和暖列表无重叠', () => {
        const result = smashUpCriticalImageResolver(undefined);
        const criticalSet = new Set(result.critical);
        for (const warm of result.warm) {
            expect(criticalSet.has(warm)).toBe(false);
        }
    });

    it('派系选择阶段也返回全部卡牌图集（需要展示所有派系供选择）', () => {
        const state = {
            core: {
                players: {
                    '0': { id: '0', factions: [] },
                },
                factionSelection: {
                    takenFactions: ['pirates', 'ghosts'],
                    playerSelections: { '0': ['pirates', 'ghosts'] },
                    completedPlayers: [],
                },
            },
        };
        const result = smashUpCriticalImageResolver(state);
        expect(result.critical).toEqual(CARD_ATLAS_PATHS);
        expect(result.warm).toEqual(BASE_ATLAS_PATHS);
    });
});
