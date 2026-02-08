/**
 * 大杀四方 (Smash Up) - 领域内核组装
 *
 * 职责：setup 初始化、FlowSystem 钩子、playerView、isGameOver
 */

import type { DomainCore, GameEvent, GameOverResult, PlayerId, RandomFn } from '../../../engine/types';
import type { FlowHooks } from '../../../engine/systems/FlowSystem';
import type {
    SmashUpCommand,
    SmashUpCore,
    SmashUpEvent,
    GamePhase,
    PlayerState,
    BaseInPlay,
    TurnStartedEvent,
    TurnEndedEvent,
    CardsDrawnEvent,
    BaseScoredEvent,
    BaseReplacedEvent,
    DeckReshuffledEvent,
} from './types';
import {
    PHASE_ORDER,
    SU_EVENTS,
    DRAW_PER_TURN,
    HAND_LIMIT,
    VP_TO_WIN,
    getCurrentPlayerId,
    getTotalPowerOnBase,
} from './types';
import { validate } from './commands';
import { execute, reduce } from './reducer';
import { getAllBaseDefIds, getBaseDef } from '../data/cards';
import { drawCards } from './utils';
import { triggerAllBaseAbilities, triggerBaseAbility } from './baseAbilities';

// ============================================================================
// Setup
// ============================================================================

function setup(playerIds: PlayerId[], random: RandomFn): SmashUpCore {
    let nextUid = 1;

    const players: Record<PlayerId, PlayerState> = {};
    const playerSelections: Record<PlayerId, string[]> = {};
    for (const pid of playerIds) {
        players[pid] = {
            id: pid,
            vp: 0,
            hand: [],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
            factions: [] as any,
        };
        playerSelections[pid] = [];
    }

    // 翻开 玩家数+1 张基地
    const allBaseIds = random.shuffle(getAllBaseDefIds());
    const baseCount = playerIds.length + 1;
    const activeBases: BaseInPlay[] = allBaseIds.slice(0, baseCount).map(defId => ({
        defId,
        minions: [],
        ongoingActions: [],
    }));
    const baseDeck = allBaseIds.slice(baseCount);

    return {
        players,
        turnOrder: [...playerIds],
        currentPlayerIndex: 0,
        bases: activeBases,
        baseDeck,
        turnNumber: 1,
        nextUid,
        gameResult: undefined,
        factionSelection: {
            takenFactions: [],
            playerSelections,
            completedPlayers: [],
        }
    };
}

// ============================================================================
// FlowSystem 钩子
// ============================================================================

