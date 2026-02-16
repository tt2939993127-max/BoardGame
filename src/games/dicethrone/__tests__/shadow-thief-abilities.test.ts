/**
 * Shadow Thief (暗影刺客) 技能与状态效果覆盖测试
 *
 * 覆盖范围：
 * 1. 角色注册与初始化
 * 2. 技能/卡牌/Token/骰子定义完整性
 * 3. 自定义动作（匕首打击CP/毒液、偷窃、暗影之舞、聚宝盆等）
 * 4. 升级卡牌替换技能
 * 5. Token 被动触发（Sneak/Sneak Attack）
 */

import { describe, it, expect } from 'vitest';
import { SHADOW_THIEF_CARDS, getShadowThiefStartingDeck } from '../heroes/shadow_thief/cards';
import { SHADOW_THIEF_ABILITIES } from '../heroes/shadow_thief/abilities';
import { SHADOW_THIEF_TOKENS, SHADOW_THIEF_INITIAL_TOKENS } from '../heroes/shadow_thief/tokens';
import { shadowThiefDiceDefinition } from '../heroes/shadow_thief/diceConfig';
import { SHADOW_THIEF_RESOURCES } from '../heroes/shadow_thief/resourceConfig';
import { CHARACTER_DATA_MAP } from '../domain/characters';
import { DiceThroneDomain } from '../domain';
import { TOKEN_IDS, STATUS_IDS, SHADOW_THIEF_DICE_FACE_IDS, DICETHRONE_CARD_ATLAS_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import { INITIAL_HEALTH, INITIAL_CP } from '../domain/types';
import type { DiceThroneCore, DiceThroneCommand } from '../domain/types';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import type { EngineSystem } from '../../../engine/systems/types';
import { createInitialSystemState, executePipeline } from '../../../engine/pipeline';
import { diceThroneSystemsForTest } from '../game';
import {
    createQueuedRandom,
    fixedRandom,
    cmd,
    assertState,
    type DiceThroneExpectation,
} from './test-utils';
import { GameTestRunner } from '../../../engine/testing';

// ============================================================================
// 测试工具
// ============================================================================

const testSystems = diceThroneSystemsForTest as unknown as EngineSystem<DiceThroneCore>[];

const shadowThiefSetupCommands = [
    { type: 'SELECT_CHARACTER', playerId: '0', payload: { characterId: 'shadow_thief' } },
    { type: 'SELECT_CHARACTER', playerId: '1', payload: { characterId: 'shadow_thief' } },
    { type: 'PLAYER_READY', playerId: '1', payload: {} },
    { type: 'HOST_START_GAME', playerId: '0', payload: {} },
];

function createShadowThiefState(playerIds: PlayerId[], random: RandomFn): MatchState<DiceThroneCore> {
    const core = DiceThroneDomain.setup(playerIds, random);
    const sys = createInitialSystemState(playerIds, testSystems, undefined);
    let state: MatchState<DiceThroneCore> = { sys, core };
    const pipelineConfig = { domain: DiceThroneDomain, systems: testSystems };
    for (const c of shadowThiefSetupCommands) {
        const command = { type: c.type, playerId: c.playerId, payload: c.payload, timestamp: Date.now() } as DiceThroneCommand;
        const result = executePipeline(pipelineConfig, state, command, random, playerIds);
        if (result.success) state = result.state as MatchState<DiceThroneCore>;
    }
    return state;
}

/** 创建暗影刺客 vs 暗影刺客的 setup（清空手牌避免响应窗口干扰） */
const createShadowThiefSetup = (opts?: {
    mutate?: (core: DiceThroneCore) => void;
    keepHands?: boolean;
}) => {
    return (playerIds: PlayerId[], random: RandomFn): MatchState<DiceThroneCore> => {
        const state = createShadowThiefState(playerIds, random);
        if (!opts?.keepHands) {
            state.core.players['0'].hand = [];
            state.core.players['1'].hand = [];
        }
        opts?.mutate?.(state.core);
        return state;
    };
};


// ============================================================================
// 1. 角色注册与初始化
// ============================================================================

describe('暗影刺客 - 角色注册与初始化', () => {
    it('CHARACTER_DATA_MAP 包含 shadow_thief 且数据正确', () => {
        const data = CHARACTER_DATA_MAP.shadow_thief;
        expect(data).toBeDefined();
        expect(data.id).toBe('shadow_thief');
        expect(data.abilities).toBe(SHADOW_THIEF_ABILITIES);
        expect(data.tokens).toBe(SHADOW_THIEF_TOKENS);
        expect(data.initialTokens).toEqual(SHADOW_THIEF_INITIAL_TOKENS);
        expect(data.diceDefinitionId).toBe('shadow_thief-dice');
        expect(data.getStartingDeck).toBe(getShadowThiefStartingDeck);
    });

    it('选角后正确初始化暗影刺客状态', () => {
        const state = createShadowThiefState(['0', '1'], fixedRandom);
        const player = state.core.players['0'];

        expect(player.characterId).toBe('shadow_thief');
        expect(player.resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH);
        expect(player.resources[RESOURCE_IDS.CP]).toBe(INITIAL_CP);
        expect(player.tokens[TOKEN_IDS.SNEAK]).toBe(0);
        expect(player.tokens[TOKEN_IDS.SNEAK_ATTACK]).toBe(0);
        expect(player.abilities.length).toBe(SHADOW_THIEF_ABILITIES.length);
        expect(player.hand.length).toBe(4);
    });

    it('初始技能等级全部为 1', () => {
        const state = createShadowThiefState(['0', '1'], fixedRandom);
        const player = state.core.players['0'];
        const expectedAbilities = [
            'dagger-strike', 'pickpocket', 'steal', 'kidney-shot',
            'shadow-dance', 'cornucopia', 'shadow-shank', 'shadow-defense',
            'fearless-riposte',
        ];
        for (const id of expectedAbilities) {
            expect(player.abilityLevels[id]).toBe(1);
        }
    });
});

// ============================================================================
// 2. 定义完整性
// ============================================================================

describe('暗影刺客 - 定义完整性', () => {
    it('骰子定义包含 4 种骰面，共 6 面', () => {
        expect(shadowThiefDiceDefinition.id).toBe('shadow_thief-dice');
        expect(shadowThiefDiceDefinition.sides).toBe(6);
        expect(shadowThiefDiceDefinition.faces).toHaveLength(6);

        const symbols = shadowThiefDiceDefinition.faces.map(f => f.symbols[0]);
        expect(symbols.filter(s => s === 'dagger')).toHaveLength(2);
        expect(symbols.filter(s => s === 'bag')).toHaveLength(2);
        expect(symbols.filter(s => s === 'card')).toHaveLength(1);
        expect(symbols.filter(s => s === 'shadow')).toHaveLength(1);
    });

    it('资源定义包含 CP 和 HP', () => {
        expect(SHADOW_THIEF_RESOURCES).toHaveLength(2);
        const cpDef = SHADOW_THIEF_RESOURCES.find(r => r.id === 'cp');
        const hpDef = SHADOW_THIEF_RESOURCES.find(r => r.id === 'hp');
        expect(cpDef?.initialValue).toBe(2);
        expect(cpDef?.max).toBe(15);
        expect(hpDef?.initialValue).toBe(50);
        expect(hpDef?.max).toBe(50);
    });

    it('Token 定义包含 Sneak、Sneak Attack 和 Poison', () => {
        expect(SHADOW_THIEF_TOKENS.length).toBeGreaterThanOrEqual(3);
        const sneakDef = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK);
        const sneakAttackDef = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK_ATTACK);
        const poisonDef = SHADOW_THIEF_TOKENS.find(t => t.id === STATUS_IDS.POISON);

        expect(sneakDef).toBeDefined();
        expect(sneakDef!.category).toBe('buff');
        expect(sneakDef!.stackLimit).toBe(1);
        expect(sneakDef!.passiveTrigger?.timing).toBe('onDamageReceived');

        expect(sneakAttackDef).toBeDefined();
        expect(sneakAttackDef!.category).toBe('consumable');
        expect(sneakAttackDef!.stackLimit).toBe(1);

        expect(poisonDef).toBeDefined();
        expect(poisonDef!.category).toBe('debuff');
    });

    it('基础技能 9 个，ID 正确', () => {
        expect(SHADOW_THIEF_ABILITIES).toHaveLength(9);
        const ids = SHADOW_THIEF_ABILITIES.map(a => a.id);
        expect(ids).toContain('dagger-strike');
        expect(ids).toContain('pickpocket');
        expect(ids).toContain('steal');
        expect(ids).toContain('kidney-shot');
        expect(ids).toContain('shadow-dance');
        expect(ids).toContain('cornucopia');
        expect(ids).toContain('shadow-shank');
        expect(ids).toContain('shadow-defense');
        expect(ids).toContain('fearless-riposte');
    });

    it('卡牌包含升级卡和行动卡', () => {
        const upgradeCards = SHADOW_THIEF_CARDS.filter(c => c.type === 'upgrade');
        const actionCards = SHADOW_THIEF_CARDS.filter(c => c.type === 'action');
        expect(upgradeCards.length).toBeGreaterThanOrEqual(8);
        expect(actionCards.length).toBeGreaterThanOrEqual(3);
    });

    it('卡牌图集引用正确', () => {
        const heroCards = SHADOW_THIEF_CARDS.filter(c =>
            c.previewRef?.type === 'atlas' &&
            c.previewRef?.atlasId === DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF
        );
        // 暗影刺客专属卡牌应该引用 SHADOW_THIEF 图集
        expect(heroCards.length).toBeGreaterThan(0);
    });

    it('起始牌库包含通用卡牌', () => {
        // 通用卡牌已注入，牌库应该比专属卡牌多
        const deck = getShadowThiefStartingDeck(fixedRandom);
        expect(deck.length).toBeGreaterThan(SHADOW_THIEF_CARDS.filter(c => c.type === 'upgrade').length);
    });

    it('初始 Token 状态为 0', () => {
        expect(SHADOW_THIEF_INITIAL_TOKENS[TOKEN_IDS.SNEAK]).toBe(0);
        expect(SHADOW_THIEF_INITIAL_TOKENS[TOKEN_IDS.SNEAK_ATTACK]).toBe(0);
    });
});

