/**
 * 月精灵 (Moon Elf) Custom Action 运行时行为断言测试
 */

import { describe, it, expect } from 'vitest';
import { STATUS_IDS, TOKEN_IDS, MOON_ELF_DICE_FACE_IDS as FACES } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import type { DiceThroneCore, Die, HeroState, DiceThroneEvent } from '../domain/types';
import { getCustomActionHandler } from '../domain/effects';
import type { CustomActionContext } from '../domain/effects';
import { initializeCustomActions } from '../domain/customActions';
import { registerDiceDefinition } from '../domain/diceRegistry';
import { moonElfDiceDefinition } from '../heroes/moon_elf/diceConfig';

initializeCustomActions();
registerDiceDefinition(moonElfDiceDefinition);

// ============================================================================
// 测试工具
// ============================================================================

function createMoonElfDie(value: number): Die {
    const faceMap: Record<number, string> = {
        1: FACES.BOW, 2: FACES.BOW, 3: FACES.BOW,
        4: FACES.FOOT, 5: FACES.FOOT,
        6: FACES.MOON,
    };
    return {
        id: 0, definitionId: 'moon_elf-dice', value,
        symbol: faceMap[value] as any, symbols: [faceMap[value]], isKept: false,
    };
}

function createState(opts: {
    dice?: Die[];
    defenderHP?: number;
    attackerHP?: number;
    attackerEvasive?: number;
    pendingAttackFaceCounts?: Record<string, number>;
}): DiceThroneCore {
    const attacker: HeroState = {
        id: '0', characterId: 'moon_elf',
        resources: { [RESOURCE_IDS.HP]: opts.attackerHP ?? 50, [RESOURCE_IDS.CP]: 5 },
        hand: [], deck: [], discard: [],
        statusEffects: {}, tokens: { [TOKEN_IDS.EVASIVE]: opts.attackerEvasive ?? 0 },
        tokenStackLimits: { [TOKEN_IDS.EVASIVE]: 3 },
        damageShields: [], abilities: [], abilityLevels: {}, upgradeCardByAbilityId: {},
    };
    const defender: HeroState = {
        id: '1', characterId: 'monk',
        resources: { [RESOURCE_IDS.HP]: opts.defenderHP ?? 50, [RESOURCE_IDS.CP]: 5 },
        hand: [], deck: [], discard: [],
        statusEffects: {}, tokens: {}, tokenStackLimits: {},
        damageShields: [], abilities: [], abilityLevels: {}, upgradeCardByAbilityId: {},
    };
    const state: DiceThroneCore = {
        players: { '0': attacker, '1': defender },
        selectedCharacters: { '0': 'moon_elf', '1': 'monk' },
        readyPlayers: { '0': true, '1': true },
        hostPlayerId: '0', hostStarted: true,
        dice: opts.dice ?? [1, 2, 3, 4, 5].map(v => createMoonElfDie(v)),
        rollCount: 1, rollLimit: 3, rollDiceCount: 5, rollConfirmed: false,
        activePlayerId: '0', startingPlayerId: '0', turnNumber: 1,
        pendingAttack: null, tokenDefinitions: [],
    };
    if (opts.pendingAttackFaceCounts) {
        state.pendingAttack = {
            attackerId: '0', defenderId: '1', isDefendable: true,
            damage: 5, bonusDamage: 0,
            attackDiceFaceCounts: opts.pendingAttackFaceCounts,
        } as any;
    }
    return state;
}

function buildCtx(
    state: DiceThroneCore, actionId: string,
    opts?: { random?: () => number; asDefender?: boolean }
): CustomActionContext {
    const attackerId = opts?.asDefender ? '0' : '0';
    const defenderId = opts?.asDefender ? '1' : '1';
    const effectCtx = {
        attackerId: attackerId as any, defenderId: defenderId as any,
        sourceAbilityId: actionId, state, damageDealt: 0, timestamp: 1000,
    };
    const randomFn = opts?.random
        ? {
            d: (n: number) => Math.ceil(opts.random!() * n),
            random: opts.random,
        } as any
        : undefined;
    return {
        ctx: effectCtx, targetId: '1' as any, attackerId: '0' as any,
        sourceAbilityId: actionId, state, timestamp: 1000, random: randomFn,
        action: { type: 'custom', customActionId: actionId },
    };
}