export const smashUpFlowHooks: FlowHooks<SmashUpCore> = {
    initialPhase: 'factionSelect',

    getNextPhase({ from }): string {
        const idx = PHASE_ORDER.indexOf(from as GamePhase);
        if (idx === -1 || idx >= PHASE_ORDER.length - 1) {
            // endTurn 后回到 startTurn（跳过 factionSelect，它只在游戏开始时使用一次）
            return 'startTurn';
        }
        return PHASE_ORDER[idx + 1];
    },

    getActivePlayerId({ state }): PlayerId {
        return getCurrentPlayerId(state.core);
    },

    onPhaseExit({ state, from }): GameEvent[] {
        const core = state.core;
        const pid = getCurrentPlayerId(core);
        const now = Date.now();

        if (from === 'endTurn') {
            // 切换到下一个玩家
            const nextIndex = (core.currentPlayerIndex + 1) % core.turnOrder.length;
            const evt: TurnEndedEvent = {
                type: SU_EVENTS.TURN_ENDED,
                payload: { playerId: pid, nextPlayerIndex: nextIndex },
                timestamp: now,
            };
            return [evt];
        }
        return [];
    },

    onPhaseEnter({ state, from, to, random }): GameEvent[] {
        const core = state.core;
        const pid = getCurrentPlayerId(core);
        const now = Date.now();
        const events: GameEvent[] = [];

        if (to === 'startTurn') {
            let nextPlayerId = pid;
            let nextTurnNumber = core.turnNumber;
            if (from === 'endTurn') {
                const nextIndex = (core.currentPlayerIndex + 1) % core.turnOrder.length;
                nextPlayerId = core.turnOrder[nextIndex];
                if (nextIndex === 0) {
                    nextTurnNumber = core.turnNumber + 1;
                }
            }
            const turnStarted: TurnStartedEvent = {
                type: SU_EVENTS.TURN_STARTED,
                payload: {
                    playerId: nextPlayerId,
                    turnNumber: nextTurnNumber,
                },
                timestamp: now,
            };
            events.push(turnStarted);

            // 触发基地 onTurnStart 能力（如更衣室：有随从则抽牌）
            const baseEvents = triggerAllBaseAbilities('onTurnStart', core, nextPlayerId, now);
            events.push(...baseEvents);
        }

        if (to === 'scoreBases') {
            // Property 15: 循环检查所有达到临界点的基地
            // 每次记分后重新检查（因为 afterScoring 能力可能改变状态）
            let currentBases = core.bases;
            let currentBaseDeck = core.baseDeck;
            let scoredCount = 0;

            // 最多循环基地数量次（防止无限循环）
            const maxIterations = core.bases.length;
            for (let iter = 0; iter < maxIterations; iter++) {
                let foundIndex = -1;
                for (let i = 0; i < currentBases.length; i++) {
                    const base = currentBases[i];
                    const baseDef = getBaseDef(base.defId);
                    if (!baseDef) continue;
                    const totalPower = getTotalPowerOnBase(base);
                    if (totalPower >= baseDef.breakpoint) {
                        foundIndex = i;
                        break;
                        // TODO Property 14: 多基地同时达标时，通过 PromptSystem 让玩家选择顺序
                    }
                }
                if (foundIndex === -1) break; // 无基地达标，退出循环

                const base = currentBases[foundIndex];
                const baseDef = getBaseDef(base.defId)!;

                // 触发 beforeScoring 基地能力
                const beforeCtx = {
                    state: core,
                    baseIndex: foundIndex,
                    baseDefId: base.defId,
                    playerId: pid,
                    now,
                };
                const bsEvents = triggerBaseAbility(base.defId, 'beforeScoring', beforeCtx);
                events.push(...bsEvents);

                // 计算排名
                const playerPowers = new Map<PlayerId, number>();
                for (const m of base.minions) {
                    const prev = playerPowers.get(m.controller) ?? 0;
                    playerPowers.set(m.controller, prev + m.basePower + m.powerModifier);
                }
                const sorted = Array.from(playerPowers.entries())
                    .filter(([, p]) => p > 0)
                    .sort((a, b) => b[1] - a[1]);

                // Property 16: 平局玩家获得该名次最高 VP
                // 例：两人并列第一 → 都拿第一名 VP，第三名拿第三名 VP
                const rankings: { playerId: string; power: number; vp: number }[] = [];
                let rankSlot = 0; // 当前名次槽位（0=第一名, 1=第二名, 2=第三名）
                for (let i = 0; i < sorted.length; i++) {
                    const [playerId, power] = sorted[i];
                    // 如果不是第一个且力量与前一个不同，推进名次槽位
                    if (i > 0 && power < sorted[i - 1][1]) {
                        rankSlot = i; // 跳过被平局占用的名次
                    }
                    rankings.push({
                        playerId,
                        power,
                        vp: rankSlot < 3 ? baseDef.vpAwards[rankSlot] : 0,
                    });
                }

                const scoreEvt: BaseScoredEvent = {
                    type: SU_EVENTS.BASE_SCORED,
                    payload: { baseIndex: foundIndex, baseDefId: base.defId, rankings },
                    timestamp: now,
                };
                events.push(scoreEvt);

                // 触发 afterScoring 基地能力
                const afterCtx = {
                    state: core,
                    baseIndex: foundIndex,
                    baseDefId: base.defId,
                    playerId: pid,
                    rankings,
                    now,
                };
                const asEvents = triggerBaseAbility(base.defId, 'afterScoring', afterCtx);
                events.push(...asEvents);

                // 替换基地
                if (currentBaseDeck.length > 0) {
                    const replaceEvt: BaseReplacedEvent = {
                        type: SU_EVENTS.BASE_REPLACED,
                        payload: {
                            baseIndex: foundIndex,
                            oldBaseDefId: base.defId,
                            newBaseDefId: currentBaseDeck[0],
                        },
                        timestamp: now,
                    };
                    events.push(replaceEvt);
                    // 更新本地追踪（reducer 会处理实际状态）
                    currentBaseDeck = currentBaseDeck.slice(1);
                }

                // 从本地追踪中移除已记分基地（用于循环检查）
                currentBases = currentBases.filter((_, i) => i !== foundIndex);
                scoredCount++;
            }
        }

        if (to === 'draw') {
            const player = core.players[pid];
            if (player) {
                const { drawnUids, reshuffledDeckUids } = drawCards(player, DRAW_PER_TURN, random);
                if (drawnUids.length > 0) {
                    if (reshuffledDeckUids && reshuffledDeckUids.length > 0) {
                        const reshuffleEvt: DeckReshuffledEvent = {
                            type: SU_EVENTS.DECK_RESHUFFLED,
                            payload: { playerId: pid, deckUids: reshuffledDeckUids },
                            timestamp: now,
                        };
                        events.push(reshuffleEvt);
                    }
                    const drawEvt: CardsDrawnEvent = {
                        type: SU_EVENTS.CARDS_DRAWN,
                        payload: { playerId: pid, count: drawnUids.length, cardUids: drawnUids },
                        timestamp: now,
                    };
                    events.push(drawEvt);
                }
            }
        }

        return events;
    },

    onAutoContinueCheck({ state }): { autoContinue: boolean; playerId: PlayerId } | void {
        const core = state.core;
        const pid = getCurrentPlayerId(core);
        const phase = state.sys.phase as GamePhase;

        // factionSelect 自动推进 check
        if (phase === 'factionSelect') {
            // 如果所有人都选完了（reducer把selection置空了），则自动进入下一阶段
            if (!core.factionSelection) {
                return { autoContinue: true, playerId: pid };
            }
        }

        // startTurn 自动推进到 playCards
        if (phase === 'startTurn') {
            return { autoContinue: true, playerId: pid };
        }

        // scoreBases 自动推进到 draw
        if (phase === 'scoreBases') {
            return { autoContinue: true, playerId: pid };
        }

        // draw 阶段：手牌不超限则自动推进到 endTurn
        if (phase === 'draw') {
            const player = core.players[pid];
            if (player && player.hand.length <= HAND_LIMIT) {
                return { autoContinue: true, playerId: pid };
            }
        }

        // endTurn 自动推进到 startTurn（切换玩家后）
        if (phase === 'endTurn') {
            return { autoContinue: true, playerId: pid };
        }
    },
};