// ============================================================================
// 3. 自定义动作测试（通过 GameTestRunner）
// ============================================================================

describe('暗影刺客 - 匕首打击 CP 获取', () => {
    it('匕首打击 x3 变体引用正确的 customActionId', () => {
        const daggerStrike = SHADOW_THIEF_ABILITIES.find(a => a.id === 'dagger-strike');
        expect(daggerStrike).toBeDefined();
        expect(daggerStrike!.variants).toBeDefined();
        expect(daggerStrike!.variants!.length).toBe(3);

        // 每个变体都应该有 dagger-strike-cp 和 dagger-strike-poison
        for (const variant of daggerStrike!.variants!) {
            const cpEffect = variant.effects.find(e =>
                e.action.type === 'custom' &&
                (e.action as any).customActionId === 'shadow_thief-dagger-strike-cp'
            );
            const poisonEffect = variant.effects.find(e =>
                e.action.type === 'custom' &&
                (e.action as any).customActionId === 'shadow_thief-dagger-strike-poison'
            );
            expect(cpEffect).toBeDefined();
            expect(poisonEffect).toBeDefined();
        }
    });

    it('匕首打击 x3/x4/x5 伤害递增', () => {
        const daggerStrike = SHADOW_THIEF_ABILITIES.find(a => a.id === 'dagger-strike');
        const variants = daggerStrike!.variants!;
        const damages = variants.map(v => {
            const dmgEffect = v.effects.find(e => e.action.type === 'damage');
            return (dmgEffect?.action as any).value;
        });
        expect(damages).toEqual([4, 6, 8]);
    });

    it('通过 GameTestRunner 验证选角后进入 upkeep', () => {
        const random = fixedRandom;
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '暗影刺客选角后进入 main1',
            commands: [],
            expect: {
                turnPhase: 'main1',
                activePlayerId: '0',
                players: {
                    '0': { hp: INITIAL_HEALTH, cp: INITIAL_CP },
                    '1': { hp: INITIAL_HEALTH, cp: INITIAL_CP },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
    });
});

describe('暗影刺客 - 偷窃机制', () => {
    it('偷窃技能定义包含 Shadow 条件偷取逻辑', () => {
        const stealAbility = SHADOW_THIEF_ABILITIES.find(a => a.id === 'steal');
        expect(stealAbility).toBeDefined();
        expect(stealAbility!.variants).toBeDefined();
        expect(stealAbility!.variants!.length).toBeGreaterThanOrEqual(3);

        // 每个变体都应该引用 steal-cp custom action
        for (const variant of stealAbility!.variants!) {
            const customEffect = variant.effects.find(e =>
                e.action.type === 'custom' &&
                (e.action as any).customActionId?.startsWith('shadow_thief-steal-cp')
            );
            expect(customEffect).toBeDefined();
        }
    });
});

describe('暗影刺客 - 暗影之舞', () => {
    it('暗影之舞技能定义需要 3 个 Shadow 面', () => {
        const shadowDance = SHADOW_THIEF_ABILITIES.find(a => a.id === 'shadow-dance');
        expect(shadowDance).toBeDefined();
        expect(shadowDance!.trigger).toEqual({
            type: 'diceSet',
            faces: { [SHADOW_THIEF_DICE_FACE_IDS.SHADOW]: 3 },
        });
    });

    it('暗影之舞效果包含掷骰伤害 + Sneak + Sneak Attack', () => {
        const shadowDance = SHADOW_THIEF_ABILITIES.find(a => a.id === 'shadow-dance');
        expect(shadowDance!.effects).toHaveLength(3);

        const rollEffect = shadowDance!.effects[0];
        expect((rollEffect.action as any).customActionId).toBe('shadow_thief-shadow-dance-roll');

        const sneakEffect = shadowDance!.effects[1];
        expect(sneakEffect.action.type).toBe('grantToken');
        expect((sneakEffect.action as any).tokenId).toBe(TOKEN_IDS.SNEAK);

        const sneakAttackEffect = shadowDance!.effects[2];
        expect(sneakAttackEffect.action.type).toBe('grantToken');
        expect((sneakAttackEffect.action as any).tokenId).toBe(TOKEN_IDS.SNEAK_ATTACK);
    });
});

describe('暗影刺客 - 终极技能 Shadow Shank', () => {
    it('Shadow Shank 需要 5 个 Shadow 面', () => {
        const shank = SHADOW_THIEF_ABILITIES.find(a => a.id === 'shadow-shank');
        expect(shank).toBeDefined();
        expect(shank!.tags).toContain('ultimate');
        expect(shank!.trigger).toEqual({
            type: 'diceSet',
            faces: { [SHADOW_THIEF_DICE_FACE_IDS.SHADOW]: 5 },
        });
    });

    it('Shadow Shank 效果包含 CP获取 + CP+5伤害 + 移除负面 + Sneak', () => {
        const shank = SHADOW_THIEF_ABILITIES.find(a => a.id === 'shadow-shank');
        expect(shank!.effects).toHaveLength(4);

        // gainCp(3)
        expect((shank!.effects[0].action as any).customActionId).toBe('gain-cp');
        expect((shank!.effects[0].action as any).params.amount).toBe(3);

        // CP+5 伤害
        expect((shank!.effects[1].action as any).customActionId).toBe('shadow_thief-shadow-shank-damage');

        // 移除负面
        expect((shank!.effects[2].action as any).customActionId).toBe('shadow_thief-remove-all-debuffs');

        // Sneak token
        expect(shank!.effects[3].action.type).toBe('grantToken');
        expect((shank!.effects[3].action as any).tokenId).toBe(TOKEN_IDS.SNEAK);
    });
});

describe('暗影刺客 - 防御技能', () => {
    it('暗影守护使用 4 颗骰子', () => {
        const defense = SHADOW_THIEF_ABILITIES.find(a => a.id === 'shadow-defense');
        expect(defense).toBeDefined();
        expect(defense!.type).toBe('defensive');
        expect(defense!.trigger).toEqual({
            type: 'phase',
            phaseId: 'defensiveRoll',
            diceCount: 4,
        });
    });

    it('恐惧反击使用 5 颗骰子', () => {
        const riposte = SHADOW_THIEF_ABILITIES.find(a => a.id === 'fearless-riposte');
        expect(riposte).toBeDefined();
        expect(riposte!.type).toBe('defensive');
        expect(riposte!.trigger).toEqual({
            type: 'phase',
            phaseId: 'defensiveRoll',
            diceCount: 5,
        });
    });

    it('恐惧反击效果引用正确的 customActionId', () => {
        const riposte = SHADOW_THIEF_ABILITIES.find(a => a.id === 'fearless-riposte');
        expect(riposte!.effects).toHaveLength(1);
        expect((riposte!.effects[0].action as any).customActionId).toBe('shadow_thief-fearless-riposte');
    });

    it('暗影刺客拥有 2 个独立防御技能（触发多防御选择流程）', () => {
        const defensiveAbilities = SHADOW_THIEF_ABILITIES.filter(a => a.type === 'defensive');
        expect(defensiveAbilities).toHaveLength(2);
        const ids = defensiveAbilities.map(a => a.id);
        expect(ids).toContain('shadow-defense');
        expect(ids).toContain('fearless-riposte');
    });
});

describe('暗影刺客 - 聚宝盆', () => {
    it('聚宝盆需要 2 个 Card 面', () => {
        const cornucopia = SHADOW_THIEF_ABILITIES.find(a => a.id === 'cornucopia');
        expect(cornucopia).toBeDefined();
        expect(cornucopia!.trigger).toEqual({
            type: 'diceSet',
            faces: { [SHADOW_THIEF_DICE_FACE_IDS.CARD]: 2 },
        });
    });

    it('聚宝盆效果包含抽牌和条件弃牌', () => {
        const cornucopia = SHADOW_THIEF_ABILITIES.find(a => a.id === 'cornucopia');
        expect(cornucopia!.effects).toHaveLength(2);
        expect(cornucopia!.effects[0].action.type).toBe('drawCard');
        expect((cornucopia!.effects[1].action as any).customActionId).toBe('shadow_thief-cornucopia-discard');
    });
});

// ============================================================================
// 4. 双防御技能流程测试（选择 + 升级）
// ============================================================================

/**
 * 进入 defensiveRoll 的标准命令序列（暗影刺客 vs 暗影刺客）
 * fixedRandom: d()=1 → 所有骰子 value=1 → 全部 dagger → dagger-strike-5 可用
 * 流程：upkeep → main1（先手跳过 income）→ offensiveRoll → 掷骰 → 确认 → 选择进攻技能 → ADVANCE_PHASE → defensiveRoll
 */
const enterDefensiveRollCommands = [
    cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
    cmd('ROLL_DICE', '0'),
    cmd('CONFIRM_ROLL', '0'),
    cmd('SELECT_ABILITY', '0', { abilityId: 'dagger-strike-5' }), // 5 dagger → dagger-strike-5
    cmd('ADVANCE_PHASE', '0'), // offensiveRoll → defensiveRoll
];

describe('暗影刺客 - 双防御技能选择流程', () => {
    it('进入 defensiveRoll 时 rollDiceCount=0（等待选择防御技能）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '双防御技能 - 进入 defensiveRoll 时 rollDiceCount=0',
            commands: [...enterDefensiveRollCommands],
            expect: {
                turnPhase: 'defensiveRoll',
                roll: { diceCount: 0 },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
        // 验证 pendingAttack 存在但 defenseAbilityId 未设置
        const core = result.finalState.core;
        expect(core.pendingAttack).not.toBeNull();
        expect(core.pendingAttack?.defenseAbilityId).toBeUndefined();
    });

    it('选择暗影守护后 rollDiceCount=4', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '双防御技能 - 选择暗影守护 rollDiceCount=4',
            commands: [
                ...enterDefensiveRollCommands,
                cmd('SELECT_ABILITY', '1', { abilityId: 'shadow-defense' }),
            ],
            expect: {
                turnPhase: 'defensiveRoll',
                roll: { diceCount: 4 },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
        expect(result.finalState.core.pendingAttack?.defenseAbilityId).toBe('shadow-defense');
    });

    it('选择恐惧反击后 rollDiceCount=5', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '双防御技能 - 选择恐惧反击 rollDiceCount=5',
            commands: [
                ...enterDefensiveRollCommands,
                cmd('SELECT_ABILITY', '1', { abilityId: 'fearless-riposte' }),
            ],
            expect: {
                turnPhase: 'defensiveRoll',
                roll: { diceCount: 5 },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
        expect(result.finalState.core.pendingAttack?.defenseAbilityId).toBe('fearless-riposte');
    });

    it('未选择防御技能时不能掷骰（defense_ability_not_selected）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '双防御技能 - 未选择时不能掷骰',
            commands: [
                ...enterDefensiveRollCommands,
                // 不选择防御技能，直接尝试掷骰
                cmd('ROLL_DICE', '1'),
            ],
        });

        // 掷骰命令应该失败（defense_ability_not_selected）
        // rollDiceCount 仍为 0，rollCount 仍为 0
        expect(result.finalState.core.rollDiceCount).toBe(0);
        expect(result.finalState.core.rollCount).toBe(0);
    });

    it('选择防御技能后可以正常掷骰', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '双防御技能 - 选择后可掷骰',
            commands: [
                ...enterDefensiveRollCommands,
                cmd('SELECT_ABILITY', '1', { abilityId: 'shadow-defense' }),
                cmd('ROLL_DICE', '1'),
            ],
            expect: {
                turnPhase: 'defensiveRoll',
                roll: { diceCount: 4, count: 1 },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
    });
});

