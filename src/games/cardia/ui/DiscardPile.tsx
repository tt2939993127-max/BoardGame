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
    // 移动端优先：缩小弃牌堆视觉占用，避免压缩主战场和手牌区域
    const cardWidth = 68;
    const cardHeight = 103;
    
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
    const maxPileWidth = 112;
    const offsetStep = historyCards.length > 0
        ? Math.max(4, Math.min(24, Math.floor((maxPileWidth - cardWidth) / historyCards.length)))
        : 0;
    
    // 历史卡片自动压缩，避免在手机和平板上把信息栏顶出屏幕
    const totalWidth = historyCards.length * offsetStep + cardWidth;

    return (
        <div className="max-w-full overflow-hidden">
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
                            className="absolute bottom-0 cursor-pointer transition-transform hover:scale-105"
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

                {cards.length > 1 && (
                    <div className="absolute -bottom-2 -right-2 rounded-full border border-gray-800 bg-black/85 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                        {cards.length}
                    </div>
                )}
            </div>
        </div>
    );
};
