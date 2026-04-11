import React from 'react';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { CharacterBadgeDef } from '../../../core/ui/CharacterSelection.types';

export interface CharacterSelectionBadgeProps {
    badge: CharacterBadgeDef;
    label: string;
    testId: string;
    className?: string;
    style?: CSSProperties;
}

const getCharacterBadgeToneClassName = (badge: CharacterBadgeDef) => {
    switch (badge.tone) {
        case 'info':
            return 'border-sky-300/55 bg-sky-500/85 text-white';
        case 'success':
            return 'border-emerald-300/55 bg-emerald-500/85 text-white';
        case 'danger':
            return 'border-rose-300/55 bg-rose-500/85 text-white';
        case 'neutral':
            return 'border-slate-200/45 bg-slate-500/80 text-white';
        case 'warning':
        default:
            return 'border-slate-950/85 text-slate-950';
    }
};

const getCharacterBadgeToneStyle = (badge: CharacterBadgeDef): CSSProperties | undefined => {
    if (badge.tone !== 'warning') {
        return undefined;
    }

    return {
        backgroundColor: '#facc15',
        backgroundImage: [
            'linear-gradient(180deg, rgba(255,244,180,0.9) 0%, rgba(250,204,21,0.95) 100%)',
            'repeating-linear-gradient(135deg, rgba(15,23,42,0.92) 0 6px, rgba(15,23,42,0) 6px 12px)',
        ].join(', '),
        boxShadow: '0 0 0 1px rgba(15,23,42,0.55), 0 6px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35)',
    };
};

export const CharacterSelectionBadge: React.FC<CharacterSelectionBadgeProps> = ({
    badge,
    label,
    testId,
    className,
    style,
}) => {
    return (
        <span
            data-testid={testId}
            className={clsx(
                'inline-flex items-center justify-center rounded-full border font-black uppercase tracking-[0.14em] shadow-lg backdrop-blur-sm',
                getCharacterBadgeToneClassName(badge),
                className,
            )}
            style={{
                ...getCharacterBadgeToneStyle(badge),
                ...style,
            }}
        >
            {label}
        </span>
    );
};
