/**
 * 大杀四方 - 恐龙派系能力
 *
 * 主题：高力量、消灭低力量随从、力量增�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, addPowerCounter, getMinionPower, buildMinionTargetOptions } from '../domain/abilityHelpers';
import type { SmashUpEvent, SmashUpCore, MinionOnBase } from '../domain/types';
import { getCardDef, getBaseDef } from '../data/cards';
import type { MinionCardDef } from '../domain/types';
import { registerProtection } from '../domain/ongoingEffects';
import type { ProtectionCheckContext } from '../domain/ongoingEffects';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { MatchState } from '../../../engine/types';

/** 注册恐龙派系所有能�?*/
export function registerDinosaurAbilities(): void {
    registerAbility('dino_laser_triceratops', 'onPlay', dinoLaserTriceratops);
    registerAbility('dino_wild_stuffing', 'onPlay', dinoWildStuffing);
    registerAbility('dino_augmentation', 'onPlay', dinoAugmentation);
    registerAbility('dino_howl', 'onPlay', dinoHowl);
    registerAbility('dino_natural_selection', 'onPlay', dinoNaturalSelection);
    registerAbility('dino_wild_rampage', 'onPlay', dinoWildRampage);
    registerAbility('dino_survival_of_the_fittest', 'onPlay', dinoSurvivalOfTheFittest);

    // === ongoing 效果注册 ===
    // 利齿钢爪：保护附着随从不被其他玩家消灭/影响
    registerProtection('dino_tooth_and_claw', 'destroy', dinoToothAndClawChecker);
    registerProtection('dino_tooth_and_claw', 'affect', dinoToothAndClawChecker);
    // 升级：保护附着随从不被消灭�?2力量�?ongoingModifiers 中注册）
    registerProtection('dino_upgrade', 'destroy', dinoUpgradeChecker);
}

/** 激光三角龙 onPlay：消灭本基地一个力量≤2的随�?*/
function dinoLaserTriceratops(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 2
    );
    if (targets.length === 0) return { events: [] };
    // Prompt 选择
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    const interaction = createSimpleChoice(
        `dino_laser_triceratops_${ctx.now}`, ctx.playerId,
        '选择要消灭的力量≤2的随从', buildMinionTargetOptions(options), 'dino_laser_triceratops',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 野蛮践踏 onPlay：消灭一个力量≤3的随从（任意基地�?*/
function dinoWildStuffing(ctx: AbilityContext): AbilityResult {
    // 收集所有基地上力量�?的对手随�?
    const targets: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId && getMinionPower(ctx.state, m, i) <= 3) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                const power = getMinionPower(ctx.state, m, i);
                targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
            }
        }
    }
    if (targets.length === 0) return { events: [] };
    // Prompt 选择
    const options = targets.map((t) => ({
        uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label,
    }));
    const interaction = createSimpleChoice(
        `dino_wild_stuffing_${ctx.now}`, ctx.playerId,
        '选择要消灭的力量≤2的随从', buildMinionTargetOptions(options), 'dino_wild_stuffing',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 机能强化 onPlay：一个随�?4力量 */
function dinoAugmentation(ctx: AbilityContext): AbilityResult {
    // 收集所有己方随�?
    const myMinions: { uid: string; defId: string; baseIndex: number; power: number }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) {
                myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, power: getMinionPower(ctx.state, m, i) });
            }
        }
    }
    if (myMinions.length === 0) return { events: [] };
    // Prompt 选择
    const options = myMinions.map(entry => {
        const def = getCardDef(entry.defId) as MinionCardDef | undefined;
        const name = def?.name ?? entry.defId;
        const baseDef = getBaseDef(ctx.state.bases[entry.baseIndex].defId);
        const baseName = baseDef?.name ?? `基地 ${entry.baseIndex + 1}`;
        return { uid: entry.uid, defId: entry.defId, baseIndex: entry.baseIndex, label: `${name} (力量 ${entry.power}) @ ${baseName}` };
    });
    const interaction = createSimpleChoice(
        `dino_augmentation_${ctx.now}`, ctx.playerId,
        '选择一个随从获得+4力量', buildMinionTargetOptions(options), 'dino_augmentation',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 咆哮 onPlay：你的全部随�?1力量 */
function dinoHowl(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) {
                events.push(addPowerCounter(m.uid, i, 1, 'dino_howl', ctx.now));
            }
        }
    }
    return { events };
}

