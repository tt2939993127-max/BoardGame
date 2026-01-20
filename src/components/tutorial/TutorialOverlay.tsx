import React, { useEffect, useState } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';

export const TutorialOverlay: React.FC = () => {
    const { isActive, currentStep, nextStep } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);



    // Update highlight position
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const updateRect = () => {
            if (currentStep.highlightTarget) {
                const el = document.querySelector(`[data-tutorial-id="${currentStep.highlightTarget}"]`) ||
                    document.getElementById(currentStep.highlightTarget);

                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        const interval = setInterval(updateRect, 500);

        return () => {
            window.removeEventListener('resize', updateRect);
            clearInterval(interval);
        };
    }, [isActive, currentStep]);

    // State for tooltip position and arrow class
    const [tooltipStyles, setTooltipStyles] = useState<{
        style: React.CSSProperties,
        arrowClass: string
    }>({ style: {}, arrowClass: '' });

    // Calculate layout based on targetRect
    useEffect(() => {
        if (!targetRect) {
            // Default: Bottom Center
            setTooltipStyles({
                style: {
                    position: 'fixed',
                    bottom: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100
                },
                arrowClass: 'hidden'
            });
            return;
        }

        const padding = 12; // Gap between target and tooltip
        const tooltipWidth = 280; // Estimated width
        const tooltipHeight = 160; // Estimated height

        // Priority logic: Right -> Left -> Bottom -> Top
        const spaceRight = window.innerWidth - targetRect.right;
        const spaceLeft = targetRect.left;
        const spaceBottom = window.innerHeight - targetRect.bottom;

        let pos: 'right' | 'left' | 'bottom' | 'top';

        if (spaceRight > tooltipWidth + 20) {
            pos = 'right';
        } else if (spaceLeft > tooltipWidth + 20) {
            pos = 'left';
        } else if (spaceBottom > tooltipHeight + 20) {
            pos = 'bottom';
        } else {
            pos = 'top';
        }

        // Calculate specific coordinates
        const styles: React.CSSProperties = {
            position: 'absolute',
            zIndex: 100,
        };
        let arrow = '';

        switch (pos) {
            case 'right':
                styles.left = targetRect.right + padding;
                styles.top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 3);
                arrow = '-left-[6px] top-[40px] border-b border-l'; // Left-pointing on right side
                break;
            case 'left':
                styles.left = targetRect.left - tooltipWidth - padding;
                styles.top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 3);
                arrow = '-right-[6px] top-[40px] border-t border-r'; // Right-pointing on left side
                break;
            case 'bottom':
                styles.top = targetRect.bottom + padding;
                styles.left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
                arrow = '-top-[6px] left-1/2 -translate-x-1/2 border-t border-l'; // Up-pointing on bottom side
                break;
            case 'top':
                styles.top = targetRect.top - tooltipHeight - padding;
                styles.left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
                arrow = '-bottom-[6px] left-1/2 -translate-x-1/2 border-b border-r'; // Down-pointing on top side
                break;
        }

        // Add common base classes for the rotated square arrow
        const arrowBase = "bg-white w-4 h-4 absolute rotate-45 border-gray-100 z-0";
        setTooltipStyles({ style: styles, arrowClass: `${arrowBase} ${arrow}` });

    }, [targetRect]);

    if (!isActive || !currentStep) return null;

    // Don't show overlay during AI's turn - let the AI move happen silently
    if (currentStep.aiMove !== undefined) return null;



    // SVG Path for the mask with a hole
    let maskPath = `M0 0 h${window.innerWidth} v${window.innerHeight} h-${window.innerWidth} z`;
    if (targetRect) {
        // Anti-clockwise rect for the hole to create cutout (fill-rule: evenodd)
        const { left, top, right, bottom } = targetRect;
        const p = 8;
        maskPath += ` M${left - p} ${top - p} v${(bottom - top) + p * 2} h${(right - left) + p * 2} v-${(bottom - top) + p * 2} z`;
    }

    const maskOpacity = currentStep.showMask ? 0.6 : 0;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Mask Layer - Only block clicks when showMask is true */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300">
                <path
                    d={maskPath}
                    fill={`rgba(0, 0, 0, ${maskOpacity})`}
                    // When mask is transparent, allow all clicks through
                    // When mask is visible, still need to allow clicks on the "hole" area
                    style={{ pointerEvents: currentStep.showMask ? 'auto' : 'none' }}
                    fillRule="evenodd"
                />
            </svg>

            {/* Target Highlight Ring (Apple-style blue glow) - Always visible when target exists */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none transition-all duration-300"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        borderRadius: '12px',
                        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.3)'
                    }}
                />
            )}

            {/* Tooltip Popover */}
            <div
                className="pointer-events-auto transition-all duration-300 ease-out flex flex-col items-center absolute"
                style={tooltipStyles.style}
            >
                {/* CSS Triangle Arrow */}
                <div className={`absolute w-0 h-0 border-solid ${tooltipStyles.arrowClass}`} />

                {/* Content Card */}
                <div className="bg-[#fcfbf9] rounded-sm shadow-[0_8px_30px_rgba(67,52,34,0.12)] p-5 border border-[#e5e0d0] max-w-sm w-72 animate-in fade-in zoom-in-95 duration-200 relative font-serif">
                    {/* Decorative Corner (Top Right) */}
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-[#c0a080] opacity-40" />

                    <div className="text-[#433422] font-bold text-lg mb-4 leading-relaxed text-left">
                        {currentStep.content}
                    </div>

                    {!currentStep.requireAction && (
                        <button
                            onClick={nextStep}
                            className="w-full py-2 bg-[#433422] hover:bg-[#2b2114] text-[#fcfbf9] font-bold text-sm uppercase tracking-widest transition-all cursor-pointer"
                        >
                            下一步
                        </button>
                    )}

                    {currentStep.requireAction && (
                        <div className="flex items-center gap-2 text-sm font-bold text-[#8c7b64] bg-[#f3f0e6]/50 p-2 border border-[#e5e0d0]/50 justify-center italic">
                            <span className="animate-pulse w-2 h-2 rounded-full bg-[#c0a080]"></span>
                            请点击高亮区域继续
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
