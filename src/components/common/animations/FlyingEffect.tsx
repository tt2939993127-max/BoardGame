import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 飞行效果数据结构
export interface FlyingEffectData {
    id: string;
    type: 'buff' | 'damage' | 'heal' | 'custom';
    content: React.ReactNode;
    color?: string;
    startPos: { x: number; y: number };
    endPos: { x: number; y: number };
}

// 获取视口中心坐标
export const getViewportCenter = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

// 获取元素中心坐标
export const getElementCenter = (element: HTMLElement | null) => {
    if (!element) return getViewportCenter();
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

// 单个飞行效果组件
const FlyingEffectItem = ({
    effect,
    onComplete,
}: {
    effect: FlyingEffectData;
    onComplete: (id: string) => void;
}) => {
    const deltaX = effect.endPos.x - effect.startPos.x;
    const deltaY = effect.endPos.y - effect.startPos.y;

    const isBuff = effect.type === 'buff';
    const isDamage = effect.type === 'damage';
    const isHeal = effect.type === 'heal';

    const getBgClass = () => {
        if (isDamage) return 'from-red-600 to-red-800';
        if (isHeal) return 'from-emerald-500 to-green-600';
        if (isBuff && effect.color) return effect.color;
        return 'from-amber-500 to-orange-600';
    };

    const getSizeClass = () => {
        if (isDamage || isHeal) return 'w-[2.5vw] h-[2.5vw] text-[1.2vw]';
        return 'w-[3vw] h-[3vw] text-[1.5vw]';
    };

    return (
        <motion.div
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: effect.startPos.x,
                top: effect.startPos.y,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
                x: deltaX,
                y: deltaY,
                scale: [1, 1.3, 1],
                opacity: 1,
            }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
                scale: { times: [0, 0.5, 1] },
            }}
            onAnimationComplete={() => onComplete(effect.id)}
        >
            <div
                className={`
                    flex items-center justify-center rounded-full shadow-2xl
                    bg-gradient-to-br ${getBgClass()} ${getSizeClass()}
                    font-black text-white drop-shadow-md
                `}
            >
                {effect.content}
            </div>
        </motion.div>
    );
};

// 飞行效果层 - 管理多个飞行效果
export const FlyingEffectsLayer = ({
    effects,
    onEffectComplete,
}: {
    effects: FlyingEffectData[];
    onEffectComplete: (id: string) => void;
}) => {
    return (
        <AnimatePresence>
            {effects.map(effect => (
                <FlyingEffectItem
                    key={effect.id}
                    effect={effect}
                    onComplete={onEffectComplete}
                />
            ))}
        </AnimatePresence>
    );
};

// Hook: 管理飞行效果状态
export const useFlyingEffects = () => {
    const [effects, setEffects] = React.useState<FlyingEffectData[]>([]);

    const pushEffect = React.useCallback((effect: Omit<FlyingEffectData, 'id'>) => {
        const id = `${effect.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setEffects(prev => [...prev, { ...effect, id }]);
    }, []);

    const removeEffect = React.useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    const clearAll = React.useCallback(() => {
        setEffects([]);
    }, []);

    return { effects, pushEffect, removeEffect, clearAll };
};
