/**
 * 大杀四方 - 恐龙派系能力
 *
 * 主题：高力量、消灭低力量随从、力量增强
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, addPowerCounter, getMinionPower, setPromptContinuation, buildMinionTargetOptions, buildBaseTargetOptions } from '../domain/abilityHelpers';
import type { SmashUpEvent, MinionOnBase } from '../domain/types';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';
import type { MinionCardDef } from '../domain/types';

/** 注册恐龙派系所有能力 */
export function registerDinosaurAbilities(): void {
    registerAbility('dino_laser_triceratops', 'onPlay', dinoLaserTriceratops);
    registerAbility('dino_wild_stuffing', 'onPlay', dinoWildStuffing);
    registerAbility('dino_augmentation', 'onPlay', dinoAugmentation);
    registerAbility('dino_howl', 'onPlay', dinoHowl);
    registerAbility('dino_natural_selection', 'onPlay', dinoNaturalSelection);
    registerAbility('dino_wild_rampage', 'onPlay', dinoWildRampage);
    registerAbility('dino_survival_of_the_fittest', 'onPlay', dinoSurvivalOfTheFittest);
}


/** 激光三角龙 onPlay：消灭本基地一个力量≤2的随从 */
function dinoLaserTriceratops(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 2
    );
    if (targets.length === 0) return { events: [] };
    // 单目标自动消灭
    if (targets.length === 1) {
        return {
            events: [destroyMinion(targets[0].uid, targets[0].defId, ctx.baseIndex, targets[0].owner, 'dino_laser_triceratops', ctx.now)],
        };
    }
    // 多目标：Prompt 选择
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [
            setPromptContinuation(
                {
                    abilityId: 'dino_laser_triceratops',
                    playerId: ctx.playerId,
                    data: { promptConfig: { title: '选择要消灭的力量≤2的随从', options: buildMinionTargetOptions(options) } },
                },
                ctx.now
            ),
        ],
    };
}

/** 野蛮践踏 onPlay：消灭一个力量≤3的随从（任意基地） */
function dinoWildStuffing(ctx: AbilityContext): AbilityResult {
    // 收集所有基地上力量≤3的对手随从
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
    // 单目标自动消灭
    if (targets.length === 1) {
        return {
            events: [destroyMinion(targets[0].uid, targets[0].defId, targets[0].baseIndex, targets[0].owner, 'dino_wild_stuffing', ctx.now)],
        };
    }
    // 多目标：Prompt 选择
    const options = targets.map((t, i) => ({
        uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label,
    }));
    return {
        events: [
            setPromptContinuation(
                {
                    abilityId: 'dino_wild_stuffing',
                    playerId: ctx.playerId,
                    data: { promptConfig: { title: '选择要消灭的力量≤3的随从', options: buildMinionTargetOptions(options) } },
                },
                ctx.now
            ),
        ],
    };
}

/** 机能强化 onPlay：一个随从+4力量 */
function dinoAugmentation(ctx: AbilityContext): AbilityResult {
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
    // 单目标自动加力量
    if (myMinions.length === 1) {
        return { events: [addPowerCounter(myMinions[0].uid, myMinions[0].baseIndex, 4, 'dino_augmentation', ctx.now)] };
    }
    // 多目标：Prompt 选择
    const options = myMinions.map(entry => {
        const def = getCardDef(entry.defId) as MinionCardDef | undefined;
        const name = def?.name ?? entry.defId;
        const baseDef = getBaseDef(ctx.state.bases[entry.baseIndex].defId);
        const baseName = baseDef?.name ?? `基地 ${entry.baseIndex + 1}`;
        return { uid: entry.uid, defId: entry.defId, baseIndex: entry.baseIndex, label: `${name} (力量 ${entry.power}) @ ${baseName}` };
    });
    return {
        events: [
            setPromptContinuation(
                {
                    abilityId: 'dino_augmentation',
                    playerId: ctx.playerId,
                    data: { promptConfig: { title: '选择一个随从获得+4力量', options: buildMinionTargetOptions(options) } },
                },
                ctx.now
            ),
        ],
    };
}

/** 咆哮 onPlay：你的全部随从+1力量 */
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

/** 物竞天择 onPlay：选择你的一个随从，消灭该基地一个力量低于它的随从 */
function dinoNaturalSelection(ctx: AbilityContext): AbilityResult {
    // 收集所有基地上可作为"参照"的己方随从
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

    // 只有一个己方随从可选时，跳过第一步选择，直接进入目标选择
    if (myMinions.length === 1) {
        const chosen = myMinions[0];
        return selectDestroyTarget(ctx, chosen.minion, chosen.baseIndex, chosen.power);
    }

    // 多个己方随从可选：创建 Prompt 让玩家选择参照随从
    const options = myMinions.map((entry, i) => {
        const def = getCardDef(entry.minion.defId) as MinionCardDef | undefined;
        const name = def?.name ?? entry.minion.defId;
        return {
            uid: entry.minion.uid,
            defId: entry.minion.defId,
            baseIndex: entry.baseIndex,
            label: `${name} (力量 ${entry.power})`,
        };
    });

    return {
        events: [
            setPromptContinuation(
                {
                    abilityId: 'dino_natural_selection_choose_mine',
                    playerId: ctx.playerId,
                    data: {
                        promptConfig: {
                            title: '选择你的一个随从作为参照',
                            options: buildMinionTargetOptions(options),
                        },
                    },
                },
                ctx.now
            ),
        ],
    };
}

