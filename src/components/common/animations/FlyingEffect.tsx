import React from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';

// ============================================================================
// 类型
// ============================================================================

export interface FlyingEffectData {
    id: string;
    type: 'buff' | 'damage' | 'heal' | 'custom';
    content: React.ReactNode;
    color?: string;
    startPos: { x: number; y: number };
    endPos: { x: number; y: number };
    /** 效果强度（伤害/治疗量），影响尾迹粒子密度。默认 1 */
    intensity?: number;
}

// ============================================================================
// 工具函数
// ============================================================================

export const getViewportCenter = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

export const getElementCenter = (element: HTMLElement | null) => {
    if (!element) return getViewportCenter();
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

// ============================================================================
// 样式配置
// ============================================================================

/** 类型对应的颜色配置 */
const TYPE_STYLES: Record<string, {
    bgClass: string;
    impactColor: string;
    floatColor: string;
    glowShadow: string;
    /** 尾迹粒子颜色数组（tsParticles 用） */
    trailColors: string[];
}> = {
    damage: {
        bgClass: 'from-red-600 to-red-800',
        impactColor: 'rgba(239, 68, 68, 0.6)',
        floatColor: 'text-red-400',
        glowShadow: '0 0 12px 4px rgba(239, 68, 68, 0.5)',
        trailColors: ['#ef4444', '#f87171', '#fca5a5', '#fff'],
    },
    heal: {
        bgClass: 'from-emerald-500 to-green-600',
        impactColor: 'rgba(52, 211, 153, 0.6)',
        floatColor: 'text-emerald-400',
        glowShadow: '0 0 12px 4px rgba(52, 211, 153, 0.5)',
        trailColors: ['#34d399', '#6ee7b7', '#a7f3d0', '#fff'],
    },
    buff: {
        bgClass: 'from-amber-500 to-orange-600',
        impactColor: 'rgba(251, 191, 36, 0.5)',
        floatColor: 'text-amber-400',
        glowShadow: '0 0 12px 4px rgba(251, 191, 36, 0.4)',
        trailColors: ['#fbbf24', '#fcd34d', '#fde68a'],
    },
    custom: {
        bgClass: 'from-slate-500 to-slate-600',
        impactColor: 'rgba(148, 163, 184, 0.5)',
        floatColor: 'text-slate-300',
        glowShadow: '0 0 12px 4px rgba(148, 163, 184, 0.4)',
        trailColors: ['#94a3b8', '#cbd5e1'],
    },
};

function getStyle(type: string, color?: string) {
    const base = TYPE_STYLES[type] ?? TYPE_STYLES.custom;
    if (type === 'buff' && color) {
        return { ...base, bgClass: color };
    }
    return base;
}

function getSizeClass(type: string) {
    if (type === 'damage' || type === 'heal') return 'w-[2.5vw] h-[2.5vw] text-[1.2vw]';
    return 'w-[3vw] h-[3vw] text-[1.5vw]';
}

// ============================================================================
// 常量
// ============================================================================

const FLIGHT_DURATION = 0.5; // 秒

/**
 * 根据 intensity 计算尾迹粒子数
 * intensity 1 → 6 粒子，每 +1 → +3，上限 30
 */
function getTrailParticleCount(intensity: number): number {
    return Math.min(30, 6 + Math.max(0, intensity - 1) * 3);
}

// ============================================================================
// tsParticles 尾迹粒子
// ============================================================================

type ParticlesComponent = React.ComponentType<import('@tsparticles/react').IParticlesProps>;

/** 引擎初始化缓存（与 BurstParticles 共享同一个 promise） */
let engineInitPromise: Promise<ParticlesComponent> | null = null;

async function getParticlesComponent(): Promise<ParticlesComponent> {
    if (!engineInitPromise) {
        engineInitPromise = (async () => {
            const [{ initParticlesEngine, Particles }, { loadSlim }] = await Promise.all([
                import('@tsparticles/react'),
                import('@tsparticles/slim'),
            ]);
            await initParticlesEngine(async (engine) => {
                await loadSlim(engine);
            });
            return Particles;
        })();
    }
    return engineInitPromise;
}

/** 构建尾迹粒子的 tsParticles 配置 */
function buildTrailOptions(
    count: number,
    colors: string[],
    speed: number,
): import('@tsparticles/engine').ISourceOptions {
    return {
        fullScreen: { enable: false, zIndex: 0 },
        fpsLimit: 60,
        detectRetina: true,
        particles: {
            number: { value: count },
            color: { value: colors },
            shape: { type: ['circle'] },
            opacity: {
                value: { min: 0.5, max: 1 },
                animation: {
                    enable: true,
                    speed: 2,
                    startValue: 'max' as const,
                    destroy: 'min' as const,
                },
            },
            size: {
                value: { min: 1.5, max: 4 },
                animation: {
                    enable: true,
                    speed: 3,
                    startValue: 'max' as const,
                    destroy: 'min' as const,
                },
            },
            move: {
                enable: true,
                // 粒子从发射点向反方向扩散（模拟尾迹脱落）
                speed: { min: speed * 0.3, max: speed * 0.8 },
                direction: 'none' as const,
                outModes: { default: 'destroy' as const },
                gravity: { enable: false },
            },
            life: {
                duration: { value: { min: 0.15, max: 0.35 } },
                count: 1,
            },
        },
    };
}

/**
 * 尾迹粒子容器 — 跟随飞行体位置，持续发射粒子
 *
 * 使用 tsParticles，粒子数量与 intensity 成正比。
 * 容器通过 useAnimationFrame 同步飞行体的 motionValue 位置。
 */
const TrailEmitter: React.FC<{
    motionX: import('framer-motion').MotionValue<number>;
    motionY: import('framer-motion').MotionValue<number>;
    intensity: number;
    trailColors: string[];
}> = ({ motionX, motionY, intensity, trailColors }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [Comp, setComp] = React.useState<ParticlesComponent | null>(null);

    // 动态加载 tsParticles
    React.useEffect(() => {
        let mounted = true;
        void getParticlesComponent().then((P) => {
            if (mounted) setComp(() => P);
        });
        return () => { mounted = false; };
    }, []);

    // 每帧同步容器位置到飞行体当前坐标
    useAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        el.style.transform = `translate(${motionX.get()}px, ${motionY.get()}px)`;
    });

    const count = getTrailParticleCount(intensity);
    // 高 intensity 粒子速度更快，视觉更猛烈
    const speed = 3 + Math.min(intensity, 8) * 0.8;

    const options = React.useMemo(
        () => buildTrailOptions(count, trailColors, speed),
        [count, trailColors, speed],
    );

    return (
        <div
            ref={containerRef}
            className="absolute pointer-events-none"
            style={{
                width: 40,
                height: 40,
                left: -20,
                top: -20,
            }}
        >
            {Comp && (
                <Comp
                    id={`trail-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`}
                    options={options}
                />
            )}
        </div>
    );
};

