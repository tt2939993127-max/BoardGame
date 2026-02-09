/**
 * 牌组构建核心 Hook
 *
 * 管理 DeckDraft 状态、召唤师选择、卡牌添加/移除、
 * 实时验证、API 持久化（保存/加载/删除）以及牌组确认（用于对局）。
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Card, UnitCard, FactionId } from '../../domain/types';
import {
    type DeckDraft,
    type DeckValidationResult,
    validateDeck,
    canAddCard as checkCanAddCard,
    getSymbolMatch,
} from '../../config/deckValidation';
import {
    buildCardRegistry,
    getCardPoolByFaction,
    groupCardsByType,
} from '../../config/cardRegistry';
import {
    serializeDeck,
    deserializeDeck,
    type SerializedCustomDeck,
} from '../../config/deckSerializer';
import {
    listCustomDecks,
    getCustomDeck,
    createCustomDeck,
    updateCustomDeck,
    deleteCustomDeck as apiDeleteDeck,
    type SavedDeckSummary,
    type CustomDeckPayload,
} from '../../../../api/custom-deck';
import { useAuth } from '../../../../contexts/AuthContext';

// ============================================================================
// 类型定义
// ============================================================================

/** 添加卡牌的结果 */
export interface AddCardResult {
    success: boolean;
    reason?: string;
}

export interface UseDeckBuilderReturn {
    // 状态
    currentDeck: DeckDraft;
    selectedFactionId: FactionId | null;
    validationResult: DeckValidationResult;
    savedDecks: SavedDeckSummary[];
    isLoading: boolean;
    editingDeckId: string | null;
    confirmedDeck: SerializedCustomDeck | null;

    // 召唤师操作
    selectSummoner: (summonerCard: UnitCard) => void;

    // 卡牌操作
    addCard: (card: Card) => AddCardResult;
    removeCard: (cardId: string) => void;

    // 阵营浏览
    selectFaction: (factionId: FactionId) => void;

    // 持久化
    saveDeck: (name: string) => Promise<void>;
    loadDeck: (deckId: string) => Promise<void>;
    deleteDeck: (deckId: string) => Promise<void>;

    // 牌组选择（用于对局）
    confirmDeck: (deckId: string) => void;

    // 重置
    resetDeck: () => void;
}

// 重新导出 SavedDeckSummary 以保持向后兼容（MyDeckPanel 从此处导入）
export type { SavedDeckSummary } from '../../../../api/custom-deck';


// ============================================================================
// 常量
// ============================================================================

