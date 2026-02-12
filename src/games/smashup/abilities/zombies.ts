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
import { recoverCardsFromDiscard, grantExtraMinion, requestChoice, buildBaseTargetOptions } from '../domain/abilityHelpers';
import { registerPromptContinuation } from '../domain/promptContinuation';
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

/** 掘墓�?onPlay：从弃牌堆取回一个随从到手牌 */
function zombieGraveDigger(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    const options = minionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [requestChoice({
            abilityId: 'zombie_grave_digger',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要从弃牌堆取回的随从', options },
        }, ctx.now)],
    };
}

/** 行尸 onPlay：查看牌库顶，选择弃掉或放�?*/
function zombieWalker(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    const def = getCardDef(topCard.defId);
    const cardName = def?.name ?? topCard.defId;
    return {
        events: [requestChoice({
            abilityId: 'zombie_walker',
            playerId: ctx.playerId,
            promptConfig: {
                    title: `牌库顶是�?{cardName}」，选择处理方式`,
                    options: [
                        { id: 'discard', label: '弃掉', value: { action: 'discard' } },
                        { id: 'keep', label: '放回牌库顶顶', value: { action: 'keep' } },
                    ],
                },
                        continuationContext: { cardUid: topCard.uid, },
        }, ctx.now)],
    };
}

/** 掘墓 onPlay：从弃牌堆取回一张卡到手�?*/
function zombieGraveRobbing(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const options = player.discard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: `${name} (${c.type === 'minion' ? '随从' : '行动'})`, value: { cardUid: c.uid } };
    });
    return {
        events: [requestChoice({
            abilityId: 'zombie_grave_robbing',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要从弃牌堆取回的卡牌', options },
        }, ctx.now)],
    };
}

/** 子弹不收回够 onPlay：选择一个效果随从名，取回弃牌堆中所有同名随�?*/
function zombieNotEnoughBullets(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    // �?defId 分组
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
    return {
        events: [requestChoice({
            abilityId: 'zombie_not_enough_bullets',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要取回的随从名（取回所有同名随从）', options },
        }, ctx.now)],
    };
}

/** 借把�?onPlay：将弃牌堆全部洗回牌库（MVP：全部洗回） */
function zombieLendAHand(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const combined = [...player.deck, ...player.discard];
    const shuffled = ctx.random.shuffle([...combined]);
    const evt: DeckReshuffledEvent = {
        type: SU_EVENTS.DECK_RESHUFFLED,
        payload: {
            playerId: ctx.playerId,
            deckUids: shuffled.map(c => c.uid),
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 爆发 onPlay：在没有己方随从的基地额外打出随�?*/
function zombieOutbreak(ctx: AbilityContext): AbilityResult {
    const hasEmptyBase = ctx.state.bases.some(
        base => !base.minions.some(m => m.controller === ctx.playerId)
    );
    if (!hasEmptyBase) return { events: [] };
    return { events: [grantExtraMinion(ctx.playerId, 'zombie_outbreak', ctx.now)] };
}

/** 僵尸领主 onPlay：在没有己方随从的基地从弃牌堆打出力量≤2的随�?*/
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
    // 找弃牌堆中力量≤2的随�?
    const player = ctx.state.players[ctx.playerId];
    const discardMinions = player.discard.filter(c => {
        if (c.type !== 'minion') return false;
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        return def != null && def.power <= 2;
    });
    if (discardMinions.length === 0) return { events: [] };
    const options = discardMinions.map((c, i) => {
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        const name = def?.name ?? c.defId;
        const power = def?.power ?? 0;
        return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
    });
    return {
        events: [requestChoice({
            abilityId: 'zombie_lord_choose_minion',
            playerId: ctx.playerId,
            promptConfig: { title: '选择弃牌堆中力量≤2的随从打出到空基地', options },
                        continuationContext: { emptyBases, remainingSlots: emptyBases.length, },
        }, ctx.now)],
    };
}

/** 进发商场 onPlay：选择一个效果卡名，搜索牌库中所有同名卡放入弃牌�?*/
function zombieMallCrawl(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    // �?defId 分组
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
    return {
        events: [requestChoice({
            abilityId: 'zombie_mall_crawl',
            playerId: ctx.playerId,
            promptConfig: { title: '选择一个效果卡名，将牌库中所有同名卡放入弃牌堆', options },
        }, ctx.now)],
    };
}

// ============================================================================
// 它们不收回断来临：从弃牌堆额外打出一个随�?
// ============================================================================

/** 它们不收回断来临 onPlay：从弃牌堆额外打出一个随�?*/
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
    return {
        events: [requestChoice({
            abilityId: 'zombie_they_keep_coming',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要从弃牌堆额外打出的随从', options },
        }, ctx.now)],
    };
}

// ============================================================================
// 泛滥横行 (ongoing)：其他玩家不收回能打随从到此基地 + 回合开始自�?
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

/** 它们为你而来触发：回合开始时 Prompt 选弃牌堆随从打到此基�?*/
function zombieTheyreComingTrigger(ctx: TriggerContext): SmashUpEvent[] {
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
        // 加一个“跳过”选项
        options.push({ id: 'skip', label: '跳过', value: { cardUid: '', defId: '', power: 0 } });
        return [requestChoice({
            abilityId: 'zombie_theyre_coming_to_get_you',
            playerId: ctx.playerId,
            promptConfig: { title: '它们为你而来：选择从弃牌堆打出的随从到此基地', options },
                        continuationContext: { baseIndex: i, },
        }, ctx.now)];
    }
    return [];
}