// ============================================================================
// 到达冲击波
// ============================================================================

/** 到达时的冲击闪光 + 扩散环 */
const ArrivalImpact: React.FC<{
    deltaX: number;
    deltaY: number;
    impactColor: string;
    glowShadow: string;
}> = ({ deltaX, deltaY, impactColor, glowShadow }) => (
    <>
        {/* 闪光 */}
        <motion.div
            className="absolute rounded-full"
            style={{
                width: 20,
                height: 20,
                left: '50%',
                top: '50%',
                marginLeft: -10,
                marginTop: -10,
                backgroundColor: impactColor,
                boxShadow: glowShadow,
            }}
            initial={{ x: deltaX, y: deltaY, scale: 0, opacity: 0 }}
            animate={{
                x: deltaX,
                y: deltaY,
                scale: [0, 2, 2.5],
                opacity: [0, 0.8, 0],
            }}
            transition={{
                duration: 0.35,
                delay: FLIGHT_DURATION - 0.05,
                ease: 'easeOut',
            }}
        />
        {/* 扩散环 */}
        <motion.div
            className="absolute rounded-full"
            style={{
                width: 30,
                height: 30,
                left: '50%',
                top: '50%',
                marginLeft: -15,
                marginTop: -15,
                border: `2px solid ${impactColor}`,
            }}
            initial={{ x: deltaX, y: deltaY, scale: 0, opacity: 0 }}
            animate={{
                x: deltaX,
                y: deltaY,
                scale: [0, 2.5],
                opacity: [0, 0.6, 0],
            }}
            transition={{
                duration: 0.4,
                delay: FLIGHT_DURATION,
                ease: 'easeOut',
            }}
        />
    </>
);

// ============================================================================
// 飘字（到达后向上浮出）
// ============================================================================

