
import type { Card, UnitCard, EventCard, StructureCard } from '../domain/types';
import { FACTION_CATALOG } from './factions';

// 用于 UI 开发的模拟数据
const MOCK_CARDS: Card[] = [
    // Necromancer
    {
        id: 'necro_summoner',
        cardType: 'unit',
        name: 'Ret-Talus',
        unitClass: 'summoner',
        faction: 'necromancer',
        strength: 3,
        life: 6,
        cost: 0,
        attackType: 'ranged',
        attackRange: 3,
        deckSymbols: ['skull'],
        abilities: ['raise_dead']
    } as UnitCard,
    {
        id: 'necro_champion_1',
        cardType: 'unit',
        name: 'Dragos',
        unitClass: 'champion',
        faction: 'necromancer',
        strength: 3,
        life: 5,
        cost: 5,
        attackType: 'melee',
        attackRange: 1,
        deckSymbols: ['skull'],
    } as UnitCard,
    {
        id: 'necro_common_1',
        cardType: 'unit',
        name: 'Skeleton',
        unitClass: 'common',
        faction: 'necromancer',
        strength: 1,
        life: 1,
        cost: 0,
        attackType: 'melee',
        attackRange: 1,
        deckSymbols: ['skull'],
    } as UnitCard,
    {
        id: 'necro_event_1',
        cardType: 'event',
        name: 'Raise Dead',
        cost: 0,
        playPhase: 'summon',
        effect: 'Return a common unit from discard pile to play.',
        deckSymbols: ['skull'],
    } as EventCard,
    {
        id: 'necro_gate',
        cardType: 'structure',
        name: 'Gate',
        cost: 0,
        life: 5,
        isGate: true,
        deckSymbols: ['skull'],
    } as StructureCard,

    // Goblins
    {
        id: 'goblin_summoner',
        cardType: 'unit',
        name: 'Sneeks',
        unitClass: 'summoner',
        faction: 'goblin',
        strength: 3,
        life: 5,
        cost: 0,
        attackType: 'melee',
        attackRange: 1,
        deckSymbols: ['axe'],
    } as UnitCard,
    {
        id: 'goblin_common_1',
        cardType: 'unit',
        name: 'Beast Rider',
        unitClass: 'common',
        faction: 'goblin',
        strength: 2,
        life: 2,
        cost: 1,
        attackType: 'melee',
        attackRange: 1,
        deckSymbols: ['axe'],
    } as UnitCard,
];

// 辅助扩展卡牌用于测试
const ALL_CARDS = [...MOCK_CARDS];

export type CardRegistry = Map<string, Card>;

let registry: CardRegistry | null = null;

export function buildCardRegistry(): CardRegistry {
    if (registry) return registry;
    registry = new Map();
    // 在真实应用中，我们会在这里处理所有阵营。
    // 目前使用模拟数据。
    ALL_CARDS.forEach(card => registry!.set(card.id, card));
    return registry;
}

export function getCardPoolByFaction(factionId: string): Card[] {
    // 在真实实现中，这将从完整注册表中过滤
    // 目前我们返回模拟卡牌并按阵营过滤
    return ALL_CARDS.filter(c => {
        if ('faction' in c) return c.faction === factionId;
        // 事件/建筑在领域类型中没有 'faction' 字段，但在配置中通常有
        // 我们通过 ID 前缀来模拟此 UI 演示
        return c.id.startsWith(factionId.substring(0, 4));
    });
}

export interface GroupedCards {
    summoners: UnitCard[];
    champions: UnitCard[];
    commons: UnitCard[];
    events: EventCard[];
    structures: StructureCard[];
}

export function groupCardsByType(cards: Card[]): GroupedCards {
    const groups: GroupedCards = {
        summoners: [],
        champions: [],
        commons: [],
        events: [],
        structures: [],
    };

    cards.forEach(card => {
        if (card.cardType === 'unit') {
            if (card.unitClass === 'summoner') groups.summoners.push(card);
            else if (card.unitClass === 'champion') groups.champions.push(card);
            else groups.commons.push(card);
        } else if (card.cardType === 'event') {
            groups.events.push(card);
        } else if (card.cardType === 'structure') {
            groups.structures.push(card);
        }
    });

    return groups;
}