// ============================================================================
// 顽强丧尸：回合开始时可从弃牌堆打出（每回合限1次）
// ============================================================================

/** 顽强丧尸触发：回合开始时检查弃牌堆是否�?tenacious_z */
function zombieTenaciousZTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const player = ctx.state.players[ctx.playerId];
    if (!player) return [];
    const tenaciousInDiscard = player.discard.filter(c => c.defId === 'zombie_tenacious_z');
    if (tenaciousInDiscard.length === 0) return [];
    // 只取第一张（每回合限�?次）
    const card = tenaciousInDiscard[0];
    const def = getCardDef(card.defId) as MinionCardDef | undefined;
    const name = def?.name ?? card.defId;
    const power = def?.power ?? 0;
    return [requestChoice({
        abilityId: 'zombie_tenacious_z',
        playerId: ctx.playerId,
        promptConfig: {
                title: `顽强丧尸在弃牌堆，是否作为额外随从打出？`,
                options: [
                    { id: 'play', label: `打出 ${name} (力量 ${power})`, value: { cardUid: card.uid, defId: card.defId, power, action: 'play' } },
                    { id: 'skip', label: '跳过', value: { action: 'skip' } },
                ],
            },
                        continuationContext: {},
    }, ctx.now)];
}


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册僵尸派系�?Prompt 继续函数 */
export function registerZombiePromptContinuations(): void {
    // 掘墓者：选择弃牌堆随从后取回
    registerPromptContinuation('zombie_grave_digger', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [recoverCardsFromDiscard(ctx.playerId, [cardUid], 'zombie_grave_digger', ctx.now)];
    });

    // 掘墓：选择弃牌堆卡牌后取回
    registerPromptContinuation('zombie_grave_robbing', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [recoverCardsFromDiscard(ctx.playerId, [cardUid], 'zombie_grave_robbing', ctx.now)];
    });

    // 子弹不收回够：选择随从名后取回所有同�?
    registerPromptContinuation('zombie_not_enough_bullets', (ctx) => {
        const { defId } = ctx.selectedValue as { defId: string };
        const player = ctx.state.players[ctx.playerId];
        const sameNameMinions = player.discard.filter(c => c.type === 'minion' && c.defId === defId);
        if (sameNameMinions.length === 0) return [];
        return [recoverCardsFromDiscard(ctx.playerId, sameNameMinions.map(c => c.uid), 'zombie_not_enough_bullets', ctx.now)];
    });

    // 行尸：选择弃掉或保�?
    registerPromptContinuation('zombie_walker', (ctx) => {
        const { action } = ctx.selectedValue as { action: 'discard' | 'keep' };
        if (action === 'keep') return [];
        const data = ctx.data as { cardUid: string };
        return [{
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: ctx.playerId, cardUids: [data.cardUid] },
            timestamp: ctx.now,
        } as CardsDiscardedEvent];
    });

    // 进发商场：选择卡名后搜索同名卡放入弃牌�?
    registerPromptContinuation('zombie_mall_crawl', (ctx) => {
        const { defId } = ctx.selectedValue as { defId: string };
        const player = ctx.state.players[ctx.playerId];
        const sameNameCards = player.deck.filter(c => c.defId === defId);
        if (sameNameCards.length === 0) return [];
        const uids = sameNameCards.map(c => c.uid);
        return [
            { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: uids.length, cardUids: uids }, timestamp: ctx.now } as CardsDrawnEvent,
            { type: SU_EVENTS.CARDS_DISCARDED, payload: { playerId: ctx.playerId, cardUids: uids }, timestamp: ctx.now } as CardsDiscardedEvent,
        ];
    });

    // 僵尸领主：选择弃牌堆随从后，选择空基�?
    registerPromptContinuation('zombie_lord_choose_minion', (ctx) => {
        const { cardUid, defId, power } = ctx.selectedValue as { cardUid: string; defId: string; power: number };
        const data = ctx.data as { emptyBases: { baseIndex: number; label: string }[]; remainingSlots: number };
        const emptyBases = data.emptyBases;
        return [requestChoice({
            abilityId: 'zombie_lord_choose_base',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要放置随从的空基地', options: buildBaseTargetOptions(emptyBases) },
                        continuationContext: { cardUid, defId, power, remainingSlots: data.remainingSlots, },
        }, ctx.now)];
    });

    // 僵尸领主：选择基地后放置随�?
    registerPromptContinuation('zombie_lord_choose_base', (ctx) => {
        const { baseIndex } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { cardUid: string; defId: string; power: number; remainingSlots: number };
        return [{
            type: SU_EVENTS.MINION_PLAYED,
            payload: { playerId: ctx.playerId, cardUid: data.cardUid, defId: data.defId, baseIndex, power: data.power, fromDiscard: true },
            timestamp: ctx.now,
        } as MinionPlayedEvent];
    });

    // 它们不收回断来临：选弃牌堆随从后给额外随从额度 + 打出
    registerPromptContinuation('zombie_they_keep_coming', (ctx) => {
        const { cardUid, defId, power } = ctx.selectedValue as { cardUid: string; defId: string; power: number };
        return [
            grantExtraMinion(ctx.playerId, 'zombie_they_keep_coming', ctx.now),
            { type: SU_EVENTS.MINION_PLAYED, payload: { playerId: ctx.playerId, cardUid, defId, baseIndex: 0, power, fromDiscard: true }, timestamp: ctx.now } as MinionPlayedEvent,
        ];
    });

    // 它们为你而来：选弃牌堆随从后打到指定基�?
    registerPromptContinuation('zombie_theyre_coming_to_get_you', (ctx) => {
        const { cardUid, defId, power } = ctx.selectedValue as { cardUid: string; defId: string; power: number };
        if (!cardUid) return []; // 跳过
        const data = ctx.data as { baseIndex: number };
        return [{
            type: SU_EVENTS.MINION_PLAYED,
            payload: { playerId: ctx.playerId, cardUid, defId, baseIndex: data.baseIndex, power, fromDiscard: true },
            timestamp: ctx.now,
        } as MinionPlayedEvent];
    });

    // 顽强丧尸：选择打出或跳�?
    registerPromptContinuation('zombie_tenacious_z', (ctx) => {
        const val = ctx.selectedValue as { action: string; cardUid?: string; defId?: string; power?: number };
        if (val.action === 'skip') return [];
        return [
            grantExtraMinion(ctx.playerId, 'zombie_tenacious_z', ctx.now),
            { type: SU_EVENTS.MINION_PLAYED, payload: { playerId: ctx.playerId, cardUid: val.cardUid!, defId: val.defId!, baseIndex: 0, power: val.power!, fromDiscard: true }, timestamp: ctx.now } as MinionPlayedEvent,
        ];
    });
}
