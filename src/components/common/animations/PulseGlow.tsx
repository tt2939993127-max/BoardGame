import React from 'react';
import { motion } from 'framer-motion';
import { pulseGlowVariants } from './variants';

interface PulseGlowProps {
    children: React.ReactNode;
    isGlowing: boolean;
    className?: string;
    style?: React.CSSProperties;
    glowColor?: string;
    onClick?: () => void;
}

// 脉冲发光容器组件 - 技能激活时的发光效果
export const PulseGlow = ({
    children,
    isGlowing,
    className = '',
    style,
    glowColor = 'rgba(251, 191, 36, 0.6)',
    onClick,
}: PulseGlowProps) => {
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
            },
        },
    }), [glowColor]);

    return (
        <motion.div
            className={className}
            style={style}
            variants={glowColor === 'rgba(251, 191, 36, 0.6)' ? pulseGlowVariants : customVariants}
            animate={isGlowing ? 'glow' : 'idle'}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
};

// Hook: 管理发光状态
export const usePulseGlow = (duration = 800) => {
    const [isGlowing, setIsGlowing] = React.useState(false);

    const triggerGlow = React.useCallback(() => {
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), duration);
    }, [duration]);

    return { isGlowing, triggerGlow };
};
