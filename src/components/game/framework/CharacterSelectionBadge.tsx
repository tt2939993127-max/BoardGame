import React from 'react';
import clsx from 'clsx';
import type { CharacterBadgeDef } from '../../../core/ui/CharacterSelection.types';

type InlineUnit = (value: number) => string;

export interface CharacterSelectionBadgeProps {
    badge: CharacterBadgeDef;
    label: string;
    inlineUnit: InlineUnit;
    testId: string;
    mode?: 'pill' | 'overlay';
}

const getStandardToneClassName = (badge: CharacterBadgeDef, mode: 'pill' | 'overlay') => {
    const shapeClassName = mode === 'overlay'
        ? 'border-y-[2px] px-4 py-1'
        : 'rounded-full px-3 py-1';

    switch (badge.tone) {
        case 'info':
            return `${shapeClassName} border border-sky-300/55 bg-sky-500/85 text-white`;
        case 'success':
            return `${shapeClassName} border border-emerald-300/55 bg-emerald-500/85 text-white`;
        case 'danger':
            return `${shapeClassName} border border-rose-300/55 bg-rose-500/85 text-white`;
        case 'neutral':
            return `${shapeClassName} border border-slate-200/45 bg-slate-500/80 text-white`;
        default:
            return `${shapeClassName} border border-slate-950 bg-[#f4ecd0] text-slate-950`;
    }
};

export const CharacterSelectionBadge: React.FC<CharacterSelectionBadgeProps> = ({
    badge,
    label,
    inlineUnit,
    testId,
    mode = 'pill',
}) => {
    if (badge.tone !== 'warning') {
        return (
            <span
                data-testid={testId}
                className={clsx(
                    'inline-flex items-center justify-center font-black uppercase shadow-lg backdrop-blur-sm',
                    getStandardToneClassName(badge, mode),
                )}
                style={{
                    fontSize: inlineUnit(mode === 'overlay' ? 0.52 : 0.38),
                    lineHeight: 1.1,
                    letterSpacing: inlineUnit(mode === 'overlay' ? 0.025 : 0.01),
                }}
            >
                {label}
            </span>
        );
    }

    const isOverlay = mode === 'overlay';
    const clipPath = isOverlay
        ? 'polygon(3.5% 0, 100% 0, 96.5% 100%, 0 100%)'
        : 'polygon(7.5% 0, 100% 0, 92.5% 100%, 0 100%)';
    const shadowOffsetX = inlineUnit(isOverlay ? 0.12 : 0.08);
    const shadowOffsetY = inlineUnit(isOverlay ? 0.12 : 0.08);

    return (
        <span
            data-testid={testId}
            className="relative inline-flex items-center justify-center isolate"
            style={{
                transform: `rotate(${isOverlay ? -13 : -12}deg)`,
                width: isOverlay ? '146%' : undefined,
            }}
        >
            <span
                aria-hidden="true"
                className="absolute inset-0 bg-black"
                style={{
                    transform: `translate(${shadowOffsetX}, ${shadowOffsetY})`,
                    clipPath,
                }}
            />

            <span
                className="relative inline-flex items-center justify-center overflow-hidden border-[2px] border-black font-black uppercase text-black"
                style={{
                    width: isOverlay ? '100%' : undefined,
                    minWidth: inlineUnit(isOverlay ? 11.5 : 4.95),
                    minHeight: inlineUnit(isOverlay ? 1.95 : 0.98),
                    paddingLeft: inlineUnit(isOverlay ? 1.28 : 0.7),
                    paddingRight: inlineUnit(isOverlay ? 1.28 : 0.7),
                    paddingTop: inlineUnit(isOverlay ? 0.16 : 0.11),
                    paddingBottom: inlineUnit(isOverlay ? 0.16 : 0.11),
                    clipPath,
                    backgroundColor: '#facc15',
                }}
            >
                <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(135deg, rgba(10,10,10,0.98) 0 12px, rgba(10,10,10,0.98) 12px 18px, rgba(250,204,21,0) 18px 34px)',
                    }}
                />
                <span
                    className="relative z-10 text-center font-black uppercase"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: isOverlay ? '48%' : undefined,
                        backgroundColor: isOverlay ? '#0f0f0f' : 'transparent',
                        color: isOverlay ? '#facc15' : '#111111',
                        paddingLeft: inlineUnit(isOverlay ? 0.95 : 0.36),
                        paddingRight: inlineUnit(isOverlay ? 0.82 : 0.26),
                        paddingTop: inlineUnit(isOverlay ? 0.18 : 0),
                        paddingBottom: inlineUnit(isOverlay ? 0.18 : 0),
                        fontSize: inlineUnit(isOverlay ? 0.58 : 0.41),
                        lineHeight: 1,
                        letterSpacing: inlineUnit(isOverlay ? 0.04 : 0.018),
                    }}
                >
                    {label}
                </span>
            </span>
        </span>
    );
};
