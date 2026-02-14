/**
 * 烈焰术士 (Pyromancer) Custom Action 运行时行为断言测试
 *
 * 目标：用声明式 spec 表驱动测试，覆盖每个 custom action handler 的
 * 输入状态 → 输出事件映射，捕获语义级 bug（如数值错误、逻辑反转）。
 *
 * 每个 spec 描述：
 *   - actionId: 要测试的 custom action
 *   - setup: 初始玩家状态（FM、HP、CP、骰子、状态等）
 *   - expected: 期望产出的事件断言（类型、关键 payload 字段）
 */

import { describe, it, expect } from 'vitest';
import { TOKEN_IDS, STATUS_IDS, PYROMANCER_DICE_FACE_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import type { DiceThroneCore, Die, HeroState, DiceThroneEvent } from '../domain/types';
import { getCustomActionHandler } from '../domain/effects';
import type { CustomActionContext } from '../domain/effects';
import { initializeCustomActions } from '../domain/customActions';
import { registerDiceDefinition } from '../domain/diceRegistry';
import { pyromancerDiceDefinition } from '../heroes/pyromancer/diceConfig';

// 模块顶层初始化
initializeCustomActions();
registerDiceDefinition(pyromancerDiceDefinition);

// ============================================================================
// 测试工具
// ============================================================================

/** 创建最小化的 HeroState */
function createHeroState(overrides: Partial<HeroState> = {}): HeroState {
    return {
        id: overrides.id ?? '0',
        characterId: 'pyromancer',
        resources: { [RESOURCE_IDS.HP]: 50, [RESOURCE_IDS.CP]: 5, ...overrides.resources },
        hand: [],
        deck: [],
        discard: [],
        statusEffects: { ...overrides.statusEffects },
        tokens: { [TOKEN_IDS.FIRE_MASTERY]: 0, ...overrides.tokens },
        tokenStackLimits: { [TOKEN_IDS.FIRE_MASTERY]: 5, ...overrides.tokenStackLimits },
        damageShields: [],
        abilities: [],
        abilityLevels: {},
        upgradeCardByAbilityId: {},
        ...overrides,
    };
}

/** 创建炎术士骰子（用于 getPlayerDieFace 查找） */
function createPyroDie(value: number): Die {
    const faceMap: Record<number, string> = {
        1: PYROMANCER_DICE_FACE_IDS.FIRE,
        2: PYROMANCER_DICE_FACE_IDS.FIRE,
        3: PYROMANCER_DICE_FACE_IDS.FIRE,
        4: PYROMANCER_DICE_FACE_IDS.MAGMA,
        5: PYROMANCER_DICE_FACE_IDS.FIERY_SOUL,
        6: PYROMANCER_DICE_FACE_IDS.METEOR,
    };
    return {
        id: 0,
        definitionId: 'pyromancer-dice',
        value,
        symbol: faceMap[value] as any,
        symbols: [faceMap[value]],
        isKept: false,
    };
}


/** 创建最小化的 DiceThroneCore */
function createState(opts: {
    attackerFM?: number;
    attackerHP?: number;
    attackerCP?: number;
    defenderHP?: number;
    fmLimit?: number;
    dice?: Die[];
    attackerStatus?: Record<string, number>;
    defenderStatus?: Record<string, number>;
    defenderTokens?: Record<string, number>;
}): DiceThroneCore {
    const attackerTokens = { [TOKEN_IDS.FIRE_MASTERY]: opts.attackerFM ?? 0 };
    const attacker = createHeroState({
        id: '0',
        tokens: attackerTokens,
        tokenStackLimits: { [TOKEN_IDS.FIRE_MASTERY]: opts.fmLimit ?? 5 },
        resources: {
            [RESOURCE_IDS.HP]: opts.attackerHP ?? 50,
            [RESOURCE_IDS.CP]: opts.attackerCP ?? 5,
        },
        statusEffects: opts.attackerStatus ?? {},
    });
    const defender = createHeroState({
        id: '1',
        resources: { [RESOURCE_IDS.HP]: opts.defenderHP ?? 50, [RESOURCE_IDS.CP]: 5 },
        statusEffects: opts.defenderStatus ?? {},
        tokens: opts.defenderTokens ?? {},
    });

    return {
        players: { '0': attacker, '1': defender },
        selectedCharacters: { '0': 'pyromancer', '1': 'monk' },
        readyPlayers: { '0': true, '1': true },
        hostPlayerId: '0',
        hostStarted: true,
        dice: opts.dice ?? [
            createPyroDie(1), createPyroDie(2), createPyroDie(3),
            createPyroDie(4), createPyroDie(5),
        ],
        rollCount: 1,
        rollLimit: 3,
        rollDiceCount: 5,
        rollConfirmed: false,
        activePlayerId: '0',
        startingPlayerId: '0',
        turnNumber: 1,
        pendingAttack: null,
        tokenDefinitions: [],
    };
}

/** 构建 CustomActionContext */
function buildCtx(
    state: DiceThroneCore,
    actionId: string,
    opts?: { random?: () => number; params?: Record<string, any> }
): CustomActionContext {
    const effectCtx = {
        attackerId: '0' as any,
        defenderId: '1' as any,
        sourceAbilityId: actionId,
        state,
        damageDealt: 0,
        timestamp: 1000,
    };
    const randomFn = opts?.random
        ? { d: (n: number) => Math.ceil(opts.random!() * n) } as any
        : undefined;
    return {
        ctx: effectCtx,
        targetId: '1' as any,
        attackerId: '0' as any,
        sourceAbilityId: actionId,
        state,
        timestamp: 1000,
        random: randomFn,
        action: { type: 'custom', customActionId: actionId, params: opts?.params },
    };
}

/** 从事件数组中提取指定类型的事件 */
function eventsOfType<T extends DiceThroneEvent>(events: DiceThroneEvent[], type: string): T[] {
    return events.filter(e => e.type === type) as T[];
}

/** 计算事件中某类型的总量 */
function sumPayloadField(events: DiceThroneEvent[], type: string, field: string): number {
    return events
        .filter(e => e.type === type)
        .reduce((sum, e) => sum + ((e as any).payload?.[field] ?? 0), 0);
}

// ============================================================================
// 测试套件
// ============================================================================



describe('烈焰术士 Custom Action 运行时行为断言', () => {

    // ========================================================================
    // soul-burn-fm: 获得2FM（preDefense 时机）
    // soul-burn-damage: 骰面fiery_soul数量的伤害（withDamage 时机）
    // ========================================================================
    describe('soul-burn-fm (灵魂燃烧 FM获取)', () => {
        it('获得2FM', () => {
            const state = createState({ attackerFM: 1 });
            const handler = getCustomActionHandler('soul-burn-fm')!;
            const events = handler(buildCtx(state, 'soul-burn-fm'));

            // FM: 1 + 2 = 3
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(2);
            expect((tokenEvents[0] as any).payload.newTotal).toBe(3);

            // 不产生伤害事件
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(0);
        });

        it('FM已满时仍尝试授予（由reducer cap）', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5 });
            const handler = getCustomActionHandler('soul-burn-fm')!;
            const events = handler(buildCtx(state, 'soul-burn-fm'));

            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.newTotal).toBe(5); // capped
        });
    });

    describe('soul-burn-damage (灵魂燃烧 伤害)', () => {
        it('造成fiery_soul骰面数量的伤害', () => {
            // 5颗骰子: fire,fire,fire,magma,fiery_soul → 1个fiery_soul
            const state = createState({ attackerFM: 1 });
            const handler = getCustomActionHandler('soul-burn-damage')!;
            const events = handler(buildCtx(state, 'soul-burn-damage'));

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(1);
            expect((dmgEvents[0] as any).payload.amount).toBe(1);
        });

        it('无fiery_soul骰面时不造成伤害', () => {
            // 全部fire面
            const dice = [1, 2, 3, 1, 2].map(v => createPyroDie(v));
            const state = createState({ attackerFM: 0, dice });
            const handler = getCustomActionHandler('soul-burn-damage')!;
            const events = handler(buildCtx(state, 'soul-burn-damage'));

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(0);
        });
    });

    // ========================================================================
    // soul-burn-4-resolve: FM上限+1，获得5FM
    // ========================================================================
    describe('soul-burn-4-resolve (4火魂灵魂燃烧)', () => {
        it('上限+1，然后获得5FM', () => {
            const state = createState({ attackerFM: 2, fmLimit: 5 });
            const handler = getCustomActionHandler('soul-burn-4-resolve')!;
            const events = handler(buildCtx(state, 'soul-burn-4-resolve'));

            // TOKEN_LIMIT_CHANGED: 5 → 6
            const limitEvents = eventsOfType(events, 'TOKEN_LIMIT_CHANGED');
            expect(limitEvents).toHaveLength(1);
            expect((limitEvents[0] as any).payload.newLimit).toBe(6);

            // TOKEN_GRANTED: 获得5FM（2+5=7 > 6 → cap到6，实际获得4）
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(4); // min(5, 6-2) = 4
            expect((tokenEvents[0] as any).payload.newTotal).toBe(6);
        });

        it('FM已满时只提升上限，获得量受新上限约束', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5 });
            const handler = getCustomActionHandler('soul-burn-4-resolve')!;
            const events = handler(buildCtx(state, 'soul-burn-4-resolve'));

            const limitEvents = eventsOfType(events, 'TOKEN_LIMIT_CHANGED');
            expect((limitEvents[0] as any).payload.newLimit).toBe(6);

            // 5 + 5 = 10 > 6 → cap到6，实际获得1
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(1);
            expect((tokenEvents[0] as any).payload.newTotal).toBe(6);
        });
    });

    // ========================================================================
    // fiery-combo-resolve: 获得2FM，造成 5+FM 伤害
    // ========================================================================
    describe('fiery-combo-resolve (烈焰连击)', () => {
        it('获得2FM后造成 5+updatedFM 伤害', () => {
            const state = createState({ attackerFM: 1 });
            const handler = getCustomActionHandler('fiery-combo-resolve')!;
            const events = handler(buildCtx(state, 'fiery-combo-resolve'));

            // FM: 1+2=3
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect((tokenEvents[0] as any).payload.newTotal).toBe(3);

            // 伤害: 5 + 3 = 8
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(8);
        });

        it('FM满时伤害基于cap后的FM', () => {
            const state = createState({ attackerFM: 4, fmLimit: 5 });
            const handler = getCustomActionHandler('fiery-combo-resolve')!;
            const events = handler(buildCtx(state, 'fiery-combo-resolve'));

            // FM: min(4+2, 5) = 5
            // 伤害: 5 + 5 = 10
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(10);
        });
    });

    // ========================================================================
    // fiery-combo-2-resolve: 造成 5+当前FM 伤害（FM已在preDefense获得）
    // ========================================================================
    describe('fiery-combo-2-resolve (炽热波纹 II)', () => {
        it('造成 5+当前FM 伤害', () => {
            const state = createState({ attackerFM: 3 });
            const handler = getCustomActionHandler('fiery-combo-2-resolve')!;
            const events = handler(buildCtx(state, 'fiery-combo-2-resolve'));

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(1);
            expect((dmgEvents[0] as any).payload.amount).toBe(8); // 5+3
        });

        it('FM=0时造成5点伤害', () => {
            const state = createState({ attackerFM: 0 });
            const handler = getCustomActionHandler('fiery-combo-2-resolve')!;
            const events = handler(buildCtx(state, 'fiery-combo-2-resolve'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(5);
        });
    });


    // ========================================================================
    // meteor-resolve: 获得2FM，造成 updatedFM 不可防御伤害
    // ========================================================================
    describe('meteor-resolve (流星)', () => {
        it('获得2FM后造成 updatedFM 伤害', () => {
            const state = createState({ attackerFM: 2 });
            const handler = getCustomActionHandler('meteor-resolve')!;
            const events = handler(buildCtx(state, 'meteor-resolve'));

            // FM: 2+2=4
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect((tokenEvents[0] as any).payload.newTotal).toBe(4);

            // 伤害 = 4
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(4);
        });

        it('FM=0时获得2FM后造成2点伤害', () => {
            const state = createState({ attackerFM: 0 });
            const handler = getCustomActionHandler('meteor-resolve')!;
            const events = handler(buildCtx(state, 'meteor-resolve'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(2);
        });

        it('FM满时伤害基于cap后的FM', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5 });
            const handler = getCustomActionHandler('meteor-resolve')!;
            const events = handler(buildCtx(state, 'meteor-resolve'));

            // FM: min(5+2, 5) = 5
            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(5);
        });
    });

    // ========================================================================
    // burn-down-resolve: 获得1FM，消耗最多4个FM，每个造成3点伤害
    // ========================================================================
    describe('burn-down-resolve (焚尽 I)', () => {
        it('获得1FM后消耗最多4个，每个3点伤害', () => {
            const state = createState({ attackerFM: 3 });
            const handler = getCustomActionHandler('burn-down-resolve')!;
            const events = handler(buildCtx(state, 'burn-down-resolve'));

            // FM: 3+1=4, 消耗4个
            const consumeEvents = eventsOfType(events, 'TOKEN_CONSUMED');
            expect(consumeEvents).toHaveLength(1);
            expect((consumeEvents[0] as any).payload.amount).toBe(4);

            // 伤害: 4 × 3 = 12
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(12);
        });

        it('FM=0时获得1FM后消耗1个，造成3点伤害', () => {
            const state = createState({ attackerFM: 0 });
            const handler = getCustomActionHandler('burn-down-resolve')!;
            const events = handler(buildCtx(state, 'burn-down-resolve'));

            const consumeEvents = eventsOfType(events, 'TOKEN_CONSUMED');
            expect((consumeEvents[0] as any).payload.amount).toBe(1);

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(3);
        });
    });

    // ========================================================================
    // burn-down-2-resolve: 获得1FM，消耗全部FM，每个造成4点伤害
    // ========================================================================
    describe('burn-down-2-resolve (焚尽 II)', () => {
        it('获得1FM后消耗全部，每个4点伤害', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5 });
            const handler = getCustomActionHandler('burn-down-2-resolve')!;
            const events = handler(buildCtx(state, 'burn-down-2-resolve'));

            // FM: min(5+1, 5)=5, 消耗全部5个（limit=99）
            const consumeEvents = eventsOfType(events, 'TOKEN_CONSUMED');
            expect((consumeEvents[0] as any).payload.amount).toBe(5);

            // 伤害: 5 × 4 = 20
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(20);
        });

        it('FM=0时获得1FM后消耗1个，造成4点伤害', () => {
            const state = createState({ attackerFM: 0 });
            const handler = getCustomActionHandler('burn-down-2-resolve')!;
            const events = handler(buildCtx(state, 'burn-down-2-resolve'));

            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(4);
        });
    });

    // ========================================================================
    // ignite-resolve: 获得2FM，造成 4 + 2×FM 伤害
    // ========================================================================
    describe('ignite-resolve (点燃 I)', () => {
        it('获得2FM后造成 4+2×updatedFM 伤害', () => {
            const state = createState({ attackerFM: 1 });
            const handler = getCustomActionHandler('ignite-resolve')!;
            const events = handler(buildCtx(state, 'ignite-resolve'));

            // FM: 1+2=3
            // 伤害: 4 + 2×3 = 10
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(10);
        });
    });

    // ========================================================================
    // ignite-2-resolve: 获得2FM，造成 5 + 2×FM 伤害
    // ========================================================================
    describe('ignite-2-resolve (点燃 II)', () => {
        it('获得2FM后造成 5+2×updatedFM 伤害', () => {
            const state = createState({ attackerFM: 2 });
            const handler = getCustomActionHandler('ignite-2-resolve')!;
            const events = handler(buildCtx(state, 'ignite-2-resolve'));

            // FM: 2+2=4
            // 伤害: 5 + 2×4 = 13
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect((dmgEvents[0] as any).payload.amount).toBe(13);
        });

        it('FM满时伤害基于cap后的FM', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5 });
            const handler = getCustomActionHandler('ignite-2-resolve')!;
            const events = handler(buildCtx(state, 'ignite-2-resolve'));

            // FM: min(5+2, 5)=5
            // 伤害: 5 + 2×5 = 15
            expect((eventsOfType(events, 'DAMAGE_DEALT')[0] as any).payload.amount).toBe(15);
        });
    });

    // ========================================================================
    // magma-armor-resolve: 投1骰，fire面=1伤害，fiery_soul面=1FM
    // ========================================================================
    describe('magma-armor-resolve (熔岩盔甲 I)', () => {
        it('投出fire面时造成1点伤害', () => {
            const state = createState({ attackerFM: 0 });
            // 固定投出1 → fire面
            const handler = getCustomActionHandler('magma-armor-resolve')!;
            const events = handler(buildCtx(state, 'magma-armor-resolve', {
                random: () => 1 / 6, // d(6) → ceil(1/6 * 6) = 1 → fire
            }));

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(1);
            expect((dmgEvents[0] as any).payload.amount).toBe(1); // 1 × dmgPerFire(1)
        });

        it('投出fiery_soul面时获得1FM', () => {
            const state = createState({ attackerFM: 0 });
            const handler = getCustomActionHandler('magma-armor-resolve')!;
            const events = handler(buildCtx(state, 'magma-armor-resolve', {
                random: () => 5 / 6, // d(6) → ceil(5/6 * 6) = 5 → fiery_soul
            }));

            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(1);
        });
    });

    // ========================================================================
    // magma-armor-3-resolve: 投3骰，fire面=2伤害/个，fiery_soul面=1FM/个
    // ========================================================================
    describe('magma-armor-3-resolve (熔岩盔甲 III)', () => {
        it('fire面每个造成2点伤害（dmgPerFire=2）', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('magma-armor-3-resolve')!;
            // 3颗骰子全投fire (值1,2,3)
            const events = handler(buildCtx(state, 'magma-armor-3-resolve', {
                random: () => {
                    callCount++;
                    return [1 / 6, 2 / 6, 3 / 6][callCount - 1]; // → 1,2,3 全是fire
                },
            }));

            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            expect(dmgEvents).toHaveLength(1);
            expect((dmgEvents[0] as any).payload.amount).toBe(6); // 3 × 2
        });
    });

    // ========================================================================
    // increase-fm-limit: FM上限+1
    // ========================================================================
    describe('increase-fm-limit (提升FM上限)', () => {
        it('上限从5变为6', () => {
            const state = createState({ fmLimit: 5 });
            const handler = getCustomActionHandler('increase-fm-limit')!;
            const events = handler(buildCtx(state, 'increase-fm-limit'));

            const limitEvents = eventsOfType(events, 'TOKEN_LIMIT_CHANGED');
            expect(limitEvents).toHaveLength(1);
            expect((limitEvents[0] as any).payload.newLimit).toBe(6);
            expect((limitEvents[0] as any).payload.delta).toBe(1);
        });
    });


    // ========================================================================
    // pyro-spend-cp-for-fm: CP>=1且FM未满时弹出选择（每1CP=1FM）
    // ========================================================================
    describe('pyro-spend-cp-for-fm (升温)', () => {
        it('CP>=1且FM未满时生成CHOICE_REQUESTED，选项数=min(CP,FM空间)+1(跳过)', () => {
            const state = createState({ attackerFM: 3, attackerCP: 5 });
            const handler = getCustomActionHandler('pyro-spend-cp-for-fm')!;
            const events = handler(buildCtx(state, 'pyro-spend-cp-for-fm'));

            const choiceEvents = eventsOfType(events, 'CHOICE_REQUESTED');
            expect(choiceEvents).toHaveLength(1);
            // FM空间=5-3=2, CP=5 → maxSpend=2, 选项: 2CP, 1CP, 跳过
            const options = (choiceEvents[0] as any).payload.options;
            expect(options).toHaveLength(3);
            expect(options[0].value).toBe(2); // 花费2CP
            expect(options[1].value).toBe(1); // 花费1CP
            expect(options[2].value).toBe(0); // 跳过
        });

        it('CP=1时仍生成选择（1CP=1FM）', () => {
            const state = createState({ attackerFM: 3, attackerCP: 1 });
            const handler = getCustomActionHandler('pyro-spend-cp-for-fm')!;
            const events = handler(buildCtx(state, 'pyro-spend-cp-for-fm'));

            const choiceEvents = eventsOfType(events, 'CHOICE_REQUESTED');
            expect(choiceEvents).toHaveLength(1);
            const options = (choiceEvents[0] as any).payload.options;
            expect(options).toHaveLength(2); // 1CP + 跳过
        });

        it('CP=0时不生成事件', () => {
            const state = createState({ attackerFM: 3, attackerCP: 0 });
            const handler = getCustomActionHandler('pyro-spend-cp-for-fm')!;
            const events = handler(buildCtx(state, 'pyro-spend-cp-for-fm'));

            expect(events).toHaveLength(0);
        });

        it('FM已满时不生成事件', () => {
            const state = createState({ attackerFM: 5, fmLimit: 5, attackerCP: 5 });
            const handler = getCustomActionHandler('pyro-spend-cp-for-fm')!;
            const events = handler(buildCtx(state, 'pyro-spend-cp-for-fm'));

            expect(events).toHaveLength(0);
        });
    });

    // ========================================================================
    // pyro-details-dmg-per-fm: 每个FM增加1点伤害到pendingAttack
    // ========================================================================
    describe('pyro-details-dmg-per-fm (烈焰赤红)', () => {
        it('FM=3时增加3点bonusDamage到pendingAttack', () => {
            const state = createState({ attackerFM: 3 });
            state.pendingAttack = {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                damage: 5,
                bonusDamage: 0,
            };
            const handler = getCustomActionHandler('pyro-details-dmg-per-fm')!;
            const events = handler(buildCtx(state, 'pyro-details-dmg-per-fm'));

            // 不产生事件，直接修改 pendingAttack.bonusDamage
            expect(events).toHaveLength(0);
            expect(state.pendingAttack!.bonusDamage).toBe(3);
        });

        it('FM=0时不修改bonusDamage', () => {
            const state = createState({ attackerFM: 0 });
            state.pendingAttack = {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                damage: 5,
                bonusDamage: 0,
            };
            const handler = getCustomActionHandler('pyro-details-dmg-per-fm')!;
            const events = handler(buildCtx(state, 'pyro-details-dmg-per-fm'));

            expect(events).toHaveLength(0);
            expect(state.pendingAttack!.bonusDamage).toBe(0);
        });
    });

    // ========================================================================
    // pyro-infernal-embrace: 投1骰，meteor面→FM填满，其他→抽1牌
    // ========================================================================
    describe('pyro-infernal-embrace (地狱拥抱)', () => {
        it('投出meteor面时FM填满', () => {
            const state = createState({ attackerFM: 2, fmLimit: 5 });
            const handler = getCustomActionHandler('pyro-infernal-embrace')!;
            const events = handler(buildCtx(state, 'pyro-infernal-embrace', {
                random: () => 1, // d(6) → ceil(1*6) = 6 → meteor
            }));

            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(3); // 5-2=3
            expect((tokenEvents[0] as any).payload.newTotal).toBe(5);
        });

        it('投出非meteor面时抽1牌', () => {
            const state = createState({ attackerFM: 2 });
            const handler = getCustomActionHandler('pyro-infernal-embrace')!;
            const events = handler(buildCtx(state, 'pyro-infernal-embrace', {
                random: () => 1 / 6, // d(6) → 1 → fire
            }));

            const drawEvents = eventsOfType(events, 'CARD_DRAWN');
            expect(drawEvents).toHaveLength(1);
            // 不应获得FM
            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(0);
        });
    });

    // ========================================================================
    // pyro-blast-2-roll / pyro-blast-3-roll: 炎爆术骰子效果
    // ========================================================================
    describe('pyro-blast-2-roll (炎爆术 II)', () => {
        it('投2骰，fire面各造成3点伤害', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-2-roll')!;
            // 两颗都投fire (值1,2)
            const events = handler(buildCtx(state, 'pyro-blast-2-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 1 / 6 : 2 / 6; // → 1, 2 都是fire
                },
            }));

            // FM=0 所以不会进入reroll模式，直接结算
            const dmgEvents = eventsOfType(events, 'DAMAGE_DEALT');
            const totalDmg = dmgEvents.reduce((s, e) => s + (e as any).payload.amount, 0);
            expect(totalDmg).toBe(6); // 2 × 3
        });

        it('投出fiery_soul面时获得2FM', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-2-roll')!;
            // 投出 fiery_soul(5) + fire(1)
            const events = handler(buildCtx(state, 'pyro-blast-2-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 5 / 6 : 1 / 6;
                },
            }));

            const tokenEvents = eventsOfType(events, 'TOKEN_GRANTED');
            expect(tokenEvents).toHaveLength(1);
            expect((tokenEvents[0] as any).payload.amount).toBe(2);
        });

        it('投出magma面时施加1层burn', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-2-roll')!;
            // 投出 magma(4) + fire(1)
            const events = handler(buildCtx(state, 'pyro-blast-2-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 4 / 6 : 1 / 6;
                },
            }));

            const statusEvents = eventsOfType(events, 'STATUS_APPLIED');
            expect(statusEvents).toHaveLength(1);
            expect((statusEvents[0] as any).payload.statusId).toBe(STATUS_IDS.BURN);
        });

        it('投出meteor面时施加knockdown', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-2-roll')!;
            // 投出 meteor(6) + fire(1)
            const events = handler(buildCtx(state, 'pyro-blast-2-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 1 : 1 / 6; // 6 → meteor, 1 → fire
                },
            }));

            const statusEvents = eventsOfType(events, 'STATUS_APPLIED');
            expect(statusEvents).toHaveLength(1);
            expect((statusEvents[0] as any).payload.statusId).toBe(STATUS_IDS.KNOCKDOWN);
        });
    });

    describe('pyro-blast-3-roll (炎爆术 III)', () => {
        it('有FM时进入reroll模式（BONUS_DICE_REROLL_REQUESTED）', () => {
            const state = createState({ attackerFM: 2 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-3-roll')!;
            const events = handler(buildCtx(state, 'pyro-blast-3-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 1 / 6 : 2 / 6;
                },
            }));

            const rerollEvents = eventsOfType(events, 'BONUS_DICE_REROLL_REQUESTED');
            expect(rerollEvents).toHaveLength(1);
            const settlement = (rerollEvents[0] as any).payload.settlement;
            expect(settlement.maxRerollCount).toBe(1);
            expect(settlement.rerollCostTokenId).toBe(TOKEN_IDS.FIRE_MASTERY);
        });

        it('FM=0时直接结算（不进入reroll）', () => {
            const state = createState({ attackerFM: 0 });
            let callCount = 0;
            const handler = getCustomActionHandler('pyro-blast-3-roll')!;
            const events = handler(buildCtx(state, 'pyro-blast-3-roll', {
                random: () => {
                    callCount++;
                    return callCount === 1 ? 1 / 6 : 2 / 6;
                },
            }));

            const rerollEvents = eventsOfType(events, 'BONUS_DICE_REROLL_REQUESTED');
            expect(rerollEvents).toHaveLength(0);
            // 应该有直接结算的伤害/状态事件
            expect(events.length).toBeGreaterThan(2); // 至少有 BONUS_DIE_ROLLED + 效果
        });
    });
});
