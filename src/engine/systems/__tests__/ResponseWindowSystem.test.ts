import { describe, expect, it } from 'vitest';
import { createInitialSystemState } from '../../pipeline';
import type { Command, MatchState } from '../../types';
import {
    INTERACTION_COMMANDS,
    INTERACTION_EVENTS,
} from '../InteractionSystem';
import {
    createResponseWindowSystem,
    RESPONSE_WINDOW_COMMANDS,
    RESPONSE_WINDOW_EVENTS,
} from '../ResponseWindowSystem';
import type { EngineSystem } from '../types';

type TestCore = Record<string, never>;

function createState(requiredInteractionId?: string): MatchState<TestCore> {
    const system = createResponseWindowSystem<TestCore>();
    const systems: EngineSystem<TestCore>[] = [system];
    const sys = createInitialSystemState(['0', '1'], systems, 'response-window-test');
    return {
        core: {},
        sys: {
            ...sys,
            responseWindow: {
                current: {
                    id: 'window-1',
                    windowType: 'test',
                    responderQueue: ['1'],
                    currentResponderIndex: 0,
                    passedPlayers: [],
                    ...(requiredInteractionId ? { requiredInteractionId } : {}),
                },
            },
        },
    };
}

function context(
    state: MatchState<TestCore>,
    command: Command<string, unknown>,
) {
    return {
        state,
        command,
        events: [],
        random: {
            random: () => 0.5,
            d: () => 1,
            range: (min: number) => min,
            shuffle: <T,>(values: T[]) => [...values],
        },
        playerIds: ['0', '1'],
    };
}

describe('ResponseWindowSystem required interaction', () => {
    it('rejects pass while a required interaction is active', () => {
        const system = createResponseWindowSystem<TestCore>();
        const result = system.beforeCommand?.(context(createState('interaction-1'), {
            type: RESPONSE_WINDOW_COMMANDS.PASS,
            playerId: '1',
            payload: {},
        }));

        expect(result?.halt).toBe(true);
        expect(result?.error).toContain('无法跳过');
    });

    it('rejects cancellation while a required interaction is active', () => {
        const system = createResponseWindowSystem<TestCore>();
        const result = system.beforeCommand?.(context(createState('interaction-1'), {
            type: INTERACTION_COMMANDS.CANCEL,
            playerId: '1',
            payload: {},
        }));

        expect(result?.halt).toBe(true);
        expect(result?.error).toContain('不可取消');
    });

    it('keeps ordinary optional pass behavior unchanged', () => {
        const system = createResponseWindowSystem<TestCore>();
        const result = system.beforeCommand?.(context(createState(), {
            type: RESPONSE_WINDOW_COMMANDS.PASS,
            playerId: '1',
            payload: {},
        }));

        expect(result?.error).toBeUndefined();
        expect(result?.state?.sys.responseWindow.current).toBeUndefined();
        expect(result?.events).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: RESPONSE_WINDOW_EVENTS.CLOSED }),
        ]));
    });

    it('closes the required window when the matching interaction resolves', () => {
        const system = createResponseWindowSystem<TestCore>();
        const state = createState('interaction-1');
        const result = system.afterEvents?.({
            ...context(state, {
                type: INTERACTION_COMMANDS.RESPOND,
                playerId: '1',
                payload: {},
            }),
            events: [{
                type: INTERACTION_EVENTS.RESOLVED,
                payload: { interactionId: 'interaction-1' },
                timestamp: 1,
            }],
        });

        expect(result?.state?.sys.responseWindow.current).toBeUndefined();
        expect(result?.events).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: RESPONSE_WINDOW_EVENTS.CLOSED,
                payload: expect.objectContaining({ requiredInteractionResolved: true }),
            }),
        ]));
    });
});