describe('暗影刺客 - 防御技能独立升级', () => {
    /** 创建手牌包含指定升级卡的 setup（从牌库/手牌中提取） */
    const createUpgradeSetup = (upgradeCardIds: string[], cp: number = 10) => {
        return (playerIds: PlayerId[], random: RandomFn): MatchState<DiceThroneCore> => {
            const state = createShadowThiefState(playerIds, random);
            const player = state.core.players['0'];

            // 从手牌和牌库中提取指定升级卡
            const allCards = [...player.hand, ...player.deck];
            const upgradeCards = upgradeCardIds
                .map(cardId => allCards.find(c => c.id === cardId))
                .filter(Boolean) as typeof player.hand;

            // 手牌只放升级卡
            player.hand = upgradeCards;
            // 牌库移除已提取的卡
            const extractedIds = new Set(upgradeCards.map(c => c.id));
            player.deck = player.deck.filter(c => !extractedIds.has(c.id));

            player.resources.cp = cp;

            // 清空对手手牌避免响应窗口
            state.core.players['1'].hand = [];

            return state;
        };
    };

    it('升级暗影守护到 II 级（shadow-defense → level 2）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createUpgradeSetup(['upgrade-shadow-defense-2']),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '升级暗影守护到 II 级',
            commands: [
                cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'upgrade-shadow-defense-2', targetAbilityId: 'shadow-defense' }),
            ],
            expect: {
                players: {
                    '0': {
                        abilityLevels: {
                            'shadow-defense': 2,
                            'fearless-riposte': 1,
                        },
                    },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
    });

    it('升级恐惧反击到 II 级（fearless-riposte → level 2）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createUpgradeSetup(['upgrade-fearless-riposte-2']),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '升级恐惧反击到 II 级',
            commands: [
                cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'upgrade-fearless-riposte-2', targetAbilityId: 'fearless-riposte' }),
            ],
            expect: {
                players: {
                    '0': {
                        abilityLevels: {
                            'fearless-riposte': 2,
                            'shadow-defense': 1,
                        },
                    },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
    });

    it('分别升级两个防御技能互不影响', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createUpgradeSetup(['upgrade-shadow-defense-2', 'upgrade-fearless-riposte-2'], 15),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '分别升级两个防御技能',
            commands: [
                cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'upgrade-shadow-defense-2', targetAbilityId: 'shadow-defense' }),
                cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'upgrade-fearless-riposte-2', targetAbilityId: 'fearless-riposte' }),
            ],
            expect: {
                players: {
                    '0': {
                        abilityLevels: {
                            'shadow-defense': 2,
                            'fearless-riposte': 2,
                        },
                    },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
    });

    it('升级暗影守护后技能定义变为 SHADOW_DEFENSE_2（5 骰）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createUpgradeSetup(['upgrade-shadow-defense-2']),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '升级暗影守护后验证技能定义',
            commands: [
                cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'upgrade-shadow-defense-2', targetAbilityId: 'shadow-defense' }),
            ],
        });

        const player = result.finalState.core.players['0'];
        const shadowDefense = player.abilities.find(a => a.id === 'shadow-defense');
        expect(shadowDefense).toBeDefined();
        // SHADOW_DEFENSE_2 定义：diceCount=5
        expect((shadowDefense!.trigger as { diceCount?: number }).diceCount).toBe(5);
        // 恐惧反击保持 Level 1（diceCount=5）
        const riposte = player.abilities.find(a => a.id === 'fearless-riposte');
        expect(riposte).toBeDefined();
        expect((riposte!.trigger as { diceCount?: number }).diceCount).toBe(5);
    });
});

describe('暗影刺客 - 单防御技能时自动选择', () => {
    it('只有 1 个防御技能时自动选择（不需要 SELECT_ABILITY）', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createShadowThiefSetup({
                mutate: (core) => {
                    // 移除恐惧反击，只保留暗影守护
                    const player1 = core.players['1'];
                    player1.abilities = player1.abilities.filter(a => a.id !== 'fearless-riposte');
                },
            }),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '单防御技能自动选择',
            commands: [...enterDefensiveRollCommands],
            expect: {
                turnPhase: 'defensiveRoll',
                roll: { diceCount: 4 }, // 暗影守护 4 骰，自动设置
            },
        });

        expect(result.assertionErrors).toHaveLength(0);
        expect(result.finalState.core.pendingAttack?.defenseAbilityId).toBe('shadow-defense');
    });
});
