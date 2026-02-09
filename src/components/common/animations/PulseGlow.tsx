import React from 'react';
import { motion, type MotionStyle } from 'framer-motion';
import { pulseGlowVariants } from './variants';

interface PulseGlowProps {
    children: React.ReactNode;
    isGlowing: boolean;
    className?: string;
    style?: React.CSSProperties;
    glowColor?: string;
    onClick?: () => void;
    loop?: boolean;
    effect?: 'glow' | 'ripple';
}

// 脉冲发光容器组件 - 技能激活时的发光效果
export const PulseGlow = ({
    children,
    isGlowing,
    className = '',
    style,
    glowColor = 'rgba(251, 191, 36, 0.6)',
    onClick,
    loop = false,
    effect = 'glow',
}: PulseGlowProps) => {
    const defaultGlowColor = 'rgba(251, 191, 36, 0.6)';
    const useRipple = effect === 'ripple';
    const customVariants = React.useMemo(() => ({
        idle: {
            boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)',
        },
        glow: {
            boxShadow: [
                `0 0 0 0 ${glowColor.replace('0.6', '0.8')}`,
                `0 0 30px 10px ${glowColor}`,
                `0 0 0 0 ${glowColor.replace('0.6', '0')}`,
            ],
            transition: {
                duration: 0.8,
                ease: 'easeOut' as const,
                ...(loop ? { repeat: Infinity, repeatType: 'loop' as const, repeatDelay: 0.8 } : {}),
            },
        },
    }), [glowColor, loop]);

    const useDefaultVariants = glowColor === defaultGlowColor && !loop;
    const rippleTransitionBase = React.useMemo(() => ({
        duration: 1.6,
        ease: 'easeOut' as const,
        ...(loop ? { repeat: Infinity, repeatDelay: 0.2 } : {}),
    }), [loop]);
    const containerStyle: MotionStyle | undefined = useRipple
        ? ({ position: 'relative', ...(style ?? {}) } as MotionStyle)
        : (style as MotionStyle | undefined);

    return (
        <motion.div
            className={className}
            style={containerStyle}
            variants={useRipple ? undefined : (useDefaultVariants ? pulseGlowVariants : customVariants)}
            animate={useRipple ? undefined : (isGlowing ? 'glow' : 'idle')}
            onClick={onClick}
        >
            {useRipple && isGlowing && (
                <>
                    <motion.span
                        className="absolute inset-0 rounded-full border-2 pointer-events-none"
                        style={{ borderColor: glowColor }}
                        initial={{ opacity: 0.8, scale: 1 }}
                        animate={{ opacity: [0.8, 0], scale: [1, 2.2] }}
                        transition={rippleTransitionBase}
                    />
                    <motion.span
                        className="absolute inset-0 rounded-full border-2 pointer-events-none"
                        style={{ borderColor: glowColor }}
                        initial={{ opacity: 0.7, scale: 1 }}
                        animate={{ opacity: [0.7, 0], scale: [1, 2.2] }}
                        transition={{ ...rippleTransitionBase, delay: loop ? 0.8 : 0 }}
                    />
                </>
            )}
            {children}
        </motion.div>
    );
};

// Hook：管理发光状态
export const usePulseGlow = (duration = 800) => {
    const [isGlowing, setIsGlowing] = React.useState(false);

    const triggerGlow = React.useCallback(() => {
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), duration);
    }, [duration]);

    return { isGlowing, triggerGlow };
};
