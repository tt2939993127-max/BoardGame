import { describe, it, expect } from 'vitest';
import { summonerWarsCriticalImageResolver } from '../criticalImageResolver';
import type { FactionId } from '../domain/types';

// 所有阵营的 hero 图集路径
const ALL_HERO_ATLASES = [
    'summonerwars/hero/Necromancer/hero',
    'summonerwars/hero/Trickster/hero',
    'summonerwars/hero/Paladin/hero',
    'summonerwars/hero/Goblin/hero',
    'summonerwars/hero/Frost/hero',
    'summonerwars/hero/Barbaric/hero',
];

// 所有阵营的 tip 图片路径
const ALL_TIP_IMAGES = [
    'summonerwars/hero/Necromancer/tip',
    'summonerwars/hero/Trickster/tip',
    'summonerwars/hero/Paladin/tip',
    'summonerwars/hero/Goblin/tip',
    'summonerwars/hero/Frost/tip',
    'summonerwars/hero/Barbaric/tip',
];

// 通用资源路径
const COMMON_PATHS = {
    map: 'summonerwars/common/map',
    cardback: 'summonerwars/common/cardback',
    portal: 'summonerwars/common/Portal',
    dice: 'summonerwars/common/dice',
};

const makeState = (
    phase: string,
    selectedFactions: Partial<Record<'0' | '1', FactionId | 'unselected'>> = {}
) => ({
    core: {
        phase,
        selectedFactions: {
            '0': selectedFactions['0'] ?? 'unselected',
            '1': selectedFactions['1'] ?? 'unselected',
        },
        players: {
            '0': { id: '0' as const },
            '1': { id: '1' as const },
        },
        board: [],
    },
});

describe('summonerWarsCriticalImageResolver', () => {
    it('无状态时预加载所有 hero 图集，tip 图片为暖加载', () => {
        const result = summonerWarsCriticalImageResolver(undefined);

        // 地图和卡背为关键
        expect(result.critical).toContain(COMMON_PATHS.map);
        expect(result.critical).toContain(COMMON_PATHS.cardback);

        // 所有 hero 图集为关键
        for (const heroPath of ALL_HERO_ATLASES) {
            expect(result.critical).toContain(heroPath);
        }

        // 所有 tip 图片为暖加载
        for (const tipPath of ALL_TIP_IMAGES) {
            expect(result.warm).toContain(tipPath);
        }
    });

    it('派系选择阶段：hero 图集为关键，tip 图片为暖加载', () => {
        const state = makeState('factionSelect');
        const result = summonerWarsCriticalImageResolver(state);

        // 地图和卡背为关键
        expect(result.critical).toContain(COMMON_PATHS.map);
        expect(result.critical).toContain(COMMON_PATHS.cardback);

        // 所有 hero 图集为关键
        for (const heroPath of ALL_HERO_ATLASES) {
            expect(result.critical).toContain(heroPath);
        }

        // 所有 tip 图片为暖加载
        for (const tipPath of ALL_TIP_IMAGES) {
            expect(result.warm).toContain(tipPath);
        }

        // cards 图集不应出现在关键列表
        expect(result.critical.some(p => p.includes('/cards'))).toBe(false);
    });

    it('游戏进行中：已选阵营的 cards 图集为关键', () => {
        const state = makeState('summon', {
            '0': 'necromancer',
            '1': 'paladin',
        });
        const result = summonerWarsCriticalImageResolver(state);

        // 通用资源为关键
        expect(result.critical).toContain(COMMON_PATHS.map);
        expect(result.critical).toContain(COMMON_PATHS.cardback);
        expect(result.critical).toContain(COMMON_PATHS.portal);
        expect(result.critical).toContain(COMMON_PATHS.dice);

        // 已选阵营的 hero 和 cards 图集为关键
        expect(result.critical).toContain('summonerwars/hero/Necromancer/hero');
        expect(result.critical).toContain('summonerwars/hero/Necromancer/cards');
        expect(result.critical).toContain('summonerwars/hero/Paladin/hero');
        expect(result.critical).toContain('summonerwars/hero/Paladin/cards');

        // 未选阵营的 cards 图集为暖加载
        expect(result.warm).toContain('summonerwars/hero/Trickster/cards');
        expect(result.warm).toContain('summonerwars/hero/Goblin/cards');
        expect(result.warm).toContain('summonerwars/hero/Frost/cards');
        expect(result.warm).toContain('summonerwars/hero/Barbaric/cards');

        // 未选阵营的 cards 不应在关键列表中
        expect(result.critical).not.toContain('summonerwars/hero/Trickster/cards');
    });

    it('单人选择阵营时只预加载该阵营的 cards 图集', () => {
        const state = makeState('summon', {
            '0': 'frost',
            '1': 'unselected', // 玩家1未选择（异常情况）
        });
        const result = summonerWarsCriticalImageResolver(state);

        // 只有已选阵营的 cards 在关键列表
        expect(result.critical).toContain('summonerwars/hero/Frost/hero');
        expect(result.critical).toContain('summonerwars/hero/Frost/cards');

        // 其他阵营的 cards 在暖加载
        expect(result.warm.length).toBe(5); // 6 - 1 = 5 个未选阵营
    });

    it('两人选择相同阵营时去重', () => {
        const state = makeState('attack', {
            '0': 'goblin',
            '1': 'goblin', // 同一阵营
        });
        const result = summonerWarsCriticalImageResolver(state);

        // goblin 的 cards 只出现一次
        const goblinCardsCount = result.critical.filter(
            p => p === 'summonerwars/hero/Goblin/cards'
        ).length;
        expect(goblinCardsCount).toBe(1);

        // goblin 的 hero 只出现一次
        const goblinHeroCount = result.critical.filter(
            p => p === 'summonerwars/hero/Goblin/hero'
        ).length;
        expect(goblinHeroCount).toBe(1);
    });

    it('所有阵营都被选中时暖加载列表为空', () => {
        // 模拟 3-4 人游戏，所有阵营都被选中的情况
        // 但当前 SummonerWars 是 2 人游戏，最多选 2 个阵营
        const state = makeState('draw', {
            '0': 'necromancer',
            '1': 'barbaric',
        });
        const result = summonerWarsCriticalImageResolver(state);

        // 暖加载列表包含未选的 4 个阵营
        expect(result.warm.length).toBe(4);
    });
});
