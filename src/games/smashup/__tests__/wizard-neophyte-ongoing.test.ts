/**
 * 测试学徒打出 ongoing 行动卡的流程
 * 
 * Bug: 学徒通过 play_extra 打出 ongoing 行动卡时，没有选择目标基地的交互
 * Fix: 检测到 ongoing 行动卡时，先创建选择基地的交互，然后再打出
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { makeState, makePlayer, makeCard, makeBase, makeMatchState } from './helpers';
import { runCommand, defaultTestRandom } from './testRunner';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import { INTERACTION_COMMANDS } from '../../../engine/systems/InteractionSystem';
import { registerWizardAbilities, registerWizardInteractionHandlers } from '../abilities/wizards';
import { registerZombieAbilities, registerZombieInteractionHandlers } from '../abilities/zombies';
import { registerNinjaAbilities } from '../abilities/ninjas';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearInteractionHandlers, getInteractionHandler } from '../domain/abilityInteractionHandlers';

beforeAll(() => {
    clearRegistry();
    clearInteractionHandlers();
    registerWizardAbilities();
    registerWizardInteractionHandlers();
    registerZombieAbilities();
    registerZombieInteractionHandlers();
    registerNinjaAbilities();
});

describe('学徒打出 ongoing 行动卡', () => {
    it('学徒打出 zombie_overrun（泛滥横行）时应该先选择目标基地', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [
                        makeCard('overrun', 'zombie_overrun', 'action', '0'), // ongoing 行动卡
                        makeCard('d2', 'test_minion', 'minion', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [makeBase(), makeBase()],
        });

        const ms = makeMatchState(state);

        // Step 1: 打出学徒
        const r1 = runCommand(ms, {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'm1', baseIndex: 0 },
        }, defaultTestRandom);

        expect(r1.success).toBe(true);

        // Step 2: 学徒 onPlay 触发，展示牌库顶（zombie_overrun）
        const interaction1 = r1.finalState.sys.interaction.current;
        expect(interaction1).toBeDefined();
        expect((interaction1?.data as any)?.sourceId).toBe('wizard_neophyte');

        // Step 3: 选择 play_extra（作为额外行动打出）
        const r2 = runCommand(r1.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: 'play_extra' },
        }, defaultTestRandom);

        expect(r2.success).toBe(true);

        // Step 4: 应该弹出选择基地的交互
        const interaction2 = r2.finalState.sys.interaction.current;
        expect(interaction2).toBeDefined();
        expect((interaction2?.data as any)?.sourceId).toBe('wizard_neophyte_choose_base');
        expect((interaction2?.data as any)?.title).toContain('泛滥横行');

        // 验证选项包含所有基地
        const options = (interaction2?.data as any)?.options;
        expect(options).toHaveLength(2);

        // Step 5: 选择基地 0
        const r3 = runCommand(r2.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: options[0].id },
        }, defaultTestRandom);

        expect(r3.success).toBe(true);

        // 验证 ongoing 行动卡已附着到基地 0
        const finalState = r3.finalState.core;
        expect(finalState.bases[0].ongoingActions).toHaveLength(1);
        expect(finalState.bases[0].ongoingActions[0].defId).toBe('zombie_overrun');
        expect(finalState.bases[0].ongoingActions[0].ownerId).toBe('0');

        // 验证卡牌不在手牌中
        expect(finalState.players['0'].hand.find(c => c.uid === 'overrun')).toBeUndefined();
        expect(finalState.players['0'].deck.find(c => c.uid === 'overrun')).toBeUndefined();

        // 验证行动额度没有被消耗（额外行动）
        expect(finalState.players['0'].actionsPlayed).toBe(0);
    });

    it('学徒打出 standard 行动卡时不需要选择基地', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [
                        makeCard('summon', 'wizard_summon', 'action', '0'), // standard 行动卡
                        makeCard('d2', 'test_minion', 'minion', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [makeBase()],
        });

        const ms = makeMatchState(state);

        // Step 1: 打出学徒
        const r1 = runCommand(ms, {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'm1', baseIndex: 0 },
        }, defaultTestRandom);

        expect(r1.success).toBe(true);

        // Step 2: 选择 play_extra
        const r2 = runCommand(r1.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: 'play_extra' },
        }, defaultTestRandom);

        expect(r2.success).toBe(true);

        // Step 3: wizard_summon 的 onPlay 能力会增加随从额度（不创建交互）
        const finalState = r2.finalState.core;
        
        // 验证行动卡已进入弃牌堆
        expect(finalState.players['0'].discard.find(c => c.uid === 'summon')).toBeDefined();
        
        // 验证随从额度增加了 1
        expect(finalState.players['0'].minionLimit).toBe(2); // 初始 1 + wizard_summon 额外 1
        
        // 验证行动额度没有被消耗（额外行动）
        expect(finalState.players['0'].actionsPlayed).toBe(0);
    });

    it('wizard_neophyte: 牌库顶是计分窗口 special 时不应提供 play_extra', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [makeCard('special', 'ninja_hidden_ninja', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [makeBase(), makeBase()],
        });

        const r1 = runCommand(makeMatchState(state), {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'm1', baseIndex: 0 },
        }, defaultTestRandom);

        const options = ((r1.finalState.sys.interaction.current?.data as any)?.options ?? []) as Array<{ id: string }>;
        expect(options.map(option => option.id)).toEqual(['to_hand']);
    });

    it('wizard_neophyte: onlyCardInHand 约束不满足时不应提供 play_extra', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('m1', 'wizard_neophyte', 'minion', '0'),
                        makeCard('extra', 'test_minion', 'minion', '0'),
                    ],
                    deck: [makeCard('contact', 'ghost_make_contact', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [makeBase('b1'), makeBase('b2')],
        });

        const r1 = runCommand(makeMatchState(state), {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'm1', baseIndex: 0 },
        }, defaultTestRandom);

        const options = ((r1.finalState.sys.interaction.current?.data as any)?.options ?? []) as Array<{ id: string }>;
        expect(options.map(option => option.id)).toEqual(['to_hand']);
    });

    it('学徒打出 ninja_smoke_bomb（烟幕弹）时应该先选择目标随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [
                        makeCard('bomb', 'ninja_smoke_bomb', 'action', '0'),
                        makeCard('d2', 'test_minion', 'minion', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                makeBase('b1', [
                    { uid: 'target-1', defId: 'test_minion', controller: '0', owner: '0', basePower: 3, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                ]),
                makeBase('b2', [
                    { uid: 'target-2', defId: 'test_minion', controller: '1', owner: '1', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                ]),
            ],
        });

        const ms = makeMatchState(state);

        const r1 = runCommand(ms, {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'm1', baseIndex: 0 },
        }, defaultTestRandom);
        expect(r1.success).toBe(true);

        const r2 = runCommand(r1.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: 'play_extra' },
        }, defaultTestRandom);
        expect(r2.success).toBe(true);

        const interaction = r2.finalState.sys.interaction.current;
        expect(interaction).toBeDefined();
        expect((interaction?.data as any)?.sourceId).toBe('wizard_neophyte_choose_minion');

        const options = (interaction?.data as any)?.options;
        expect(options.length).toBeGreaterThanOrEqual(2);

        const targetOpt = options.find((opt: any) => opt.value?.minionUid === 'target-2');
        expect(targetOpt).toBeDefined();

        const r3 = runCommand(r2.finalState, {
            type: INTERACTION_COMMANDS.RESPOND,
            playerId: '0',
            payload: { optionId: targetOpt.id },
        }, defaultTestRandom);
        expect(r3.success).toBe(true);

        const finalState = r3.finalState.core;
        const targetMinion = finalState.bases[1].minions.find(m => m.uid === 'target-2');
        expect(targetMinion?.attachedActions).toHaveLength(1);
        expect(targetMinion?.attachedActions[0].defId).toBe('ninja_smoke_bomb');
        expect(finalState.players['0'].deck.find(c => c.uid === 'bomb')).toBeUndefined();
        expect(finalState.players['0'].actionsPlayed).toBe(0);
    });

    it('wizard_neophyte_choose_base: 若待打出的 ongoing 已不在牌库则不再附着', () => {
        const handler = getInteractionHandler('wizard_neophyte_choose_base');
        expect(handler).toBeDefined();

        const state = makeState({
            players: {
                '0': makePlayer('0', { deck: [] }),
                '1': makePlayer('1'),
            },
            bases: [makeBase(), makeBase()],
        });

        const result = handler!(
            makeMatchState(state),
            '0',
            { baseIndex: 0 },
            { continuationContext: { cardUid: 'overrun', defId: 'zombie_overrun' } },
            defaultTestRandom,
            1000,
        );

        expect(result?.events ?? []).toHaveLength(0);
    });

    it('wizard_neophyte_choose_minion: 若待打出的 ongoing 已不在牌库则不再附着', () => {
        const handler = getInteractionHandler('wizard_neophyte_choose_minion');
        expect(handler).toBeDefined();

        const state = makeState({
            players: {
                '0': makePlayer('0', { deck: [] }),
                '1': makePlayer('1'),
            },
            bases: [makeBase('b1'), makeBase('b2')],
        });

        const result = handler!(
            makeMatchState(state),
            '0',
            { baseIndex: 0, minionUid: 'target-1' },
            { continuationContext: { cardUid: 'bomb', defId: 'ninja_smoke_bomb' } },
            defaultTestRandom,
            1000,
        );

        expect(result?.events ?? []).toHaveLength(0);
    });
});
