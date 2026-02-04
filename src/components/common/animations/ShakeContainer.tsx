import React from 'react';
import { motion } from 'framer-motion';
import { shakeVariants } from './variants';

interface ShakeContainerProps {
    children: React.ReactNode;
    isShaking: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

// 震动容器组件 - 包裹子元素并在触发时震动
export const ShakeContainer = ({
    children,
    isShaking,
    className = '',
    style,
    onClick,
}: ShakeContainerProps) => {
    return (
        <motion.div
            className={className}
            style={style}
            variants={shakeVariants}
            animate={isShaking ? 'shake' : 'idle'}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
};

// Hook：管理震动状态
export const useShake = (duration = 500) => {
    const [isShaking, setIsShaking] = React.useState(false);

    const triggerShake = React.useCallback(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), duration);
    }, [duration]);

    return { isShaking, triggerShake };
};
