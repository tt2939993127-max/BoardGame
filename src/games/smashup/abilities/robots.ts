/**
 * 大杀四方 - 机器人派系能力
 *
 * 主题：微型机联动、从牌库打出随从、额外出牌
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { grantExtraMinion, destroyMinion, getMinionPower, setPromptContinuation, buildMinionTargetOptions, buildBaseTargetOptions } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, DeckReshuffledEvent, SmashUpEvent } from '../domain/types';
import type { MinionCardDef } from '../domain/types';
import { drawCards } from '../domain/utils';
import { registerProtection, registerTrigger } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册机器人派系所有能力 */
export function registerRobotAbilities(): void {
    registerAbility('robot_microbot_guard', 'onPlay', robotMicrobotGuard);
    registerAbility('robot_microbot_fixer', 'onPlay', robotMicrobotFixer);
    registerAbility('robot_microbot_reclaimer', 'onPlay', robotMicrobotReclaimer);
    registerAbility('robot_hoverbot', 'onPlay', robotHoverbot);
    // 高速机器人：额外打出力量≤2的随从
    registerAbility('robot_zapbot', 'onPlay', robotZapbot);
    // 技术中心（行动卡）：按基地上随从数抽牌
    registerAbility('robot_tech_center', 'onPlay', robotTechCenter);
    // 核弹机器人 onDestroy：被消灭后消灭同基地其他玩家所有随从
    registerAbility('robot_nukebot', 'onDestroy', robotNukebotOnDestroy);

    // 注册 ongoing 拦截器
    registerRobotOngoingEffects();
}

/** 微型机守护者 onPlay：消灭力量低于己方随从数量的随从 */
function robotMicrobotGuard(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const myMinionCount = base.minions.filter(m => m.controller === ctx.playerId).length + 1;
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) < myMinionCount
    );
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [destroyMinion(targets[0].uid, targets[0].defId, ctx.baseIndex, targets[0].owner, 'robot_microbot_guard', ctx.now)] };
    }
    // 多目标：Prompt 选择
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'robot_microbot_guard',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要消灭的随从（力量低于己方随从数量）', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 微型机修理者 onPlay：如果是本回合第一个随从，额外出牌 */
function robotMicrobotFixer(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.minionsPlayed > 0) return { events: [] };
    return { events: [grantExtraMinion(ctx.playerId, 'robot_microbot_fixer', ctx.now)] };
}

/** 微型机回收者 onPlay：如果是本回合第一个随从，额外出牌；将弃牌堆中的微型机洗回牌库 */
function robotMicrobotReclaimer(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const events: SmashUpEvent[] = [];

    // 第一个随从时给额外出牌
    if (player.minionsPlayed === 0) {
        events.push(grantExtraMinion(ctx.playerId, 'robot_microbot_reclaimer', ctx.now));
    }

    // 将弃牌堆中的微型机（power=1 的机器人随从）洗回牌库
    const microbotDefIds = new Set([
        'robot_microbot_guard', 'robot_microbot_fixer', 'robot_microbot_reclaimer',
        'robot_microbot_archive', 'robot_microbot_alpha',
    ]);
    const microbotsInDiscard = player.discard.filter(
        c => c.type === 'minion' && microbotDefIds.has(c.defId)
    );
    if (microbotsInDiscard.length > 0) {
        // 将微型机从弃牌堆移到牌库并洗牌
        const newDeck = [...player.deck, ...microbotsInDiscard];
        const shuffled = ctx.random.shuffle([...newDeck]);
        const reshuffleEvt: DeckReshuffledEvent = {
            type: SU_EVENTS.DECK_RESHUFFLED,
            payload: {
                playerId: ctx.playerId,
                deckUids: shuffled.map(c => c.uid),
            },
            timestamp: ctx.now,
        };
        events.push(reshuffleEvt);
    }

    return { events };
}

/** 盘旋机器人 onPlay：展示牌库顶，如果是随从可额外打出 */
function robotHoverbot(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    if (topCard.type === 'minion') {
        return { events: [grantExtraMinion(ctx.playerId, 'robot_hoverbot', ctx.now)] };
    }
    return { events: [] };
}

/** 高速机器人 onPlay：额外打出力量≤2的随从 */
function robotZapbot(ctx: AbilityContext): AbilityResult {
    // MVP：直接给额外随从额度（实际应限制力量≤2，需要 Prompt 配合）
    return { events: [grantExtraMinion(ctx.playerId, 'robot_zapbot', ctx.now)] };
}