function eventsOfType(events: DiceThroneEvent[], type: string) {
    return events.filter(e => e.type === type);
}

// ============================================================================
// 测试套件
// ============================================================================

describe('月精灵 Custom Action 运行时行为断言', () => {

    // ========================================================================
    // 长弓连击判定
    // ========================================================================
    describe('moon_elf-longbow-bonus-check-4 (长弓II连击：≥4同面→缠绕)', () => {
        it('4个相同骰面时施加缠绕', () => {
            const state = createState({
                pendingAttackFaceCounts: { [FACES.BOW]: 4, [FACES.FOOT]: 1 },
            });
            const handler = getCustomActionHandler('moon_elf-longbow-bonus-check-4')!;
            const events = handler(buildCtx(state, 'moon_elf-longbow-bonus-check-4'));

            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(1);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.ENTANGLE);
        });

        it('不足4个相同骰面时不施加', () => {
            const state = createState({
                pendingAttackFaceCounts: { [FACES.BOW]: 3, [FACES.FOOT]: 2 },
            });
            const handler = getCustomActionHandler('moon_elf-longbow-bonus-check-4')!;
            const events = handler(buildCtx(state, 'moon_elf-longbow-bonus-check-4'));
            expect(events).toHaveLength(0);
        });

        it('无pendingAttack快照时不施加', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-longbow-bonus-check-4')!;
            const events = handler(buildCtx(state, 'moon_elf-longbow-bonus-check-4'));
            expect(events).toHaveLength(0);
        });
    });

    describe('moon_elf-longbow-bonus-check-3 (长弓III连击：≥3同面→缠绕)', () => {
        it('3个相同骰面时施加缠绕', () => {
            const state = createState({
                pendingAttackFaceCounts: { [FACES.BOW]: 3, [FACES.FOOT]: 2 },
            });
            const handler = getCustomActionHandler('moon_elf-longbow-bonus-check-3')!;
            const events = handler(buildCtx(state, 'moon_elf-longbow-bonus-check-3'));

            expect(eventsOfType(events, 'STATUS_APPLIED')).toHaveLength(1);
        });

        it('不足3个相同骰面时不施加', () => {
            const state = createState({
                pendingAttackFaceCounts: { [FACES.BOW]: 2, [FACES.FOOT]: 2, [FACES.MOON]: 1 },
            });
            const handler = getCustomActionHandler('moon_elf-longbow-bonus-check-3')!;
            const events = handler(buildCtx(state, 'moon_elf-longbow-bonus-check-3'));
            expect(events).toHaveLength(0);
        });
    });

    // ========================================================================
    // 爆裂箭结算
    // ========================================================================
    describe('moon_elf-exploding-arrow-resolve-1 (爆裂箭I：骰值伤害)', () => {
        it('投出3时造成3点伤害', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-exploding-arrow-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-exploding-arrow-resolve-1', {
                random: () => 3 / 6, // d(6)→3
            }));

            const dmg = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmg).toHaveLength(1);
            expect((dmg[0] as any).payload.amount).toBe(3);
        });

        it('投出6时造成6点伤害', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-exploding-arrow-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-exploding-arrow-resolve-1', {
                random: () => 1, // d(6)→6
            }));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(6);
        });
    });

    describe('moon_elf-exploding-arrow-resolve-2 (爆裂箭II：骰值+1伤害)', () => {
        it('投出4时造成5点伤害', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-exploding-arrow-resolve-2')!;
            const events = handler(buildCtx(state, 'moon_elf-exploding-arrow-resolve-2', {
                random: () => 4 / 6,
            }));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(5); // 4+1
        });
    });

    describe('moon_elf-exploding-arrow-resolve-3 (爆裂箭III：骰值+2伤害+缠绕)', () => {
        it('投出3时造成5点伤害并施加缠绕', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-exploding-arrow-resolve-3')!;
            const events = handler(buildCtx(state, 'moon_elf-exploding-arrow-resolve-3', {
                random: () => 3 / 6,
            }));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(5); // 3+2
            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(1);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.ENTANGLE);
        });
    });

    // ========================================================================
    // 迷影步结算
    // ========================================================================
    describe('moon_elf-elusive-step-resolve-1 (迷影步I)', () => {
        it('1个足面：造成2伤害', () => {
            // 骰子: bow,bow,bow,foot,bow → 1个foot
            const dice = [1, 2, 3, 4, 1].map(v => createMoonElfDie(v));
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-1'));

            const dmg = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmg).toHaveLength(1);
            expect((dmg[0] as any).payload.amount).toBe(2);
            expect(eventsOfType(events, 'TOKEN_GRANTED')).toHaveLength(0);
        });

        it('2个足面：造成2伤害+获得1闪避', () => {
            const dice = [1, 2, 3, 4, 5].map(v => createMoonElfDie(v)); // 2个foot(4,5)
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-1'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(2);
            const token = eventsOfType(events, 'TOKEN_GRANTED');
            expect(token).toHaveLength(1);
            expect((token[0] as any).payload.tokenId).toBe(TOKEN_IDS.EVASIVE);
        });

        it('3+个足面：造成4伤害+获得1闪避', () => {
            const dice = [4, 4, 5, 5, 4].map(v => createMoonElfDie(v)); // 5个foot
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-1'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(4);
            expect(eventsOfType(events, 'TOKEN_GRANTED')).toHaveLength(1);
        });

        it('0个足面：无事件', () => {
            const dice = [1, 1, 1, 1, 1].map(v => createMoonElfDie(v)); // 全bow
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-1')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-1'));
            expect(events).toHaveLength(0);
        });
    });

    describe('moon_elf-elusive-step-resolve-2 (迷影步II)', () => {
        it('1个足面：造成3伤害', () => {
            const dice = [1, 2, 3, 4, 1].map(v => createMoonElfDie(v));
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-2')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-2'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(3);
            expect(eventsOfType(events, 'TOKEN_GRANTED')).toHaveLength(0);
        });

        it('2个足面：造成3伤害+获得1闪避', () => {
            const dice = [1, 2, 3, 4, 5].map(v => createMoonElfDie(v));
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-2')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-2'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(3);
            expect(eventsOfType(events, 'TOKEN_GRANTED')).toHaveLength(1);
        });

        it('3+个足面：造成5伤害+获得1闪避+施加缠绕', () => {
            const dice = [4, 4, 5, 5, 4].map(v => createMoonElfDie(v));
            const state = createState({ dice });
            const handler = getCustomActionHandler('moon_elf-elusive-step-resolve-2')!;
            const events = handler(buildCtx(state, 'moon_elf-elusive-step-resolve-2'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(5);
            expect(eventsOfType(events, 'TOKEN_GRANTED')).toHaveLength(1);
            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(1);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.ENTANGLE);
        });
    });

    // ========================================================================
    // 行动卡
    // ========================================================================
    describe('moon_elf-action-moon-shadow-strike (月影突袭)', () => {
        it('投出弓面时抽1牌', () => {
            const state = createState({});
            state.players['0'].deck = [{ id: 'c1' } as any];
            const handler = getCustomActionHandler('moon_elf-action-moon-shadow-strike')!;
            const events = handler(buildCtx(state, 'moon_elf-action-moon-shadow-strike', {
                random: () => 1 / 6, // d(6)→1 → bow
            }));

            expect(eventsOfType(events, 'CARD_DRAWN')).toHaveLength(1);
        });

        it('投出足面时施加缠绕', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-action-moon-shadow-strike')!;
            const events = handler(buildCtx(state, 'moon_elf-action-moon-shadow-strike', {
                random: () => 4 / 6, // d(6)→4 → foot
            }));

            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(1);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.ENTANGLE);
        });

        it('投出月面时施加致盲+锁定', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-action-moon-shadow-strike')!;
            const events = handler(buildCtx(state, 'moon_elf-action-moon-shadow-strike', {
                random: () => 1, // d(6)→6 → moon
            }));

            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(2);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.BLINDED);
            expect((status[1] as any).payload.statusId).toBe(STATUS_IDS.TARGETED);
        });
    });

    describe('moon_elf-action-volley (齐射：+3伤害)', () => {
        it('增加pendingAttack.bonusDamage 3点', () => {
            const state = createState({});
            state.pendingAttack = {
                attackerId: '0', defenderId: '1', isDefendable: true,
                damage: 5, bonusDamage: 0,
            } as any;
            const handler = getCustomActionHandler('moon_elf-action-volley')!;
            const events = handler(buildCtx(state, 'moon_elf-action-volley'));

            expect(events).toHaveLength(0);
            expect(state.pendingAttack!.bonusDamage).toBe(3);
        });
    });

    describe('moon_elf-action-watch-out (小心！：施加锁定)', () => {
        it('对对手施加锁定', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-action-watch-out')!;
            const events = handler(buildCtx(state, 'moon_elf-action-watch-out'));

            const status = eventsOfType(events, 'STATUS_APPLIED');
            expect(status).toHaveLength(1);
            expect((status[0] as any).payload.statusId).toBe(STATUS_IDS.TARGETED);
            expect((status[0] as any).payload.targetId).toBe('1');
        });
    });

    // ========================================================================
    // 状态效果钩子
    // ========================================================================
    describe('moon_elf-blinded-check (致盲判定)', () => {
        it('投1-2时标记攻击无效', () => {
            const state = createState({});
            state.players['0'].statusEffects[STATUS_IDS.BLINDED] = 1;
            state.pendingAttack = {
                attackerId: '0', defenderId: '1', isDefendable: true,
                damage: 5, bonusDamage: 0, sourceAbilityId: 'test',
            } as any;
            const handler = getCustomActionHandler('moon_elf-blinded-check')!;
            const events = handler(buildCtx(state, 'moon_elf-blinded-check', {
                random: () => 1 / 6, // d(6)→1 → 失败
            }));

            // 移除致盲
            expect(eventsOfType(events, 'STATUS_REMOVED')).toHaveLength(1);
            // 攻击无效
            expect(state.pendingAttack!.sourceAbilityId).toBeUndefined();
        });

        it('投3-6时攻击正常', () => {
            const state = createState({});
            state.players['0'].statusEffects[STATUS_IDS.BLINDED] = 1;
            state.pendingAttack = {
                attackerId: '0', defenderId: '1', isDefendable: true,
                damage: 5, bonusDamage: 0, sourceAbilityId: 'test',
            } as any;
            const handler = getCustomActionHandler('moon_elf-blinded-check')!;
            const events = handler(buildCtx(state, 'moon_elf-blinded-check', {
                random: () => 3 / 6, // d(6)→3 → 成功
            }));

            expect(eventsOfType(events, 'STATUS_REMOVED')).toHaveLength(1);
            expect(state.pendingAttack!.sourceAbilityId).toBe('test'); // 保持不变
        });
    });

    describe('moon_elf-entangle-effect (缠绕效果：掷骰次数-1)', () => {
        it('减少1次掷骰机会并移除缠绕', () => {
            const state = createState({});
            state.players['0'].statusEffects[STATUS_IDS.ENTANGLE] = 1;
            const handler = getCustomActionHandler('moon_elf-entangle-effect')!;
            const events = handler(buildCtx(state, 'moon_elf-entangle-effect'));

            const rollLimit = eventsOfType(events, 'ROLL_LIMIT_CHANGED');
            expect(rollLimit).toHaveLength(1);
            expect((rollLimit[0] as any).payload.newLimit).toBe(2); // 3-1
            expect(eventsOfType(events, 'STATUS_REMOVED')).toHaveLength(1);
        });
    });

    describe('moon_elf-targeted-removal (锁定移除)', () => {
        it('移除锁定状态', () => {
            const state = createState({});
            state.players['1'].statusEffects[STATUS_IDS.TARGETED] = 1;
            const handler = getCustomActionHandler('moon_elf-targeted-removal')!;
            const events = handler(buildCtx(state, 'moon_elf-targeted-removal'));

            const removed = eventsOfType(events, 'STATUS_REMOVED');
            expect(removed).toHaveLength(1);
            expect((removed[0] as any).payload.statusId).toBe(STATUS_IDS.TARGETED);
        });

        it('无锁定时不生成事件', () => {
            const state = createState({});
            const handler = getCustomActionHandler('moon_elf-targeted-removal')!;
            const events = handler(buildCtx(state, 'moon_elf-targeted-removal'));
            expect(events).toHaveLength(0);
        });
    });
});
