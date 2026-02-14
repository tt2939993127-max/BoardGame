/**
 * DiceThrone - ActionLog 格式化测试
 * 
 * 验证 formatDiceThroneActionEntry 生成正确的 i18n segment（延迟翻译）。
 */

import { describe, expect, it } from 'vitest';
import type { ActionLogEntry, ActionLogSegment, Command, GameEvent, MatchState } from '../../../engine/types';
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

const normalizeEntries = (result: ActionLogEntry | ActionLogEntry[] | null): ActionLogEntry[] => {
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
};

const createState = (): MatchState<DiceThroneCore> => {
    return createInitializedState(['0', '1'], fixedRandom);
};

/** 从 segments 中提取所有 i18n segment 的 key */
const getI18nKeys = (segments: ActionLogSegment[]): string[] =>
    segments.filter(s => s.type === 'i18n').map(s => (s as { key: string }).key);

/** 查找指定 key 的 i18n segment */
const findI18nSegment = (segments: ActionLogSegment[], key: string) =>
    segments.find(s => s.type === 'i18n' && (s as { key: string }).key === key) as
    | { type: 'i18n'; ns: string; key: string; params?: Record<string, string | number>; paramI18nKeys?: string[] }
    | undefined;

describe('formatDiceThroneActionEntry', () => {
    it('SELECT_ABILITY 生成 i18n segment', () => {
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
        const seg = entries[0].segments[0];
        expect(seg.type).toBe('i18n');
        if (seg.type === 'i18n') {
            expect(seg.ns).toBe('game-dicethrone');
            expect(seg.key).toBe('actionLog.abilityActivated');
            expect(seg.params).toHaveProperty('abilityName');
        }
    });

    it('DAMAGE_DEALT 生成 i18n segment（含原始伤害）', () => {
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
        const keys = getI18nKeys(entries[0].segments);
        // sourceAbilityId='test-ability' 在技能表中找不到，fallback 用原始 ID 作为文本
        expect(keys).toContain('actionLog.damageDealt');
        expect(keys).toContain('actionLog.damageOriginal');

        const dealSeg = findI18nSegment(entries[0].segments, 'actionLog.damageDealt');
        expect(dealSeg?.params?.amount).toBe(4);
        expect(dealSeg?.params?.targetPlayerId).toBe('1');
        expect(dealSeg?.params?.source).toBe('test-ability');
        const origSeg = findI18nSegment(entries[0].segments, 'actionLog.damageOriginal');
        expect(origSeg?.params?.amount).toBe(5);
    });

    it('伤害修改器应记录在 ActionLog 中（太极减伤）', () => {
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
                amount: 8,
                actualDamage: 5,
                sourceAbilityId: 'test-ability',
                modifiers: [
                    { type: 'token', value: -3, sourceId: 'taiji', sourceName: 'tokens.taiji.name' },
                ],
            },
            timestamp: 10,
        };
        const attackResolved: AttackResolvedEvent = {
            type: 'ATTACK_RESOLVED',
            payload: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'test-ability',
                totalDamage: 5,
            },
            timestamp: 11,
        };

        const entries = normalizeEntries(formatDiceThroneActionEntry({ 
            command, 
            state, 
            events: [damageEvent, attackResolved] as GameEvent[] 
        }));

        expect(entries).toHaveLength(1);
        const keys = getI18nKeys(entries[0].segments);
        expect(keys).toContain('actionLog.damageDealt');
        expect(keys).toContain('actionLog.damageModifiers');

        const dealSeg = findI18nSegment(entries[0].segments, 'actionLog.damageDealt');
        expect(dealSeg?.params?.amount).toBe(5);
        expect(dealSeg?.params?.targetPlayerId).toBe('1');
        
        const modSeg = findI18nSegment(entries[0].segments, 'actionLog.damageModifiers');
        expect(modSeg?.params?.original).toBe(8);
        expect(modSeg?.params?.modifiers).toContain('tokens.taiji.name -3');
    });

    it('HEAL_APPLIED/STATUS_APPLIED/TOKEN_USED 生成正确的 i18n segment', () => {
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

        // SELECT_ABILITY + 4 个事件 = 5 个 entry
        expect(entries).toHaveLength(5);

        // 验证 HEAL_APPLIED
        const healEntry = entries.find(e => e.kind === 'HEAL_APPLIED');
        expect(healEntry).toBeTruthy();
        const healSeg = findI18nSegment(healEntry!.segments, 'actionLog.healApplied');
        expect(healSeg?.params?.targetPlayerId).toBe('0');
        expect(healSeg?.params?.amount).toBe(3);

        // 验证 STATUS_APPLIED
        const statusEntry = entries.find(e => e.kind === 'STATUS_APPLIED');
        expect(statusEntry).toBeTruthy();
        const statusSeg = findI18nSegment(statusEntry!.segments, 'actionLog.statusApplied');
        expect(statusSeg?.params?.targetPlayerId).toBe('1');

        // 验证 TOKEN_GRANTED
        const tokenEntry = entries.find(e => e.kind === 'TOKEN_GRANTED');
        expect(tokenEntry).toBeTruthy();
        const tokenSeg = findI18nSegment(tokenEntry!.segments, 'actionLog.tokenGranted');
        expect(tokenSeg?.params?.amount).toBe(1);

        // 验证 TOKEN_USED
        const tokenUsedEntry = entries.find(e => e.kind === 'TOKEN_USED');
        expect(tokenUsedEntry).toBeTruthy();
        const tokenUsedSeg = findI18nSegment(tokenUsedEntry!.segments, 'actionLog.tokenUsed');
        expect(tokenUsedSeg?.params?.effectLabel).toBe('actionLog.tokenEffect.damageBoost');
        expect(tokenUsedSeg?.paramI18nKeys).toContain('effectLabel');
    });

    it('ADVANCE_PHASE 生成带 paramI18nKeys 的 i18n segment', () => {
        const state = createState();
        const command: Command = {
            type: 'ADVANCE_PHASE',
            playerId: '0',
            payload: {},
            timestamp: 30,
        };
        const phaseEvent: GameEvent = {
            type: 'SYS_PHASE_CHANGED',
            payload: { to: 'offensiveRoll' },
            timestamp: 30,
        };

        const result = formatDiceThroneActionEntry({
            command,
            state,
            events: [phaseEvent],
        });
        const entries = normalizeEntries(result);

        expect(entries).toHaveLength(1);
        const seg = findI18nSegment(entries[0].segments, 'actionLog.advancePhase');
        expect(seg).toBeTruthy();
        expect(seg?.params?.phase).toBe('phase.offensiveRoll.label');
        expect(seg?.paramI18nKeys).toContain('phase');
    });
});
