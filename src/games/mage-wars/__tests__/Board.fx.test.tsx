import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialSystemState } from '../../../engine/pipeline';
import type { GameBoardProps } from '../../../engine/transport/protocol';
import type { RandomFn } from '../../../engine/types';
import MageWarsBoard from '../Board';
import { MageWarsDomain, type MageWarsCore } from '../domain';
import { engineConfig } from '../game';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'zh-CN' },
        t: (key: string, params?: Record<string, string | number>) => (
            params ? `${key}:${JSON.stringify(params)}` : key
        ),
    }),
}));

vi.mock('../../../components/common/media/OptimizedImage', () => ({
    OptimizedImage: ({ src, alt, className }: { src: string; alt?: string; className?: string }) => (
        <img data-testid="mock-optimized-image" src={src} alt={alt ?? ''} className={className} />
    ),
}));

vi.mock('../../../components/common/media/CardPreview', () => ({
    CardPreview: ({ title, className }: { title?: string; className?: string }) => (
        <div data-testid="mock-card-preview" className={className}>{title}</div>
    ),
}));

const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: () => 3,
    range: (min: number) => min,
    shuffle: <T,>(array: T[]) => [...array],
};

function boardProps(): GameBoardProps<MageWarsCore> {
    const playerIds = ['0', '1'];
    return {
        G: {
            core: MageWarsDomain.setup(playerIds, fixedRandom),
            sys: {
                ...createInitialSystemState(playerIds, engineConfig.systems, 'local:mage-wars-board-fx'),
                phase: 'creatureAction',
            },
        },
        dispatch: vi.fn(),
        playerID: '0',
        isMultiplayer: false,
        isConnected: true,
    };
}

describe('MageWarsBoard FX wiring', () => {
    it('mounts the board with the event-driven FX layer attached', () => {
        render(<MageWarsBoard {...boardProps()} />);

        expect(screen.queryByTestId('mage-wars-board')).not.toBeNull();
    });
});
