import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialSystemState } from '../../../engine/pipeline';
import type { GameBoardProps } from '../../../engine/transport/protocol';
import type { RandomFn } from '../../../engine/types';
import MageWarsBoard from '../Board';
import { MageWarsDomain, type MageWarsArenaObjectState, type MageWarsCore } from '../domain';
import { engineConfig } from '../game';
import { ARENA_ZONE_IDS } from '../domain/ids';

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

function boardProps(coreOverride?: MageWarsCore): GameBoardProps<MageWarsCore> {
    const playerIds = ['0', '1'];
    return {
        G: {
            core: coreOverride ?? MageWarsDomain.setup(playerIds, fixedRandom),
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

    it('renders summoned arena objects from core object state', () => {
        const baseCore = MageWarsDomain.setup(['0', '1'], fixedRandom);
        const object: MageWarsArenaObjectState = {
            id: 'mwobj-0-2906-1',
            kind: 'creature',
            ownerId: '0',
            sourceSpellCardId: 2906,
            sourceObjectId: 'spell-2906',
            name: '野性山猫',
            zoneId: ARENA_ZONE_IDS.A1,
            life: 4,
            damage: 2,
            armor: 0,
            actionReady: false,
            guarding: false,
            statusTokens: {},
        };
        const core: MageWarsCore = {
            ...baseCore,
            objects: {
                [object.id]: object,
            },
            arena: baseCore.arena.map((zone) => (
                zone.id === ARENA_ZONE_IDS.A1
                    ? { ...zone, objectIds: [object.id] }
                    : zone
            )),
        };

        render(<MageWarsBoard {...boardProps(core)} />);

        const fieldCard = screen.getByText('野性山猫').closest('[data-testid="mage-wars-zone-field-card"]');
        expect(fieldCard).not.toBeNull();
        expect(fieldCard?.getAttribute('data-object-id')).toBe(object.id);
        expect(screen.getAllByTestId('mock-card-preview').some((node) => node.textContent === '野性山猫')).toBe(true);
    });
});
