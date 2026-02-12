import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../../contexts/TutorialContext';
import { playSound } from '../../lib/audio/useGameAudio';
import { AudioManager } from '../../lib/audio/AudioManager';
import { UI_Z_INDEX } from '../../core';

const TUTORIAL_NEXT_SOUND_KEY = 'ui.general.khron_studio_rpg_interface_essentials_inventory_dialog_ucs_system_192khz.buttons.tab_switching_button.uiclick_tab_switching_button_01_krst_none';

/** Check if an element is inside an overflow:hidden ancestor (before the viewport root). */
function hasOverflowHiddenAncestor(el: Element): boolean {
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
        const overflow = getComputedStyle(parent).overflow;
        if (overflow === 'hidden') return true;
        parent = parent.parentElement;
    }
    return false;
}

export const TutorialOverlay: React.FC = () => {
    const { isActive, currentStep, nextStep, isLastStep } = useTutorial();
    const stepNamespace = currentStep?.content?.includes(':')
        ? currentStep.content.split(':')[0]
        : undefined;
    const namespaces = stepNamespace ? ['tutorial', stepNamespace] : ['tutorial'];
    const { t } = useTranslation(namespaces);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const lastStepIdRef = useRef<string | null>(null);
    const hasAutoScrolledRef = useRef(false);
    const [positionedStepId, setPositionedStepId] = useState<string | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    }));

    const [tooltipStyles, setTooltipStyles] = useState<{
        style: React.CSSProperties,
        arrowClass: string
    }>({ style: {}, arrowClass: '' });

    // 响应窗口尺寸变化，确保遮罩与提示框重新计算
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setViewport((prev) => {
                const next = { width: window.innerWidth, height: window.innerHeight };
                if (prev.width === next.width && prev.height === next.height) return prev;
                return next;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isActive) return;
        AudioManager.preloadKeys([TUTORIAL_NEXT_SOUND_KEY]);
    }, [isActive]);

    // 统一布局 effect：找元素 + 算位置在同一个回调里完成，不会有过期数据
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const stepId = currentStep.id;
        const highlightTarget = currentStep.highlightTarget;
        const position = currentStep.position;
        const viewportWidth = viewport.width || window.innerWidth;
        const viewportHeight = viewport.height || window.innerHeight;

        if (lastStepIdRef.current !== stepId) {
            lastStepIdRef.current = stepId;
            hasAutoScrolledRef.current = false;
            setTargetRect(null);
            setPositionedStepId(null);
        }

        let resizeObserver: ResizeObserver | null = null;
        let rafId: number | null = null;

        /** 从 DOMRect 直接算出提示框位置，和 targetRect 一起原子更新 */
        const applyLayout = (rect: DOMRect | null) => {
            // 1. 更新高亮区域
            setTargetRect(prev => {
                if (!rect) return null;
                if (prev && Math.abs(prev.top - rect.top) < 0.5 && Math.abs(prev.left - rect.left) < 0.5
                    && Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5) {
                    return prev;
                }
                return rect;
            });

            // 2. 计算提示框位置
            const isCenterPosition = position === 'center';
            if (!rect || isCenterPosition) {
                setTooltipStyles({
                    style: {
                        position: 'fixed',
                        bottom: '10%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: UI_Z_INDEX.tutorial,
                    },
                    arrowClass: 'hidden'
                });
                setPositionedStepId(stepId);
                return;
            }

            const padding = 12;
            const tooltipWidth = 280;
            // 用实际 DOM 尺寸，首次渲染前 fallback 到估算值
            const measured = tooltipRef.current?.getBoundingClientRect();
            const tooltipHeight = measured ? measured.height : 160;
            const actualTooltipWidth = measured ? measured.width : tooltipWidth;

            const spaceRight = viewportWidth - rect.right;
            const spaceLeft = rect.left;
            const spaceBottom = viewportHeight - rect.bottom;

            let pos: 'right' | 'left' | 'bottom' | 'top';
            if (position) {
                pos = position;
            } else if (spaceRight > tooltipWidth + 20) {
                pos = 'right';
            } else if (spaceLeft > tooltipWidth + 20) {
                pos = 'left';
            } else if (spaceBottom > tooltipHeight + 20) {
                pos = 'bottom';
            } else {
                pos = 'top';
            }

            const styles: React.CSSProperties = { position: 'fixed', zIndex: UI_Z_INDEX.tutorial };
            let arrow = '';
            switch (pos) {
                case 'right':
                    styles.left = rect.right + padding;
                    styles.top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                    arrow = '-left-[6px] top-[40px] border-b border-l';
                    break;
                case 'left':
                    styles.left = rect.left - actualTooltipWidth - padding;
                    styles.top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                    arrow = '-right-[6px] top-[40px] border-t border-r';
                    break;
                case 'bottom':
                    styles.top = rect.bottom + padding;
                    styles.left = rect.left + (rect.width / 2) - (actualTooltipWidth / 2);
                    arrow = '-top-[6px] left-1/2 -translate-x-1/2 border-t border-l';
                    break;
                case 'top':
                    styles.top = rect.top - tooltipHeight - padding;
                    styles.left = rect.left + (rect.width / 2) - (actualTooltipWidth / 2);
                    arrow = '-bottom-[6px] left-1/2 -translate-x-1/2 border-b border-r';
                    break;
            }

            // 防遮挡：确保 tooltip 不覆盖高亮目标区域
            if (typeof styles.top === 'number') {
                const tooltipBottom = styles.top + tooltipHeight;
                const tooltipTop = styles.top;
                if (pos === 'top' && tooltipBottom > rect.top - padding) {
                    // tooltip 底部侵入目标区域，往上推
                    styles.top = rect.top - tooltipHeight - padding;
                }
                if (pos === 'bottom' && tooltipTop < rect.bottom + padding) {
                    styles.top = rect.bottom + padding;
                }
            }

            const arrowBase = 'bg-white w-4 h-4 absolute rotate-45 border-gray-100 z-0';
            const safeMargin = 8;
            // 视口边界约束（上下都限制，防止全屏高亮目标把 tooltip 推到屏幕外）
            if (typeof styles.top === 'number') {
                const maxTop = viewportHeight - tooltipHeight - safeMargin;
                styles.top = Math.max(safeMargin, Math.min(styles.top as number, maxTop));
            }
            if (typeof styles.left === 'number') {
                styles.left = Math.max(safeMargin, Math.min(styles.left as number, viewportWidth - actualTooltipWidth - safeMargin));
            }
            const topValue = typeof styles.top === 'number' ? styles.top : safeMargin;
            styles.maxHeight = viewportHeight - topValue - safeMargin;

            setTooltipStyles({ style: styles, arrowClass: `${arrowBase} ${arrow}` });
            setPositionedStepId(stepId);
        };

        const updateLayout = () => {
            if (highlightTarget) {
                const el = document.querySelector(`[data-tutorial-id="${highlightTarget}"]`) ||
                    document.getElementById(highlightTarget);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    applyLayout(rect);
                    if (!hasAutoScrolledRef.current) {
                        const tolerance = 50;
                        const inView = rect.top >= -tolerance && rect.left >= -tolerance
                            && rect.bottom <= viewportHeight + tolerance
                            && rect.right <= viewportWidth + tolerance;
                        // Only scrollIntoView if the element is NOT inside an overflow:hidden
                        // ancestor. Those containers (e.g. transform-based map panning) manage
                        // their own visibility; scrollIntoView would produce an unwanted
                        // scrollTop offset that conflicts with CSS transform positioning.
                        if (!inView && !hasOverflowHiddenAncestor(el)) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        hasAutoScrolledRef.current = true;
                    }
                    if (!resizeObserver) {
                        resizeObserver = new ResizeObserver(() => updateLayout());
                        resizeObserver.observe(el);
                    }
                } else {
                    applyLayout(null);
                }
            } else {
                applyLayout(null);
            }
        };

        // rAF 轮询（~10fps）：追踪元素位置变化（transform 动画等）
        let lastPollTime = 0;
        const POLL_INTERVAL = 100;
        const poll = () => {
            const now = performance.now();
            if (now - lastPollTime >= POLL_INTERVAL) {
                lastPollTime = now;
                updateLayout();
            }
            rafId = requestAnimationFrame(poll);
        };
        rafId = requestAnimationFrame(poll);

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
        };
    }, [currentStep, isActive, viewport.height, viewport.width]);

    if (!isActive || !currentStep) {
        return null;
    }

    // 在智能回合期间不显示遮罩层 - 让智能方静默移动
    if (currentStep.aiActions && currentStep.aiActions.length > 0) {
        return null;
    }

    // 矢量路径用于带孔洞的遮罩
    const viewportWidth = viewport.width || window.innerWidth;
    const viewportHeight = viewport.height || window.innerHeight;
    let maskPath = `M0 0 h${viewportWidth} v${viewportHeight} h-${viewportWidth} z`;
    if (targetRect) {
        // 逆时针矩形用于创建挖空效果（偶奇填充规则）
        const { left, top, right, bottom } = targetRect;
        const p = 8;
        maskPath += ` M${left - p} ${top - p} v${(bottom - top) + p * 2} h${(right - left) + p * 2} v-${(bottom - top) + p * 2} z`;
    }

    const maskOpacity = currentStep.showMask && targetRect ? 0.6 : 0;

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: UI_Z_INDEX.tutorial }}
            data-tutorial-step={currentStep.id ?? 'unknown'}
        >
            {/* 遮罩层 - 仅在遮罩开关为真且目标存在时阻止点击 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300">
                <path
                    d={maskPath}
                    fill={`rgba(0, 0, 0, ${maskOpacity})`}
                    // 当遮罩透明时，允许所有点击穿透
                    // 当遮罩可见时，仍需要允许在“孔洞”区域点击
                    style={{ pointerEvents: currentStep.showMask && targetRect ? 'auto' : 'none' }}
                    fillRule="evenodd"
                />
            </svg>

            {/* 目标高亮环（苹果风格蓝色光晕）- 目标存在时始终可见 */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        borderRadius: '12px',
                        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.3)',
                    }}
                />
            )}

            {/* 提示框弹窗 - requireAction 时不拦截点击，让用户与游戏 UI 交互 */}
            <div
                ref={tooltipRef}
                className={`${currentStep.requireAction ? 'pointer-events-none' : 'pointer-events-auto'} flex flex-col items-center absolute transition-opacity duration-150`}
                style={{ ...tooltipStyles.style, opacity: positionedStepId === currentStep.id ? 1 : 0 }}
            >
                {/* 样式三角箭头 */}
                <div className={`absolute w-0 h-0 border-solid ${tooltipStyles.arrowClass}`} />

                {/* 内容卡片 */}
                <div className="bg-[#fcfbf9] rounded-sm shadow-[0_8px_30px_rgba(67,52,34,0.12)] p-5 border border-[#e5e0d0] max-w-sm w-72 animate-in fade-in zoom-in-95 duration-200 relative font-serif flex flex-col" style={{ maxHeight: 'inherit' }}>
                    {/* 装饰性边角（右上）*/}
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-[#c0a080] opacity-40" />

                    <div className="text-[#433422] font-bold text-lg mb-4 leading-relaxed text-left overflow-y-auto flex-1 min-h-0 whitespace-pre-line">
                        {t(currentStep.content)}
                    </div>

                    {!currentStep.requireAction && (
                        <button
                            onClick={() => {
                                playSound(TUTORIAL_NEXT_SOUND_KEY);
                                nextStep('manual');
                            }}
                            className="w-full py-2 bg-[#433422] hover:bg-[#2b2114] text-[#fcfbf9] font-bold text-sm uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center text-center relative z-10 pointer-events-auto"
                        >
                            {isLastStep ? t('overlay.finish') : t('overlay.next')}
                        </button>
                    )}

                    {currentStep.requireAction && (
                        <div className="flex items-center gap-2 text-sm font-bold text-[#8c7b64] bg-[#f3f0e6]/50 p-2 border border-[#e5e0d0]/50 justify-center italic">
                            <span className="animate-pulse w-2 h-2 rounded-full bg-[#c0a080]"></span>
                            {t('overlay.clickToContinue')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
