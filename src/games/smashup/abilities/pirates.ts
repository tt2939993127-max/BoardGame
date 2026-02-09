/**
 * 大杀四方 - 海盗派系能力
 *
 * 主题：移动随从、消灭低力量随从
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, addPowerCounter, moveMinion, getMinionPower, setPromptContinuation, buildMinionTargetOptions, buildBaseTargetOptions } from '../domain/abilityHelpers';
import type { SmashUpEvent, MinionCardDef } from '../domain/types';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册海盗派系所有能力 */
export function registerPirateAbilities(): void {
    registerAbility('pirate_saucy_wench', 'onPlay', pirateSaucyWench);
    registerAbility('pirate_broadside', 'onPlay', pirateBroadside);
    registerAbility('pirate_cannon', 'onPlay', pirateCannon);
    registerAbility('pirate_swashbuckling', 'onPlay', pirateSwashbuckling);
    // 炸药桶：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从
    registerAbility('pirate_powderkeg', 'onPlay', piratePowderkeg);
    // 小艇（行动卡）：移动至多两个己方随从到其他基地
    registerAbility('pirate_dinghy', 'onPlay', pirateDinghy);
    // 上海（行动卡）：移动一个对手随从到另一个基地
    registerAbility('pirate_shanghai', 'onPlay', pirateShanghai);
    // 海狗（行动卡）：移动一个随从到另一个基地
    registerAbility('pirate_sea_dogs', 'onPlay', pirateSeaDogs);
}

/** 粗鲁少妇 onPlay：消灭本基地一个力量≤2的随从 */
function pirateSaucyWench(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 2
    );
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [destroyMinion(targets[0].uid, targets[0].defId, ctx.baseIndex, targets[0].owner, 'pirate_saucy_wench', ctx.now)] };
    }
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [setPromptContinuation({ abilityId: 'pirate_saucy_wench', playerId: ctx.playerId, data: { promptConfig: { title: '选择要消灭的力量≤2的随从', options: buildMinionTargetOptions(options) } } }, ctx.now)],
    };
}

/** 侧翼开炮 onPlay：消灭一个玩家在你有随从的基地的所有力量≤2随从（MVP：自动选对手） */
function pirateBroadside(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 找到你有随从的基地
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const myMinions = base.minions.filter(m => m.controller === ctx.playerId);
        if (myMinions.length === 0) continue;

        // 找到该基地上对手力量≤2的随从最多的玩家
        const opponentCounts = new Map<string, number>();
        for (const m of base.minions) {
            if (m.controller !== ctx.playerId && getMinionPower(ctx.state, m, i) <= 2) {
                opponentCounts.set(m.controller, (opponentCounts.get(m.controller) || 0) + 1);
            }
        }
        if (opponentCounts.size === 0) continue;

        // MVP：选随从最多的对手，在第一个符合条件的基地
        let bestOpponent = '';
        let bestCount = 0;
        for (const [pid, count] of opponentCounts) {
            if (count > bestCount) {
                bestCount = count;
                bestOpponent = pid;
            }
        }

        // 消灭该对手在该基地所有力量≤2的随从
        for (const m of base.minions) {
            if (m.controller === bestOpponent && getMinionPower(ctx.state, m, i) <= 2) {
                events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'pirate_broadside', ctx.now));
            }
        }
        break; // 只选一个基地
    }

    return { events };
}

/** 加农炮 onPlay：消灭至多两个力量≤2的随从 */
function pirateCannon(ctx: AbilityContext): AbilityResult {
    // 收集所有力量≤2的随从
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
    // 0-1个目标自动消灭
    if (allTargets.length === 1) {
        return { events: [destroyMinion(allTargets[0].uid, allTargets[0].defId, allTargets[0].baseIndex, allTargets[0].owner, 'pirate_cannon', ctx.now)] };
    }
    // 多目标：Prompt 选择第一个
    const options = allTargets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'pirate_cannon_choose_first',
            playerId: ctx.playerId,
            data: { allTargetUids: allTargets.map(t => t.uid), promptConfig: { title: '选择第一个要消灭的力量≤2的随从（至多2个）', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 虚张声势 onPlay：你的每个随从+1力量直到回合结束 */
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

// TODO: pirate_king (special) - 基地计分前移动到该基地（需要 beforeScoring 时机）
// TODO: pirate_buccaneer (special) - 被消灭时移动到其他基地（需要 onDestroy 替代效果）
// TODO: pirate_first_mate (special) - 基地计分后移动到其他基地（需要 afterScoring 时机）
// TODO: pirate_full_sail (special action) - 移动任意数量随从（需要 Prompt + special 时机）

/** 小艇 onPlay：移动至多两个己方随从到其他基地（MVP：自动选力量最低的两个移到随从最少的基地） */
function pirateDinghy(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    // 收集所有己方随从
    const myMinions: { uid: string; defId: string; baseIndex: number; power: number }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) {
                myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, power: getMinionPower(ctx.state, m, i) });
            }
        }
    }
    if (myMinions.length === 0) return { events: [] };

    // 选力量最低的至多2个
    myMinions.sort((a, b) => a.power - b.power);
    const toMove = myMinions.slice(0, 2);

    for (const m of toMove) {
        // 找一个不同的基地（随从最少的）
        let bestBase = -1;
        let bestCount = Infinity;
        for (let i = 0; i < ctx.state.bases.length; i++) {
            if (i === m.baseIndex) continue;
            if (ctx.state.bases[i].minions.length < bestCount) {
                bestCount = ctx.state.bases[i].minions.length;
                bestBase = i;
            }
        }
        if (bestBase >= 0) {
            events.push(moveMinion(m.uid, m.defId, m.baseIndex, bestBase, 'pirate_dinghy', ctx.now));
        }
    }
    return { events };
}

