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

    if (!isOverlay) {
        return (
            <span
                data-testid={testId}
                className="relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-black font-black uppercase text-black"
                style={{
                    minWidth: inlineUnit(4.95),
                    minHeight: inlineUnit(0.98),
                    paddingLeft: inlineUnit(0.7),
                    paddingRight: inlineUnit(0.7),
                    paddingTop: inlineUnit(0.11),
                    paddingBottom: inlineUnit(0.11),
                    backgroundColor: '#facc15',
                }}
            >
                <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(135deg, rgba(10,10,10,0.92) 0 9px, rgba(10,10,10,0.92) 9px 13px, rgba(250,204,21,0) 13px 24px)',
                    }}
                />
                <span
                    className="relative z-10 text-center font-black uppercase"
                    style={{
                        fontSize: inlineUnit(0.41),
                        lineHeight: 1,
                        letterSpacing: inlineUnit(0.018),
                    }}
                >
                    {label}
                </span>
            </span>
        );
    }

    return (
        <span
            data-testid={testId}
            className="relative inline-flex items-center justify-center"
            style={{
                width: '152%',
                transform: 'rotate(-12deg)',
            }}
        >
            <span
                className="relative inline-flex items-center justify-center overflow-hidden border-y-[3px] border-black font-black uppercase"
                style={{
                    width: '100%',
                    minHeight: inlineUnit(1.78),
                    backgroundColor: '#facc15',
                }}
            >
                <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(135deg, rgba(12,12,12,0.95) 0 14px, rgba(12,12,12,0.95) 14px 20px, rgba(250,204,21,0) 20px 38px)',
                    }}
                />
                <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/2 -translate-x-1/2"
                    style={{
                        width: '50%',
                        backgroundColor: 'rgba(74, 60, 18, 0.96)',
                        borderLeft: '2px solid #111111',
                        borderRight: '2px solid #111111',
                    }}
                />
                <span
                    className="relative z-10 text-center font-black uppercase"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '50%',
                        color: '#facc15',
                        paddingLeft: inlineUnit(0.85),
                        paddingRight: inlineUnit(0.85),
                        paddingTop: inlineUnit(0.17),
                        paddingBottom: inlineUnit(0.17),
                        fontSize: inlineUnit(0.58),
                        lineHeight: 1,
                        letterSpacing: inlineUnit(0.04),
                    }}
                >
                    {label}
                </span>
            </span>
        </span>
    );
};
