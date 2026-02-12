/**
 * 大杀四方 - 食人花派系能�?
 *
 * 主题：额外出随从、搜索牌库、力量修�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import {
    grantExtraMinion, destroyMinion,
    requestChoice, buildMinionTargetOptions,
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type {
    PowerCounterRemovedEvent, SmashUpEvent, CardsDrawnEvent,
    DeckReshuffledEvent, MinionCardDef, OngoingDetachedEvent,
} from '../domain/types';
import { registerProtection, registerTrigger } from '../domain/ongoingEffects';
import type { ProtectionCheckContext, TriggerContext } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getMinionDef, getBaseDef } from '../data/cards';

/** 急速生�?onPlay：额外打出一个随�?*/
function killerPlantInstaGrow(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraMinion(ctx.playerId, 'killer_plant_insta_grow', ctx.now)] };
}

/** 野生食人�?onPlay：打出回�?2力量（通过 powerModifier 实现�?*/
function killerPlantWeedEater(ctx: AbilityContext): AbilityResult {
    // 打出时给 -2 力量修正（本回合有效，回合结束时应清除——MVP 先用 powerModifier 实现�?
    const evt: PowerCounterRemovedEvent = {
        type: SU_EVENTS.POWER_COUNTER_REMOVED,
        payload: {
            minionUid: ctx.cardUid,
            baseIndex: ctx.baseIndex,
            amount: 2,
            reason: 'killer_plant_weed_eater',
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

// killer_plant_sleep_spores (ongoing) �?已通过 ongoingModifiers 系统实现力量修正�?1力量�?
// killer_plant_overgrowth (ongoing) �?已通过 ongoingModifiers 系统实现临界点修�?
// killer_plant_entangled (ongoing) �?已通过 ongoingEffects 保护 + 触发系统实现

// ============================================================================
// ongoing 效果检查器
// ============================================================================

/**
 * deep_roots 保护检查：此基地上�?deep_roots 且目标随从属�?deep_roots 拥有者时�?
 * 不收回可被其他玩家移动或返回手牌
 */
function killerPlantDeepRootsChecker(ctx: ProtectionCheckContext): boolean {
    const base = ctx.state.bases[ctx.targetBaseIndex];
    if (!base) return false;
    const deepRoots = base.ongoingActions.find(a => a.defId === 'killer_plant_deep_roots');
    if (!deepRoots) return false;
    // 只保�?deep_roots 拥有者的随从，且只拦截对手的效果
    return deepRoots.ownerId === ctx.targetMinion.controller
        && ctx.sourcePlayerId !== ctx.targetMinion.controller;
}

/**
 * water_lily 触发：回合开始时控制者抽1�?
 */
function killerPlantWaterLilyTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (const base of ctx.state.bases) {
        for (const m of base.minions) {
            if (m.defId !== 'killer_plant_water_lily') continue;
            if (m.controller !== ctx.playerId) continue;
            const player = ctx.state.players[m.controller];
            if (!player || player.deck.length === 0) continue;
            const drawnUid = player.deck[0].uid;
            events.push({
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId: m.controller, count: 1, cardUids: [drawnUid] },
                timestamp: ctx.now,
            } as CardsDrawnEvent);
        }
    }
    return events;
}

/**
 * sprout 触发：控制者回合开始时消灭自身 + Prompt 搜索牌库力量�?随从打出
 */
function killerPlantSproutTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const m of base.minions) {
            if (m.defId !== 'killer_plant_sprout') continue;
            if (m.controller !== ctx.playerId) continue;
            // 消灭自身
            events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'killer_plant_sprout', ctx.now));
            // 搜索牌库中力量≤3的随�?
            const player = ctx.state.players[m.controller];
            if (!player) continue;
            const eligible = player.deck.filter(c => {
                if (c.type !== 'minion') return false;
                const def = getMinionDef(c.defId);
                return def !== undefined && def.power <= 3;
            });
            if (eligible.length === 0) continue;
            if (eligible.length === 1) {
                // 只有一个候选，自动选择
                events.push(
                    { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: m.controller, count: 1, cardUids: [eligible[0].uid] }, timestamp: ctx.now } as CardsDrawnEvent,
                    grantExtraMinion(m.controller, 'killer_plant_sprout', ctx.now),
                    buildDeckReshuffle(player, m.controller, [eligible[0].uid], ctx.now),
                );
            } else {
                // 多个候选，Prompt 选择
                const options = eligible.map((c, idx) => {
                    const def = getMinionDef(c.defId);
                    return { id: `minion-${idx}`, label: `${def?.name ?? c.defId} (力量 ${def?.power ?? '?'})`, value: { cardUid: c.uid, defId: c.defId } };
                });
                events.push(requestChoice({
                    abilityId: 'killer_plant_sprout_search',
                    playerId: m.controller,
                    promptConfig: { title: '幼苗：选择一个效果力量≤3的随从打出到此基地地', options },
                        continuationContext: { baseIndex: i, },
                }, ctx.now));
            }
        }
    }
    return events;
}

