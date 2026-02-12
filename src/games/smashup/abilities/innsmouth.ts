/**
 * 大杀四方 - 印斯茅斯派系能力
 *
 * 主题：同名随从联动、数量优�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { addPowerCounter, grantExtraMinion, drawMadnessCards, getMinionPower, requestChoice } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, DeckReshuffledEvent, CardsDrawnEvent, MinionReturnedEvent } from '../domain/types';
import { registerProtection } from '../domain/ongoingEffects';
import type { ProtectionCheckContext } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';

/** 注册印斯茅斯派系所有能�?*/
export function registerInnsmouthAbilities(): void {
    // 深潜者（行动卡）：力量≤2的己方随从各+1力量
    registerAbility('innsmouth_the_deep_ones', 'onPlay', innsmouthTheDeepOnes);
    // 新人（行动卡）：所有玩家将弃牌堆随从洗回牌�?
    registerAbility('innsmouth_new_acolytes', 'onPlay', innsmouthNewAcolytes);
    // 招募（行动卡）：抽最�?张疯狂卡，每�?= 额外打出1个随�?
    registerAbility('innsmouth_recruitment', 'onPlay', innsmouthRecruitment);
    // 本地人（随从 onPlay）：展示牌库�?张，同名卡放手牌，其余放牌库�?
    registerAbility('innsmouth_the_locals', 'onPlay', innsmouthTheLocals);
    // 回归大海（special）：计分后同名随从回手牌
    registerAbility('innsmouth_return_to_the_sea', 'special', innsmouthReturnToTheSea);
    // 深潜者的秘密（行动卡）：3+同名随从时抽牌，可选额外抽�?疯狂�?
    registerAbility('innsmouth_mysteries_of_the_deep', 'onPlay', innsmouthMysteriesOfTheDeep);
    // 宗教圆环（ongoing talent）：额外打出同名随从到此基地
    registerAbility('innsmouth_sacred_circle', 'talent', innsmouthSacredCircle);
    // 散播谣言（行动卡）：额外打出至多2个与场中同名的随�?
    registerAbility('innsmouth_spreading_the_word', 'onPlay', innsmouthSpreadingTheWord);

    // === ongoing 效果注册 ===
    // in_plain_sight: 力量�?随从不收回受其他玩家影响
    registerProtection('innsmouth_in_plain_sight', 'affect', innsmouthInPlainSightChecker);
}

/** 深潜�?onPlay：每个你的力量≤2的随从获�?1力量 */
function innsmouthTheDeepOnes(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const m of base.minions) {
            if (m.controller === ctx.playerId && getMinionPower(ctx.state, m, i) <= 2) {
                events.push(addPowerCounter(m.uid, i, 1, 'innsmouth_the_deep_ones', ctx.now));
            }
        }
    }
    return { events };
}

/** 新人 onPlay：所有玩家将弃牌堆中的所有随从洗回牌�?*/
function innsmouthNewAcolytes(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        const player = ctx.state.players[pid];
        const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
        if (minionsInDiscard.length === 0) continue;
        // 合并牌库 + 弃牌堆随从，洗牌
        const newDeckCards = [...player.deck, ...minionsInDiscard];
        const shuffled = ctx.random.shuffle([...newDeckCards]);
        const evt: DeckReshuffledEvent = {
            type: SU_EVENTS.DECK_RESHUFFLED,
            payload: {
                playerId: pid,
                deckUids: shuffled.map(c => c.uid),
            },
            timestamp: ctx.now,
        };
        events.push(evt);
    }
    return { events };
}

/** 招募 onPlay：抽最�?张疯狂卡，每张成功抽�?= 额外打出1个随从（MVP：尽量抽�?张） */
function innsmouthRecruitment(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    // 尝试�?张疯狂卡
    const madnessEvt = drawMadnessCards(ctx.playerId, 3, ctx.state, 'innsmouth_recruitment', ctx.now);
    if (madnessEvt) {
        events.push(madnessEvt);
        // 每张成功抽取的疯狂卡 = 1个额外随�?
        const actualDrawn = madnessEvt.payload.cardUids.length;
        for (let i = 0; i < actualDrawn; i++) {
            events.push(grantExtraMinion(ctx.playerId, 'innsmouth_recruitment', ctx.now));
        }
    }
    return { events };
}

