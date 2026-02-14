/**
 * 大杀四方 - 僵尸派系能力
 *
 * 主题：从弃牌堆复活随从、弃牌堆操作
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type {
    CardsDrawnEvent,
    CardsDiscardedEvent,
    DeckReshuffledEvent,
    SmashUpEvent,
    MinionCardDef,
    MinionPlayedEvent,
} from '../domain/types';
import { recoverCardsFromDiscard, grantExtraMinion, buildBaseTargetOptions } from '../domain/abilityHelpers';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import { registerRestriction, registerTrigger } from '../domain/ongoingEffects';
import type { RestrictionCheckContext, TriggerContext } from '../domain/ongoingEffects';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册僵尸派系所有能�?*/
export function registerZombieAbilities(): void {
    registerAbility('zombie_grave_digger', 'onPlay', zombieGraveDigger);
    registerAbility('zombie_walker', 'onPlay', zombieWalker);
    registerAbility('zombie_grave_robbing', 'onPlay', zombieGraveRobbing);
    registerAbility('zombie_not_enough_bullets', 'onPlay', zombieNotEnoughBullets);
    registerAbility('zombie_lend_a_hand', 'onPlay', zombieLendAHand);
    registerAbility('zombie_outbreak', 'onPlay', zombieOutbreak);
    registerAbility('zombie_mall_crawl', 'onPlay', zombieMallCrawl);
    registerAbility('zombie_lord', 'onPlay', zombieLord);
    // 它们不收回断来临：从弃牌堆额外打出一个随�?
    registerAbility('zombie_they_keep_coming', 'onPlay', zombieTheyKeepComing);

    // === ongoing 效果注册 ===
    // 泛滥横行：其他玩家不收回能打随从到此基地 + 回合开始自�?
    registerRestriction('zombie_overrun', 'play_minion', zombieOverrunRestriction);
    registerTrigger('zombie_overrun', 'onTurnStart', zombieOverrunSelfDestruct);
    // 它们为你而来：回合开始时可从弃牌堆打随从到此基地
    registerTrigger('zombie_theyre_coming_to_get_you', 'onTurnStart', zombieTheyreComingTrigger);
    // 顽强丧尸：回合开始时检查弃牌堆
    registerTrigger('zombie_tenacious_z', 'onTurnStart', zombieTenaciousZTrigger);
}

/** 掘墓者 onPlay：从弃牌堆取回一个随从到手牌 */
function zombieGraveDigger(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    const options = minionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };
    });
    const interaction = createSimpleChoice(
        `zombie_grave_digger_${ctx.now}`, ctx.playerId,
        '选择要从弃牌堆取回的随从', options, 'zombie_grave_digger',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 行尸 onPlay：查看牌库顶，选择弃掉或放回 */
function zombieWalker(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    const def = getCardDef(topCard.defId);
    const cardName = def?.name ?? topCard.defId;
    const interaction = createSimpleChoice(
        `zombie_walker_${ctx.now}`, ctx.playerId,
        `牌库顶是「${cardName}」，选择处理方式`,
        [
            { id: 'discard', label: '弃掉', value: { action: 'discard' } },
            { id: 'keep', label: '放回牌库顶', value: { action: 'keep' } },
        ],
        'zombie_walker',
    );
    const extended = {
        ...interaction,
        data: { ...interaction.data, continuationContext: { cardUid: topCard.uid, defId: topCard.defId } },
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, extended) };
}