/**
 * choking_vines 触发：回合开始时消灭附着�?choking_vines 的随�?
 */
function killerPlantChokingVinesTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const m of base.minions) {
            const attached = m.attachedActions.find(a => a.defId === 'killer_plant_choking_vines');
            if (!attached) continue;
            if (attached.ownerId !== ctx.playerId) continue;
            // 消灭附着的随�?
            events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'killer_plant_choking_vines', ctx.now));
        }
    }
    return events;
}

// ============================================================================
// 新增能力实现
// ============================================================================

/**
 * 金星捕蝇�?talent：搜索牌库打出力量≤2随从到此基地
 */
function killerPlantVenusManTrap(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const eligible = player.deck.filter(c => {
        if (c.type !== 'minion') return false;
        const def = getMinionDef(c.defId);
        return def !== undefined && def.power <= 2;
    });
    if (eligible.length === 0) return { events: [] };
    if (eligible.length === 1) {
        // 只有一个候选，自动选择
        return {
            events: [
                { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: 1, cardUids: [eligible[0].uid] }, timestamp: ctx.now } as CardsDrawnEvent,
                grantExtraMinion(ctx.playerId, 'killer_plant_venus_man_trap', ctx.now),
                buildDeckReshuffle(player, ctx.playerId, [eligible[0].uid], ctx.now),
            ],
        };
    }
    // 多个候选，Prompt 选择
    const options = eligible.map((c, idx) => {
        const def = getMinionDef(c.defId);
        return { id: `minion-${idx}`, label: `${def?.name ?? c.defId} (力量 ${def?.power ?? '?'})`, value: { cardUid: c.uid, defId: c.defId } };
    });
    return {
        events: [requestChoice({
            abilityId: 'killer_plant_venus_man_trap_search',
            playerId: ctx.playerId,
            promptConfig: { title: '维纳斯捕食者：选择一个效果力量≤2的随从打出到此基地地', options },
                        continuationContext: { baseIndex: ctx.baseIndex, },
        }, ctx.now)],
    };
}

/**
 * 出芽生殖 onPlay：选择场上一个随从，搜索牌库同名卡加入手�?
 */
