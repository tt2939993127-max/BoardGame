/**
 * SmashUp - ActionLog 格式化测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionLogEntry, Command, GameEvent, MatchState } from '../../../engine/types';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import type { SmashUpCore } from '../domain/types';
import { formatSmashUpActionEntry } from '../actionLog';
import { makeBase, makeMatchState, makeStateWithBases } from './helpers';
import i18n from '../../../lib/i18n';

const formatMockText = (key: string, params?: Record<string, string | number>) => {
    if (!params || Object.keys(params).length === 0) return String(key);
    const serialized = Object.entries(params)
        .map(([paramKey, value]) => `${paramKey}=${value}`)
        .join(',');
    return `${key}:${serialized}`;
};

beforeEach(() => {
    vi.spyOn(i18n, 't').mockImplementation((...args) => {
        const [key, params] = args as [unknown, Record<string, string | number> | undefined];
        return formatMockText(String(key), params);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

const normalizeEntries = (result: ActionLogEntry | ActionLogEntry[] | null): ActionLogEntry[] => {
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
};

const createMatchState = (): MatchState<SmashUpCore> => {
    const core = makeStateWithBases([makeBase('base_the_homeworld')]);
    return makeMatchState(core);
};

describe('formatSmashUpActionEntry', () => {
    it('PLAY_MINION 使用 MINION_PLAYED 事件生成基地提示', () => {
        const command: Command = {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'pirate_king-1-1', baseIndex: 0 },
            timestamp: 1,
        };
        const event: GameEvent = {
            type: SU_EVENTS.MINION_PLAYED,
            payload: { playerId: '0', cardUid: 'pirate_king-1-1', defId: 'pirate_king', baseIndex: 0, power: 5 },
            timestamp: 1,
        } as GameEvent;

        const result = formatSmashUpActionEntry({
            command,
            state: createMatchState(),
            events: [event],
        });
        const entries = normalizeEntries(result);

        const commandEntry = entries.find((entry) => entry.kind === SU_COMMANDS.PLAY_MINION);
        expect(commandEntry).toBeTruthy();
        const cardSegments = commandEntry?.segments.filter(segment => segment.type === 'card');
        expect(cardSegments?.[0]).toMatchObject({ cardId: 'pirate_king' });
        const text = commandEntry?.segments
            .map(segment => (segment.type === 'text' ? segment.text : ''))
            .join('');
        expect(text).toContain('家园');
    });

    it('BASE_SCORED 记录排名与 VP', () => {
        const command: Command = {
            type: SU_COMMANDS.PLAY_ACTION,
            playerId: '0',
            payload: { cardUid: 'pirate_dinghy-1-1' },
            timestamp: 2,
        };
        const event: GameEvent = {
            type: SU_EVENTS.BASE_SCORED,
            payload: {
                baseIndex: 0,
                baseDefId: 'base_the_homeworld',
                rankings: [
                    { playerId: '0', power: 12, vp: 3 },
                    { playerId: '1', power: 9, vp: 2 },
                ],
            },
            timestamp: 2,
        } as GameEvent;

        const result = formatSmashUpActionEntry({
            command,
            state: createMatchState(),
            events: [event],
        });
        const entries = normalizeEntries(result);
        const scoredEntry = entries.find((entry) => entry.kind === SU_EVENTS.BASE_SCORED);

        expect(scoredEntry).toBeTruthy();
        const text = scoredEntry?.segments
            .map(segment => (segment.type === 'text' ? segment.text : ''))
            .join('');
        const expectedRanking = i18n.t('game-smashup:actionLog.baseScoredRanking', {
            player: i18n.t('game-smashup:actionLog.playerLabel', { playerId: '0' }),
            vp: 3,
        });
        expect(text).toContain(i18n.t('game-smashup:actionLog.baseScored'));
        expect(text).toContain(expectedRanking);
    });

    it('MINION_MOVED 使用 from/to 基地文案', () => {
        const command: Command = {
            type: SU_COMMANDS.USE_TALENT,
            playerId: '0',
            payload: { minionUid: 'pirate_king-1-1', baseIndex: 0 },
            timestamp: 3,
        };
        const event: GameEvent = {
            type: SU_EVENTS.MINION_MOVED,
            payload: {
                minionUid: 'pirate_king-1-1',
                minionDefId: 'pirate_king',
                fromBaseIndex: 0,
                toBaseIndex: 0,
                reason: 'test',
            },
            timestamp: 3,
        } as GameEvent;

        const result = formatSmashUpActionEntry({
            command,
            state: createMatchState(),
            events: [event],
        });
        const entries = normalizeEntries(result);
        const movedEntry = entries.find((entry) => entry.kind === SU_EVENTS.MINION_MOVED);
        expect(movedEntry).toBeTruthy();
        const expectedFromTo = i18n.t('game-smashup:actionLog.fromTo', {
            from: '家园',
            to: '家园',
        });
        const text = movedEntry?.segments
            .map(segment => (segment.type === 'text' ? segment.text : ''))
            .join('');
        expect(text).toContain(expectedFromTo);
    });

    it('VP_AWARDED 追加原因说明', () => {
        const command: Command = {
            type: SU_COMMANDS.PLAY_ACTION,
            playerId: '0',
            payload: { cardUid: 'pirate_dinghy-1-1' },
            timestamp: 4,
        };
        const event: GameEvent = {
            type: SU_EVENTS.VP_AWARDED,
            payload: { playerId: '0', amount: 2, reason: 'test-reason' },
            timestamp: 4,
        } as GameEvent;

        const result = formatSmashUpActionEntry({
            command,
            state: createMatchState(),
            events: [event],
        });
        const entries = normalizeEntries(result);
        const vpEntry = entries.find((entry) => entry.kind === SU_EVENTS.VP_AWARDED);
        expect(vpEntry).toBeTruthy();
        const text = vpEntry?.segments
            .map(segment => (segment.type === 'text' ? segment.text : ''))
            .join('');
        expect(text).toContain(i18n.t('game-smashup:actionLog.reasonSuffix', { reason: 'test-reason' }));
    });
});
