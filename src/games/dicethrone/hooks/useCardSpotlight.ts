/**
 * useCardSpotlight Hook
 * 
 * 管理卡牌特写队列和额外骰子特写展示。
 * 自动追踪 lastPlayedCard 和 lastBonusDieRoll 的变化，维护特写队列。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlayerId } from '../../../engine/types';
import type { DieFace } from '../domain/types';
import type { CardSpotlightItem } from '../ui/CardSpotlightOverlay';
import { MONK_CARDS } from '../monk/cards';

/**
 * 卡牌特写配置
 */
export interface CardSpotlightConfig {
    /** 最后打出的卡牌 */
    lastPlayedCard?: {
        timestamp: number;
        cardId: string;
        atlasIndex?: number;
        playerId: PlayerId;
    };
    /** 最后的额外骰子投掷 */
    lastBonusDieRoll?: {
        timestamp: number;
        value: number;
        face?: DieFace;
        playerId: PlayerId;
        /** 效果描述 key */
        effectKey?: string;
        /** 效果描述参数 */
        effectParams?: Record<string, string | number>;
    };
    /** 当前玩家 ID */
    currentPlayerId: PlayerId;
    /** 对手名称 */
    opponentName: string;
}

/**
 * 卡牌特写状态
 */
export interface CardSpotlightState {
    /** 卡牌特写队列 */
    cardSpotlightQueue: CardSpotlightItem[];
    /** 关闭卡牌特写 */
    handleCardSpotlightClose: (id: string) => void;
    /** 额外骰子展示状态 */
    bonusDie: {
        value?: number;
        face?: DieFace;
        effectKey?: string;
        effectParams?: Record<string, string | number>;
        show: boolean;
    };
    /** 关闭额外骰子特写 */
    handleBonusDieClose: () => void;
}

/**
 * 管理卡牌和额外骰子特写队列
 */
export function useCardSpotlight(config: CardSpotlightConfig): CardSpotlightState {
    const { lastPlayedCard, lastBonusDieRoll, currentPlayerId, opponentName } = config;

    // 卡牌特写队列
    const [cardSpotlightQueue, setCardSpotlightQueue] = useState<CardSpotlightItem[]>([]);
    const cardSpotlightQueueRef = useRef<CardSpotlightItem[]>([]);

    // 额外骰子状态
    const [bonusDieValue, setBonusDieValue] = useState<number | undefined>(undefined);
    const [bonusDieFace, setBonusDieFace] = useState<DieFace | undefined>(undefined);
    const [bonusDieEffectKey, setBonusDieEffectKey] = useState<string | undefined>(undefined);
    const [bonusDieEffectParams, setBonusDieEffectParams] = useState<Record<string, string | number> | undefined>(undefined);
    const [showBonusDie, setShowBonusDie] = useState(false);

    // 追踪 timestamp 避免重复触发
    const prevLastPlayedCardTimestampRef = useRef<number | undefined>(lastPlayedCard?.timestamp);
    const prevBonusDieTimestampRef = useRef<number | undefined>(lastBonusDieRoll?.timestamp);

    // 同步队列到 ref
    useEffect(() => {
        cardSpotlightQueueRef.current = cardSpotlightQueue;
    }, [cardSpotlightQueue]);

    /**
     * 监听额外骰子投掷
     */
    useEffect(() => {
        const bonusDie = lastBonusDieRoll;
        const prevTimestamp = prevBonusDieTimestampRef.current;

        if (!bonusDie || bonusDie.timestamp === prevTimestamp) {
            return;
        }

        prevBonusDieTimestampRef.current = bonusDie.timestamp;

        // 尝试绑定到卡牌队列（卡左骰右）
        const cardQueue = cardSpotlightQueueRef.current;
        const thresholdMs = 1500;
        const cardCandidate = [...cardQueue]
            .reverse()
            .find((item) =>
                item.playerId === bonusDie.playerId &&
                Math.abs(item.timestamp - bonusDie.timestamp) <= thresholdMs
            );

        if (cardCandidate) {
            // 绑定到卡牌上一起显示
            setCardSpotlightQueue((prev) =>
                prev.map((item) =>
                    item.id === cardCandidate.id
                        ? {
                            ...item,
                            bonusDice: [
                                ...(item.bonusDice || []),
                                {
                                    value: bonusDie.value,
                                    face: bonusDie.face,
                                    timestamp: bonusDie.timestamp,
                                    effectKey: bonusDie.effectKey,
                                    effectParams: bonusDie.effectParams,
                                },
                            ],
                        }
                        : item
                )
            );
            setShowBonusDie(false);
            return;
        }

        // 否则使用独立骰子特写
        setBonusDieValue(bonusDie.value);
        setBonusDieFace(bonusDie.face);
        setBonusDieEffectKey(bonusDie.effectKey);
        setBonusDieEffectParams(bonusDie.effectParams);
        setShowBonusDie(true);
    }, [lastBonusDieRoll]);

    /**
     * 监听其他玩家打出卡牌
     */
    useEffect(() => {
        const card = lastPlayedCard;
        const prevTimestamp = prevLastPlayedCardTimestampRef.current;

        if (!card || card.timestamp === prevTimestamp) {
            return;
        }

        prevLastPlayedCardTimestampRef.current = card.timestamp;

        // 归一化 ID 比较
        const cardPlayerId = String(card.playerId);
        const selfPlayerId = String(currentPlayerId);

        console.log('[useCardSpotlight] New card detected:', {
            cardId: card.cardId,
            timestamp: card.timestamp,
            cardPlayerId,
            selfPlayerId,
            shouldShow: cardPlayerId !== selfPlayerId && selfPlayerId !== ''
        });

        // DEBUG: 暂时允许显示自己的卡牌特写（方便调试）
        // 归一化后 ID 相同说明是自己打出的卡
        // if (cardPlayerId === selfPlayerId) return;

        // 尝试从定义中查找正确的 atlasIndex，作为数据损坏的修复
        const cardDef = MONK_CARDS.find(c => c.id === card.cardId);
        const resolvedAtlasIndex = cardDef?.atlasIndex ?? card.atlasIndex ?? 0;

        console.log('[useCardSpotlight] Atlas Lookup:', {
            cardId: card.cardId,
            originalAtlasIndex: card.atlasIndex,
            resolvedAtlasIndex
        });

        const newItem: CardSpotlightItem = {
            id: `${card.cardId}-${card.timestamp}`,
            timestamp: card.timestamp,
            atlasIndex: resolvedAtlasIndex,
            playerId: card.playerId,
            playerName: opponentName, // 注意：如果是自己，这里的名字可能不对，但 UI 暂未显示名字
        };
        setCardSpotlightQueue((prev) => [...prev, newItem]);
    }, [lastPlayedCard, currentPlayerId, opponentName]);

    /**
     * 关闭卡牌特写
     */
    const handleCardSpotlightClose = useCallback((id: string) => {
        setCardSpotlightQueue(prev => prev.filter(item => item.id !== id));
    }, []);

    /**
     * 关闭额外骰子特写
     */
    const handleBonusDieClose = useCallback(() => {
        setShowBonusDie(false);
    }, []);

    return {
        cardSpotlightQueue,
        handleCardSpotlightClose,
        bonusDie: {
            value: bonusDieValue,
            face: bonusDieFace,
            effectKey: bonusDieEffectKey,
            effectParams: bonusDieEffectParams,
            show: showBonusDie,
        },
        handleBonusDieClose,
    };
}

