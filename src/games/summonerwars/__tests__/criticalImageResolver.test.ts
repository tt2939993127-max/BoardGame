import { describe, it, expect } from 'vitest';
import { summonerWarsCriticalImageResolver } from '../criticalImageResolver';
import type { FactionId } from '../domain/types';

const ALL_HERO_ATLASES = [
    'summonerwars/hero/Necromancer/hero',
    'summonerwars/hero/Trickster/hero',
    'summonerwars/hero/Paladin/hero',
    'summonerwars/hero/Goblin/hero',
    'summonerwars/hero/Frost/hero',
    'summonerwars/hero/Barbaric/hero',
];

const ALL_TIP_IMAGES = [
    'summonerwars/hero/Necromancer/tip',
    'summonerwars/hero/Trickster/tip',
    'summonerwars/hero/Paladin/tip',
    'summonerwars/hero/Goblin/tip',
    'summonerwars/hero/Frost/tip',
    'summonerwars/hero/Barbaric/tip',
];

/** 选角界面关键资源 */
const SELECTION_CRITICAL = [
    'summonerwars/common/map',
    'summonerwars/common/cardback',
];

/** 游戏中才用到的通用资源（选角阶段应在 warm） */
const GAMEPLAY_COMMON = [
    'summonerwars/common/Portal',
    'summonerwars/common/dice',
];

const makeState = (
    hostStarted: boolean,
    selectedFactions: Partial<Record<'0' | '1', FactionId | 'unselected'>> = {},
    phase = 'summon',
) => ({
    core: {
        phase,
        hostStarted,
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
    it('无状态时：选角资源为 critical，游戏资源为 warm', () => {
        const result = summonerWarsCriticalImageResolver(undefined);

        for (const path of SELECTION_CRITICAL) {
            expect(result.critical).toContain(path);
        }
        for (const heroPath of ALL_HERO_ATLASES) {
            expect(result.critical).toContain(heroPath);
        }

        // 骰子/传送门在选角用不到，应在 warm
        for (const path of GAMEPLAY_COMMON) {
            expect(result.warm).toContain(path);
            expect(result.critical).not.toContain(path);
        }
        for (const tipPath of ALL_TIP_IMAGES) {
            expect(result.warm).toContain(tipPath);
        }

        expect(result.phaseKey).toBe('init');
    });

    it('选角阶段（hostStarted=false）：骰子/传送门在 warm 暖加载', () => {
        const state = makeState(false);
        const result = summonerWarsCriticalImageResolver(state);

        // hero 图集 + 地图/卡背为 critical
        for (const path of SELECTION_CRITICAL) {
            expect(result.critical).toContain(path);
        }
        for (const heroPath of ALL_HERO_ATLASES) {
            expect(result.critical).toContain(heroPath);
        }

        // 骰子/传送门选角用不到，应在 warm 后台软加载
        for (const path of GAMEPLAY_COMMON) {
            expect(result.warm).toContain(path);
            expect(result.critical).not.toContain(path);
        }

        // cards 不应出现
        expect(result.critical.some(p => p.includes('/cards'))).toBe(false);

        expect(result.phaseKey).toBe('factionSelect');
    });

    it('游戏进行中（hostStarted=true）：骰子/传送门提升为 critical', () => {
        const state = makeState(true, { '0': 'necromancer', '1': 'paladin' });
        const result = summonerWarsCriticalImageResolver(state);

        // 通用资源全部为 critical
        for (const path of [...SELECTION_CRITICAL, ...GAMEPLAY_COMMON]) {
            expect(result.critical).toContain(path);
        }

        // 已选阵营的 hero + cards 为 critical
        expect(result.critical).toContain('summonerwars/hero/Necromancer/hero');
        expect(result.critical).toContain('summonerwars/hero/Necromancer/cards');
        expect(result.critical).toContain('summonerwars/hero/Paladin/hero');
        expect(result.critical).toContain('summonerwars/hero/Paladin/cards');

        // 未选阵营 cards 为 warm（非教程模式）
        expect(result.warm).toContain('summonerwars/hero/Trickster/cards');
        expect(result.critical).not.toContain('summonerwars/hero/Trickster/cards');

        expect(result.phaseKey).toBe('playing');
    });

    it('教程模式游戏进行中：未选阵营不进入 warm', () => {
        const state = {
            ...makeState(true, { '0': 'necromancer', '1': 'necromancer' }),
            sys: { tutorial: { active: true } },
        };
        const result = summonerWarsCriticalImageResolver(state);

        // 已选阵营资源仍为 critical
        expect(result.critical).toContain('summonerwars/hero/Necromancer/hero');
        expect(result.critical).toContain('summonerwars/hero/Necromancer/cards');

        // 教程模式：warm 为空，不预加载未选阵营
        expect(result.warm).toHaveLength(0);
        expect(result.phaseKey).toBe('playing');
    });

    it('phaseKey 变化触发 CriticalImageGate 重新预加载', () => {
        const selectResult = summonerWarsCriticalImageResolver(makeState(false));
        const playResult = summonerWarsCriticalImageResolver(
            makeState(true, { '0': 'necromancer', '1': 'paladin' }),
        );

        expect(selectResult.phaseKey).toBe('factionSelect');
        expect(playResult.phaseKey).toBe('playing');
        expect(selectResult.phaseKey).not.toBe(playResult.phaseKey);
    });

    it('两人选相同阵营时去重', () => {
        const state = makeState(true, { '0': 'goblin', '1': 'goblin' });
        const result = summonerWarsCriticalImageResolver(state);

        const goblinCardsCount = result.critical.filter(
            p => p === 'summonerwars/hero/Goblin/cards',
        ).length;
        expect(goblinCardsCount).toBe(1);
    });
});