/** 物竞天择第二步：根据选定的己方随从，选择要消灭的目标 */
function selectDestroyTarget(
    ctx: AbilityContext,
    myMinion: MinionOnBase,
    baseIndex: number,
    myPower: number,
): AbilityResult {
    const base = ctx.state.bases[baseIndex];
    // 收集该基地上力量低于己方随从的所有其他随从（不限敌我）
    const targets: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
    for (const m of base.minions) {
        if (m.uid === myMinion.uid) continue;
        const power = getMinionPower(ctx.state, m, baseIndex);
        if (power < myPower) {
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            targets.push({
                uid: m.uid,
                defId: m.defId,
                baseIndex,
                label: `${name} (力量 ${power})`,
            });
        }
    }

    if (targets.length === 0) return { events: [] };

    // 只有一个目标时自动消灭
    if (targets.length === 1) {
        const t = targets[0];
        const owner = base.minions.find(m => m.uid === t.uid)?.owner ?? ctx.playerId;
        return {
            events: [destroyMinion(t.uid, t.defId, baseIndex, owner, 'dino_natural_selection', ctx.now)],
        };
    }

    // 多个目标：创建 Prompt 让玩家选择
    return {
        events: [
            setPromptContinuation(
                {
                    abilityId: 'dino_natural_selection_choose_target',
                    playerId: ctx.playerId,
                    data: {
                        baseIndex,
                        promptConfig: {
                            title: '选择要消灭的随从',
                            options: buildMinionTargetOptions(targets),
                        },
                    },
                },
                ctx.now
            ),
        ],
    };
}

/** 注册恐龙派系的 Prompt 继续函数 */
export function registerDinosaurPromptContinuations(): void {
    // 激光三角龙：选择目标后消灭
    registerPromptContinuation('dino_laser_triceratops', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_laser_triceratops', ctx.now)];
    });

    // 野蛮践踏：选择目标后消灭
    registerPromptContinuation('dino_wild_stuffing', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_wild_stuffing', ctx.now)];
    });

    // 机能强化：选择目标后加力量
    registerPromptContinuation('dino_augmentation', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        return [addPowerCounter(minionUid, baseIndex, 4, 'dino_augmentation', ctx.now)];
    });

    // 物竞天择第一步：选择己方随从后，进入目标选择
    registerPromptContinuation('dino_natural_selection_choose_mine', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];

        const myMinion = base.minions.find(m => m.uid === minionUid);
        if (!myMinion) return [];

        const myPower = getMinionPower(ctx.state, myMinion, baseIndex);

        // 收集可消灭的目标
        const targets: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (const m of base.minions) {
            if (m.uid === myMinion.uid) continue;
            const power = getMinionPower(ctx.state, m, baseIndex);
            if (power < myPower) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                targets.push({
                    uid: m.uid,
                    defId: m.defId,
                    baseIndex,
                    label: `${name} (力量 ${power})`,
                });
            }
        }

        if (targets.length === 0) return [];

        // 只有一个目标时自动消灭
        if (targets.length === 1) {
            const t = targets[0];
            const owner = base.minions.find(m => m.uid === t.uid)?.owner ?? ctx.playerId;
            return [destroyMinion(t.uid, t.defId, baseIndex, owner, 'dino_natural_selection', ctx.now)];
        }

        // 多个目标：创建第二步 Prompt
        return [
            setPromptContinuation(
                {
                    abilityId: 'dino_natural_selection_choose_target',
                    playerId: ctx.playerId,
                    data: {
                        baseIndex,
                        promptConfig: {
                            title: '选择要消灭的随从',
                            options: buildMinionTargetOptions(targets),
                        },
                    },
                },
                ctx.now
            ),
        ];
    });

    // 物竞天择第二步：选择目标后消灭
    registerPromptContinuation('dino_natural_selection_choose_target', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];

        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];

        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'dino_natural_selection', ctx.now)];
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

/** 适者生存 onPlay：消灭所有拥有最低力量的随从 */
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

// 暴龙雷克斯：无能力（纯力量7）
// dino_armor_stego (ongoing) - 已通过 ongoingModifiers 系统实现力量修正
// dino_war_raptor (ongoing) - 已通过 ongoingModifiers 系统实现力量修正
// TODO: dino_tooth_and_claw (ongoing) - 保护随从（需要 ongoing 效果系统）
// TODO: dino_upgrade (ongoing) - +2力量且不能被消灭（需要 ongoing 效果系统）
