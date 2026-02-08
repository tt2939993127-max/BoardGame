/**
 * 大杀四方 - 海盗派系能力
 *
 * 主题：移动随从、消灭低力量随从
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, addPowerCounter, getPlayerMinionsOnBase } from '../domain/abilityHelpers';
import type { SmashUpEvent } from '../domain/types';

/** 注册海盗派系所有能力 */
export function registerPirateAbilities(): void {
    registerAbility('pirate_saucy_wench', 'onPlay', pirateSaucyWench);
    registerAbility('pirate_broadside', 'onPlay', pirateBroadside);
    registerAbility('pirate_cannon', 'onPlay', pirateCannon);
    registerAbility('pirate_swashbuckling', 'onPlay', pirateSwashbuckling);
    // 炸药桶：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从
    registerAbility('pirate_powderkeg', 'onPlay', piratePowderkeg);
}

/** 粗鲁少妇 onPlay：消灭本基地一个力量≤2的随从（MVP：自动选第一个） */
function pirateSaucyWench(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };

    const target = base.minions.find(
        m => m.uid !== ctx.cardUid && (m.basePower + m.powerModifier) <= 2
    );
    if (!target) return { events: [] };

    return {
        events: [
            destroyMinion(target.uid, target.defId, ctx.baseIndex, target.owner, 'pirate_saucy_wench', ctx.now),
        ],
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
            if (m.controller !== ctx.playerId && (m.basePower + m.powerModifier) <= 2) {
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
            if (m.controller === bestOpponent && (m.basePower + m.powerModifier) <= 2) {
                events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'pirate_broadside', ctx.now));
            }
        }
        break; // 只选一个基地
    }

    return { events };
}

/** 加农炮 onPlay：消灭至多两个力量≤2的随从（MVP：自动选前两个对手随从） */
function pirateCannon(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    let destroyed = 0;

    for (let i = 0; i < ctx.state.bases.length && destroyed < 2; i++) {
        const base = ctx.state.bases[i];
        for (const m of base.minions) {
            if (destroyed >= 2) break;
            if (m.controller !== ctx.playerId && (m.basePower + m.powerModifier) <= 2) {
                events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'pirate_cannon', ctx.now));
                destroyed++;
            }
        }
    }

    return { events };
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
// TODO: pirate_dinghy (action) - 移动至多两个随从（需要 Prompt 选择目标）
// TODO: pirate_full_sail (special action) - 移动任意数量随从（需要 Prompt + special 时机）
// TODO: pirate_shanghai (action) - 移动对手随从（需要 Prompt）
// TODO: pirate_sea_dogs (action) - 移动指定派系随从（需要 Prompt）

/** 炸药桶 onPlay：消灭己方随从，然后消灭同基地所有力量≤被消灭随从的随从（MVP：自动选力量最低的己方随从） */
function piratePowderkeg(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 找己方力量最低的随从（牺牲最小代价）
    let weakest: { uid: string; defId: string; power: number; baseIndex: number; owner: string } | undefined;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = m.basePower + m.powerModifier;
            if (!weakest || power < weakest.power) {
                weakest = { uid: m.uid, defId: m.defId, power, baseIndex: i, owner: m.owner };
            }
        }
    }
    if (!weakest) return { events: [] };

    // 消灭己方随从
    events.push(destroyMinion(weakest.uid, weakest.defId, weakest.baseIndex, weakest.owner, 'pirate_powderkeg', ctx.now));

    // 消灭同基地所有力量≤被消灭随从的其他随从
    const base = ctx.state.bases[weakest.baseIndex];
    for (const m of base.minions) {
        if (m.uid === weakest.uid) continue; // 跳过已消灭的
        if ((m.basePower + m.powerModifier) <= weakest.power) {
            events.push(destroyMinion(m.uid, m.defId, weakest.baseIndex, m.owner, 'pirate_powderkeg', ctx.now));
        }
    }

    return { events };
}
