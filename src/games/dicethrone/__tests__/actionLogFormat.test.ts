/**
 * DiceThrone - ActionLog 格式化测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionLogEntry, Command, GameEvent, MatchState } from '../../../engine/types';
import type {
    AbilityActivatedEvent,
    AttackResolvedEvent,
    DamageDealtEvent,
    DiceThroneCore,
    HealAppliedEvent,
    StatusAppliedEvent,
    TokenGrantedEvent,
    TokenUsedEvent,
} from '../domain/types';
import { STATUS_IDS, TOKEN_IDS } from '../domain/ids';
import { createInitializedState, fixedRandom, fistAttackAbilityId } from './test-utils';
import { formatDiceThroneActionEntry } from '../game';
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

const createState = (): MatchState<DiceThroneCore> => {
    return createInitializedState(['0', '1'], fixedRandom);
};

describe('formatDiceThroneActionEntry', () => {
    it('SELECT_ABILITY 记录技能名称', () => {
        const state = createState();
        const command: Command = {
            type: 'SELECT_ABILITY',
            playerId: '0',
            payload: { abilityId: fistAttackAbilityId },
            timestamp: 1,
        };
        const abilityEvent: AbilityActivatedEvent = {
            type: 'ABILITY_ACTIVATED',
            payload: { abilityId: fistAttackAbilityId, playerId: '0', isDefense: false },
            timestamp: 1,
        };

        const result = formatDiceThroneActionEntry({
            command,
            state,
            events: [abilityEvent] as GameEvent[],
        });
        const entries = normalizeEntries(result);

        expect(entries).toHaveLength(1);
        const abilityName = i18n.t('game-dicethrone:abilities.fist-technique.name');
        const expected = i18n.t('game-dicethrone:actionLog.abilityActivated', { abilityName });
        expect(entries[0].segments[0]).toMatchObject({ type: 'text', text: expected });
    });

    it('DAMAGE_DEALT 记录造成伤害', () => {
        const state = createState();
        const command: Command = {
            type: 'SKIP_TOKEN_RESPONSE',
            playerId: '0',
            payload: {},
            timestamp: 10,
        };
        const damageEvent: DamageDealtEvent = {
            type: 'DAMAGE_DEALT',
            payload: {
                targetId: '1',
                amount: 5,
                actualDamage: 4,
                sourceAbilityId: 'test-ability',
            },
            timestamp: 10,
        };
        const resolvedEvent: AttackResolvedEvent = {
            type: 'ATTACK_RESOLVED',
            payload: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'test-ability',
                defenseAbilityId: undefined,
                totalDamage: 4,
            },
            timestamp: 10,
        };

        const result = formatDiceThroneActionEntry({
            command,
            state,
            events: [damageEvent, resolvedEvent] as GameEvent[],
        });
        const entries = normalizeEntries(result);

        expect(entries).toHaveLength(1);
        expect(entries[0].actorId).toBe('0');
        const text = entries[0].segments
            .map(segment => (segment.type === 'text' ? segment.text : ''))
            .join('');
        expect(text).toContain(i18n.t('game-dicethrone:actionLog.damageDealt', { amount: 4 }));
        expect(text).toContain(i18n.t('game-dicethrone:actionLog.damageOriginal', { amount: 5 }));
    });

    it('HEAL_APPLIED/STATUS_APPLIED/TOKEN_USED 记录详细文案', () => {
        const state = createState();
        const command: Command = {
            type: 'SELECT_ABILITY',
            playerId: '0',
            payload: { abilityId: fistAttackAbilityId },
            timestamp: 20,
        };
        const healEvent: HealAppliedEvent = {
            type: 'HEAL_APPLIED',
            payload: { targetId: '0', amount: 3, sourceAbilityId: fistAttackAbilityId },
            timestamp: 20,
        };
        const statusEvent: StatusAppliedEvent = {
            type: 'STATUS_APPLIED',
            payload: { targetId: '1', statusId: STATUS_IDS.BURN, stacks: 1, newTotal: 1 },
            timestamp: 20,
        };
        const tokenEvent: TokenGrantedEvent = {
            type: 'TOKEN_GRANTED',
            payload: { targetId: '0', tokenId: TOKEN_IDS.TAIJI, amount: 1, newTotal: 2 },
            timestamp: 20,
        };
        const tokenUsedEvent: TokenUsedEvent = {
            type: 'TOKEN_USED',
            payload: { playerId: '0', tokenId: TOKEN_IDS.TAIJI, amount: 1, effectType: 'damageBoost', damageModifier: 1 },
            timestamp: 20,
        };

        const result = formatDiceThroneActionEntry({
            command,
            state,
            events: [healEvent, statusEvent, tokenEvent, tokenUsedEvent] as GameEvent[],
        });
        const entries = normalizeEntries(result);

        // SELECT_ABILITY command 会先生成 1 个"发动技能"entry，
        // 然后 4 个事件各生成 1 个 entry = 总共 5 个
        expect(entries).toHaveLength(5);
        const text = entries
            .map((entry) => entry.segments.map(segment => (segment.type === 'text' ? segment.text : '')).join(''))
            .join('|');
        expect(text).toContain(
            i18n.t('game-dicethrone:actionLog.healApplied', {
                targetLabel: i18n.t('game-dicethrone:actionLog.playerLabel', { playerId: '0' }),
                amount: 3,
            })
        );
        expect(text).toContain(i18n.t(`game-dicethrone:statusEffects.${STATUS_IDS.BURN}.name`));
        expect(text).toContain(i18n.t(`game-dicethrone:tokens.${TOKEN_IDS.TAIJI}.name`));
    });
});