/** 掘墓 onPlay：从弃牌堆取回一张卡到手牌 */
function zombieGraveRobbing(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const options = player.discard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: `${name} (${c.type === 'minion' ? '随从' : '行动'})`, value: { cardUid: c.uid, defId: c.defId } };
    });
    const interaction = createSimpleChoice(
        `zombie_grave_robbing_${ctx.now}`, ctx.playerId,
        '选择要从弃牌堆取回的卡牌', options, 'zombie_grave_robbing',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 子弹不够 onPlay：选择一个随从名，取回弃牌堆中所有同名随从 */
function zombieNotEnoughBullets(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    // 按 defId 分组
    const groups = new Map<string, { defId: string; uids: string[]; name: string }>();
    for (const c of minionsInDiscard) {
        if (!groups.has(c.defId)) {
            const def = getCardDef(c.defId);
            groups.set(c.defId, { defId: c.defId, uids: [], name: def?.name ?? c.defId });
        }
        groups.get(c.defId)!.uids.push(c.uid);
    }
    const groupList = Array.from(groups.values());
    const options = groupList.map((g, i) => ({
        id: `group-${i}`, label: `${g.name} (×${g.uids.length})`, value: { defId: g.defId },
    }));
    const interaction = createSimpleChoice(
        `zombie_not_enough_bullets_${ctx.now}`, ctx.playerId,
        '选择要取回的随从名（取回所有同名随从）', options, 'zombie_not_enough_bullets',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 借把手 onPlay：将弃牌堆全部洗回牌库（MVP：全部洗回） */
/** 借把手 onPlay：选择任意数量的牌从弃牌堆洗回牌库 */
function zombieLendAHand(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const options = player.discard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        const typeLabel = c.type === 'minion' ? '随从' : '行动';
        return { id: `card-${i}`, label: `${name} (${typeLabel})`, value: { cardUid: c.uid } };
    });
    const interaction = createSimpleChoice(
        `zombie_lend_a_hand_${ctx.now}`, ctx.playerId,
        '借把手：选择要洗回牌库的卡牌', options, 'zombie_lend_a_hand',
        undefined, { min: 1, max: player.discard.length },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 爆发 onPlay：在一个没有己方随从的基地额外打出一个随从（交互选择） */
function zombieOutbreak(ctx: AbilityContext): AbilityResult {
    // 找没有己方随从的基地
    const emptyBases: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (!ctx.state.bases[i].minions.some(m => m.controller === ctx.playerId)) {
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            emptyBases.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
        }
    }
    if (emptyBases.length === 0) return { events: [] };
    // 检查手牌中是否有随从
    const player = ctx.state.players[ctx.playerId];
    const handMinions = player.hand.filter(c => c.type === 'minion' && c.uid !== ctx.cardUid);
    if (handMinions.length === 0) return { events: [] };
    // 第一步：选择基地
    const baseOptions = buildBaseTargetOptions(emptyBases);
    const interaction = createSimpleChoice(
        `zombie_outbreak_base_${ctx.now}`, ctx.playerId,
        '爆发：选择一个没有你随从的基地', baseOptions as any[], 'zombie_outbreak_choose_base',
    );
    const extended = {
        ...interaction,
        data: { ...interaction.data, targetType: 'base', continuationContext: { emptyBases } },
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, extended) };
}

/** 僵尸领主 onPlay：在每个没有己方随从的基地从弃牌堆打出力量≤2的随从 */
function zombieLord(ctx: AbilityContext): AbilityResult {
    // 找空基地
    const emptyBases: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (!ctx.state.bases[i].minions.some(m => m.controller === ctx.playerId)) {
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            emptyBases.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
        }
    }
    if (emptyBases.length === 0) return { events: [] };
    // 找弃牌堆中力量≤2的随从
    const player = ctx.state.players[ctx.playerId];
    const discardMinions = player.discard.filter(c => {
        if (c.type !== 'minion') return false;
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        return def != null && def.power <= 2;
    });
    if (discardMinions.length === 0) return { events: [] };
    // 第一步：选择基地
    const baseOptions = buildBaseTargetOptions(emptyBases);
    baseOptions.push({ id: 'done', label: '完成', value: { baseIndex: -1 } } as any);
    const interaction = createSimpleChoice(
        `zombie_lord_base_${ctx.now}`, ctx.playerId,
        '僵尸领主：选择一个空基地放置随从（或完成）', baseOptions as any[], 'zombie_lord_choose_base_first',
    );
    const extended = {
        ...interaction,
        data: { ...interaction.data, continuationContext: { emptyBases, usedCardUids: [] as string[], filledBases: [] as number[] } },
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, extended) };
}

