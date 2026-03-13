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
import { resolveCardiaCardImagePath } from '../imagePaths';

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
    const imagePath = card ? resolveCardiaCardImagePath(card) : undefined;

    const widthForThreeQuarterHeight = 'calc(75vh * (106 / 160))';

    return (
        <MagnifyOverlay isOpen={!!target} onClose={onClose} overlayClassName="p-3 sm:p-8">
            {target && (
                <div
                    className="relative aspect-[106/160] bg-transparent"
                    style={{
                        height: '75vh',
                        width: `min(75vw, ${widthForThreeQuarterHeight})`,
                    }}
                >
                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute -right-2 -top-2 z-50 h-8 w-8 rounded-full border-2 border-black bg-white font-black text-black shadow-lg transition-transform hover:scale-110 sm:-right-4 sm:-top-4 sm:h-10 sm:w-10"
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
