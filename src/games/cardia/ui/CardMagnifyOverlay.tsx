/**
 * Cardia - 卡牌放大预览覆盖层
 *
 * 纯图片展示，无额外特效和文字。
 * 
 * 性能优化：组件始终渲染（不卸载），只控制可见性，避免重复挂载/卸载的开销。
 */

import React from 'react';
import { MagnifyOverlay } from '../../../components/common/overlays/MagnifyOverlay';
import { CardPreview } from '../../../components/common/media/CardPreview';
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
    const { card } = target || {};
    const imagePath = card?.imagePath || (card?.imageIndex ? `cardia/cards/${card.imageIndex}.jpg` : undefined);

    return (
        <MagnifyOverlay isOpen={!!target} onClose={onClose}>
            {target && (
                <div className="relative w-[32vw] max-w-[400px] aspect-[0.667] bg-transparent">
                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute -top-4 -right-4 bg-white text-black rounded-full w-10 h-10 font-black border-2 border-black z-50 hover:scale-110 transition-transform shadow-lg"
                    >
                        ✕
                    </button>

                    {/* 纯图片展示 */}
                    <div className="relative w-full h-full rounded-xl border-4 border-white/30 shadow-2xl overflow-hidden bg-gray-900">
                        {imagePath ? (
                            <CardPreview
                                previewRef={{ type: 'image', src: imagePath }}
                                alt="Card"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white text-xl">
                                无图片
                            </div>
                        )}
                    </div>
                </div>
            )}
        </MagnifyOverlay>
    );
};