// innsmouth_in_plain_sight (ongoing) - 通过 ongoing 效果系统实现（注册在 registerInnsmouthAbilities 中）

// ============================================================================
// ongoing 效果检查器
// ============================================================================

/**
 * in_plain_sight 保护检查：力量�?的己方随从不收回受其他玩家影�?
 */
function innsmouthInPlainSightChecker(ctx: ProtectionCheckContext): boolean {
    const base = ctx.state.bases[ctx.targetBaseIndex];
    if (!base) return false;
    // 检查基地上是否�?in_plain_sight ongoing 行动�?
    const sight = base.ongoingActions.find(o => o.defId === 'innsmouth_in_plain_sight');
    if (!sight) return false;
    // 只保�?sight 拥有者的随从
    if (ctx.targetMinion.controller !== sight.ownerId) return false;
    // 只保护力量≤2的随�?
    const power = getMinionPower(ctx.state, ctx.targetMinion, ctx.targetBaseIndex);
    return power <= 2 && ctx.sourcePlayerId !== sight.ownerId;
}

/**
 * 回归大海 special：计分后同名随从回手�?
 * MVP：将自己在被计分基地上的所有同 defId 随从回手�?
 */
function innsmouthReturnToTheSea(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };

    const events: SmashUpEvent[] = [];
    // 找同基地上自己的�?defId 随从
    const myMinions = base.minions.filter(
        m => m.controller === ctx.playerId && m.uid !== ctx.cardUid
    );
    // 找与触发随从�?defId 的随�?
    const triggerMinion = base.minions.find(m => m.uid === ctx.cardUid);
    if (!triggerMinion) return { events: [] };

    const sameDefMinions = myMinions.filter(m => m.defId === triggerMinion.defId);
    for (const m of sameDefMinions) {
        events.push({
            type: SU_EVENTS.MINION_RETURNED,
            payload: {
                minionUid: m.uid,
                minionDefId: m.defId,
                fromBaseIndex: ctx.baseIndex,
                toPlayerId: m.owner,
                reason: 'innsmouth_return_to_the_sea',
            },
            timestamp: ctx.now,
        } as MinionReturnedEvent);
    }
    return { events };
}

/**
 * 本地�?onPlay：展示牌库顶3张，将其中的"本地�?（同 defId）放入手牌，其余放牌库底
 */
function innsmouthTheLocals(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };

    const events: SmashUpEvent[] = [];
    const topCards = player.deck.slice(0, 3);
    const locals = topCards.filter(c => c.defId === 'innsmouth_the_locals');
    const others = topCards.filter(c => c.defId !== 'innsmouth_the_locals');

    // 同名卡放入手�?
    if (locals.length > 0) {
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: locals.length, cardUids: locals.map(c => c.uid) },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 其余放牌库底
    if (others.length > 0) {
        const processedUids = new Set(topCards.map(c => c.uid));
        const remainingDeck = player.deck.filter(c => !processedUids.has(c.uid));
        const newDeckUids = [...remainingDeck.map(c => c.uid), ...others.map(c => c.uid)];
        const reshuffleEvt: DeckReshuffledEvent = {
            type: SU_EVENTS.DECK_RESHUFFLED,
            payload: { playerId: ctx.playerId, deckUids: newDeckUids },
            timestamp: ctx.now,
        };
        events.push(reshuffleEvt);
    }

    return { events };
}

// ============================================================================
// 新增能力实现
// ============================================================================

/**
 * 深潜者的秘密 onPlay：如果你在一个基地有3+同名随从，抽3张牌�?
 * 之后可选额外抽2张牌�?张疯狂卡�?
 */
