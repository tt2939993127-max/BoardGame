/**
 * 大杀四方 (Smash Up) - 命令执行与事件归约
 */

import type { MatchState, RandomFn } from '../../../engine/types';
import type {
    SmashUpCommand,
    SmashUpCore,
    SmashUpEvent,
    MinionPlayedEvent,
    ActionPlayedEvent,
    CardsDiscardedEvent,
    MinionReturnedEvent,
    LimitModifiedEvent,
    MinionOnBase,
    CardInstance,
    BaseInPlay,
} from './types';
import { SU_COMMANDS, SU_EVENTS } from './types';
import { getMinionDef } from '../data/cards';

// ============================================================================
// execute：命令 → 事件
// ============================================================================

export function execute(
    state: MatchState<SmashUpCore>,
    command: SmashUpCommand,
    _random: RandomFn
): SmashUpEvent[] {
    const now = Date.now();
    const core = state.core;

    switch (command.type) {
        case SU_COMMANDS.PLAY_MINION: {
            const player = core.players[command.playerId];
            const card = player.hand.find(c => c.uid === command.payload.cardUid)!;
            const minionDef = getMinionDef(card.defId);
            const baseIndex = command.payload.baseIndex;
            const events: SmashUpEvent[] = [];

            const playedEvt: MinionPlayedEvent = {
                type: SU_EVENTS.MINION_PLAYED,
                payload: {
                    playerId: command.playerId,
                    cardUid: card.uid,
                    defId: card.defId,
                    baseIndex,
                    power: minionDef?.power ?? 0,
                },
                sourceCommandType: command.type,
                timestamp: now,
            };
            events.push(playedEvt);

            // on-play 能力触发
            events.push(...resolveOnPlayAbility(
                card.defId, command.playerId, baseIndex, core, now
            ));

            return events;
        }

        case SU_COMMANDS.PLAY_ACTION: {
            const player = core.players[command.playerId];
            const card = player.hand.find(c => c.uid === command.payload.cardUid)!;
            const event: ActionPlayedEvent = {
                type: SU_EVENTS.ACTION_PLAYED,
                payload: {
                    playerId: command.playerId,
                    cardUid: card.uid,
                    defId: card.defId,
                },
                sourceCommandType: command.type,
                timestamp: now,
            };
            // TODO: 行动卡效果系统（MVP 阶段仅消耗卡牌）
            return [event];
        }

        case SU_COMMANDS.DISCARD_TO_LIMIT: {
            const event: CardsDiscardedEvent = {
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: {
                    playerId: command.playerId,
                    cardUids: command.payload.cardUids,
                },
                sourceCommandType: command.type,
                timestamp: now,
            };
            return [event];
        }

        default:
            return [];
    }
}

// ============================================================================
// on-play 能力解析
// ============================================================================

function resolveOnPlayAbility(
    defId: string,
    playerId: string,
    baseIndex: number,
    core: SmashUpCore,
    now: number
): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    const base = core.bases[baseIndex];
    if (!base) return events;

    switch (defId) {
        // 最高霸主：额外打出一个随从
        case 'alien_supreme_overlord': {
            const evt: LimitModifiedEvent = {
                type: SU_EVENTS.LIMIT_MODIFIED,
                payload: { playerId, limitType: 'minion', delta: 1, reason: 'alien_supreme_overlord' },
                timestamp: now,
            };
            events.push(evt);
            break;
        }

        // 收集者：每位其他玩家收回此基地上自己的一个随从
        case 'alien_collector': {
            for (const m of base.minions) {
                if (m.controller !== playerId) {
                    // 每个其他玩家只收回一个（第一个找到的）
                    const alreadyReturned = events.some(
                        e => e.type === SU_EVENTS.MINION_RETURNED &&
                            (e as MinionReturnedEvent).payload.toPlayerId === m.owner
                    );
                    if (alreadyReturned) continue;

                    const evt: MinionReturnedEvent = {
                        type: SU_EVENTS.MINION_RETURNED,
                        payload: {
                            minionUid: m.uid,
                            minionDefId: m.defId,
                            fromBaseIndex: baseIndex,
                            toPlayerId: m.owner,
                            reason: 'alien_collector',
                        },
                        timestamp: now,
                    };
                    events.push(evt);
                }
            }
            break;
        }

        // 入侵者：可以收回此基地上一个随从（MVP：自动收回第一个其他玩家的随从）
        // TODO: 需要目标选择 Prompt
        case 'alien_invader': {
            const target = base.minions.find(m => m.controller !== playerId);
            if (target) {
                const evt: MinionReturnedEvent = {
                    type: SU_EVENTS.MINION_RETURNED,
                    payload: {
                        minionUid: target.uid,
                        minionDefId: target.defId,
                        fromBaseIndex: baseIndex,
                        toPlayerId: target.owner,
                        reason: 'alien_invader',
                    },
                    timestamp: now,
                };
                events.push(evt);
            }
            break;
        }

        // 侦察兵：Special 能力，在记分时触发，此处不处理
        case 'alien_scout':
            break;
    }

    return events;
}