/** 进发商场 onPlay：选择一个卡名，搜索牌库中所有同名卡放入弃牌堆 */
function zombieMallCrawl(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    // 按 defId 分组
    const groups = new Map<string, { defId: string; uids: string[]; name: string }>();
    for (const c of player.deck) {
        if (!groups.has(c.defId)) {
            const def = getCardDef(c.defId);
            groups.set(c.defId, { defId: c.defId, uids: [], name: def?.name ?? c.defId });
        }
        groups.get(c.defId)!.uids.push(c.uid);
    }
    const groupList = Array.from(groups.values());
    const options = groupList.map((g, i) => ({
        id: `group-${i}`, label: `${g.name} (×${g.uids.length})`, value: { defId: g.defId },
    }));
    const interaction = createSimpleChoice(
        `zombie_mall_crawl_${ctx.now}`, ctx.playerId,
        '选择一个卡名，将牌库中所有同名卡放入弃牌堆', options, 'zombie_mall_crawl',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// 它们不收回断来临：从弃牌堆额外打出一个随从
// ============================================================================

/** 它们不断来临 onPlay：从弃牌堆额外打出一个随从 */
function zombieTheyKeepComing(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    const options = minionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        const name = def?.name ?? c.defId;
        const power = def?.power ?? 0;
        return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
    });
    const interaction = createSimpleChoice(
        `zombie_they_keep_coming_${ctx.now}`, ctx.playerId,
        '选择要从弃牌堆额外打出的随从', options, 'zombie_they_keep_coming',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// 泛滥横行 (ongoing)：其他玩家不收回能打随从到此基地 + 回合开始自毁
// ============================================================================

/** 泛滥横行限制：其他玩家不收回能打随从到此基地 */
function zombieOverrunRestriction(ctx: RestrictionCheckContext): boolean {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return false;
    const overrun = base.ongoingActions.find(o => o.defId === 'zombie_overrun');
    if (!overrun) return false;
    // 只限制非拥有�?
    return ctx.playerId !== overrun.ownerId;
}

/** 泛滥横行触发：拥有者回合开始时自毁 */
function zombieOverrunSelfDestruct(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const overrun = base.ongoingActions.find(o => o.defId === 'zombie_overrun');
        if (!overrun) continue;
        if (overrun.ownerId !== ctx.playerId) continue;
        events.push({
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: { cardUid: overrun.uid, defId: overrun.defId, ownerId: overrun.ownerId, reason: 'zombie_overrun_self_destruct' },
            timestamp: ctx.now,
        });
    }
    return events;
}

// ============================================================================
// 它们为你而来 (ongoing)：回合开始时可从弃牌堆打随从到此基地
// ============================================================================

/** 它们为你而来触发：回合开始时从弃牌堆打随从到此基地 */
function zombieTheyreComingTrigger(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.matchState) return [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const ongoing = base.ongoingActions.find(
            o => o.defId === 'zombie_theyre_coming_to_get_you' && o.ownerId === ctx.playerId
        );
        if (!ongoing) continue;
        const player = ctx.state.players[ctx.playerId];
        const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
        if (minionsInDiscard.length === 0) continue;
        const options = minionsInDiscard.map((c, idx) => {
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            const name = def?.name ?? c.defId;
            const power = def?.power ?? 0;
            return { id: `card-${idx}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
        });
        options.push({ id: 'skip', label: '跳过', value: { cardUid: '', defId: '', power: 0 } });
        const interaction = createSimpleChoice(
            `zombie_theyre_coming_${ctx.now}`, ctx.playerId,
            '它们为你而来：选择从弃牌堆打出的随从到此基地', options, 'zombie_theyre_coming_to_get_you',
        );
        const extended = {
            ...interaction,
            data: { ...interaction.data, continuationContext: { baseIndex: i } },
        };
        queueInteraction(ctx.matchState, extended);
        return [];
    }
    return [];
}
// ============================================================================
// 顽强丧尸：回合开始时可从弃牌堆打出（每回合限1次）
// ============================================================================

/** 顽强丧尸触发：回合开始时检查弃牌堆是否有 tenacious_z */
function zombieTenaciousZTrigger(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.matchState) return [];
    const player = ctx.state.players[ctx.playerId];
    if (!player) return [];
    const tenaciousInDiscard = player.discard.filter(c => c.defId === 'zombie_tenacious_z');
    if (tenaciousInDiscard.length === 0) return [];
    const card = tenaciousInDiscard[0];
    const def = getCardDef(card.defId) as MinionCardDef | undefined;
    const name = def?.name ?? card.defId;
    const power = def?.power ?? 0;
    const interaction = createSimpleChoice(
        `zombie_tenacious_z_${ctx.now}`, ctx.playerId,
        '顽强丧尸在弃牌堆，是否作为额外随从打出？',
        [
            { id: 'play', label: `打出 ${name} (力量 ${power})`, value: { cardUid: card.uid, defId: card.defId, power, action: 'play' } },
            { id: 'skip', label: '跳过', value: { action: 'skip' } },
        ],
        'zombie_tenacious_z',
    );
    queueInteraction(ctx.matchState, interaction);
    return [];
}

// ============================================================================
// 交互解决处理函数（InteractionHandler）
// ============================================================================

/** 注册僵尸派系的交互解决处理函数 */
export function registerZombieInteractionHandlers(): void {
    // 掘墓者：选择弃牌堆随从后取回
    registerInteractionHandler('zombie_grave_digger', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid } = value as { cardUid: string };
        return { state, events: [recoverCardsFromDiscard(playerId, [cardUid], 'zombie_grave_digger', timestamp)] };
    });

    // 掘墓：选择弃牌堆卡牌后取回
    registerInteractionHandler('zombie_grave_robbing', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid } = value as { cardUid: string };
        return { state, events: [recoverCardsFromDiscard(playerId, [cardUid], 'zombie_grave_robbing', timestamp)] };
    });

    // 借把手：多选弃牌堆卡牌后洗回牌库
    registerInteractionHandler('zombie_lend_a_hand', (state, playerId, value, _iData, random, timestamp) => {
        const selections = (Array.isArray(value) ? value : [value]) as { cardUid: string }[];
        const selectedUids = new Set(selections.map(s => s.cardUid));
        const player = state.core.players[playerId];
        // 将选中的弃牌堆卡牌与现有牌库合并后洗牌
        const selectedCards = player.discard.filter(c => selectedUids.has(c.uid));
        const combined = [...player.deck, ...selectedCards];
        const shuffled = random.shuffle([...combined]);
        return {
            state,
            events: [{
                type: SU_EVENTS.DECK_RESHUFFLED,
                payload: { playerId, deckUids: shuffled.map(c => c.uid) },
                timestamp,
            } as DeckReshuffledEvent],
        };
    });

    // 子弹不够：选择随从名后取回所有同名
    registerInteractionHandler('zombie_not_enough_bullets', (state, playerId, value, _iData, _random, timestamp) => {
        const { defId } = value as { defId: string };
        const player = state.core.players[playerId];
        const sameNameMinions = player.discard.filter(c => c.type === 'minion' && c.defId === defId);
        if (sameNameMinions.length === 0) return { state, events: [] };
        return { state, events: [recoverCardsFromDiscard(playerId, sameNameMinions.map(c => c.uid), 'zombie_not_enough_bullets', timestamp)] };
    });

    // 行尸：选择弃掉或保留
    registerInteractionHandler('zombie_walker', (state, playerId, value, iData, _random, timestamp) => {
        const { action } = value as { action: 'discard' | 'keep' };
        if (action === 'keep') return { state, events: [] };
        const contCtx = iData?.continuationContext as { cardUid: string } | undefined;
        if (!contCtx?.cardUid) return { state, events: [] };
        return {
            state,
            events: [{
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId, cardUids: [contCtx.cardUid] },
                timestamp,
            } as CardsDiscardedEvent],
        };
    });

    // 进发商场：选择卡名后搜索同名卡放入弃牌堆
    registerInteractionHandler('zombie_mall_crawl', (state, playerId, value, _iData, _random, timestamp) => {
        const { defId } = value as { defId: string };
        const player = state.core.players[playerId];
        const sameNameCards = player.deck.filter(c => c.defId === defId);
        if (sameNameCards.length === 0) return { state, events: [] };
        const uids = sameNameCards.map(c => c.uid);
        return {
            state,
            events: [
                { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId, count: uids.length, cardUids: uids }, timestamp } as CardsDrawnEvent,
                { type: SU_EVENTS.CARDS_DISCARDED, payload: { playerId, cardUids: uids }, timestamp } as CardsDiscardedEvent,
            ],
        };
    });

    // 爆发第一步：选择空基地后 → 选择手牌随从
    registerInteractionHandler('zombie_outbreak_choose_base', (state, playerId, value, _iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const player = state.core.players[playerId];
        const handMinions = player.hand.filter(c => c.type === 'minion');
        if (handMinions.length === 0) return { state, events: [] };
        const options = handMinions.map((c, i) => {
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            const name = def?.name ?? c.defId;
            const power = def?.power ?? 0;
            return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
        });
        const next = createSimpleChoice(
            `zombie_outbreak_minion_${timestamp}`, playerId,
            '爆发：选择要打出的随从', options, 'zombie_outbreak_choose_minion',
        );
        return {
            state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { targetBaseIndex: baseIndex } } }),
            events: [grantExtraMinion(playerId, 'zombie_outbreak', timestamp)],
        };
    });

    // 爆发第二步：选择随从后打出到指定基地
    registerInteractionHandler('zombie_outbreak_choose_minion', (state, playerId, value, iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        const contCtx = iData?.continuationContext as { targetBaseIndex: number };
        if (!contCtx) return undefined;
        return {
            state,
            events: [{
                type: SU_EVENTS.MINION_PLAYED,
                payload: { playerId, cardUid, defId, baseIndex: contCtx.targetBaseIndex, power },
                timestamp,
            } as MinionPlayedEvent],
        };
    });

    // 僵尸领主第一步：选择基地后 → 选择弃牌堆随从
    registerInteractionHandler('zombie_lord_choose_base_first', (state, playerId, value, iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        if (baseIndex === -1) return { state, events: [] }; // 完成
        const contCtx = iData?.continuationContext as { emptyBases: { baseIndex: number; label: string }[]; usedCardUids: string[]; filledBases: number[] };
        const player = state.core.players[playerId];
        const discardMinions = player.discard.filter(c => {
            if (c.type !== 'minion') return false;
            if (contCtx.usedCardUids.includes(c.uid)) return false;
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            return def != null && def.power <= 2;
        });
        if (discardMinions.length === 0) return { state, events: [] };
        const options = discardMinions.map((c, i) => {
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            const name = def?.name ?? c.defId;
            const power = def?.power ?? 0;
            return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
        });
        const next = createSimpleChoice(
            `zombie_lord_minion_${timestamp}`, playerId,
            '选择弃牌堆中力量≤2的随从', options, 'zombie_lord_choose_minion',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { ...contCtx, targetBaseIndex: baseIndex } } }), events: [] };
    });

    // 僵尸领主第二步：选择随从后放置，然后检查是否还有空基地可继续
    registerInteractionHandler('zombie_lord_choose_minion', (state, playerId, value, iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        const contCtx = iData?.continuationContext as { emptyBases: { baseIndex: number; label: string }[]; usedCardUids: string[]; filledBases: number[]; targetBaseIndex: number };
        const events: SmashUpEvent[] = [{
            type: SU_EVENTS.MINION_PLAYED,
            payload: { playerId, cardUid, defId, baseIndex: contCtx.targetBaseIndex, power, fromDiscard: true },
            timestamp,
        } as MinionPlayedEvent];
        // 更新已用列表
        const usedCardUids = [...contCtx.usedCardUids, cardUid];
        const filledBases = [...contCtx.filledBases, contCtx.targetBaseIndex];
        // 检查是否还有空基地和弃牌堆随从
        const remainingBases = contCtx.emptyBases.filter(b => !filledBases.includes(b.baseIndex));
        if (remainingBases.length === 0) return { state, events };
        const player = state.core.players[playerId];
        const remainingMinions = player.discard.filter(c => {
            if (c.type !== 'minion') return false;
            if (usedCardUids.includes(c.uid)) return false;
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            return def != null && def.power <= 2;
        });
        if (remainingMinions.length === 0) return { state, events };
        // 继续选下一个基地
        const baseOptions = buildBaseTargetOptions(remainingBases);
        baseOptions.push({ id: 'done', label: '完成', value: { baseIndex: -1 } } as any);
        const next = createSimpleChoice(
            `zombie_lord_base_${timestamp}`, playerId,
            '僵尸领主：选择下一个空基地（或完成）', baseOptions as any[], 'zombie_lord_choose_base_first',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { emptyBases: contCtx.emptyBases, usedCardUids, filledBases } } }), events };
    });

    // 它们不断来临：选弃牌堆随从后 → 链式选择基地
    registerInteractionHandler('zombie_they_keep_coming', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        // 选择基地
        const candidates: { baseIndex: number; label: string }[] = [];
        for (let i = 0; i < state.core.bases.length; i++) {
            const baseDef = getBaseDef(state.core.bases[i].defId);
            candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
        }
        if (candidates.length === 1) {
            // 只有一个基地直接打出
            return {
                state,
                events: [
                    grantExtraMinion(playerId, 'zombie_they_keep_coming', timestamp),
                    { type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex: candidates[0].baseIndex, power, fromDiscard: true }, timestamp } as MinionPlayedEvent,
                ],
            };
        }
        const next = createSimpleChoice(
            `zombie_they_keep_coming_base_${timestamp}`, playerId,
            '选择要打出随从的基地', buildBaseTargetOptions(candidates), 'zombie_they_keep_coming_choose_base',
        );
        return {
            state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { cardUid, defId, power } } }),
            events: [grantExtraMinion(playerId, 'zombie_they_keep_coming', timestamp)],
        };
    });

    // 它们不断来临：选择基地后打出
    registerInteractionHandler('zombie_they_keep_coming_choose_base', (state, playerId, value, iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const ctx = (iData as any)?.continuationContext as { cardUid: string; defId: string; power: number };
        if (!ctx) return undefined;
        return {
            state,
            events: [{ type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid: ctx.cardUid, defId: ctx.defId, baseIndex, power: ctx.power, fromDiscard: true }, timestamp } as MinionPlayedEvent],
        };
    });

    // 它们为你而来：选弃牌堆随从后打到指定基地
    registerInteractionHandler('zombie_theyre_coming_to_get_you', (state, playerId, value, iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        if (!cardUid) return { state, events: [] };
        const contCtx = iData?.continuationContext as { baseIndex: number } | undefined;
        if (!contCtx) return { state, events: [] };
        return {
            state,
            events: [{
                type: SU_EVENTS.MINION_PLAYED,
                payload: { playerId, cardUid, defId, baseIndex: contCtx.baseIndex, power, fromDiscard: true },
                timestamp,
            } as MinionPlayedEvent],
        };
    });

    // 顽强丧尸：选择打出或跳过
    registerInteractionHandler('zombie_tenacious_z', (state, playerId, value, _iData, _random, timestamp) => {
        const val = value as { action: string; cardUid?: string; defId?: string; power?: number };
        if (val.action === 'skip') return { state, events: [] };
        // 选择基地
        const candidates: { baseIndex: number; label: string }[] = [];
        for (let i = 0; i < state.core.bases.length; i++) {
            const baseDef = getBaseDef(state.core.bases[i].defId);
            candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
        }
        if (candidates.length === 1) {
            return {
                state,
                events: [
                    grantExtraMinion(playerId, 'zombie_tenacious_z', timestamp),
                    { type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid: val.cardUid!, defId: val.defId!, baseIndex: candidates[0].baseIndex, power: val.power!, fromDiscard: true }, timestamp } as MinionPlayedEvent,
                ],
            };
        }
        const next = createSimpleChoice(
            `zombie_tenacious_z_base_${timestamp}`, playerId,
            '选择要打出顽强丧尸的基地', buildBaseTargetOptions(candidates), 'zombie_tenacious_z_choose_base',
        );
        return {
            state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { cardUid: val.cardUid, defId: val.defId, power: val.power } } }),
            events: [grantExtraMinion(playerId, 'zombie_tenacious_z', timestamp)],
        };
    });

    // 顽强丧尸：选择基地后打出
    registerInteractionHandler('zombie_tenacious_z_choose_base', (state, playerId, value, iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const ctx = (iData as any)?.continuationContext as { cardUid: string; defId: string; power: number };
        if (!ctx) return undefined;
        return {
            state,
            events: [{ type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid: ctx.cardUid, defId: ctx.defId, baseIndex, power: ctx.power, fromDiscard: true }, timestamp } as MinionPlayedEvent],
        };
    });
}