function innsmouthMysteriesOfTheDeep(ctx: AbilityContext): AbilityResult {
    // 检查是否有基地上有3+同名己方随从
    let hasTriple = false;
    for (const base of ctx.state.bases) {
        const myMinions = base.minions.filter(m => m.controller === ctx.playerId);
        const nameCount: Record<string, number> = {};
        for (const m of myMinions) {
            nameCount[m.defId] = (nameCount[m.defId] || 0) + 1;
        }
        if (Object.values(nameCount).some(c => c >= 3)) {
            hasTriple = true;
            break;
        }
    }
    if (!hasTriple) return { events: [] };

    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];

    // �?张牌
    const topThree = player.deck.slice(0, 3);
    if (topThree.length > 0) {
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: topThree.length, cardUids: topThree.map(c => c.uid) },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 提示：是否额外抽2张牌+2张疯狂卡
    const options = [
        { id: 'yes', label: '是 - 额外抽2张牌+2张疯狂卡', value: { accept: true } },
        { id: 'no', label: '否 - 不收回额外抽牌', value: { accept: false } },
    ];
    events.push(requestChoice({
        abilityId: 'innsmouth_mysteries_of_the_deep',
        playerId: ctx.playerId,
        promptConfig: { title: '是否额外抽2张牌+2张疯狂卡？', options },
    }, ctx.now));

    return { events };
}

/**
 * 宗教圆环 talent：额外打出一个与此基地上随从同名的随从到这里
 * MVP：检查手牌是否有匹配随从，如有则授予1个额外随从额�?
 */
function innsmouthSacredCircle(ctx: AbilityContext): AbilityResult {
    // 找到 sacred_circle 所在基�?
    let sacredBaseIndex = -1;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (ctx.state.bases[i].ongoingActions.some(o => o.uid === ctx.cardUid)) {
            sacredBaseIndex = i;
            break;
        }
    }
    if (sacredBaseIndex === -1) return { events: [] };

    const base = ctx.state.bases[sacredBaseIndex];
    const minionDefIds = new Set(base.minions.map(m => m.defId));
    if (minionDefIds.size === 0) return { events: [] };

    // 检查手牌是否有同名随从
    const player = ctx.state.players[ctx.playerId];
    const hasMatch = player.hand.some(c => c.type === 'minion' && minionDefIds.has(c.defId));
    if (!hasMatch) return { events: [] };

    return { events: [grantExtraMinion(ctx.playerId, 'innsmouth_sacred_circle', ctx.now)] };
}

/**
 * 散播谣言 onPlay：额外打出至�?个与场中一个随从同名的随从
 * MVP：检查手牌是否有匹配随从，授予最�?个额外随从额�?
 */
function innsmouthSpreadingTheWord(ctx: AbilityContext): AbilityResult {
    // 收集所有在场随从的 defId
    const inPlayDefIds = new Set<string>();
    for (const base of ctx.state.bases) {
        for (const m of base.minions) {
            inPlayDefIds.add(m.defId);
        }
    }
    if (inPlayDefIds.size === 0) return { events: [] };

    // 检查手牌中匹配的随从数�?
    const player = ctx.state.players[ctx.playerId];
    const matchCount = player.hand.filter(c => c.type === 'minion' && inPlayDefIds.has(c.defId)).length;
    if (matchCount === 0) return { events: [] };

    const grantCount = Math.min(2, matchCount);
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < grantCount; i++) {
        events.push(grantExtraMinion(ctx.playerId, 'innsmouth_spreading_the_word', ctx.now));
    }
    return { events };
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册印斯茅斯派系�?Prompt 继续函数 */
export function registerInnsmouthPromptContinuations(): void {
    // 深潜者的秘密：选择是否额外�?张牌+2张疯狂卡
    registerPromptContinuation('innsmouth_mysteries_of_the_deep', (ctx) => {
        const { accept } = ctx.selectedValue as { accept: boolean };
        if (!accept) return [];
        const events: SmashUpEvent[] = [];
        // 额外�?张牌
        const player = ctx.state.players[ctx.playerId];
        const topTwo = player.deck.slice(0, 2);
        if (topTwo.length > 0) {
            events.push({
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId: ctx.playerId, count: topTwo.length, cardUids: topTwo.map(c => c.uid) },
                timestamp: ctx.now,
            } as CardsDrawnEvent);
        }
        // �?张疯狂卡
        const madnessEvt = drawMadnessCards(ctx.playerId, 2, ctx.state, 'innsmouth_mysteries_of_the_deep', ctx.now);
        if (madnessEvt) events.push(madnessEvt);
        return events;
    });
}
