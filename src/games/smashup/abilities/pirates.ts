/**
 * 大杀四方 - 海盗派系能力
 *
 * 主题：移动随从、消灭低力量随从
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, addPowerCounter, moveMinion, getMinionPower, requestChoice, buildMinionTargetOptions, buildBaseTargetOptions } from '../domain/abilityHelpers';
import type { SmashUpEvent, MinionCardDef, SmashUpCore, MinionDestroyedEvent } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';
import { registerTrigger, registerInterceptor } from '../domain/ongoingEffects';
import type { TriggerContext } from '../domain/ongoingEffects';

/** 注册海盗派系所有能�?*/
export function registerPirateAbilities(): void {
    registerAbility('pirate_saucy_wench', 'onPlay', pirateSaucyWench);
    registerAbility('pirate_broadside', 'onPlay', pirateBroadside);
    registerAbility('pirate_cannon', 'onPlay', pirateCannon);
    registerAbility('pirate_swashbuckling', 'onPlay', pirateSwashbuckling);
    // 炸药桶：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从
    registerAbility('pirate_powderkeg', 'onPlay', piratePowderkeg);
    // 小艇（行动卡）：移动至多两个己方随从到其他基�?
    registerAbility('pirate_dinghy', 'onPlay', pirateDinghy);
    // 全速航行（特殊行动卡）：移动己方任意数量随从到其他基地
    registerAbility('pirate_full_sail', 'onPlay', pirateFullSail);
    // 上海（行动卡）：移动一个对手随从到另一个基�?
    registerAbility('pirate_shanghai', 'onPlay', pirateShanghai);
    // 海狗（行动卡）：移动一个随从到另一个基�?
    registerAbility('pirate_sea_dogs', 'onPlay', pirateSeaDogs);

    // === ongoing 效果注册 ===
    // 海盗王：基地计分前移动到该基�?
    registerTrigger('pirate_king', 'beforeScoring', pirateKingBeforeScoring);
    // 副官：基地计分后移动到其他基地（而非弃牌堆）
    registerTrigger('pirate_first_mate', 'afterScoring', pirateFirstMateAfterScoring);
    // 海盗（海盗）：被消灭时移动到其他基地而非进入弃牌�?
    registerInterceptor('pirate_buccaneer', buccaneerDestroyInterceptor);
}

/** 粗鲁少妇 onPlay：消灭本基地一个力量≤2的随�?*/
function pirateSaucyWench(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 2
    );
    if (targets.length === 0) return { events: [] };
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [requestChoice({ abilityId: 'pirate_saucy_wench', playerId: ctx.playerId, promptConfig: { title: '选择要消灭的力量≤2的随从', options: buildMinionTargetOptions(options) } }, ctx.now)],
    };
}

/** 侧翼开�?onPlay：选择一个效果对�?一个你有随从的基地，消灭该对手在该基地所有力量≤2的随�?*/
function pirateBroadside(ctx: AbilityContext): AbilityResult {
    // 收集所有可能的 (基地, 对手) 组合
    const candidates: { baseIndex: number; opponentId: string; count: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        if (!base.minions.some(m => m.controller === ctx.playerId)) continue;
        const opponentCounts = new Map<string, number>();
        for (const m of base.minions) {
            if (m.controller !== ctx.playerId && getMinionPower(ctx.state, m, i) <= 2) {
                opponentCounts.set(m.controller, (opponentCounts.get(m.controller) || 0) + 1);
            }
        }
        const baseDef = getBaseDef(base.defId);
        const baseName = baseDef?.name ?? `基地 ${i + 1}`;
        for (const [pid, count] of opponentCounts) {
            candidates.push({ baseIndex: i, opponentId: pid, count, label: `${baseName} �?对手 ${pid}�?{count}个弱随从）` });
        }
    }
    if (candidates.length === 0) return { events: [] };
    const options = candidates.map((c, i) => ({ id: `target-${i}`, label: c.label, value: { baseIndex: c.baseIndex, opponentId: c.opponentId } }));
    return {
        events: [requestChoice({
            abilityId: 'pirate_broadside',
            playerId: ctx.playerId,
            promptConfig: { title: '选择基地和对手，消灭该对手所有力量≤2的随从', options },
        }, ctx.now)],
    };
}

