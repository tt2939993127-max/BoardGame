import React from 'react';
import { OptimizedImage } from '../../../components/common/media/OptimizedImage';
import type { CardInstance } from '../domain/core-types';
import { CardTransition, CardListTransition } from './CardTransition';
import { CARDIA_IMAGE_PATHS, resolveCardiaCardImagePath } from '../imagePaths';
import {
    CARDIA_DISCARD_IMAGE_STYLE,
    getCardiaDiscardHistoryCardStyle,
    getCardiaDiscardLatestCardStyle,
    getCardiaDiscardPileStyle,
} from './layout';

interface DiscardPileProps {
    cards: CardInstance[];
    isOpponent?: boolean;
    onCardClick?: (card: CardInstance) => void;
}

/**
 * 弃牌堆组件
 *
 * 显示规则：
 * - 最新弃牌显示完整卡面
 * - 历史弃牌只露出左侧一部分
 * - 整体跟随视口高度缩放，避免矮屏裁切顶部区域
 */
export const DiscardPile: React.FC<DiscardPileProps> = ({ cards, isOpponent: _isOpponent = false, onCardClick }) => {
    if (cards.length === 0) {
        return (
            <div
                className="relative border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"
                style={getCardiaDiscardPileStyle(0)}
            >
                <div className="text-gray-500 text-xs text-center">
                    空
                </div>
            </div>
        );
    }

    const displayCards = [...cards].reverse();
    const latestCard = displayCards[0];
    const historyCards = displayCards.slice(1);

    return (
        <div>
            <div className="relative" style={getCardiaDiscardPileStyle(historyCards.length)}>
                <CardListTransition>
                    {historyCards.map((card, index) => {
                        const zIndex = index;

                        return (
                            <CardTransition key={`${card.uid}-${index}`} cardUid={`discard-${card.uid}-${index}`} type="discard" layoutAnimation={false}>
                                <div
                                    className="absolute bottom-0 overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                                    style={{
                                        ...getCardiaDiscardHistoryCardStyle(index),
                                        zIndex,
                                    }}
                                    onClick={() => onCardClick?.(card)}
                                    title={`影响力 ${card.baseInfluence}`}
                                >
                                    <div className="relative" style={CARDIA_DISCARD_IMAGE_STYLE}>
                                        <OptimizedImage
                                            src={resolveCardiaCardImagePath(card) || CARDIA_IMAGE_PATHS.DECK1_BACK}
                                            alt={`Card ${card.baseInfluence}`}
                                            className="w-full h-full object-cover rounded-lg"
                                            sizes="100px"
                                        />
                                    </div>
                                </div>
                            </CardTransition>
                        );
                    })}

                    <CardTransition key={latestCard.uid} cardUid={`discard-latest-${latestCard.uid}`} type="discard" layoutAnimation={false}>
                        <div
                            className="absolute bottom-0 cursor-pointer hover:scale-105 transition-transform"
                            style={{
                                ...getCardiaDiscardLatestCardStyle(historyCards.length),
                                zIndex: historyCards.length,
                            }}
                            onClick={() => onCardClick?.(latestCard)}
                        >
                            <div className="relative w-full h-full">
                                <OptimizedImage
                                    src={resolveCardiaCardImagePath(latestCard) || CARDIA_IMAGE_PATHS.DECK1_BACK}
                                    alt={`Card ${latestCard.baseInfluence}`}
                                    className="w-full h-full object-cover rounded-lg shadow-lg"
                                    sizes="100px"
                                />

                                {latestCard.signets > 0 && (
                                    <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                        {latestCard.signets}
                                    </div>
                                )}

                                {latestCard.tags && Object.keys(latestCard.tags).length > 0 && (
                                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                        🔧
                                    </div>
                                )}

                                {latestCard.ongoingMarkers && latestCard.ongoingMarkers.length > 0 && (
                                    <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                        🔄
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardTransition>
                </CardListTransition>
            </div>
        </div>
    );
};
