import type { CardPreviewRef } from '../../../core';
import type { SelectableCharacterId } from '../domain/types';
import { CHARACTER_DATA_MAP } from '../domain/characters';

/**
 * 卡牌预览映射：
 * - ALL_CARDS_MAP: 保留旧接口，按 cardId 返回首个可用 previewRef
 * - CHARACTER_CARD_MAP: 新接口，按角色 + cardId 返回精确 previewRef
 *
 * 通用卡在不同角色的图集索引可能不同（如枪手/武士），
 * 这类场景必须优先走 CHARACTER_CARD_MAP。
 */
const ALL_CARDS_MAP = new Map<string, CardPreviewRef>();
const CHARACTER_CARD_MAP = new Map<SelectableCharacterId, Map<string, CardPreviewRef>>();

// 初始化卡牌映射：遍历所有角色的 getStartingDeck，自动收集 previewRef
function initializeCardsMap() {
    if (ALL_CARDS_MAP.size > 0) return; // 已初始化

    const dummyRandom = {
        random: () => 0.5,
        d: () => 1,
        range: (min: number) => min,
        shuffle: <T>(arr: T[]) => arr,
    } as any;

    for (const [characterId, data] of Object.entries(CHARACTER_DATA_MAP) as Array<[SelectableCharacterId, (typeof CHARACTER_DATA_MAP)[SelectableCharacterId]]>) {
        const deck = data.getStartingDeck(dummyRandom);
        const cardMap = new Map<string, CardPreviewRef>();
        for (const card of deck) {
            if (!card.previewRef) continue;
            cardMap.set(card.id, card.previewRef);
            if (!ALL_CARDS_MAP.has(card.id)) {
                ALL_CARDS_MAP.set(card.id, card.previewRef);
            }
        }
        CHARACTER_CARD_MAP.set(characterId, cardMap);
    }
}

/**
 * 根据卡牌 ID 获取预览引用。
 * 如果提供角色，则优先返回该角色牌组中的精确 previewRef。
 */
export function getDiceThroneCardPreviewRef(
    cardId: string,
    characterId?: SelectableCharacterId,
): CardPreviewRef | null {
    initializeCardsMap();
    if (characterId) {
        return CHARACTER_CARD_MAP.get(characterId)?.get(cardId) ?? ALL_CARDS_MAP.get(cardId) ?? null;
    }
    return ALL_CARDS_MAP.get(cardId) ?? null;
}