// ============================================================================
// playerView：隐藏其他玩家手牌与牌库
// ============================================================================

function playerView(state: SmashUpCore, playerId: PlayerId): Partial<SmashUpCore> {
    const filtered: Record<PlayerId, PlayerState> = {};
    for (const [pid, player] of Object.entries(state.players)) {
        if (pid === playerId) {
            filtered[pid] = player;
        } else {
            // 隐藏手牌内容和牌库内容，只保留数量
            filtered[pid] = {
                ...player,
                hand: player.hand.map(c => ({ ...c, defId: 'hidden', type: c.type })),
                deck: player.deck.map(c => ({ ...c, defId: 'hidden', type: c.type })),
            };
        }
    }
    return { players: filtered };
}

// ============================================================================
// isGameOver
// ============================================================================

function isGameOver(state: SmashUpCore): GameOverResult | undefined {
    if (state.gameResult) return state.gameResult;

    // 回合结束时检查：有玩家 >= 15 VP
    const winners = state.turnOrder.filter(pid => state.players[pid]?.vp >= VP_TO_WIN);
    if (winners.length === 0) return undefined;

    if (winners.length === 1) {
        return { winner: winners[0], scores: getScores(state) };
    }
    // 多人达标：VP 最高者胜
    const sorted = winners.sort((a, b) => state.players[b].vp - state.players[a].vp);
    if (state.players[sorted[0]].vp > state.players[sorted[1]].vp) {
        return { winner: sorted[0], scores: getScores(state) };
    }
    // 平局：继续游戏（规则：平局继续直到打破）
    return undefined;
}

function getScores(state: SmashUpCore): Record<PlayerId, number> {
    const scores: Record<PlayerId, number> = {};
    for (const pid of state.turnOrder) {
        scores[pid] = state.players[pid]?.vp ?? 0;
    }
    return scores;
}

// ============================================================================
// 领域内核导出
// ============================================================================

export const SmashUpDomain: DomainCore<SmashUpCore, SmashUpCommand, SmashUpEvent> = {
    gameId: 'smashup',
    setup,
    validate,
    execute,
    reduce,
    playerView,
    isGameOver,
};

export type { SmashUpCommand, SmashUpCore, SmashUpEvent } from './types';
export { SU_COMMANDS, SU_EVENTS } from './types';
export { registerAbility, resolveAbility, resolveOnPlay, resolveTalent, resolveSpecial, clearRegistry } from './abilityRegistry';
export type { AbilityContext, AbilityResult, AbilityExecutor } from './abilityRegistry';
export {
    registerBaseAbility,
    triggerBaseAbility,
    triggerAllBaseAbilities,
    hasBaseAbility,
    clearBaseAbilityRegistry,
    registerBaseAbilities,
    triggerExtendedBaseAbility,
} from './baseAbilities';
export type { BaseTriggerTiming, BaseAbilityContext, BaseAbilityResult, BaseAbilityExecutor } from './baseAbilities';
