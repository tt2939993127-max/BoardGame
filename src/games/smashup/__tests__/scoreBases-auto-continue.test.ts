/**
 * 测试 scoreBases 阶段的自动推进逻辑
 * 
 * 场景：
 * 1. 基地计分后有交互（如托尔图加 afterScoring）
 * 2. 交互解决后应该自动推进到 draw 阶段，不需要再次点击"结束回合"
 */

import { describe, it, expect } from 'vitest';
import { registerGameAiRuntime, resolveNextLocalAiAction } from '../../../engine/ai';
import { smashUpFlowHooks } from '../domain/index';
import { buildSmashUpAiLegalActions, smashUpAiRuntime } from '../ai';
import type { MatchState } from '../../../core/types';
import type { SmashUpCore, PlayerState, BaseInPlay, MinionOnBase } from '../types';

/** 构造最小 SmashUpCore 用于测试 */
function makeMinimalCore(overrides: Partial<SmashUpCore> = {}): SmashUpCore {
    const defaultPlayer: PlayerState = {
        id: '0',
        factionIds: ['robot'],
        hand: [],
        deck: [],
        discard: [],
        vp: 0,
        minionsPlayed: 0,
        minionLimit: 1,
        actionsPlayed: 0,
        actionLimit: 1,
    };
    
    return {
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        turnNumber: 1,
        players: {
            '0': defaultPlayer,
            '1': { ...defaultPlayer, id: '1', factionIds: ['pirate'] },
        },
        bases: [],
        baseDeck: [],
        nextUid: 1000,
        ...overrides,
    };
}

/** 构造基地 */
function makeBase(defId: string, minions: MinionOnBase[] = []): BaseInPlay {
    return {
        defId,
        minions,
        ongoingActions: [],
    };
}

/** 构造随从 */
function makeMinion(owner: string, defId: string, power: number): MinionOnBase {
    return {
        uid: `minion_${Math.random()}`,
        defId,
        owner,
        controller: owner,
        basePower: power,
        powerCounters: 0,
        powerModifier: 0,
        tempPowerModifier: 0,
        talentUsed: false,
        attachedActions: [],
    };
}

const smashUpAiEngineConfig = {
    gameId: 'smashup',
    domain: {} as never,
    systems: [],
};

