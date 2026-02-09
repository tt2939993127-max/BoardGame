/**
 * buildGameDeckFromCustom 单元测试
 *
 * 验证自定义牌组能正确生成与 createDeckByFactionId 相同结构的牌组对象
 *
 * 注意：cardRegistry 当前使用 MOCK_CARDS，ID 格式为下划线（如 necro_summoner）。
 * 真实阵营数据使用连字符（如 necro-summoner）。测试使用 mock 注册表中的 ID。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildGameDeckFromCustom } from '../config/deckBuilder';
import { buildCardRegistry } from '../config/cardRegistry';
import type { CardRegistry } from '../config/cardRegistry';
import type { SerializedCustomDeck } from '../domain/types';

let registry: CardRegistry;

beforeAll(() => {
    registry = buildCardRegistry();
});

describe('buildGameDeckFromCustom', () => {
    // 使用 mock 注册表中实际存在的 ID
    const MOCK_SUMMONER_ID = 'necro_summoner';
    const MOCK_CHAMPION_ID = 'necro_champion_1';
    const MOCK_COMMON_ID = 'necro_common_1';

    it('应返回与 createDeckByFactionId 相同结构的对象', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [
                { cardId: MOCK_CHAMPION_ID, faction: 'necromancer', count: 1 },
                { cardId: MOCK_COMMON_ID, faction: 'necromancer', count: 2 },
            ],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        // 验证返回结构包含所有必要字段
        expect(result).toHaveProperty('summoner');
        expect(result).toHaveProperty('summonerPosition');
        expect(result).toHaveProperty('startingUnits');
        expect(result).toHaveProperty('startingGate');
        expect(result).toHaveProperty('startingGatePosition');
        expect(result).toHaveProperty('deck');
    });

    it('应使用召唤师所属阵营的棋盘布局', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        // 棋盘布局应来自 necromancer 预构筑配置
        expect(result.summonerPosition).toEqual({ row: 0, col: 3 });
        expect(result.startingGatePosition).toBeDefined();
        expect(result.startingUnits).toBeDefined();
        expect(Array.isArray(result.startingUnits)).toBe(true);
        expect(result.startingGate).toBeDefined();
        expect(result.startingGate.isGate).toBe(true);
    });

    it('应正确查找召唤师卡牌', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        expect(result.summoner.id).toBe(MOCK_SUMMONER_ID);
        expect(result.summoner.cardType).toBe('unit');
        expect(result.summoner.unitClass).toBe('summoner');
    });

    it('应根据手动选择的卡牌构建 deck 数组', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [
                { cardId: MOCK_CHAMPION_ID, faction: 'necromancer', count: 1 },
                { cardId: MOCK_COMMON_ID, faction: 'necromancer', count: 3 },
            ],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        // deck 数组应包含展开后的卡牌：1 张冠军 + 3 张普通 = 4 张
        expect(result.deck.length).toBe(4);

        // 验证冠军卡牌
        const champions = result.deck.filter(c => c.id.startsWith(MOCK_CHAMPION_ID));
        expect(champions.length).toBe(1);

        // 验证普通卡牌（3张，ID 带索引后缀）
        const commons = result.deck.filter(c => c.id.startsWith(MOCK_COMMON_ID));
        expect(commons.length).toBe(3);
    });

    it('deck 数组中的卡牌 ID 应唯一', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [
                { cardId: MOCK_COMMON_ID, faction: 'necromancer', count: 4 },
            ],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        const ids = result.deck.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('空 cards 列表应生成空 deck 数组', () => {
        const customDeck: SerializedCustomDeck = {
            name: '空牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        expect(result.deck).toEqual([]);
    });

    it('注册表中找不到的卡牌应被跳过', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [
                { cardId: 'nonexistent-card', faction: 'necromancer', count: 2 },
                { cardId: MOCK_COMMON_ID, faction: 'necromancer', count: 1 },
            ],
        };

        const result = buildGameDeckFromCustom(customDeck, registry);

        // 只有存在的卡牌被加入 deck
        expect(result.deck.length).toBe(1);
    });

    it('无效的召唤师 ID 应抛出错误', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: 'nonexistent-summoner',
            summonerFaction: 'necromancer',
            cards: [],
        };

        expect(() => buildGameDeckFromCustom(customDeck, registry)).toThrow('无效的召唤师 ID');
    });

    it('非召唤师类型的卡牌 ID 作为召唤师应抛出错误', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_CHAMPION_ID, // 冠军不是召唤师
            summonerFaction: 'necromancer',
            cards: [],
        };

        expect(() => buildGameDeckFromCustom(customDeck, registry)).toThrow('无效的召唤师 ID');
    });

    it('不传 registry 时应自动构建', () => {
        const customDeck: SerializedCustomDeck = {
            name: '测试牌组',
            summonerId: MOCK_SUMMONER_ID,
            summonerFaction: 'necromancer',
            cards: [],
        };

        // 不传 registry 参数
        const result = buildGameDeckFromCustom(customDeck);

        expect(result.summoner.id).toBe(MOCK_SUMMONER_ID);
        expect(result.summonerPosition).toBeDefined();
    });
});
