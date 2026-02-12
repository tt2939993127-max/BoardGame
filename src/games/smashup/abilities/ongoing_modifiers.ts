/**
 * 大杀四方 - 持续力量修正能力注册
 *
 * 将各派系�?ongoing 力量修正注册�?ongoingModifiers 系统�?
 * �?initAllAbilities() 中调用�?
 */

import { registerPowerModifier, registerBreakpointModifier } from '../domain/ongoingModifiers';
import type { PowerModifierContext, BreakpointModifierContext } from '../domain/ongoingModifiers';

// ============================================================================
// 恐龙派系
// ============================================================================

function registerDinosaurModifiers(): void {
    // 重装剑龙：其他玩家回合时 +2 力量
    // MVP：计分时视为非当前玩家回�?�?始终 +2（保守策略，计分时对手视角）
    // 实际实现：检查当前回合玩家是否为随从控制�?
    registerPowerModifier('dino_armor_stego', (ctx: PowerModifierContext) => {
        // 只对自身生效
        if (ctx.minion.defId !== 'dino_armor_stego') return 0;
        // 当前回合不是自己的回合时 +2
        const currentPlayer = ctx.state.turnOrder[ctx.state.currentPlayerIndex];
        if (currentPlayer !== ctx.minion.controller) return 2;
        return 0;
    });

    // 战争猛禽：同基地每个己方战争猛禽（含自身�?1 力量
    registerPowerModifier('dino_war_raptor', (ctx: PowerModifierContext) => {
        if (ctx.minion.defId !== 'dino_war_raptor') return 0;
        const raptorCount = ctx.base.minions.filter(
            m => m.defId === 'dino_war_raptor' && m.controller === ctx.minion.controller
        ).length;
        return raptorCount;
    });

    // 升级（ongoing 行动卡附着在随从上）：目标随从 +2 力量
    registerPowerModifier('dino_upgrade', (ctx: PowerModifierContext) => {
        return ctx.minion.attachedActions.some(a => a.defId === 'dino_upgrade') ? 2 : 0;
    });
}

// ============================================================================
// 机器人派�?
// ============================================================================

function registerRobotModifiers(): void {
    // 微型机阿尔法号：每个其他己方随从（视为微型机�?1 力量
    // "你的所有随从均视为微型�? �?计算场上所有己方其他随从数�?
    registerPowerModifier('robot_microbot_alpha', (ctx: PowerModifierContext) => {
        // 只对微型机阿尔法号自身生�?
        if (ctx.minion.defId !== 'robot_microbot_alpha') return 0;
        // 计算场上所有己方其他随从数量（所有基地）
        let otherMinionCount = 0;
        for (const base of ctx.state.bases) {
            for (const m of base.minions) {
                if (m.controller === ctx.minion.controller && m.uid !== ctx.minion.uid) {
                    otherMinionCount++;
                }
            }
        }
        return otherMinionCount;
    });

    // 微型机修理�?ongoing：己方每个微型机 +1 力量
    // "你的微型�? = 所有己方随从（因为阿尔法号让所有随从视为微型机�?
    // MVP：对同控制者的所有随从生效，每个在场的修理者叠�?+1
    registerPowerModifier('robot_microbot_fixer', (ctx: PowerModifierContext) => {
        // 计算场上与目标随从同控制者的修理者数�?
        let fixerCount = 0;
        for (const base of ctx.state.bases) {
            fixerCount += base.minions.filter(
                m => m.defId === 'robot_microbot_fixer' && m.controller === ctx.minion.controller
            ).length;
        }
        if (fixerCount === 0) return 0;
        // 只对同控制者的随从生效
        const anyFixer = ctx.state.bases.flatMap(b => b.minions)
            .find(m => m.defId === 'robot_microbot_fixer');
        if (!anyFixer || anyFixer.controller !== ctx.minion.controller) return 0;
        return fixerCount; // 每个修理�?+1
    });
}

// ============================================================================
// 幽灵派系
// ============================================================================

function registerGhostModifiers(): void {
    // 不散阴魂：如果你只有2张或更少的手牌，本随�?+3 力量
    registerPowerModifier('ghost_haunting', (ctx: PowerModifierContext) => {
        if (ctx.minion.defId !== 'ghost_haunting') return 0;
        const player = ctx.state.players[ctx.minion.controller];
        if (!player) return 0;
        return player.hand.length <= 2 ? 3 : 0;
    });

    // 通灵之门（ongoing 行动卡附着在基地上）：手牌�?时同基地己方随从 +2 力量
    registerPowerModifier('ghost_door_to_the_beyond', (ctx: PowerModifierContext) => {
        // 检查基地上是否有此 ongoing 行动卡，且属于目标随从的控制�?
        const hasOngoing = ctx.base.ongoingActions.some(
            a => a.defId === 'ghost_door_to_the_beyond' && a.ownerId === ctx.minion.controller
        );
        if (!hasOngoing) return 0;
        const player = ctx.state.players[ctx.minion.controller];
        if (!player) return 0;
        return player.hand.length <= 2 ? 2 : 0;
    });
}