describe('scoreBases 阶段自动推进', () => {
    it('交互解决后应该自动推进到 draw 阶段', () => {
        // 创建一个基地达到临界点的状态
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'robot_hoverbot', 5), // 力量 5
            ])],
        });
        
        // 模拟 flowHalted=true 且交互已解决的状态
        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: true, // 上一轮 onPhaseExit 返回了 halt
                interaction: { current: null, queue: [] }, // 交互已解决
            } as any,
        };
        
        // 调用 onAutoContinueCheck
        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });
        
        // 应该返回 autoContinue=true
        expect(result).toBeDefined();
        expect(result?.autoContinue).toBe(true);
        expect(result?.playerId).toBe('0');
    });
    
    it('没有 eligible 基地时应该自动推进', () => {
        // 创建一个没有基地达到临界点的状态
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'robot_hoverbot', 2), // 力量 2，未达到临界点
            ])],
        });
        
        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
            } as any,
        };
        
        // 调用 onAutoContinueCheck
        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });
        
        // 应该返回 autoContinue=true
        expect(result).toBeDefined();
        expect(result?.autoContinue).toBe(true);
    });
    
    it('有 eligible 基地且响应窗口仍打开时不应该自动推进', () => {
        // 创建一个基地达到临界点且响应窗口仍打开的状态
        // 这是真实场景：onPhaseEnter 打开了响应窗口，等待玩家响应
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'robot_hoverbot', 5), // 力量 5
            ])],
            scoringEligibleBaseIndices: [0], // 锁定的 eligible 基地列表
        });
        
        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
                responseWindow: {
                    current: {
                        windowId: 'meFirst_scoreBases_1',
                        responderQueue: ['0', '1'],
                        windowType: 'meFirst',
                        sourceId: 'scoreBases',
                    },
                    history: [],
                },
            } as any,
        };
        
        // 调用 onAutoContinueCheck
        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });
        
        // 应该返回 undefined（不自动推进，因为响应窗口仍打开）
        expect(result).toBeUndefined();
    });
    
    it('有交互时不应该自动推进', () => {
        // 创建一个有交互的状态（如海盗王 beforeScoring 移动确认）
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'robot_hoverbot', 5),
            ])],
        });
        
        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: true,
                interaction: {
                    current: {
                        id: 'test_interaction',
                        playerId: '0',
                        type: 'simple-choice',
                        data: { title: '测试交互', options: [] },
                    },
                    queue: [],
                },
            } as any,
        };
        
        // 调用 onAutoContinueCheck
        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });
        
        // 应该返回 undefined（不自动推进，因为有交互）
        expect(result).toBeUndefined();
    });
    
    it('响应窗口关闭后应该自动推进触发计分', () => {
        // 创建一个响应窗口已关闭的状态（所有玩家都 PASS 了）
        // 这是真实场景：onPhaseEnter 打开了响应窗口，所有玩家 PASS 后窗口关闭
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'robot_hoverbot', 5), // 力量 5
            ])],
            scoringEligibleBaseIndices: [0], // 锁定的 eligible 基地列表
        });
        
        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
                responseWindow: { current: null, history: [] }, // 窗口已关闭
            } as any,
        };
        
        // 调用 onAutoContinueCheck
        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });
        
        // 应该返回 autoContinue=true（响应窗口关闭，触发计分）
        expect(result).toBeDefined();
        expect(result?.autoContinue).toBe(true);
        expect(result?.playerId).toBe('0');
    });

    it('达标基地上有可激活的侏儒 POD special 时不应该自动推进', () => {
        const core = makeMinimalCore({
            bases: [makeBase('base_pirate_cove', [
                makeMinion('0', 'trickster_gnome_pod', 3),
                makeMinion('0', 'robot_hoverbot', 4),
                makeMinion('1', 'robot_microbot_guard', 3),
            ])],
            scoringEligibleBaseIndices: [0],
        });

        const state: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const result = smashUpFlowHooks.onAutoContinueCheck!({
            state,
            events: [],
            random: { next: () => 0.5 },
        });

        expect(result).toBeUndefined();
    });

    it('AI 在计分阶段存在可激活 special 时不应暴露 advance-phase', () => {
        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore({
                bases: [makeBase('base_pirate_cove', [
                    makeMinion('0', 'trickster_gnome_pod', 3),
                    makeMinion('0', 'robot_hoverbot', 4),
                    makeMinion('1', 'robot_microbot_guard', 3),
                ])],
                scoringEligibleBaseIndices: [0],
            }),
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: state as any,
        });

        expect(legalActions.some(action => action.kind === 'activate-special')).toBe(true);
        expect(legalActions.some(action => action.kind === 'advance-phase')).toBe(false);
    });

    it('AI 在 optional multi 交互中应保留空选动作，避免 special 链卡死', () => {
        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore(),
            sys: {
                phase: 'playCards',
                flowHalted: false,
                interaction: {
                    current: {
                        id: 'miskatonic_field_trip_optional',
                        playerId: '0',
                        kind: 'simple-choice',
                        data: {
                            sourceId: 'miskatonic_field_trip',
                            options: [
                                { id: 'card-1', label: '选择 h1', value: { cardUid: 'h1' } },
                                { id: 'card-2', label: '选择 h2', value: { cardUid: 'h2' } },
                            ],
                            multi: { min: 0, max: 2 },
                        },
                    },
                    queue: [],
                },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: state as any,
        });

        const emptySelection = legalActions.find(action =>
            action.kind === 'interaction-choice'
            && (action.commands[0] as any)?.payload?.optionIds
            && Array.isArray((action.commands[0] as any).payload.optionIds)
            && (action.commands[0] as any).payload.optionIds.length === 0,
        );

        expect(emptySelection).toBeDefined();
        expect(emptySelection?.label).toContain('不选择');
    });

    it('required 动态交互在刷新后无合法选项时，AI 仍应拿到紧急跳过动作', () => {
        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore(),
            sys: {
                phase: 'playCards',
                flowHalted: false,
                interaction: {
                    current: {
                        id: 'required-empty-live',
                        playerId: '0',
                        kind: 'simple-choice',
                        data: {
                            sourceId: 'alien_probe',
                            options: [
                                { id: 'stale-card', label: '过期手牌', value: { cardUid: 'stale-card', defId: 'pirate_first_mate' } },
                            ],
                            autoRefresh: 'hand',
                            responseValidationMode: 'live',
                        },
                    },
                    queue: [],
                },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: state as any,
        });

        const emergencyAction = legalActions.find((action) =>
            action.kind === 'interaction-choice'
            && (action.commands[0] as any)?.payload?.optionId === '__emergency_skip__',
        );

        expect(emergencyAction).toBeDefined();
    });

    it('AI 对 exact-multi 交互应枚举所有合法组合，而不是总拿前两个', () => {
        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore(),
            sys: {
                phase: 'playCards',
                flowHalted: false,
                interaction: {
                    current: {
                        id: 'elder-thing-pod-destroy',
                        playerId: '0',
                        kind: 'simple-choice',
                        data: {
                            sourceId: 'elder_thing_elder_thing_pod_destroy',
                            options: [
                                { id: 'm1', label: '随从 1', value: { minionUid: 'm1' } },
                                { id: 'm2', label: '随从 2', value: { minionUid: 'm2' } },
                                { id: 'm3', label: '随从 3', value: { minionUid: 'm3' } },
                            ],
                            multi: { min: 2, max: 2 },
                        },
                    },
                    queue: [],
                },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: state as any,
        });

        const comboPayloads = legalActions
            .filter((action) => action.kind === 'interaction-choice')
            .map((action) => ((action.commands[0] as any)?.payload?.optionIds ?? []).join(','))
            .sort();

        expect(comboPayloads).toEqual(['m1,m2', 'm1,m3', 'm2,m3']);
    });

    it('在线隐藏交互只对 AI seat 可见时，Smash Up AI 仍应生成 simple-choice 响应', async () => {
        registerGameAiRuntime(smashUpAiRuntime);

        const filteredHumanState: MatchState<SmashUpCore> = {
            core: makeMinimalCore({
                currentPlayerIndex: 0,
                players: {
                    '0': {
                        ...makeMinimalCore().players['0'],
                    },
                    '1': {
                        ...makeMinimalCore().players['1'],
                    },
                },
            }),
            sys: {
                phase: 'playCards',
                turnNumber: 1,
                interaction: {
                    current: undefined,
                    queue: [],
                    isBlocked: true,
                },
                responseWindow: { current: null, history: [] },
                eventStream: { nextId: 22 },
            } as any,
        };

        const aiSeatVisibleState: MatchState<SmashUpCore> = {
            core: makeMinimalCore({
                currentPlayerIndex: 0,
                players: {
                    '0': {
                        ...makeMinimalCore().players['0'],
                    },
                    '1': {
                        ...makeMinimalCore().players['1'],
                        hand: [
                            { uid: 'c54', defId: 'wizard_summon', type: 'action', owner: '1' },
                            { uid: 'c70', defId: 'ninja_acolyte', type: 'minion', owner: '1' },
                        ],
                        discard: [
                            { uid: 'c58', defId: 'wizard_sacrifice', type: 'action', owner: '1' },
                        ],
                        factions: ['wizards', 'ninjas'],
                        minionsPlayed: 1,
                        actionsPlayed: 1,
                    },
                },
                bases: [makeBase('base_temple_of_goju', [{
                    uid: 'c66',
                    defId: 'ninja_shinobi',
                    controller: '1',
                    owner: '1',
                    basePower: 3,
                    powerCounters: 0,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    playedThisTurn: true,
                    attachedActions: [],
                } as MinionOnBase])],
            }),
            sys: {
                phase: 'playCards',
                turnNumber: 1,
                interaction: {
                    current: {
                        id: 'wizard_sacrifice_hidden_choice',
                        playerId: '1',
                        kind: 'simple-choice',
                        data: {
                            sourceId: 'wizard_sacrifice',
                            options: [{
                                id: 'target-shinobi',
                                label: '影舞者',
                                value: { minionUid: 'c66', baseIndex: 0 },
                            }],
                        },
                    },
                    queue: [],
                },
                responseWindow: { current: null, history: [] },
                eventStream: { nextId: 22 },
            } as any,
        };

        const withoutSeatSpecificState = await resolveNextLocalAiAction({
            engineConfig: smashUpAiEngineConfig,
            state: filteredHumanState,
            matchId: 'smashup-hidden-choice-regression',
            seatControllers: { '1': { type: 'local-ai' } },
        });

        expect(withoutSeatSpecificState).toBeNull();

        const withSeatSpecificState = await resolveNextLocalAiAction({
            engineConfig: smashUpAiEngineConfig,
            state: filteredHumanState,
            matchId: 'smashup-hidden-choice-regression',
            seatControllers: { '1': { type: 'local-ai' } },
            visibleStateResolver: (playerId) => (playerId === '1' ? aiSeatVisibleState : undefined),
        });

        expect(withSeatSpecificState?.playerId).toBe('1');
        expect(withSeatSpecificState?.action.kind).toBe('interaction-choice');
        expect(withSeatSpecificState?.action.commands).toEqual([{
            type: 'SYS_INTERACTION_RESPOND',
            payload: {
                optionId: 'target-shinobi',
                mergedValue: { minionUid: 'c66', baseIndex: 0 },
            },
        }]);
    });

    it('afterScoring 响应窗口与 reaction queue 主动选择并存时，AI 应优先响应当前交互而不是窗口动作', async () => {
        registerGameAiRuntime(smashUpAiRuntime);

        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore({
                currentPlayerIndex: 1,
                players: {
                    '0': {
                        ...makeMinimalCore().players['0'],
                    },
                    '1': {
                        ...makeMinimalCore().players['1'],
                        hand: [
                            { uid: 'c54', defId: 'wizard_summon', type: 'action', owner: '1' },
                            { uid: 'c70', defId: 'ninja_acolyte', type: 'minion', owner: '1' },
                        ],
                        factions: ['wizards', 'ninjas'],
                    },
                },
            }),
            sys: {
                phase: 'scoreBases',
                turnNumber: 1,
                interaction: {
                    current: {
                        id: 'reaction-order-choice',
                        playerId: '1',
                        kind: 'simple-choice',
                        data: {
                            sourceId: 'reaction_queue_choose_next',
                            options: [
                                {
                                    id: 'trigger-a',
                                    label: '先结算触发 A',
                                    displayMode: 'button',
                                    value: { triggerId: 'afterScoring:base_a:1:0' },
                                },
                                {
                                    id: 'trigger-b',
                                    label: '先结算触发 B',
                                    displayMode: 'button',
                                    value: { triggerId: 'afterScoring:base_b:1:0' },
                                },
                            ],
                        },
                    },
                    queue: [],
                },
                responseWindow: {
                    current: {
                        id: 'afterscoring-window',
                        windowType: 'afterScoring',
                        responderQueue: ['1'],
                        currentResponderIndex: 0,
                        passedPlayers: [],
                    },
                    history: [],
                },
                eventStream: { nextId: 30 },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '1',
            state,
        });

        expect(legalActions.length).toBeGreaterThan(0);
        expect(legalActions.every((action) => action.kind === 'interaction-choice')).toBe(true);
        expect(legalActions.some((action) => action.kind === 'response-pass')).toBe(false);

        const resolution = await resolveNextLocalAiAction({
            engineConfig: smashUpAiEngineConfig,
            state,
            matchId: 'smashup-reaction-queue-ai-regression',
            seatControllers: { '1': { type: 'local-ai' } },
        });

        expect(resolution?.playerId).toBe('1');
        expect(resolution?.action.kind).toBe('interaction-choice');
        expect(resolution?.action.commands[0]?.type).toBe('SYS_INTERACTION_RESPOND');
        expect(['trigger-a', 'trigger-b']).toContain(
            (resolution?.action.commands[0]?.payload as { optionId?: string } | undefined)?.optionId,
        );
    });

    it('AI 在计分阶段仅存在可激活的泰坦 special 时也不应暴露 advance-phase', () => {
        const state: MatchState<SmashUpCore> = {
            core: makeMinimalCore({
                bases: [makeBase('base_pirate_cove', [
                    makeMinion('0', 'robot_hoverbot', 4),
                    makeMinion('0', 'robot_microbot_alpha', 2),
                    makeMinion('0', 'robot_microbot_beta', 2),
                    makeMinion('1', 'pirate_first_mate', 3),
                ])],
                scoringEligibleBaseIndices: [0],
                titans: [{
                    uid: 't-megabot-setaside',
                    defId: 'mega_troopers_megabot',
                    faction: 'mega_troopers',
                    ownerId: '0',
                    controllerId: '0',
                    powerCounters: 0,
                    talentUsed: false,
                    location: { zone: 'setaside' },
                }] as any,
            }),
            sys: {
                phase: 'scoreBases',
                flowHalted: false,
                interaction: { current: null, queue: [] },
                responseWindow: { current: null, history: [] },
            } as any,
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: state as any,
        });

        expect(legalActions.some(action =>
            action.kind === 'activate-special'
            && (action.metadata as any)?.titanUid === 't-megabot-setaside',
        )).toBe(true);
        expect(legalActions.some(action => action.kind === 'advance-phase')).toBe(false);
    });
});
