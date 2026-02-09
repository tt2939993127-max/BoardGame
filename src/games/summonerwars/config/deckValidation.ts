
import type { Card, UnitCard, FactionId } from '../domain/types';

export interface DeckDraft {
    name: string;
    summoner: UnitCard | null;
    /** 自动填充的卡牌（起始单位、史诗事件、城门） */
    autoCards: Card[];
    /** 用户手动添加的卡牌（cardId → 数量） */
    manualCards: Map<string, { card: Card; count: number }>;
}

export type DeckValidationRule =
    | 'summoner_count'
    | 'gate_10hp_count'
    | 'gate_5hp_count'
    | 'starting_units'
    | 'epic_events'
    | 'standard_events'
    | 'champions'
    | 'commons'
    | 'symbol_mismatch';

export interface DeckValidationError {
    rule: DeckValidationRule;
    message: string;
    current: number;
    expected: number;
}

export interface DeckValidationResult {
    valid: boolean;
    errors: DeckValidationError[];
}

export function validateDeck(deck: DeckDraft): DeckValidationResult {
    const errors: DeckValidationError[] = [];

    if (!deck.summoner) {
        errors.push({
            rule: 'summoner_count',
            message: '牌组必须包含一个召唤师',
            current: 0,
            expected: 1
        });
    }

    // 模拟验证逻辑
    let commonCount = 0;
    let championCount = 0;
    deck.manualCards.forEach(({ card, count }) => {
        if (card.cardType === 'unit') {
            if (card.unitClass === 'common') commonCount += count;
            if (card.unitClass === 'champion') championCount += count;
        }
    });

    if (commonCount < 16) {
        errors.push({
            rule: 'commons',
            message: '普通单位需要至少 16 张',
            current: commonCount,
            expected: 16
        });
    }

    // 根据 UI 测试需要添加更多模拟错误

    return {
        valid: errors.length === 0,
        errors
    };
}

export function canAddCard(deck: DeckDraft, card: Card): { allowed: boolean; reason?: string } {
    if (!deck.summoner) return { allowed: false, reason: '请先选择一个召唤师' };
    // 模拟检查
    return { allowed: true };
}

export function getSymbolMatch(card: Card, summonerSymbols: string[]): boolean {
    // 模拟检查
    return card.deckSymbols.some(s => summonerSymbols.includes(s));
}
