import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DieFace } from '../types';
import { buildLocalizedImageSet } from '../../../core';
import { ASSETS, DICE_BG_SIZE, getDiceSpritePosition } from './assets';
import { getDieFace } from '../domain/rules';

interface BonusDieOverlayProps {
    /** 骰子值 (1-6) */
    value: number | undefined;
    /** 是否显示 */
    isVisible: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 语言 */
    locale?: string;
}

/** 骰面效果描述 */
const FACE_EFFECT_KEYS: Record<DieFace, string> = {
    fist: 'bonusDie.effect.fist',
    palm: 'bonusDie.effect.palm',
    taiji: 'bonusDie.effect.taiji',
    lotus: 'bonusDie.effect.lotus',
};

/** 骰面颜色 */
const FACE_COLORS: Record<DieFace, string> = {
    fist: 'text-red-400',
    palm: 'text-blue-400',
    taiji: 'text-purple-400',
    lotus: 'text-emerald-400',
};

/** 3D 骰子组件 */
const Dice3D = ({
    value,
    isRolling,
    size = '8vw',
    locale,
}: {
    value: number;
    isRolling: boolean;
    size?: string;
    locale?: string;
}) => {
    const translateZ = `calc(${size} / 2)`;

    const faces = [
        { id: 1, trans: `translateZ(${translateZ})` },
        { id: 6, trans: `rotateY(180deg) rotateZ(180deg) translateZ(${translateZ})` },
        { id: 3, trans: `rotateY(90deg) translateZ(${translateZ})` },
        { id: 4, trans: `rotateY(-90deg) translateZ(${translateZ})` },
        { id: 2, trans: `rotateX(90deg) translateZ(${translateZ})` },
        { id: 5, trans: `rotateX(-90deg) translateZ(${translateZ})` },
    ];

    const getFinalTransform = (val: number) => {
        switch (val) {
            case 1: return 'rotateX(0deg) rotateY(0deg)';
            case 6: return 'rotateX(180deg) rotateY(0deg)';
            case 2: return 'rotateX(-90deg) rotateY(0deg)';
            case 5: return 'rotateX(90deg) rotateY(0deg)';
            case 3: return 'rotateX(0deg) rotateY(-90deg)';
            case 4: return 'rotateX(0deg) rotateY(90deg)';
            default: return 'rotateY(0deg)';
        }
    };

    return (
        <div
            className="relative perspective-1000"
            style={{ width: size, height: size }}
        >
            <div
                className={`relative w-full h-full transform-style-3d ${isRolling ? 'animate-bonus-tumble' : ''}`}
                style={{
                    transform: isRolling
                        ? 'rotateX(720deg) rotateY(720deg)'
                        : getFinalTransform(value),
                    transition: isRolling ? 'none' : 'transform 800ms ease-out'
                }}
            >
                {faces.map((face) => {
                    const { xPos, yPos } = getDiceSpritePosition(face.id);
                    const needsFlip = face.id === 1 || face.id === 6;
                    const faceTransform = needsFlip ? `${face.trans} rotateZ(180deg)` : face.trans;
                    return (
                        <div
                            key={face.id}
                            className="absolute inset-0 w-full h-full bg-slate-900 rounded-[1vw] backface-hidden border-2 border-slate-600/50 shadow-inner"
                            style={{
                                transform: faceTransform,
                                backgroundImage: buildLocalizedImageSet(ASSETS.DICE_SPRITE, locale),
                                backgroundSize: DICE_BG_SIZE,
                                backgroundPosition: `${xPos}% ${yPos}%`,
                                boxShadow: 'inset 0 0 2vw rgba(0,0,0,0.8)',
                                imageRendering: 'auto'
                            }}
                        />
                    );
                })}
            </div>
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                @keyframes bonus-tumble {
                    0% { transform: rotateX(0) rotateY(0); }
                    100% { transform: rotateX(1440deg) rotateY(1440deg); }
                }
                .animate-bonus-tumble { animation: bonus-tumble 0.8s linear infinite; }
            `}</style>
        </div>
    );
};

export const BonusDieOverlay: React.FC<BonusDieOverlayProps> = ({
    value,
    isVisible,
    onClose,
    locale,
}) => {
    const { t } = useTranslation('game-dicethrone');
    const [isRolling, setIsRolling] = React.useState(true);
    const [showResult, setShowResult] = React.useState(false);
    const [isClosing, setIsClosing] = React.useState(false);

    const face = value ? getDieFace(value) : 'fist';

    // 投掷动画序列
    React.useEffect(() => {
        if (!isVisible || value === undefined) {
            setIsRolling(true);
            setShowResult(false);
            setIsClosing(false);
            return;
        }

        // 开始投掷动画
        setIsRolling(true);
        setShowResult(false);
        setIsClosing(false);

        // 800ms 后停止投掷
        const stopRolling = setTimeout(() => {
            setIsRolling(false);
        }, 800);

        // 1200ms 后显示结果文字
        const showResultTimer = setTimeout(() => {
            setShowResult(true);
        }, 1200);

        // 3000ms 后开始淡出
        const startClose = setTimeout(() => {
            setIsClosing(true);
        }, 3000);

        // 3500ms 后完全关闭
        const closeTimer = setTimeout(() => {
            onClose();
        }, 3500);

        return () => {
            clearTimeout(stopRolling);
            clearTimeout(showResultTimer);
            clearTimeout(startClose);
            clearTimeout(closeTimer);
        };
    }, [isVisible, value, onClose]);

    if (!isVisible || value === undefined) return null;

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* 内容区域 */}
            <div className="relative flex flex-col items-center gap-[2vw]">
                {/* 标题 */}
                <div className="text-[1.5vw] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                    {t('bonusDie.title')}
                </div>

                {/* 骰子 */}
                <div className="relative">
                    <Dice3D
                        value={value}
                        isRolling={isRolling}
                        size="10vw"
                        locale={locale}
                    />
                    {/* 发光效果 */}
                    {!isRolling && (
                        <div
                            className="absolute inset-[-1vw] rounded-[1.5vw] animate-pulse pointer-events-none"
                            style={{
                                boxShadow: `0 0 3vw 1vw ${face === 'fist' ? 'rgba(248,113,113,0.5)' : face === 'palm' ? 'rgba(96,165,250,0.5)' : face === 'taiji' ? 'rgba(192,132,252,0.5)' : 'rgba(52,211,153,0.5)'}`,
                            }}
                        />
                    )}
                </div>

                {/* 结果展示 */}
                <div
                    className={`flex flex-col items-center gap-[0.8vw] transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[1vw]'}`}
                >
                    {/* 骰面名称 */}
                    <div className={`text-[2vw] font-black ${FACE_COLORS[face]}`}>
                        {t(`dice.face.${face}`)}
                    </div>

                    {/* 效果描述 */}
                    <div className="text-[1.2vw] text-slate-300 bg-black/50 px-[1.5vw] py-[0.5vw] rounded-[0.5vw] border border-slate-600/50">
                        {t(FACE_EFFECT_KEYS[face])}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BonusDieOverlay;
