import { describe, it, expect } from 'vitest';
import type { MatchState, Command, RandomFn } from '../../types';
import {
    createInteractionSystem,
    createSimpleChoice,
    INTERACTION_COMMANDS,
} from '../InteractionSystem';

interface TestCore {
    value: number;
}

const mockRandom: RandomFn = {
    random: () => 0.5,
    d: () => 1,
    range: () => 1,
    shuffle: (arr) => [...arr],
};

const createTestState = (): MatchState<TestCore> => {
    const current = createSimpleChoice(
        'interaction-current',
        '0',
        '当前选择',
        [{ id: 'a', label: 'A', value: 'a' }],
    );
    const queued = createSimpleChoice(
        'interaction-queued',
        '1',
        '队列选择',
        [{ id: 'b', label: 'B', value: 'b' }],
    );

    return {
        core: { value: 0 },
        sys: {
            interaction: {
                current,
                queue: [queued],
            },
        },
    } as unknown as MatchState<TestCore>;
};

describe('InteractionSystem', () => {
    it('SYS_INTERACTION_CANCEL 应取消当前交互并推进队列', () => {
        const system = createInteractionSystem<TestCore>();
        const state = createTestState();
        const command: Command = {
            type: INTERACTION_COMMANDS.CANCEL,
            playerId: '0',
            payload: {},
            timestamp: 100,
        };

        const result = system.beforeCommand?.({
            state,
            command,
            events: [],
            random: mockRandom,
            playerIds: ['0', '1'],
        });

        expect(result?.halt).toBe(false);
        expect(result?.state?.sys.interaction.current?.id).toBe('interaction-queued');
        expect(result?.state?.sys.interaction.queue).toHaveLength(0);
        expect(result?.events?.[0]).toMatchObject({
            type: 'SYS_INTERACTION_CANCELLED',
            payload: {
                interactionId: 'interaction-current',
                playerId: '0',
            },
            timestamp: 100,
        });
    });

    it('非交互拥有者无法取消交互', () => {
        const system = createInteractionSystem<TestCore>();
        const state = createTestState();
        const command: Command = {
            type: INTERACTION_COMMANDS.CANCEL,
            playerId: '1',
            payload: {},
        };

        const result = system.beforeCommand?.({
            state,
            command,
            events: [],
            random: mockRandom,
            playerIds: ['0', '1'],
        });

        expect(result?.halt).toBe(true);
        expect(result?.error).toBe('不是你的交互');
    });
});
