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
    CardInstance,
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
    STARTING_HAND_SIZE,
    DRAW_PER_TURN,
    HAND_LIMIT,
    VP_TO_WIN,
    getCurrentPlayerId,
    getTotalPowerOnBase,
} from './types';
import { validate } from './commands';
import { execute, reduce } from './reducer';
import { getFactionCards, getAllBaseDefIds, getBaseDef } from '../data/cards';

// ============================================================================
// 辅助：构建牌库
// ============================================================================

/** 将派系卡牌定义展开为卡牌实例列表 */
function buildDeck(
    factions: [string, string],
    owner: PlayerId,
    startUid: number,
    random: RandomFn
): { deck: CardInstance[]; nextUid: number } {
    const cards: CardInstance[] = [];
    let uid = startUid;
    for (const factionId of factions) {
        const defs = getFactionCards(factionId);
        for (const def of defs) {
            for (let i = 0; i < def.count; i++) {
                cards.push({
                    uid: `c${uid++}`,
                    defId: def.id,
                    type: def.type,
                    owner,
                });
            }
        }
    }
    return { deck: random.shuffle(cards), nextUid: uid };
}

/** 从牌库顶部抽牌 */
function drawCards(
    player: PlayerState,
    count: number,
    random: RandomFn
): {
    hand: CardInstance[];
    deck: CardInstance[];
    discard: CardInstance[];
    drawnUids: string[];
    reshuffledDeckUids?: string[];
} {
    let deck = [...player.deck];
    let discard = [...player.discard];
    const drawn: CardInstance[] = [];
    let reshuffledDeckUids: string[] | undefined;

    for (let i = 0; i < count; i++) {
        if (deck.length === 0 && discard.length > 0) {
            deck = random.shuffle([...discard]);
            discard = [];
            if (!reshuffledDeckUids) {
                reshuffledDeckUids = deck.map(card => card.uid);
            }
        }
        if (deck.length === 0) break;
        drawn.push(deck[0]);
        deck = deck.slice(1);
    }

    return {
        hand: [...player.hand, ...drawn],
        deck,
        discard,
        drawnUids: drawn.map(c => c.uid),
        reshuffledDeckUids,
    };
}

// ============================================================================
// Setup
// ============================================================================

function setup(playerIds: PlayerId[], random: RandomFn): SmashUpCore {
    let nextUid = 1;

    // MVP：所有玩家都用海盗+忍者来测试流程
    // TODO: 派系选择系统
    const players: Record<PlayerId, PlayerState> = {};
    for (const pid of playerIds) {
        const { deck, nextUid: newUid } = buildDeck(['pirates', 'ninjas'], pid, nextUid, random);
        nextUid = newUid;

        // 抽起始手牌
        const hand = deck.slice(0, STARTING_HAND_SIZE);
        const remainingDeck = deck.slice(STARTING_HAND_SIZE);

        players[pid] = {
            id: pid,
            vp: 0,
            hand,
            deck: remainingDeck,
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
            factions: ['pirates', 'ninjas'],
        };
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
    };
}

// ============================================================================
// FlowSystem 钩子
// ============================================================================

export const smashUpFlowHooks: FlowHooks<SmashUpCore> = {
    // 首回合直接进入出牌阶段（startTurn 阶段的效果仅从第二回合起生效）
    initialPhase: 'playCards',

    getNextPhase({ from }): string {
        const idx = PHASE_ORDER.indexOf(from as GamePhase);
        if (idx === -1 || idx >= PHASE_ORDER.length - 1) return PHASE_ORDER[0];
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

    onPhaseEnter({ state, to, random }): GameEvent[] {
        const core = state.core;
        const pid = getCurrentPlayerId(core);
        const now = Date.now();
        const events: GameEvent[] = [];

        if (to === 'startTurn') {
            const turnStarted: TurnStartedEvent = {
                type: SU_EVENTS.TURN_STARTED,
                payload: {
                    playerId: pid,
                    turnNumber: core.turnNumber + (core.currentPlayerIndex === 0 ? 1 : 0),
                },
                timestamp: now,
            };
            events.push(turnStarted);
        }

        if (to === 'scoreBases') {
            // 检查所有基地是否达到临界点
            for (let i = 0; i < core.bases.length; i++) {
                const base = core.bases[i];
                const baseDef = getBaseDef(base.defId);
                if (!baseDef) continue;
                const totalPower = getTotalPowerOnBase(base);
                if (totalPower >= baseDef.breakpoint) {
                    // 计算排名
                    const playerPowers = new Map<PlayerId, number>();
                    for (const m of base.minions) {
                        const prev = playerPowers.get(m.controller) ?? 0;
                        playerPowers.set(m.controller, prev + m.basePower + m.powerModifier);
                    }
                    const sorted = Array.from(playerPowers.entries())
                        .filter(([, p]) => p > 0)
                        .sort((a, b) => b[1] - a[1]);
                    const rankings = sorted.map(([playerId, power], rank) => ({
                        playerId,
                        power,
                        vp: rank < 3 ? baseDef.vpAwards[rank] : 0,
                    }));

                    const scoreEvt: BaseScoredEvent = {
                        type: SU_EVENTS.BASE_SCORED,
                        payload: { baseIndex: i, baseDefId: base.defId, rankings },
                        timestamp: now,
                    };
                    events.push(scoreEvt);

                    // 补充新基地
                    if (core.baseDeck.length > 0) {
                        const replaceEvt: BaseReplacedEvent = {
                            type: SU_EVENTS.BASE_REPLACED,
                            payload: {
                                baseIndex: i,
                                oldBaseDefId: base.defId,
                                newBaseDefId: core.baseDeck[0],
                            },
                            timestamp: now,
                        };
                        events.push(replaceEvt);
                    }

                    // MVP：只处理第一个达到临界点的基地，避免索引偏移
                    // TODO: 支持多基地同时记分（当前玩家选择顺序）
                    break;
                }
            }
        }

        if (to === 'draw') {
            // 抽 2 张牌
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
