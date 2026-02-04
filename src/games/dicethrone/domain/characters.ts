/**
 * DiceThrone 角色数据注册表
 * 用于解耦核心逻辑与具体角色数据
 */

import type { PlayerId, RandomFn } from '../../../engine/types';
import type { TokenDef } from '../../../systems/TokenSystem';
import type { AbilityCard, HeroState, SelectableCharacterId, Die, DieFace } from './types';
import { MONK_ABILITIES, MONK_TOKENS, MONK_INITIAL_TOKENS, getMonkStartingDeck } from '../monk';
import { BARBARIAN_ABILITIES, BARBARIAN_TOKENS, BARBARIAN_INITIAL_TOKENS, getBarbarianStartingDeck } from '../barbarian';
import { diceSystem } from '../../../systems/DiceSystem';
import { resourceSystem } from './resourceSystem';
import { RESOURCE_IDS } from './resources';
import { STATUS_IDS } from './ids';

export interface CharacterData {
    id: SelectableCharacterId;
    abilities: any[];
    tokens: TokenDef[];
    initialTokens: Record<string, number>;
    diceDefinitionId: string;
    getStartingDeck: (random: RandomFn) => AbilityCard[];
    initialAbilityLevels: Record<string, number>;
}

const BARBARIAN_DATA: CharacterData = {
    id: 'barbarian',
    abilities: BARBARIAN_ABILITIES,
    tokens: BARBARIAN_TOKENS,
    initialTokens: BARBARIAN_INITIAL_TOKENS,
    diceDefinitionId: 'barbarian-dice',
    getStartingDeck: getBarbarianStartingDeck,
    initialAbilityLevels: {
        'slap': 1,
        'all-out-strike': 1,
        'powerful-strike': 1,
        'violent-assault': 1,
        'steadfast': 1,
        'suppress': 1,
        'reckless-strike': 1,
        'thick-skin': 1,
    },
};

export const CHARACTER_DATA_MAP: Record<SelectableCharacterId, CharacterData> = {
    monk: {
        id: 'monk',
        abilities: MONK_ABILITIES,
        tokens: MONK_TOKENS,
        initialTokens: MONK_INITIAL_TOKENS,
        diceDefinitionId: 'monk-dice',
        getStartingDeck: getMonkStartingDeck,
        initialAbilityLevels: {
            'fist-technique': 1,
            'zen-forget': 1,
            'harmony': 1,
            'lotus-palm': 1,
            'taiji-combo': 1,
            'thunder-strike': 1,
            'calm-water': 1,
            'meditation': 1,
        },
    },
    barbarian: BARBARIAN_DATA,
    pyromancer: { ...BARBARIAN_DATA, id: 'pyromancer' },
    shadow_thief: { ...BARBARIAN_DATA, id: 'shadow_thief' },
    moon_elf: { ...BARBARIAN_DATA, id: 'moon_elf' },
    paladin: { ...BARBARIAN_DATA, id: 'paladin' },
    ninja: { ...BARBARIAN_DATA, id: 'ninja' },
    treant: { ...BARBARIAN_DATA, id: 'treant' },
    vampire_lord: { ...BARBARIAN_DATA, id: 'vampire_lord' },
    cursed_pirate: { ...BARBARIAN_DATA, id: 'cursed_pirate' },
    gunslinger: { ...BARBARIAN_DATA, id: 'gunslinger' },
    samurai: { ...BARBARIAN_DATA, id: 'samurai' },
    tactician: { ...BARBARIAN_DATA, id: 'tactician' },
    huntress: { ...BARBARIAN_DATA, id: 'huntress' },
    seraph: { ...BARBARIAN_DATA, id: 'seraph' },
};

/**
 * DiceThrone 全量 Token 定义（按 id 去重）
 */
export const ALL_TOKEN_DEFINITIONS: TokenDef[] = (() => {
    const tokens: TokenDef[] = [];
    const seen = new Set<string>();
    Object.values(CHARACTER_DATA_MAP).forEach(data => {
        data.tokens.forEach(token => {
            if (seen.has(token.id)) return;
            seen.add(token.id);
            tokens.push(token);
        });
    });
    return tokens;
})();

/**
 * 根据角色 ID 初始化玩家状态
 */
export function initHeroState(playerId: PlayerId, characterId: SelectableCharacterId, random: RandomFn): HeroState {
    const data = CHARACTER_DATA_MAP[characterId];
    if (!data) {
        throw new Error(`[DiceThrone] Unknown characterId: ${characterId}`);
    }

    const deck = data.getStartingDeck(random);
    const startingHand = deck.splice(0, 4);

    // 创建初始资源池
    const resources = resourceSystem.createPool([RESOURCE_IDS.CP, RESOURCE_IDS.HP]);

    return {
        id: `player-${playerId}`,
        characterId,
        resources,
        hand: startingHand,
        deck,
        discard: [],
        statusEffects: {
            [STATUS_IDS.KNOCKDOWN]: 0,
        },
        tokens: { ...data.initialTokens },
        tokenStackLimits: Object.fromEntries(data.tokens.map(t => [t.id, t.stackLimit])),
        damageShields: [],
        abilities: data.abilities,
        abilityLevels: { ...data.initialAbilityLevels },
        upgradeCardByAbilityId: {},
    };
}

/**
 * 为角色创建初始骰子
 */
export function createCharacterDice(characterId: SelectableCharacterId): Die[] {
    const data = CHARACTER_DATA_MAP[characterId];
    return Array.from({ length: 5 }, (_, index) => {
        const die = diceSystem.createDie(data.diceDefinitionId, { id: index, initialValue: 1 });
        return {
            ...die,
            symbol: die.symbol as DieFace | null,
        };
    });
}
