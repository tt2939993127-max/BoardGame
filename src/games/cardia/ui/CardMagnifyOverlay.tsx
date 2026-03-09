/**
 * Cardia - 卡牌放大预览覆盖层
 *
 * 通用组件，供 Board / PlayerArea 等复用。
 * 基于 MagnifyOverlay 通用壳 + Cardia 卡牌数据。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyOverlay } from '../../../components/common/overlays/MagnifyOverlay';
import { OptimizedImage } from '../../../components/common/media/OptimizedImage';
import type { CardInstance } from '../domain/core-types';
import type { CardiaCore } from '../domain/core-types';

export interface CardMagnifyTarget {
    card: CardInstance;
    core: CardiaCore;
}

interface Props {
    target: CardMagnifyTarget | null;
    onClose: () => void;
}

export const CardMagnifyOverlay: React.FC<Props> = ({ target, onClose }) => {
    const { t } = useTranslation('game-cardia');
    const [imageError, setImageError] = React.useState(false);

    if (!target) return null;

    const { card, core } = target;

    const factionColors = {
        swamp: 'from-green-700 to-green-900',
        academy: 'from-yellow-700 to-yellow-900',
        guild: 'from-red-700 to-red-900',
        dynasty: 'from-blue-700 to-blue-900',
    };

    const bgColor = factionColors[card.faction as keyof typeof factionColors] || 'from-gray-700 to-gray-900';
    const imagePath = card.imagePath || (card.imageIndex ? `cardia/cards/${card.imageIndex}.jpg` : undefined);

    // 计算修正标记总和
    const modifierTotal = core.modifierTokens
        .filter(token => token.cardId === card.uid)
        .reduce((sum, token) => sum + token.value, 0);

    // 计算当前影响力
    const displayInfluence = card.baseInfluence + modifierTotal;

    return (
        <MagnifyOverlay isOpen onClose={onClose}>
            <div className="relative w-[32vw] max-w-[400px] aspect-[0.667] bg-transparent">
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute -top-4 -right-4 bg-white text-black rounded-full w-10 h-10 font-black border-2 border-black z-50 hover:scale-110 transition-transform shadow-lg"
                >
                    ✕
                </button>

                {/* 卡牌内容 */}
                <div className="relative w-full h-full rounded-xl border-4 border-white/30 shadow-2xl overflow-hidden">
                    {imagePath && !imageError ? (
                        <OptimizedImage
                            src={imagePath}
                            alt={t(card.defId)}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${bgColor}`}>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-center p-8">
                                    <h2 className="text-4xl font-bold mb-4">{t(card.defId)}</h2>
                                    <p className="text-xl opacity-80">派系: {t(`faction.${card.faction}`)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 影响力显示（左上角） */}
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center border-2 border-white/30">
                        <span className="text-white font-bold text-2xl">{displayInfluence}</span>
                    </div>

                    {/* 修正标记显示（右上角） */}
                    {modifierTotal !== 0 && (
                        <div className={`absolute top-4 right-4 ${
                            modifierTotal > 0 ? 'bg-green-500' : 'bg-red-500'
                        } text-white font-bold text-lg px-4 py-2 rounded-full shadow-lg border-2 border-white/30`}>
                            {modifierTotal > 0 ? '+' : ''}{modifierTotal}
                        </div>
                    )}

                    {/* 持续能力标记 */}
                    {card.ongoingMarkers && card.ongoingMarkers.length > 0 && (
                        <div className={`absolute ${modifierTotal !== 0 ? 'top-20' : 'top-4'} right-4 bg-purple-500 text-white text-base px-3 py-2 rounded-full shadow-lg flex items-center gap-2 border-2 border-white/30`}>
                            <span className="text-xl">🔄</span>
                            {card.ongoingMarkers.length > 1 && (
                                <span className="font-bold">×{card.ongoingMarkers.length}</span>
                            )}
                        </div>
                    )}

                    {/* 印戒标记（底部） */}
                    {card.signets > 0 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {Array.from({ length: card.signets }).map((_, i) => (
                                <div key={i} className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-lg" />
                            ))}
                        </div>
                    )}

                    {/* 卡牌信息（底部背景） */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pt-12">
                        <h3 className="text-white text-2xl font-bold mb-2">{t(card.defId)}</h3>
                        <div className="flex items-center gap-4 text-white/80 text-sm">
                            <span>派系: {t(`faction.${card.faction}`)}</span>
                            <span>•</span>
                            <span>难度: {card.difficulty}</span>
                            {card.abilityIds.length > 0 && (
                                <>
                                    <span>•</span>
                                    <span>能力: {card.abilityIds.length}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MagnifyOverlay>
    );
};
