import React, { useEffect, useState } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';

export const TutorialOverlay: React.FC = () => {
    const { isActive, currentStep, nextStep, currentStepIndex } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Update highlight position
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const updateRect = () => {
            if (currentStep.highlightTarget) {
                // Try finding by data-tutorial-id first, then ID
                const el = document.querySelector(`[data-tutorial-id="${currentStep.highlightTarget}"]`) ||
                    document.getElementById(currentStep.highlightTarget);

                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                    // Scroll into view if needed
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    setTargetRect(null); // Fallback: center overlay if target not found
                }
            } else {
                setTargetRect(null);
            }
        };

        // Initial update
        updateRect();

        // Listen for Resize and Mutation (in case DOM changes)
        window.addEventListener('resize', updateRect);

        // Simple polling for DOM readiness if mainly dealing with React renders
        const interval = setInterval(updateRect, 500);

        return () => {
            window.removeEventListener('resize', updateRect);
            clearInterval(interval);
        };
    }, [isActive, currentStep]);

    if (!isActive || !currentStep) return null;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    const hole = targetRect
        ? {
            top: clamp(targetRect.top - padding, 0, viewportHeight),
            left: clamp(targetRect.left - padding, 0, viewportWidth),
            right: clamp(targetRect.right + padding, 0, viewportWidth),
            bottom: clamp(targetRect.bottom + padding, 0, viewportHeight),
        }
        : null;

    // SVG Path for the mask with a hole
    let maskPath = `M0 0 h${window.innerWidth} v${window.innerHeight} h-${window.innerWidth} z`;
    if (targetRect) {
        // Anti-clockwise rect for the hole to create cutout (fill-rule: evenodd)
        const { left, top, right, bottom } = targetRect;
        // Add some padding (8px)
        const p = 8;
        maskPath += ` M${left - p} ${top - p} v${(bottom - top) + p * 2} h${(right - left) + p * 2} v-${(bottom - top) + p * 2} z`;
    }

    // Intelligent Positioning Logic
    const getTooltipStyle = () => {
        if (!targetRect) {
            // Default: Bottom Center (to avoid obscuring the board in the middle)
            return {
                bottom: '10%',
                left: '50%',
                transform: 'translateX(-50%)'
            };
        }

        // Check available space below the target
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const placeAbove = spaceBelow < 250; // Threshold for tooltip height

        return {
            top: placeAbove ? 'auto' : targetRect.bottom + 20,
            bottom: placeAbove ? (window.innerHeight - targetRect.top) + 20 : 'auto',
            left: targetRect.left + (targetRect.width / 2),
            transform: 'translateX(-50%)',
        };
    };

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Mask Layer - SVG allows click-through on the hole */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                    d={maskPath}
                    fill="rgba(0, 0, 0, 0.6)"
                    style={{ pointerEvents: 'none' }}
                    fillRule="evenodd"
                />
            </svg>

            {hole ? (
                <>
                    <div
                        className="absolute left-0 top-0 w-full pointer-events-auto"
                        data-tutorial-mask="top"
                        style={{ height: hole.top, backgroundColor: 'transparent' }}
                    />
                    <div
                        className="absolute left-0 pointer-events-auto"
                        data-tutorial-mask="left"
                        style={{ top: hole.top, height: hole.bottom - hole.top, width: hole.left, backgroundColor: 'transparent' }}
                    />
                    <div
                        className="absolute pointer-events-auto"
                        data-tutorial-mask="right"
                        style={{ top: hole.top, left: hole.right, height: hole.bottom - hole.top, width: viewportWidth - hole.right, backgroundColor: 'transparent' }}
                    />
                    <div
                        className="absolute left-0 w-full pointer-events-auto"
                        data-tutorial-mask="bottom"
                        style={{ top: hole.bottom, bottom: 0, backgroundColor: 'transparent' }}
                    />
                </>
            ) : (
                <div
                    className="absolute inset-0 pointer-events-auto"
                    data-tutorial-mask="full"
                    style={{ backgroundColor: 'transparent' }}
                />
            )}

            {/* Tooltip / Dialog Layer */}
            <div
                className="absolute pointer-events-auto transition-all duration-300 ease-out"
                style={getTooltipStyle()}
            >
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-80 border border-gray-100 animate-bounce-in">
                    <div className="mb-4 text-gray-800 font-medium text-lg leading-relaxed">
                        {currentStep.content}
                    </div>

                    {!currentStep.requireAction && (
                        <div className="flex justify-end">
                            <button
                                onClick={nextStep}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-transform active:scale-95 shadow-lg shadow-blue-200"
                            >
                                下一步 ({currentStepIndex + 1}) →
                            </button>
                        </div>
                    )}

                    {currentStep.requireAction && (
                        <div className="text-sm text-blue-500 font-bold flex items-center gap-2 animate-pulse">
                            <span>👆 请按指示操作...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Highlight Border Animation (Optional visual clue) */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none border-4 border-yellow-400 rounded-lg animate-pulse"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}
        </div>
    );
};