function killerPlantBudding(ctx: AbilityContext): AbilityResult {
    // 收集场上所有随从作为候�?
    const candidates: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            candidates.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} @ ${baseName}` });
        }
    }
    if (candidates.length === 0) return { events: [] };
    // Prompt 选择场上随从
    return {
        events: [requestChoice({
            abilityId: 'killer_plant_budding_choose',
            playerId: ctx.playerId,
            promptConfig: { title: '出芽生殖：选择一个效果场上的随从', options: buildMinionTargetOptions(candidates) },
        }, ctx.now)],
    };
}

/**
 * 绽放 onPlay：额外打�?个随�?
 */
function killerPlantBlossom(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantExtraMinion(ctx.playerId, 'killer_plant_blossom', ctx.now),
            grantExtraMinion(ctx.playerId, 'killer_plant_blossom', ctx.now),
            grantExtraMinion(ctx.playerId, 'killer_plant_blossom', ctx.now),
        ],
    };
}

/** 注册食人花派系所有能�?*/
export function registerKillerPlantAbilities(): void {
    // 急速生长（行动卡）：额外打出一个随�?
    registerAbility('killer_plant_insta_grow', 'onPlay', killerPlantInstaGrow);
    // 野生食人花（随从）：打出回合-2力量
    registerAbility('killer_plant_weed_eater', 'onPlay', killerPlantWeedEater);
    // 金星捕蝇草（talent）：搜索牌库打出力量�?随从
    registerAbility('killer_plant_venus_man_trap', 'talent', killerPlantVenusManTrap);
    // 发芽（行动卡）：搜索牌库打出同名随从
    registerAbility('killer_plant_budding', 'onPlay', killerPlantBudding);
    // 绽放（行动卡）：额外打出3个随�?
    registerAbility('killer_plant_blossom', 'onPlay', killerPlantBlossom);

    // === ongoing 效果注册 ===
    // deep_roots: 保护随从不收回被移动
    registerProtection('killer_plant_deep_roots', 'move', killerPlantDeepRootsChecker);
    // water_lily: 回合开始时控制者抽1�?
    registerTrigger('killer_plant_water_lily', 'onTurnStart', killerPlantWaterLilyTrigger);
    // sprout: 回合开始时消灭自身 + 搜索打出随从
    registerTrigger('killer_plant_sprout', 'onTurnStart', killerPlantSproutTrigger);
    // choking_vines: 回合开始时消灭此基地上力量最低的随从
    registerTrigger('killer_plant_choking_vines', 'onTurnStart', killerPlantChokingVinesTrigger);
    // entangled: 有己方随从的基地上的随从不收回可被移�?
    registerProtection('killer_plant_entangled', 'move', killerPlantEntangledChecker);
    // entangled: 控制者回合开始时消灭本卡
    registerTrigger('killer_plant_entangled', 'onTurnStart', killerPlantEntangledDestroyTrigger);
}

// ============================================================================
// 藤蔓缠绕 ongoing 效果
// ============================================================================

// ============================================================================
// 牌库洗牌辅助
// ============================================================================

/** 构建牌库洗牌事件（排除已抽出的卡牌） */
function buildDeckReshuffle(
    player: { deck: { uid: string }[] },
    playerId: string,
    drawnUids: string[],
    now: number,
): DeckReshuffledEvent {
    const drawnSet = new Set(drawnUids);
    const remaining = player.deck.filter(c => !drawnSet.has(c.uid)).map(c => c.uid);
    return {
        type: SU_EVENTS.DECK_RESHUFFLED,
        payload: { playerId, deckUids: remaining },
        timestamp: now,
    };
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册食人花派�?Prompt 继续函数 */
export function registerKillerPlantPromptContinuations(): void {
    // 金星捕蝇草：搜索牌库力量�?随从
    registerPromptContinuation('killer_plant_venus_man_trap_search', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string; defId: string };
        const player = ctx.state.players[ctx.playerId];
        return [
            { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: 1, cardUids: [cardUid] }, timestamp: ctx.now } as CardsDrawnEvent,
            grantExtraMinion(ctx.playerId, 'killer_plant_venus_man_trap', ctx.now),
            buildDeckReshuffle(player, ctx.playerId, [cardUid], ctx.now),
        ];
    });

    // 幼苗：搜索牌库力量≤3随从
    registerPromptContinuation('killer_plant_sprout_search', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string; defId: string };
        const player = ctx.state.players[ctx.playerId];
        return [
            { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: 1, cardUids: [cardUid] }, timestamp: ctx.now } as CardsDrawnEvent,
            grantExtraMinion(ctx.playerId, 'killer_plant_sprout', ctx.now),
            buildDeckReshuffle(player, ctx.playerId, [cardUid], ctx.now),
        ];
    });

    // 出芽生殖：选择场上随从后搜索牌库同名卡
    registerPromptContinuation('killer_plant_budding_choose', (ctx) => {
        const { minionUid } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        // 找到选中随从�?defId
        let chosenDefId = '';
        for (const base of ctx.state.bases) {
            const found = base.minions.find(m => m.uid === minionUid);
            if (found) { chosenDefId = found.defId; break; }
        }
        if (!chosenDefId) return [];
        // 搜索牌库中同名卡
        const player = ctx.state.players[ctx.playerId];
        const sameNameCard = player.deck.find(c => c.defId === chosenDefId);
        if (!sameNameCard) return [];
        // 加入手牌 + 洗牌�?
        return [
            { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: 1, cardUids: [sameNameCard.uid] }, timestamp: ctx.now } as CardsDrawnEvent,
            buildDeckReshuffle(player, ctx.playerId, [sameNameCard.uid], ctx.now),
        ];
    });
}

// ============================================================================
// 藤蔓缠绕 ongoing 效果
// ============================================================================

/** 藤蔓缠绕保护检查：有己方随从的基地上的所有随从不收回可被移动 */
function killerPlantEntangledChecker(ctx: ProtectionCheckContext): boolean {
    for (const base of ctx.state.bases) {
        const entangled = base.ongoingActions.find(a => a.defId === 'killer_plant_entangled');
        if (!entangled) continue;
        // 检�?entangled 拥有者在目标随从所在基地是否有随从
        const ownerHasMinion = ctx.state.bases[ctx.targetBaseIndex].minions.some(
            m => m.controller === entangled.ownerId
        );
        if (ownerHasMinion) return true;
    }
    return false;
}

/** 藤蔓缠绕触发：控制者回合开始时消灭本卡 */
function killerPlantEntangledDestroyTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const entangled = base.ongoingActions.find(a => a.defId === 'killer_plant_entangled');
        if (!entangled) continue;
        if (entangled.ownerId !== ctx.playerId) continue;
        events.push({
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: {
                cardUid: entangled.uid,
                defId: entangled.defId,
                ownerId: entangled.ownerId,
                reason: 'killer_plant_entangled_self_destruct',
            },
            timestamp: ctx.now,
        } as OngoingDetachedEvent);
    }
    return events;
}