/** 上海 onPlay：移动一个对手随从到另一个基地 */
function pirateShanghai(ctx: AbilityContext): AbilityResult {
    // 收集所有对手随从
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
    if (targets.length === 1 && ctx.state.bases.length <= 2) {
        // 单目标且只有一个其他基地，自动执行
        const t = targets[0];
        const destBase = ctx.state.bases.findIndex((_, idx) => idx !== t.baseIndex);
        if (destBase < 0) return { events: [] };
        return { events: [moveMinion(t.uid, t.defId, t.baseIndex, destBase, 'pirate_shanghai', ctx.now)] };
    }
    // Prompt 选择目标随从
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'pirate_shanghai_choose_minion',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要移动的对手随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 海狗 onPlay：移动一个随从到另一个基地 */
function pirateSeaDogs(ctx: AbilityContext): AbilityResult {
    // 收集所有随从（任意玩家）
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
    if (targets.length === 1 && ctx.state.bases.length <= 2) {
        const t = targets[0];
        const destBase = ctx.state.bases.findIndex((_, idx) => idx !== t.baseIndex);
        if (destBase < 0) return { events: [] };
        return { events: [moveMinion(t.uid, t.defId, t.baseIndex, destBase, 'pirate_sea_dogs', ctx.now)] };
    }
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'pirate_sea_dogs_choose_minion',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要移动的随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 炸药桶 onPlay：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从 */
function piratePowderkeg(ctx: AbilityContext): AbilityResult {
    // 收集所有己方随从
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
    if (myMinions.length === 1) {
        return executePowderkeg(ctx, myMinions[0]);
    }
    // 多个己方随从：Prompt 选择牺牲哪个
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'pirate_powderkeg',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要牺牲的己方随从（同基地力量≤它的随从也会被消灭）', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 炸药桶执行：消灭选定随从 + 同基地力量≤它的随从 */
function executePowderkeg(ctx: AbilityContext, chosen: { uid: string; defId: string; power: number; baseIndex: number; owner: string }): AbilityResult {
    const events: SmashUpEvent[] = [];
    events.push(destroyMinion(chosen.uid, chosen.defId, chosen.baseIndex, chosen.owner, 'pirate_powderkeg', ctx.now));
    const base = ctx.state.bases[chosen.baseIndex];
    for (const m of base.minions) {
        if (m.uid === chosen.uid) continue;
        if (getMinionPower(ctx.state, m, chosen.baseIndex) <= chosen.power) {
            events.push(destroyMinion(m.uid, m.defId, chosen.baseIndex, m.owner, 'pirate_powderkeg', ctx.now));
        }
    }
    return { events };
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
): SmashUpEvent[] {
    const candidates: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < state.bases.length; i++) {
        if (i === fromBaseIndex) continue;
        const baseDef = getBaseDef(state.bases[i].defId);
        candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
    }
    if (candidates.length === 0) return [];
    if (candidates.length === 1) {
        return [moveMinion(minionUid, minionDefId, fromBaseIndex, candidates[0].baseIndex, abilityId, now)];
    }
    return [setPromptContinuation({
        abilityId: `${abilityId}_choose_base`,
        playerId,
        data: {
            minionUid, minionDefId, fromBaseIndex,
            promptConfig: { title: '选择目标基地', options: buildBaseTargetOptions(candidates) },
        },
    }, now)];
}

import type { SmashUpCore } from '../domain/types';

/** 注册海盗派系的 Prompt 继续函数 */
export function registerPiratePromptContinuations(): void {
    // 粗鲁少妇：选择目标后消灭
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
        // 检查剩余力量≤2的随从（排除刚消灭的）
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
        if (remaining.length === 1) {
            const r = remaining[0];
            const rTarget = ctx.state.bases[r.baseIndex].minions.find(m => m.uid === r.uid);
            if (rTarget) events.push(destroyMinion(r.uid, r.defId, r.baseIndex, rTarget.owner, 'pirate_cannon', ctx.now));
            return events;
        }
        // 多个剩余目标：Prompt 选择第二个
        events.push(setPromptContinuation({
            abilityId: 'pirate_cannon_choose_second',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择第二个要消灭的力量≤2的随从（可选）', options: buildMinionTargetOptions(remaining) } },
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

    // 上海：选择基地后移动
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

    // 海狗：选择基地后移动
    registerPromptContinuation('pirate_sea_dogs_choose_base', (ctx) => {
        const { baseIndex: destBase } = ctx.selectedValue as { baseIndex: number };
        const data = ctx.data as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        return [moveMinion(data.minionUid, data.minionDefId, data.fromBaseIndex, destBase, 'pirate_sea_dogs', ctx.now)];
    });

    // 炸药桶：选择牺牲随从后执行
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