/** 技术中心 onPlay：选择一个基地，该基地上你每有一个随从就抽一张牌 */
function robotTechCenter(ctx: AbilityContext): AbilityResult {
    // 收集有己方随从的基地
    const candidates: { baseIndex: number; count: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const count = ctx.state.bases[i].minions.filter(m => m.controller === ctx.playerId).length;
        if (count > 0) {
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            candidates.push({ baseIndex: i, count, label: `${baseName} (${count} 个随从)` });
        }
    }
    if (candidates.length === 0) return { events: [] };
    // 单基地自动选择
    if (candidates.length === 1) {
        return drawForBase(ctx, candidates[0].baseIndex, candidates[0].count);
    }
    // 多基地：Prompt 选择
    return {
        events: [setPromptContinuation({
            abilityId: 'robot_tech_center',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择一个基地（按该基地上你的随从数抽牌）', options: buildBaseTargetOptions(candidates) } },
        }, ctx.now)],
    };
}

/** 技术中心辅助：按基地上己方随从数抽牌 */
function drawForBase(ctx: AbilityContext, baseIndex: number, count: number): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const { drawnUids } = drawCards(player, count, ctx.random);
    if (drawnUids.length === 0) return { events: [] };
    const evt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 核弹机器人 onDestroy：被消灭后消灭同基地其他玩家所有随从 */
function robotNukebotOnDestroy(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    // 消灭同基地上不属于自己的所有随从
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && m.controller !== ctx.playerId
    );
    if (targets.length === 0) return { events: [] };
    return {
        events: targets.map(t =>
            destroyMinion(t.uid, t.defId, ctx.baseIndex, t.owner, 'robot_nukebot', ctx.now)
        ),
    };
}

// robot_microbot_alpha (ongoing) - 已通过 ongoingModifiers 系统实现力量修正

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册机器人派系的 Prompt 继续函数 */
export function registerRobotPromptContinuations(): void {
    // 微型机守护者：选择目标后消灭
    registerPromptContinuation('robot_microbot_guard', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'robot_microbot_guard', ctx.now)];
    });

    // 技术中心：选择基地后按随从数抽牌
    registerPromptContinuation('robot_tech_center', (ctx) => {
        const { baseIndex } = ctx.selectedValue as { baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const count = base.minions.filter(m => m.controller === ctx.playerId).length;
        if (count === 0) return [];
        const player = ctx.state.players[ctx.playerId];
        if (!player || player.deck.length === 0) return [];
        const actualDraw = Math.min(count, player.deck.length);
        const drawnUids = player.deck.slice(0, actualDraw).map(c => c.uid);
        return [{
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: actualDraw, cardUids: drawnUids },
            timestamp: ctx.now,
        }];
    });
}


// ============================================================================
// Ongoing 拦截器注册
// ============================================================================

/** 注册机器人派系的 ongoing 拦截器 */
function registerRobotOngoingEffects(): void {
    // 战争机器人：不能被消灭
    registerProtection('robot_warbot', 'destroy', (ctx) => {
        return ctx.targetMinion.defId === 'robot_warbot';
    });

    // 微型机档案馆：微型机被消灭后控制者抽1张牌
    registerTrigger('robot_microbot_archive', 'onMinionDestroyed', (trigCtx) => {
        if (!trigCtx.triggerMinionDefId) return [];
        // 检查被消灭的是否是微型机（力量1的机器人随从）
        const microbotDefIds = new Set([
            'robot_microbot_guard', 'robot_microbot_fixer', 'robot_microbot_reclaimer',
            'robot_microbot_archive', 'robot_microbot_alpha',
        ]);
        if (!microbotDefIds.has(trigCtx.triggerMinionDefId)) return [];

        // 找到 microbot_archive 的拥有者
        let archiveOwner: string | undefined;
        for (const base of trigCtx.state.bases) {
            const archive = base.minions.find(m => m.defId === 'robot_microbot_archive');
            if (archive) {
                archiveOwner = archive.controller;
                break;
            }
        }
        if (!archiveOwner) return [];

        // 抽1张牌
        const player = trigCtx.state.players[archiveOwner];
        if (!player || player.deck.length === 0) return [];
        const { drawnUids } = drawCards(player, 1, trigCtx.random);
        if (drawnUids.length === 0) return [];

        return [{
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: archiveOwner, count: 1, cardUids: drawnUids },
            timestamp: trigCtx.now,
        }];
    });
}
