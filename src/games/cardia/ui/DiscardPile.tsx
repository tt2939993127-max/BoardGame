import React from 'react';
import { OptimizedImage } from '../../../components/common/media/OptimizedImage';
import type { CardInstance } from '../domain/core-types';
import { CardTransition, CardListTransition } from './CardTransition';
import { CARDIA_IMAGE_PATHS, resolveCardiaCardImagePath } from '../imagePaths';

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
 * - 历史弃牌显示左侧三分之一（数字部分）
 * - 从下往上堆叠
 */
export const DiscardPile: React.FC<DiscardPileProps> = ({ cards, isOpponent: _isOpponent = false, onCardClick }) => {
    // 卡牌尺寸：缩小到 90%（约 100px × 151px）
    const cardWidth = 100;
    const cardHeight = 151;
    
    if (cards.length === 0) {
        return (
            <div className="relative border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center" style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}>
                <div className="text-gray-500 text-xs text-center">
                    空
                </div>
            </div>
        );
    }

    // 从下往上堆叠，最新的在最上面
    const displayCards = [...cards].reverse();
    const latestCard = displayCards[0];
    const historyCards = displayCards.slice(1);
    const historyWidth = Math.floor(cardWidth / 3); // 三分之一宽度
    const offsetStep = 36; // 每张卡片向右偏移 36px
    
    // 计算总宽度：历史卡片偏移量 + 完整卡片宽度
    const totalWidth = historyCards.length * offsetStep + cardWidth;

    return (
        <div>
            <div className="relative" style={{ width: `${totalWidth}px`, height: `${cardHeight}px` }}>
                <CardListTransition>
                    {/* 历史弃牌 - 只显示左侧三分之一 */}
                    {historyCards.map((card, index) => {
                        const zIndex = index;
                        const offsetX = index * offsetStep;
                        
                        return (
                            <CardTransition key={`${card.uid}-${index}`} cardUid={`discard-${card.uid}-${index}`} type="discard" layoutAnimation={false}>
                                <div
                                    className="absolute bottom-0 overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                                    style={{
                                        left: `${offsetX}px`,
                                        width: `${historyWidth}px`,
                                        height: `${cardHeight}px`,
                                        zIndex,
                                    }}
                                    onClick={() => onCardClick?.(card)}
                                    title={`影响力: ${card.baseInfluence}`}
                                >
                                    {/* 显示卡片左侧部分（数字区域） */}
                                    <div className="relative" style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}>
                                        <OptimizedImage
                                            src={resolveCardiaCardImagePath(card) || CARDIA_IMAGE_PATHS.DECK1_BACK}
                                            alt={`Card ${card.baseInfluence}`}
                                            className="w-full h-full object-cover rounded-lg"
                                            sizes={`${cardWidth}px`}
                                        />
                                    </div>
                                </div>
                            </CardTransition>
                        );
                    })}

                    {/* 最新弃牌 - 显示完整卡面 */}
                    <CardTransition key={latestCard.uid} cardUid={`discard-latest-${latestCard.uid}`} type="discard" layoutAnimation={false}>
                        <div
                            className="absolute bottom-0 cursor-pointer hover:scale-105 transition-transform"
                            style={{
                                left: `${historyCards.length * offsetStep}px`,
                                width: `${cardWidth}px`,
                                height: `${cardHeight}px`,
                                zIndex: historyCards.length,
                            }}
                            onClick={() => onCardClick?.(latestCard)}
                        >
                            <div className="relative w-full h-full">
                                <OptimizedImage
                                    src={resolveCardiaCardImagePath(latestCard) || CARDIA_IMAGE_PATHS.DECK1_BACK}
                                    alt={`Card ${latestCard.baseInfluence}`}
                                    className="w-full h-full object-cover rounded-lg shadow-lg"
                                    sizes={`${cardWidth}px`}
                                />
                                
                                {/* 印戒标记 */}
                                {latestCard.signets > 0 && (
                                    <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                        {latestCard.signets}
                                    </div>
                                )}
                                
                                {/* 修正标记 */}
                                {latestCard.tags && Object.keys(latestCard.tags).length > 0 && (
                                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                        🔧
                                    </div>
                                )}
                                
                                {/* 持续标记 */}
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