/** 加农炮 onPlay：消灭至多两个力量≤2的随从 */
function pirateCannon(ctx: AbilityContext): AbilityResult {
    // 收集所有力量≤2的随�?
    const allTargets: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (getMinionPower(ctx.state, m, i) <= 2) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                const power = getMinionPower(ctx.state, m, i);
                allTargets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
            }
        }
    }
    if (allTargets.length === 0) return { events: [] };
    // Prompt 选择第一�?
    const options = allTargets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [requestChoice({
            abilityId: 'pirate_cannon_choose_first',
            playerId: ctx.playerId,
            promptConfig: { title: '选择第一个要消灭的力量≤2的随从（至多2个）', options: buildMinionTargetOptions(options) },
                        continuationContext: { allTargetUids: allTargets.map(t => t.uid), },
        }, ctx.now)],
    };
}

/** 虚张声势 onPlay：你的每个随�?1力量直到回合结束 */
function pirateSwashbuckling(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const m of base.minions) {
            if (m.controller === ctx.playerId) {
                events.push(addPowerCounter(m.uid, i, 1, 'pirate_swashbuckling', ctx.now));
            }
        }
    }

    return { events };
}

/** 全速航�?onPlay：移动己方任意数量随从到其他基地（多�?Prompt 循环�?*/
function pirateFullSail(ctx: AbilityContext): AbilityResult {
    return { events: buildFullSailChooseMinionPrompt(ctx.state, ctx.playerId, ctx.now, []) };
}