// ============================================================================
// 忍者派�?
// ============================================================================

function registerNinjaModifiers(): void {
    // 毒药（ongoing 行动卡附着在随从上）：目标随从 -4 力量
    registerPowerModifier('ninja_poison', (ctx: PowerModifierContext) => {
        const hasPoison = ctx.minion.attachedActions.some(
            a => a.defId === 'ninja_poison'
        );
        return hasPoison ? -4 : 0;
    });
}

// ============================================================================
// 食人花派�?
// ============================================================================

function registerKillerPlantModifiers(): void {
    // 催眠孢子（ongoing 行动卡附着在随从上）：目标随从 -1 力量
    registerPowerModifier('killer_plant_sleep_spores', (ctx: PowerModifierContext) => {
        const hasSleepSpores = ctx.minion.attachedActions.some(
            a => a.defId === 'killer_plant_sleep_spores'
        );
        return hasSleepSpores ? -1 : 0;
    });

    // 过度生长（ongoing 行动卡附着在基地上）：控制者回合时临界点降�?
    registerBreakpointModifier('killer_plant_overgrowth', (ctx: BreakpointModifierContext) => {
        const overgrowth = ctx.base.ongoingActions.find(a => a.defId === 'killer_plant_overgrowth');
        if (!overgrowth) return 0;
        const currentPlayer = ctx.state.turnOrder[ctx.state.currentPlayerIndex];
        if (currentPlayer !== overgrowth.ownerId) return 0;
        return -ctx.originalBreakpoint;
    });
}

// ============================================================================
// 蒸汽朋克派系
// ============================================================================

function registerSteampunkModifiers(): void {
    // 蒸汽人：按同基地己方行动卡数�?+力量（含基地 ongoing + 随从附着�?
    registerPowerModifier('steampunk_steam_man', (ctx: PowerModifierContext) => {
        if (ctx.minion.defId !== 'steampunk_steam_man') return 0;
        let actionCount = 0;
        // 基地上的 ongoing 行动卡（属于同控制者）
        actionCount += ctx.base.ongoingActions.filter(
            a => a.ownerId === ctx.minion.controller
        ).length;
        // 同基地随从上附着的行动卡（属于同控制者）
        for (const m of ctx.base.minions) {
            actionCount += m.attachedActions.filter(
                a => a.ownerId === ctx.minion.controller
            ).length;
        }
        return actionCount;
    });

    // 蒸汽机车：同基地有其他己方随从时 +5 力量
    registerPowerModifier('steampunk_aggromotive', (ctx: PowerModifierContext) => {
        if (ctx.minion.defId !== 'steampunk_aggromotive') return 0;
        const hasOtherMinion = ctx.base.minions.some(
            m => m.controller === ctx.minion.controller && m.uid !== ctx.minion.uid
        );
        return hasOtherMinion ? 5 : 0;
    });

    // 旋转弹头发射器（ongoing 行动卡附着在基地上）：同基地己方随�?+2 力量
    registerPowerModifier('steampunk_rotary_slug_thrower', (ctx: PowerModifierContext) => {
        const hasOngoing = ctx.base.ongoingActions.some(
            a => a.defId === 'steampunk_rotary_slug_thrower' && a.ownerId === ctx.minion.controller
        );
        return hasOngoing ? 2 : 0;
    });
}

// ============================================================================
// 黑熊骑兵派系
// ============================================================================

function registerBearCavalryModifiers(): void {
    // 极地突击队：基地上唯一己方随从�?+2 力量�? 不可消灭，后者需�?ongoing 保护系统�?
    registerPowerModifier('bear_cavalry_polar_commando', (ctx: PowerModifierContext) => {
        if (ctx.minion.defId !== 'bear_cavalry_polar_commando') return 0;
        const myMinionCount = ctx.base.minions.filter(
            m => m.controller === ctx.minion.controller
        ).length;
        return myMinionCount === 1 ? 2 : 0;
    });
}

// ============================================================================
// 远古之物派系
// ============================================================================

function registerElderThingModifiers(): void {
    // 邓威奇恐怖（ongoing 行动卡附着在随从上）：目标随从 +5 力量
    registerPowerModifier('elder_thing_dunwich_horror', (ctx: PowerModifierContext) => {
        return ctx.minion.attachedActions.some(a => a.defId === 'elder_thing_dunwich_horror') ? 5 : 0;
    });
}

/** 注册所有持续力量修�?*/
export function registerAllOngoingModifiers(): void {
    registerDinosaurModifiers();
    registerRobotModifiers();
    registerGhostModifiers();
    registerNinjaModifiers();
    registerKillerPlantModifiers();
    registerSteampunkModifiers();
    registerBearCavalryModifiers();
    registerElderThingModifiers();
}