/** 到达后的伤害/治疗飘字 */
const FloatingText: React.FC<{
    content: React.ReactNode;
    deltaX: number;
    deltaY: number;
    floatColor: string;
    type: string;
}> = ({ content, deltaX, deltaY, floatColor, type }) => {
    // 只有 damage 和 heal 显示飘字
    if (type !== 'damage' && type !== 'heal') return null;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: '50%',
                top: '50%',
            }}
            initial={{ x: deltaX - 12, y: deltaY, opacity: 0, scale: 0.5 }}
            animate={{
                x: deltaX - 12,
                y: deltaY - 50,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.4, 1.2, 0.8],
            }}
            transition={{
                duration: 0.8,
                delay: FLIGHT_DURATION + 0.05,
                ease: 'easeOut',
                opacity: { times: [0, 0.15, 0.6, 1] },
                scale: { times: [0, 0.2, 0.5, 1] },
            }}
        >
            <span
                className={`font-black whitespace-nowrap ${floatColor}`}
                style={{
                    fontSize: '1.6vw',
                    textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.5)',
                }}
            >
                {content}
            </span>
        </motion.div>
    );
};

// ============================================================================
// 主飞行体
// ============================================================================

const FlyingEffectItem: React.FC<{
    effect: FlyingEffectData;
    onComplete: (id: string) => void;
}> = ({ effect, onComplete }) => {
    const deltaX = effect.endPos.x - effect.startPos.x;
    const deltaY = effect.endPos.y - effect.startPos.y;
    const style = getStyle(effect.type, effect.color);
    const sizeClass = getSizeClass(effect.type);
    const showTrail = effect.type === 'damage' || effect.type === 'heal';
    const intensity = effect.intensity ?? 1;

    // 飞行体位置的 motionValue，供尾迹粒子跟随
    const motionX = useMotionValue(0);
    const motionY = useMotionValue(0);

    // 自动清理：飞行完成 + 飘字动画后移除
    const timerRef = React.useRef<number>(0);
    React.useEffect(() => {
        const totalMs = showTrail
            ? (FLIGHT_DURATION + 0.85) * 1000
            : FLIGHT_DURATION * 1000 + 300;
        timerRef.current = window.setTimeout(() => onComplete(effect.id), totalMs);
        return () => window.clearTimeout(timerRef.current);
    }, [effect.id, onComplete, showTrail]);

    return (
        <motion.div
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: effect.startPos.x,
                top: effect.startPos.y,
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* tsParticles 尾迹 — 跟随飞行体 */}
            {showTrail && (
                <TrailEmitter
                    motionX={motionX}
                    motionY={motionY}
                    intensity={intensity}
                    trailColors={style.trailColors}
                />
            )}

            {/* 主飞行体（圆形图标） */}
            <motion.div
                className="relative"
                initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
                animate={{
                    x: deltaX,
                    y: deltaY,
                    scale: [0.6, 1.2, 1],
                    opacity: [0, 1, 1, 0],
                }}
                transition={{
                    duration: FLIGHT_DURATION,
                    ease: [0.34, 1.56, 0.64, 1],
                    scale: { times: [0, 0.3, 1] },
                    opacity: { times: [0, 0.1, 0.85, 1] },
                }}
                style={{ x: motionX, y: motionY }}
            >
                <div
                    className={`
                        flex items-center justify-center rounded-full shadow-2xl
                        bg-gradient-to-br ${style.bgClass} ${sizeClass}
                        font-black text-white drop-shadow-md
                    `}
                    style={{ boxShadow: style.glowShadow }}
                >
                    {effect.content}
                </div>
            </motion.div>

            {/* 到达冲击 */}
            {showTrail && (
                <ArrivalImpact
                    deltaX={deltaX}
                    deltaY={deltaY}
                    impactColor={style.impactColor}
                    glowShadow={style.glowShadow}
                />
            )}

            {/* 飘字 */}
            <FloatingText
                content={effect.content}
                deltaX={deltaX}
                deltaY={deltaY}
                floatColor={style.floatColor}
                type={effect.type}
            />
        </motion.div>
    );
};

// ============================================================================
// 效果层 & Hook
// ============================================================================

export const FlyingEffectsLayer: React.FC<{
    effects: FlyingEffectData[];
    onEffectComplete: (id: string) => void;
}> = ({ effects, onEffectComplete }) => (
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