/** 构建 full_sail "选择随从" Prompt，movedUids 为已移动的随�?uid 列表 */
function buildFullSailChooseMinionPrompt(
    state: SmashUpCore,
    playerId: string,
    now: number,
    movedUids: string[],
): SmashUpEvent[] {
    const myMinions: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
    for (let i = 0; i < state.bases.length; i++) {
        for (const m of state.bases[i].minions) {
            if (m.controller === playerId && !movedUids.includes(m.uid)) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                const power = getMinionPower(state, m, i);
                myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} (力量 ${power}) @ ${baseName}` });
            }
        }
    }
    if (myMinions.length === 0) return [];
    // 构建选项：随从列�?+ "完成" 选项
    const options = [
        ...buildMinionTargetOptions(myMinions),
        { id: 'done', label: '完成移动', value: { done: true } },
    ];
    return [requestChoice({
        abilityId: 'pirate_full_sail_choose_minion',
        playerId,
        promptConfig: { title: '选择要移动的己方随从（或完成）', options },
                        continuationContext: { movedUids, },
    }, now)];
}

// TODO: pirate_full_sail special 时机（基地计分前打出�?
// 规则：Full Sail �?special 行动卡，应在基地计分前（beforeScoring）打出�?
// 当前实现�?onPlay（手动打出），需�?beforeScoring 阶段�?special action 机制支持�?
// 清理触发条件：当 special action 机制（允许在 beforeScoring 阶段从手牌打�?special 卡）实现后回填�?

// ============================================================================
// 事件拦截器（替代效果�?
// ============================================================================

/**
 * 海盗 (Buccaneer) 替代效果：被消灭时移动到其他基地
 *
 * MVP：自动选择第一个可用的其他基地。无其他基地时正常消灭�?
 */
function buccaneerDestroyInterceptor(
    state: SmashUpCore,
    event: SmashUpEvent
): SmashUpEvent | undefined {
    if (event.type !== SU_EVENTS.MINION_DESTROYED) return undefined;
    const { minionUid, minionDefId, fromBaseIndex } = (event as MinionDestroyedEvent).payload;
    if (minionDefId !== 'pirate_buccaneer') return undefined;

    // 找到第一个可用的其他基地
    for (let i = 0; i < state.bases.length; i++) {
        if (i === fromBaseIndex) continue;
        return moveMinion(minionUid, minionDefId, fromBaseIndex, i, 'pirate_buccaneer', event.timestamp);
    }
    // 无其他基地可移，不收回拦截（正常消灭�?
    return undefined;
}

// ============================================================================
// ongoing 效果触发�?
// ============================================================================

/** 海盗�?beforeScoring：自动移动到即将计分的基地（MVP：自动执行，不收回询问） */
function pirateKingBeforeScoring(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    const scoringBaseIndex = ctx.baseIndex;
    if (scoringBaseIndex === undefined) return events;

    // 遍历所有基地，找到不收回在计分基地上的 pirate_king 并移过去
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (i === scoringBaseIndex) continue;
        for (const m of ctx.state.bases[i].minions) {
            if (m.defId === 'pirate_king') {
                events.push(moveMinion(m.uid, m.defId, i, scoringBaseIndex, 'pirate_king', ctx.now));
            }
        }
    }
    return events;
}

/** 海盗副官 afterScoring：移动到其他基地而非进入弃牌堆（MVP：自动选第一个其他基地） */
function pirateFirstMateAfterScoring(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    const scoringBaseIndex = ctx.baseIndex;
    if (scoringBaseIndex === undefined) return events;

    const base = ctx.state.bases[scoringBaseIndex];
    if (!base) return events;

    for (const m of base.minions) {
        if (m.defId !== 'pirate_first_mate') continue;
        // 选择第一个可用的其他基地
        for (let i = 0; i < ctx.state.bases.length; i++) {
            if (i === scoringBaseIndex) continue;
            events.push(moveMinion(m.uid, m.defId, scoringBaseIndex, i, 'pirate_first_mate', ctx.now));
            break;
        }
    }
    return events;
}

/** 小艇 onPlay：移动至多两个己方随从到其他基地 */
function pirateDinghy(ctx: AbilityContext): AbilityResult {
    // 收集所有己方随�?
    const myMinions: { uid: string; defId: string; baseIndex: number; power: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) {
                const power = getMinionPower(ctx.state, m, i);
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, power, label: `${name} (力量 ${power}) @ ${baseName}` });
            }
        }
    }
    if (myMinions.length === 0) return { events: [] };
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    // 第一步：选择第一个随�?
    return {
        events: [requestChoice({
            abilityId: 'pirate_dinghy_choose_first',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要移动的己方随从（至多2个，第1个）', options: buildMinionTargetOptions(options) },
                        continuationContext: { remaining: 2, },
        }, ctx.now)],
    };
}

/** 上海 onPlay：移动一个对手随从到另一个基�?*/
function pirateShanghai(ctx: AbilityContext): AbilityResult {
    // 收集所有对手随�?
    const targets: { uid: string; defId: string; baseIndex: number; power: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, power, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (targets.length === 0) return { events: [] };
    // Prompt 选择目标随从
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [requestChoice({
            abilityId: 'pirate_shanghai_choose_minion',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要移动的对手随从', options: buildMinionTargetOptions(options) },
        }, ctx.now)],
    };
}

/** 海狗 onPlay：移动一个随从到另一个基�?*/
function pirateSeaDogs(ctx: AbilityContext): AbilityResult {
    // 收集所有随从（任意玩家�?
    const targets: { uid: string; defId: string; baseIndex: number; power: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, power, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (targets.length === 0) return { events: [] };
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [requestChoice({
            abilityId: 'pirate_sea_dogs_choose_minion',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要移动的随从', options: buildMinionTargetOptions(options) },
        }, ctx.now)],
    };
}

/** 炸药�?onPlay：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从 */
function piratePowderkeg(ctx: AbilityContext): AbilityResult {
    // 收集所有己方随�?
    const myMinions: { uid: string; defId: string; power: number; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            myMinions.push({ uid: m.uid, defId: m.defId, power, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (myMinions.length === 0) return { events: [] };
    // Prompt 选择牺牲哪个
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    return {
        events: [requestChoice({
            abilityId: 'pirate_powderkeg',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要牺牲的己方随从（同基地力量≤它的随从也会被消灭）', options: buildMinionTargetOptions(options) },
        }, ctx.now)],
    };
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 移动随从到目标基地的通用辅助：选择目标基地 */
function buildMoveToBasePrompt(
    state: SmashUpCore,
    minionUid: string,
    minionDefId: string,
    fromBaseIndex: number,
    abilityId: string,
    playerId: string,
    now: number,
    extraData?: Record<string, unknown>,
): SmashUpEvent[] {
    const candidates: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < state.bases.length; i++) {
        if (i === fromBaseIndex) continue;
        const baseDef = getBaseDef(state.bases[i].defId);
        candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
    }
    if (candidates.length === 0) return [];
    return [requestChoice({
        abilityId: `${abilityId}_choose_base`,
        playerId,
        promptConfig: { title: '选择目标基地', options: buildBaseTargetOptions(candidates) },
                        continuationContext: { ...extraData,
            minionUid, minionDefId, fromBaseIndex, },
    }, now)];
}

/** 注册海盗派系�?Prompt 继续函数 */
export function registerPiratePromptContinuations(): void {
    // 粗鲁少妇：选择目标后消�?
    registerPromptContinuation('pirate_saucy_wench', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'pirate_saucy_wench', ctx.now)];
    });

    // 加农炮第一步：选择第一个目标后消灭，然后检查是否还有第二个目标
    registerPromptContinuation('pirate_cannon_choose_first', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        const events: SmashUpEvent[] = [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'pirate_cannon', ctx.now)];
        // 检查剩余力量≤2的随从（排除刚消灭的�?
        const remaining: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.uid === minionUid) continue;
                if (getMinionPower(ctx.state, m, i) <= 2) {
                    const def = getCardDef(m.defId) as MinionCardDef | undefined;
                    const name = def?.name ?? m.defId;
                    const baseDef = getBaseDef(ctx.state.bases[i].defId);
                    const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                    const power = getMinionPower(ctx.state, m, i);
                    remaining.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} (力量 ${power}) @ ${baseName}` });
                }
            }
        }
        if (remaining.length === 0) return events;
        // Prompt 选择第二个（可选）
        events.push(requestChoice({
            abilityId: 'pirate_cannon_choose_second',
            playerId: ctx.playerId,
            promptConfig: { title: '选择第二个要消灭的力量≤2的随从（可选）', options: buildMinionTargetOptions(remaining) },
        }, ctx.now));
        return events;
    });

    // 加农炮第二步：选择第二个目标后消灭
    registerPromptContinuation('pirate_cannon_choose_second', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'pirate_cannon', ctx.now)];
    });

    // 上海：选择随从后，选择目标基地
    registerPromptContinuation('pirate_shanghai_choose_minion', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        return buildMoveToBasePrompt(ctx.state, minionUid, minion.defId, baseIndex, 'pirate_shanghai', ctx.playerId, ctx.now);
    });

    // 上海：选择基地后移�?
    registerPromptContinuation('pirate_shanghai_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        return [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_shanghai', ctx.now)];
    });

    // 海狗：选择随从后，选择目标基地
    registerPromptContinuation('pirate_sea_dogs_choose_minion', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        return buildMoveToBasePrompt(ctx.state, minionUid, minion.defId, baseIndex, 'pirate_sea_dogs', ctx.playerId, ctx.now);
    });

    // 海狗：选择基地后移�?
    registerPromptContinuation('pirate_sea_dogs_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        return [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_sea_dogs', ctx.now)];
    });

    // 侧翼开炮：选择基地+对手后执�?
    registerPromptContinuation('pirate_broadside', (ctx) => {
        const { baseIndex, opponentId } = ctx.selectedValue as { baseIndex: number; opponentId: string };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const events: SmashUpEvent[] = [];
        for (const m of base.minions) {
            if (m.controller === opponentId && getMinionPower(ctx.state, m, baseIndex) <= 2) {
                events.push(destroyMinion(m.uid, m.defId, baseIndex, m.owner, 'pirate_broadside', ctx.now));
            }
        }
        return events;
    });

    // 小艇第一步：选择第一个随从后，选择目标基地
    registerPromptContinuation('pirate_dinghy_choose_first', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        return buildMoveToBasePrompt(ctx.state, minionUid, minion.defId, baseIndex, 'pirate_dinghy_first', ctx.playerId, ctx.now);
    });

    // 小艇第一步选基地后：移动，然后Prompt选第二个随从（可选）
    registerPromptContinuation('pirate_dinghy_first_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        const events: SmashUpEvent[] = [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_dinghy', ctx.now)];
        // 检查是否还有其他己方随从可移动
        const remaining: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.controller === ctx.playerId && m.uid !== data.minionUid) {
                    const def = getCardDef(m.defId) as MinionCardDef | undefined;
                    const name = def?.name ?? m.defId;
                    const baseDef = getBaseDef(ctx.state.bases[i].defId);
                    const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                    const power = getMinionPower(ctx.state, m, i);
                    remaining.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} (力量 ${power}) @ ${baseName}` });
                }
            }
        }
        if (remaining.length === 0) return events;
        // Prompt选第二个
        events.push(requestChoice({
            abilityId: 'pirate_dinghy_choose_second',
            playerId: ctx.playerId,
            promptConfig: { title: '选择第二个要移动的随从（可选）', options: buildMinionTargetOptions(remaining) },
        }, ctx.now));
        return events;
    });

    // 小艇第二步：选择第二个随从后，选择目标基地
    registerPromptContinuation('pirate_dinghy_choose_second', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        return buildMoveToBasePrompt(ctx.state, minionUid, minion.defId, baseIndex, 'pirate_dinghy_second', ctx.playerId, ctx.now);
    });

    // 小艇第二步选基地后：移�?
    registerPromptContinuation('pirate_dinghy_second_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        return [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_dinghy', ctx.now)];
    });

    // 全速航行：选择随从后，选择目标基地
    registerPromptContinuation('pirate_full_sail_choose_minion', (ctx) => {
        const selected = ctx.selectedValue as { done?: boolean; minionUid?: string; baseIndex?: number };
        if (selected.done) return []; // 玩家选择"完成"
        const { minionUid, baseIndex } = selected as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        const data = ctx.data as { movedUids: string[] };
        return buildMoveToBasePrompt(
            ctx.state, minionUid, minion.defId, baseIndex,
            'pirate_full_sail', ctx.playerId, ctx.now,
            { movedUids: data.movedUids },
        );
    });

    // 全速航行：选择基地后移动，然后循环选择下一�?
    registerPromptContinuation('pirate_full_sail_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number; movedUids?: string[] };
        const events: SmashUpEvent[] = [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_full_sail', ctx.now)];
        // 循环：继续选择下一个随�?
        const newMovedUids = [...(data.movedUids ?? []), data.minionUid];
        const nextPrompt = buildFullSailChooseMinionPrompt(ctx.state, ctx.playerId, ctx.now, newMovedUids);
        events.push(...nextPrompt);
        return events;
    });

    // 炸药桶：选择牺牲随从后执�?
    registerPromptContinuation('pirate_powderkeg', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        const power = getMinionPower(ctx.state, minion, baseIndex);
        const events: SmashUpEvent[] = [];
        events.push(destroyMinion(minion.uid, minion.defId, baseIndex, minion.owner, 'pirate_powderkeg', ctx.now));
        for (const m of base.minions) {
            if (m.uid === minionUid) continue;
            if (getMinionPower(ctx.state, m, baseIndex) <= power) {
                events.push(destroyMinion(m.uid, m.defId, baseIndex, m.owner, 'pirate_powderkeg', ctx.now));
            }
        }
        return events;
    });
}
