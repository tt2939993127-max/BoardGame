import type { CSSProperties } from 'react';

type CardiaLayoutVars = CSSProperties & Record<`--${string}`, string>;

export const CARDIA_CARD_SIZE_STYLE: CSSProperties = {
    width: 'clamp(78px, 11vh, 106px)',
    height: 'clamp(118px, 16.5vh, 160px)',
};

const CARDIA_DISCARD_LAYOUT_VARS: CardiaLayoutVars = {
    '--cardia-discard-card-width': 'clamp(74px, 10.4vh, 100px)',
    '--cardia-discard-card-height': 'clamp(112px, 15.6vh, 151px)',
    '--cardia-discard-history-width': 'calc(var(--cardia-discard-card-width) / 3)',
    '--cardia-discard-offset-step': 'clamp(24px, 3.8vh, 36px)',
};

export function getCardiaDiscardPileStyle(historyCardCount: number): CardiaLayoutVars {
    return {
        ...CARDIA_DISCARD_LAYOUT_VARS,
        width: `calc(${historyCardCount} * var(--cardia-discard-offset-step) + var(--cardia-discard-card-width))`,
        height: 'var(--cardia-discard-card-height)',
    };
}

export function getCardiaDiscardHistoryCardStyle(index: number): CSSProperties {
    return {
        left: `calc(${index} * var(--cardia-discard-offset-step))`,
        width: 'var(--cardia-discard-history-width)',
        height: 'var(--cardia-discard-card-height)',
    };
}

export function getCardiaDiscardLatestCardStyle(historyCardCount: number): CSSProperties {
    return {
        left: `calc(${historyCardCount} * var(--cardia-discard-offset-step))`,
        width: 'var(--cardia-discard-card-width)',
        height: 'var(--cardia-discard-card-height)',
    };
}

export const CARDIA_DISCARD_IMAGE_STYLE: CSSProperties = {
    width: 'var(--cardia-discard-card-width)',
    height: 'var(--cardia-discard-card-height)',
};