const INITIAL_DECK: DeckDraft = {
    name: '',
    summoner: null,
    autoCards: [],
    manualCards: new Map(),
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据召唤师自动填充 autoCards
 *
 * 包含：
 * - 该召唤师的起始单位（2个普通单位）
 * - 该召唤师的史诗事件（eventType === 'legendary'）
 * - 1个十生命城门（isStartingGate === true）
 * - 3个五生命城门（isGate === true && !isStartingGate）
 */
function buildAutoCards(summoner: UnitCard): Card[] {
    const factionId = summoner.faction as FactionId;
    const pool = getCardPoolByFaction(factionId);
    const groups = groupCardsByType(pool);
    const autoCards: Card[] = [];

    // 起始单位：从该阵营的普通单位中取前2个
    const startingCommons = groups.commons.slice(0, 2);
    autoCards.push(...startingCommons);

    // 史诗事件（legendary 类型）
    const epicEvents = groups.events.filter(e => e.eventType === 'legendary');
    autoCards.push(...epicEvents);

    // 城门：1个十生命起始城门 + 3个五生命城门
    const startingGate = groups.structures.find(s => s.isGate && s.isStartingGate);
    const normalGates = groups.structures.filter(s => s.isGate && !s.isStartingGate);

    if (startingGate) {
        autoCards.push(startingGate);
    }
    // 添加3个五生命城门
    for (let i = 0; i < 3 && normalGates.length > 0; i++) {
        autoCards.push({ ...normalGates[0], id: `${normalGates[0].id}-auto-${i}` });
    }

    return autoCards;
}

/**
 * 将 DeckDraft 转换为 API 请求体
 */
function draftToPayload(draft: DeckDraft, name: string): CustomDeckPayload {
    const serialized = serializeDeck({ ...draft, name });
    return {
        name: serialized.name,
        summonerId: serialized.summonerId,
        summonerFaction: serialized.summonerFaction,
        cards: serialized.cards,
    };
}


// ============================================================================
// Hook 实现
// ============================================================================

export function useDeckBuilder(): UseDeckBuilderReturn {
    const { token } = useAuth();

    // 核心状态
    const [currentDeck, setCurrentDeck] = useState<DeckDraft>(INITIAL_DECK);
    const [selectedFactionId, setSelectedFactionId] = useState<FactionId | null>(null);
    const [savedDecks, setSavedDecks] = useState<SavedDeckSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
    const [confirmedDeck, setConfirmedDeck] = useState<SerializedCustomDeck | null>(null);

    // 用 ref 持有 token，避免 useCallback 依赖变化导致不必要的重建
    const tokenRef = useRef(token);
    tokenRef.current = token;

    // 实时验证（每次 currentDeck 变化时重新计算）
    const validationResult = useMemo(
        () => validateDeck(currentDeck),
        [currentDeck],
    );

    // ========================================================================
    // 初始化：加载已保存牌组列表
    // ========================================================================

    useEffect(() => {
        if (!tokenRef.current) return;

        let cancelled = false;

        const fetchDecks = async () => {
            try {
                const decks = await listCustomDecks(tokenRef.current!);
                if (!cancelled) {
                    setSavedDecks(decks);
                }
            } catch (err) {
                // 加载失败时静默处理，不阻塞 UI
                console.warn('[useDeckBuilder] 加载已保存牌组列表失败:', err);
            }
        };

        void fetchDecks();

        return () => { cancelled = true; };
    }, [token]); // token 变化时重新加载

    // ========================================================================
    // 召唤师选择
    // ========================================================================

    const selectSummoner = useCallback((summoner: UnitCard) => {
        setCurrentDeck(prev => {
            // 如果选择了相同的召唤师，不做任何操作
            if (prev.summoner?.id === summoner.id) return prev;

            // 自动填充卡牌（起始单位、史诗事件、城门）
            const autoCards = buildAutoCards(summoner);

            // 更换召唤师时，检查手动卡牌的符号匹配
            // 不满足新召唤师符号匹配的卡牌需要移除
            const summonerSymbols = summoner.deckSymbols;
            const newManualCards = new Map<string, { card: Card; count: number }>();

            prev.manualCards.forEach(({ card, count }, cardId) => {
                if (getSymbolMatch(card, summonerSymbols)) {
                    newManualCards.set(cardId, { card, count });
                }
                // 不匹配的卡牌被静默移除
            });

            return {
                ...prev,
                summoner,
                autoCards,
                manualCards: newManualCards,
            };
        });
    }, []);


    // ========================================================================
    // 卡牌添加
    // ========================================================================

    const addCard = useCallback((card: Card): AddCardResult => {
        // 使用函数式更新获取最新状态进行检查
        let result: AddCardResult = { success: false, reason: '未知错误' };

        setCurrentDeck(prev => {
            const check = checkCanAddCard(prev, card);
            if (!check.allowed) {
                result = { success: false, reason: check.reason };
                return prev; // 不修改状态
            }

            // 符号匹配检查
            if (prev.summoner && !getSymbolMatch(card, prev.summoner.deckSymbols)) {
                result = { success: false, reason: '卡牌符号与召唤师不匹配' };
                return prev;
            }

            const newMap = new Map(prev.manualCards);
            const existing = newMap.get(card.id);
            if (existing) {
                newMap.set(card.id, { card, count: existing.count + 1 });
            } else {
                newMap.set(card.id, { card, count: 1 });
            }

            result = { success: true };
            return { ...prev, manualCards: newMap };
        });

        return result;
    }, []);

    // ========================================================================
    // 卡牌移除
    // ========================================================================

    const removeCard = useCallback((cardId: string) => {
        setCurrentDeck(prev => {
            const newMap = new Map(prev.manualCards);
            const existing = newMap.get(cardId);
            if (!existing) return prev;

            if (existing.count > 1) {
                newMap.set(cardId, { ...existing, count: existing.count - 1 });
            } else {
                newMap.delete(cardId);
            }
            return { ...prev, manualCards: newMap };
        });
    }, []);

    // ========================================================================
    // 阵营浏览
    // ========================================================================

    const selectFaction = useCallback((factionId: FactionId) => {
        setSelectedFactionId(factionId);
    }, []);


    // ========================================================================
    // 持久化：保存牌组
    // ========================================================================

    const saveDeck = useCallback(async (name: string) => {
        const currentToken = tokenRef.current;
        if (!currentToken) {
            throw new Error('未登录，无法保存牌组');
        }

        setIsLoading(true);
        try {
            const payload = draftToPayload(currentDeck, name);

            if (editingDeckId) {
                // 更新已有牌组
                await updateCustomDeck(currentToken, editingDeckId, payload);
            } else {
                // 创建新牌组
                const { id } = await createCustomDeck(currentToken, payload);
                setEditingDeckId(id);
            }

            // 刷新牌组列表
            const decks = await listCustomDecks(currentToken);
            setSavedDecks(decks);

            // 更新当前牌组名称
            setCurrentDeck(prev => ({ ...prev, name }));
        } finally {
            setIsLoading(false);
        }
    }, [currentDeck, editingDeckId]);

    // ========================================================================
    // 持久化：加载牌组
    // ========================================================================

    const loadDeck = useCallback(async (deckId: string) => {
        const currentToken = tokenRef.current;
        if (!currentToken) {
            throw new Error('未登录，无法加载牌组');
        }

        setIsLoading(true);
        try {
            const serialized = await getCustomDeck(currentToken, deckId);
            const registry = buildCardRegistry();
            const { deck, warnings } = deserializeDeck(serialized, registry);

            if (warnings.length > 0) {
                console.warn('[useDeckBuilder] 反序列化警告:', warnings);
            }

            // 如果有召唤师，重建 autoCards
            if (deck.summoner) {
                deck.autoCards = buildAutoCards(deck.summoner);
            }

            setCurrentDeck(deck);
            setEditingDeckId(deckId);

            // 自动选中召唤师所属阵营
            if (deck.summoner) {
                setSelectedFactionId(deck.summoner.faction as FactionId);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);


    // ========================================================================
    // 持久化：删除牌组
    // ========================================================================

    const deleteDeck = useCallback(async (deckId: string) => {
        const currentToken = tokenRef.current;
        if (!currentToken) {
            throw new Error('未登录，无法删除牌组');
        }

        setIsLoading(true);
        try {
            await apiDeleteDeck(currentToken, deckId);

            // 从本地列表中移除
            setSavedDecks(prev => prev.filter(d => d.id !== deckId));

            // 如果删除的是当前编辑的牌组，重置编辑状态
            if (editingDeckId === deckId) {
                setEditingDeckId(null);
                setCurrentDeck(INITIAL_DECK);
            }
        } finally {
            setIsLoading(false);
        }
    }, [editingDeckId]);

    // ========================================================================
    // 牌组确认（用于对局选择）
    // ========================================================================

    const confirmDeck = useCallback((deckId: string) => {
        // 从已保存牌组中查找
        const deckSummary = savedDecks.find(d => d.id === deckId);
        if (!deckSummary) {
            console.warn('[useDeckBuilder] 确认牌组失败：未找到牌组', deckId);
            return;
        }

        // 如果当前编辑的就是这个牌组且有召唤师，直接使用当前 draft 序列化
        if (editingDeckId === deckId && currentDeck.summoner) {
            try {
                const serialized = serializeDeck(currentDeck);
                setConfirmedDeck(serialized);
            } catch {
                console.warn('[useDeckBuilder] 序列化当前牌组失败');
            }
            return;
        }

        // 否则需要先通过 loadDeck 加载牌组数据后再调用 confirmDeck
        console.warn('[useDeckBuilder] 请先加载牌组后再确认');
    }, [savedDecks, editingDeckId, currentDeck]);

    // ========================================================================
    // 重置牌组
    // ========================================================================

    const resetDeck = useCallback(() => {
        setCurrentDeck(INITIAL_DECK);
        setEditingDeckId(null);
        setConfirmedDeck(null);
    }, []);

    return {
        // 状态
        currentDeck,
        selectedFactionId,
        validationResult,
        savedDecks,
        isLoading,
        editingDeckId,
        confirmedDeck,

        // 召唤师操作
        selectSummoner,

        // 卡牌操作
        addCard,
        removeCard,

        // 阵营浏览
        selectFaction,

        // 持久化
        saveDeck,
        loadDeck,
        deleteDeck,

        // 牌组选择
        confirmDeck,

        // 重置
        resetDeck,
    };
}
