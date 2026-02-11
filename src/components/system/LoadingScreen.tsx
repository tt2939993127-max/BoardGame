import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LoadingArcaneAether } from './LoadingVariants';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

// 全局计数器：追踪当前存活的 LoadingScreen 实例数
let globalLoadingScreenCount = 0;
// 全局标记：标识本次会话是否已经播放过入场动画
let hasPlayedEntryAnimation = false;

interface LoadingScreenProps {
    title?: string;
    description?: string;
    fullScreen?: boolean;
    className?: string;
    titleClassName?: string;
    descriptionClassName?: string;
}

/**
 * 统一的全局/局部加载屏幕
 * 接入了 "Qualified Arcane" (LoadingArcaneAether) 高级动画
 * 
 * 优化：连续切换加载阶段时，动画不重复播放，只变文本
 */
export const LoadingScreen = ({
    title,
    description,
    fullScreen = true,
    className,
    titleClassName,
    descriptionClassName
}: LoadingScreenProps) => {
    const { t } = useTranslation('lobby');
    
    // 追踪本实例是否应该播放入场动画
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        // 挂载时：增加计数
        globalLoadingScreenCount++;
        
        // 判断是否需要播放动画：
        // 1. 如果之前没有 LoadingScreen 存活（计数为1，即当前是唯一一个）
        // 2. 且本次会话还没播放过入场动画
        // 则播放动画
        if (globalLoadingScreenCount === 1 && !hasPlayedEntryAnimation) {
            setShouldAnimate(true);
            hasPlayedEntryAnimation = true;
        } else {
            // 否则跳过动画，直接显示
            setShouldAnimate(false);
        }
        
        mountedRef.current = true;

        return () => {
            // 卸载时：减少计数
            globalLoadingScreenCount--;
            
            // 当所有 LoadingScreen 都卸载后，重置动画标记
            // 这样下次再显示加载屏幕时会重新播放动画
            if (globalLoadingScreenCount === 0) {
                // 延迟重置，避免快速切换时立即重置
                setTimeout(() => {
                    if (globalLoadingScreenCount === 0) {
                        hasPlayedEntryAnimation = false;
                    }
                }, 500);
            }
        };
    }, []);

    // 动画变体配置
    const containerVariants = shouldAnimate
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    
    const textVariants = shouldAnimate
        ? { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } }
        : { initial: { y: 0, opacity: 1 }, animate: { y: 0, opacity: 1 } };
    
    const decorVariants = shouldAnimate
        ? { initial: { scaleX: 0, opacity: 0 }, animate: { scaleX: 1, opacity: 0.3 } }
        : { initial: { scaleX: 1, opacity: 0.3 }, animate: { scaleX: 1, opacity: 0.3 } };

    return (
        <AnimatePresence>
            <motion.div
                initial={containerVariants.initial}
                animate={containerVariants.animate}
                exit={containerVariants.exit}
                className={clsx(
                    "flex flex-col items-center justify-center bg-black z-[9999]",
                    fullScreen ? "fixed inset-0 w-screen h-screen" : "relative w-full h-full min-h-[400px]",
                    className
                )}
            >
                {/* 核心法阵动画 */}
                <div className="relative mb-8 transform scale-75 md:scale-100">
                    <LoadingArcaneAether />

                    {/* 额外的底层氛围发光 */}
                    <motion.div
                        className="absolute inset-0 bg-amber-500/10 rounded-full blur-[60px] -z-10"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                {/* 文本提示区 */}
                <div className="flex flex-col items-center text-center px-6 max-w-sm">
                    {title && (
                        <motion.h2
                            key={title}
                            initial={textVariants.initial}
                            animate={textVariants.animate}
                            transition={shouldAnimate ? { delay: 0.2 } : { duration: 0.3 }}
                            className={clsx(
                                "text-amber-500 font-bold text-lg md:text-xl tracking-[0.2em] uppercase mb-2",
                                titleClassName
                            )}
                        >
                            {title}
                        </motion.h2>
                    )}

                    <motion.p
                        key={description || 'default'}
                        initial={textVariants.initial}
                        animate={textVariants.animate}
                        transition={shouldAnimate ? { delay: 0.3 } : { duration: 0.3 }}
                        className={clsx(
                            "text-amber-200/60 text-xs md:text-sm font-serif tracking-widest leading-relaxed line-clamp-2",
                            descriptionClassName
                        )}
                    >
                        {description || t('matchRoom.loadingResources')}
                    </motion.p>
                </div>

                {/* 底部装饰线 */}
                <motion.div
                    initial={decorVariants.initial}
                    animate={decorVariants.animate}
                    transition={shouldAnimate ? { delay: 0.5, duration: 1 } : { duration: 0 }}
                    className="absolute bottom-12 w-32 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"
                />
            </motion.div>
        </AnimatePresence>
    );
};

export default LoadingScreen;