// ============================================================================
// reduce：事件 → 新状态（确定性）
// ============================================================================

export function reduce(state: SmashUpCore, event: SmashUpEvent): SmashUpCore {
    switch (event.type) {
        case SU_EVENTS.MINION_PLAYED: {
            const { playerId, cardUid, defId, baseIndex, power } = event.payload;
            const player = state.players[playerId];
            const newHand = player.hand.filter(c => c.uid !== cardUid);
            const minion: MinionOnBase = {
                uid: cardUid,
                defId,
                controller: playerId,
                owner: playerId,
                basePower: power,
                powerModifier: 0,
                talentUsed: false,
                attachedActions: [],
            };
            const newBases = state.bases.map((base, i) => {
                if (i !== baseIndex) return base;
                return { ...base, minions: [...base.minions, minion] };
            });
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        hand: newHand,
                        minionsPlayed: player.minionsPlayed + 1,
                    },
                },
                bases: newBases,
            };
        }

        case SU_EVENTS.ACTION_PLAYED: {
            const { playerId, cardUid } = event.payload;
            const player = state.players[playerId];
            const card = player.hand.find(c => c.uid === cardUid);
            const newHand = player.hand.filter(c => c.uid !== cardUid);
            const newDiscard = card ? [...player.discard, card] : player.discard;
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        hand: newHand,
                        discard: newDiscard,
                        actionsPlayed: player.actionsPlayed + 1,
                    },
                },
            };
        }

        case SU_EVENTS.BASE_SCORED: {
            const { baseIndex, rankings } = event.payload;
            let newPlayers = { ...state.players };
            // 颁发 VP
            for (const r of rankings) {
                if (r.vp > 0) {
                    const p = newPlayers[r.playerId];
                    newPlayers = {
                        ...newPlayers,
                        [r.playerId]: { ...p, vp: p.vp + r.vp },
                    };
                }
            }
            // 基地上的随从回各自所有者弃牌堆
            const scoredBase = state.bases[baseIndex];
            for (const m of scoredBase.minions) {
                const owner = newPlayers[m.owner];
                const returnedCard: CardInstance = {
                    uid: m.uid,
                    defId: m.defId,
                    type: 'minion',
                    owner: m.owner,
                };
                newPlayers = {
                    ...newPlayers,
                    [m.owner]: { ...owner, discard: [...owner.discard, returnedCard] },
                };
            }
            // 移除该基地（后续由 BASE_REPLACED 补充新基地）
            const newBases = state.bases.filter((_, i) => i !== baseIndex);
            return { ...state, players: newPlayers, bases: newBases };
        }

        case SU_EVENTS.VP_AWARDED: {
            const { playerId, amount } = event.payload;
            const player = state.players[playerId];
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: { ...player, vp: player.vp + amount },
                },
            };
        }

        case SU_EVENTS.CARDS_DRAWN: {
            const { playerId, cardUids } = event.payload;
            const player = state.players[playerId];
            const drawnCards: CardInstance[] = [];
            let newDeck = [...player.deck];
            for (const uid of cardUids) {
                const idx = newDeck.findIndex(c => c.uid === uid);
                if (idx !== -1) {
                    drawnCards.push(newDeck[idx]);
                    newDeck = [...newDeck.slice(0, idx), ...newDeck.slice(idx + 1)];
                }
            }
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        hand: [...player.hand, ...drawnCards],
                        deck: newDeck,
                    },
                },
            };
        }

        case SU_EVENTS.CARDS_DISCARDED: {
            const { playerId, cardUids } = event.payload;
            const player = state.players[playerId];
            const uidSet = new Set(cardUids);
            const discarded = player.hand.filter(c => uidSet.has(c.uid));
            const remaining = player.hand.filter(c => !uidSet.has(c.uid));
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        hand: remaining,
                        discard: [...player.discard, ...discarded],
                    },
                },
            };
        }

        case SU_EVENTS.TURN_STARTED: {
            const { playerId, turnNumber } = event.payload;
            const player = state.players[playerId];
            return {
                ...state,
                turnNumber,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        minionsPlayed: 0,
                        minionLimit: 1,
                        actionsPlayed: 0,
                        actionLimit: 1,
                    },
                },
            };
        }

        case SU_EVENTS.TURN_ENDED: {
            const { nextPlayerIndex } = event.payload;
            return { ...state, currentPlayerIndex: nextPlayerIndex };
        }

        case SU_EVENTS.BASE_REPLACED: {
            const { baseIndex, newBaseDefId } = event.payload;
            const newBase: BaseInPlay = {
                defId: newBaseDefId,
                minions: [],
                ongoingActions: [],
            };
            // 在指定位置插入新基地
            const newBases = [...state.bases];
            newBases.splice(baseIndex, 0, newBase);
            const newBaseDeck = state.baseDeck.filter(id => id !== newBaseDefId);
            return { ...state, bases: newBases, baseDeck: newBaseDeck };
        }

        case SU_EVENTS.DECK_RESHUFFLED: {
            const { playerId, deckUids } = event.payload;
            const player = state.players[playerId];
            const cardMap = new Map(player.discard.map(card => [card.uid, card]));
            const reshuffledDeck = deckUids
                .map(uid => cardMap.get(uid))
                .filter((card): card is CardInstance => card !== undefined);
            const finalDeck = reshuffledDeck.length === player.discard.length
                ? reshuffledDeck
                : [...player.discard];
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        deck: finalDeck,
                        discard: [],
                    },
                },
            };
        }

        case SU_EVENTS.MINION_RETURNED: {
            const { minionUid, minionDefId, fromBaseIndex, toPlayerId } = event.payload;
            // 从基地移除随从
            const newBases = state.bases.map((base, i) => {
                if (i !== fromBaseIndex) return base;
                return { ...base, minions: base.minions.filter(m => m.uid !== minionUid) };
            });
            // 返回所有者手牌
            const owner = state.players[toPlayerId];
            const returnedCard: CardInstance = {
                uid: minionUid,
                defId: minionDefId,
                type: 'minion',
                owner: toPlayerId,
            };
            return {
                ...state,
                bases: newBases,
                players: {
                    ...state.players,
                    [toPlayerId]: {
                        ...owner,
                        hand: [...owner.hand, returnedCard],
                    },
                },
            };
        }

        case SU_EVENTS.LIMIT_MODIFIED: {
            const { playerId, limitType, delta } = event.payload;
            const player = state.players[playerId];
            if (limitType === 'minion') {
                return {
                    ...state,
                    players: {
                        ...state.players,
                        [playerId]: { ...player, minionLimit: player.minionLimit + delta },
                    },
                };
            }
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: { ...player, actionLimit: player.actionLimit + delta },
                },
            };
        }

        default:
            return state;
    }
}