/** 物竞天择 onPlay：选择你的一个随从，消灭该基地一个力量低于它的随�?*/
function dinoNaturalSelection(ctx: AbilityContext): AbilityResult {
    // 收集所有基地上可作�?参照"的己方随�?
    const myMinions: { minion: MinionOnBase; baseIndex: number; power: number }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) {
                const power = getMinionPower(ctx.state, m, i);
                // 该基地上必须存在力量低于此随从的其他随从才有意义
                const hasTarget = ctx.state.bases[i].minions.some(
                    t => t.uid !== m.uid && getMinionPower(ctx.state, t, i) < power
                );
                if (hasTarget) {
                    myMinions.push({ minion: m, baseIndex: i, power });
                }
            }
        }
    }

    if (myMinions.length === 0) return { events: [] };

    // Prompt 让玩家选择参照随从
    const options = myMinions.map((entry) => {
        const def = getCardDef(entry.minion.defId) as MinionCardDef | undefined;
        const name = def?.name ?? entry.minion.defId;
        return {
            uid: entry.minion.uid,
            defId: entry.minion.defId,
            baseIndex: entry.baseIndex,
            label: `${name} (力量 ${entry.power})`,
        };
    });

    const interaction = createSimpleChoice(
        `dino_natural_selection_${ctx.now}`, ctx.playerId,
        '选择你的一个随从作为参照', buildMinionTargetOptions(options), 'dino_natural_selection_choose_mine',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 注册恐龙派系的交互解决处理函数 */
export function registerDinosaurInteractionHandlers(): void {
    // 激光三角龙：选择目标后消灭
    registerInteractionHandler('dino_laser_triceratops', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_laser_triceratops', timestamp)] };
    });

    // 野蛮践踏：选择目标后消灭
    registerInteractionHandler('dino_wild_stuffing', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_wild_stuffing', timestamp)] };
    });

    // 机能强化：选择目标后加力量
    registerInteractionHandler('dino_augmentation', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        return { state, events: [addPowerCounter(minionUid, baseIndex, 4, 'dino_augmentation', timestamp)] };
    });

    // 物竞天择第一步：选择己方随从后，链式选择目标
    registerInteractionHandler('dino_natural_selection_choose_mine', (state, playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const myMinion = base.minions.find(m => m.uid === minionUid);
        if (!myMinion) return undefined;
        const myPower = getMinionPower(state.core, myMinion, baseIndex);
        const targets: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (const m of base.minions) {
            if (m.uid === myMinion.uid) continue;
            const power = getMinionPower(state.core, m, baseIndex);
            if (power < myPower) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                targets.push({ uid: m.uid, defId: m.defId, baseIndex, label: `${name} (力量 ${power})` });
            }
        }
        if (targets.length === 0) return undefined;
        const next = createSimpleChoice(
            `dino_natural_selection_target_${timestamp}`, playerId,
            '选择要消灭的随从', buildMinionTargetOptions(targets), 'dino_natural_selection_choose_target',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { baseIndex } } }), events: [] };
    });

    // 物竞天择第二步：选择目标后消灭
    registerInteractionHandler('dino_natural_selection_choose_target', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_natural_selection', timestamp)] };
    });
}

/** 疯狂暴走 onPlay：你在目标基地的每个随从+2力量 */
function dinoWildRampage(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    for (const m of base.minions) {
        if (m.controller === ctx.playerId) {
            events.push(addPowerCounter(m.uid, ctx.baseIndex, 2, 'dino_wild_rampage', ctx.now));
        }
    }
    return { events };
}

/** 适者生�?onPlay：消灭所有拥有最低力量的随从 */
function dinoSurvivalOfTheFittest(ctx: AbilityContext): AbilityResult {
    let minPower = Infinity;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            const power = getMinionPower(ctx.state, m, i);
            if (power < minPower) minPower = power;
        }
    }
    if (minPower === Infinity) return { events: [] };
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (getMinionPower(ctx.state, m, i) === minPower) {
                events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'dino_survival_of_the_fittest', ctx.now));
            }
        }
    }
    return { events };
}

// 暴龙雷克斯：无能力（纯力�?�?
// dino_armor_stego (ongoing) - 已通过 ongoingModifiers 系统实现力量修正
// dino_war_raptor (ongoing) - 已通过 ongoingModifiers 系统实现力量修正
// dino_tooth_and_claw (ongoing) - 已通过 ongoingEffects 保护系统实现
// dino_upgrade (ongoing) - 已通过 ongoingEffects 保护 + ongoingModifiers 力量修正实现

/** 利齿钢爪保护检查：附着了此卡的随从不受其他玩家消灭/影响 */
function dinoToothAndClawChecker(ctx: ProtectionCheckContext): boolean {
    if (ctx.sourcePlayerId === ctx.targetMinion.controller) return false;
    return ctx.targetMinion.attachedActions.some(a => a.defId === 'dino_tooth_and_claw');
}

/** 升级保护检查：附着了此卡的随从不可被消�?*/
function dinoUpgradeChecker(ctx: ProtectionCheckContext): boolean {
    return ctx.targetMinion.attachedActions.some(a => a.defId === 'dino_upgrade');
}
