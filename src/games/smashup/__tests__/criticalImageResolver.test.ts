import { describe, it, expect } from 'vitest';
import { smashUpCriticalImageResolver } from '../criticalImageResolver';

const BASE_ATLAS_PATHS = [
    'smashup/base/base1',
    'smashup/base/base2',
    'smashup/base/base3',
    'smashup/base/base4',
];

const makeState = (playerFactions: [string, string][], takenFactions?: string[]) => ({
    core: {
        players: Object.fromEntries(
            playerFactions.map(([f1, f2], i) => [
                String(i),
                { id: String(i), factions: [f1, f2] },
            ]),
        ),
        factionSelection: takenFactions
            ? { takenFactions, playerSelections: {}, completedPlayers: [] }
            : undefined,
    },
});

describe('smashUpCriticalImageResolver', () => {
    it('无 core 时返回所有基地为关键、所有卡牌图集为暖', () => {
        const result = smashUpCriticalImageResolver(undefined);
        expect(result.critical).toEqual(BASE_ATLAS_PATHS);
        expect(result.warm).toHaveLength(4);
    });

    it('玩家选了同一图集的派系时，关键图集去重', () => {
        const state = makeState([['pirates', 'ninjas'], ['aliens', 'dinosaurs']]);
        const result = smashUpCriticalImageResolver(state);
        // All four factions are in CARDS1
        expect(result.critical).toContain('smashup/cards/cards1');
        expect(result.critical.filter(p => p === 'smashup/cards/cards1')).toHaveLength(1);
        // Other 3 card atlases should be warm
        expect(result.warm).toHaveLength(3);
    });

    it('跨图集的派系选择正确分类', () => {
        // pirates (CARDS1) + ghosts (CARDS3)
        const state = makeState([['pirates', 'ghosts']]);
        const result = smashUpCriticalImageResolver(state);
        expect(result.critical).toContain('smashup/cards/cards1');
        expect(result.critical).toContain('smashup/cards/cards3');
        expect(result.warm).toContain('smashup/cards/cards2');
        expect(result.warm).toContain('smashup/cards/cards4');
    });

    it('所有 4 个图集都被选中时暖列表为空', () => {
        const state = makeState([
            ['pirates', 'minions_of_cthulhu'],
            ['ghosts', 'wizards'],
        ]);
        const result = smashUpCriticalImageResolver(state);
        expect(result.warm).toHaveLength(0);
        expect(result.critical).toContain('smashup/cards/cards1');
        expect(result.critical).toContain('smashup/cards/cards2');
        expect(result.critical).toContain('smashup/cards/cards3');
        expect(result.critical).toContain('smashup/cards/cards4');
    });

    it('基地图集始终在关键列表中', () => {
        const state = makeState([['pirates', 'ninjas']]);
        const result = smashUpCriticalImageResolver(state);
        for (const base of BASE_ATLAS_PATHS) {
            expect(result.critical).toContain(base);
        }
    });

    it('派系选择阶段（无已确认派系）时回退到 factionSelection.takenFactions', () => {
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
        expect(result.critical).toContain('smashup/cards/cards1');
        expect(result.critical).toContain('smashup/cards/cards3');
    });
});
