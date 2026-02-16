/**
 * 大杀四方 - 持续力量修正系统
 *
 * 纯计算层：根据场上状态动态计算随从的力量修正。
 * 不修改状态，只在需要计算力量时调用。
 *
 * 设计原则：
 * - 每个持续能力注册一个 PowerModifierFn
 * - 计算时遍历基地上所有随从，对每个随从调用所有相关修正函数
 * - 修正函数接收当前游戏状态和目标随从信息，返回力量增减值
 */

import type { PlayerId } from '../../../engine/types';
import type { SmashUpCore, MinionOnBase, BaseInPlay } from './types';
import { getBaseDef } from '../data/cards';

// ============================================================================
// 类型定义
// ============================================================================

/** 力量修正上下文 */
export interface PowerModifierContext {
    /** 当前游戏状态 */
    state: SmashUpCore;
    /** 被计算的随从 */
    minion: MinionOnBase;
    /** 随从所在基地索引 */
    baseIndex: number;
    /** 随从所在基地 */
    base: BaseInPlay;
}

/** 力量修正函数：返回力量增减值（正数=加，负数=减） */
export type PowerModifierFn = (ctx: PowerModifierContext) => number;

/** 修正来源信息 */
interface ModifierEntry {
    /** 来源随从 defId（提供修正的随从） */
    sourceDefId: string;
    /** 修正函数 */
    modifier: PowerModifierFn;
}

/** 临界点修正上下文 */
export interface BreakpointModifierContext {
    /** 当前游戏状态 */
    state: SmashUpCore;
    /** 基地索引 */
    baseIndex: number;
    /** 基地 */
    base: BaseInPlay;
    /** 原始临界点值 */
    originalBreakpoint: number;
}

/** 临界点修正函数：返回增减值（正数=提高临界点，负数=降低） */
export type BreakpointModifierFn = (ctx: BreakpointModifierContext) => number;

/** 临界点修正来源 */
interface BreakpointModifierEntry {
    sourceDefId: string;
    modifier: BreakpointModifierFn;
}

// ============================================================================
// 注册表
// ============================================================================

/** 持续力量修正注册表 */
const modifierRegistry: ModifierEntry[] = [];

/** 持续临界点修正注册表 */
const breakpointModifierRegistry: BreakpointModifierEntry[] = [];

/**
 * 注册一个持续力量修正
 * 
 * @param sourceDefId 提供修正的随从 defId（如 'robot_microbot_alpha'）
 * @param modifier 修正函数
 */
export function registerPowerModifier(
    sourceDefId: string,
    modifier: PowerModifierFn
): void {
    modifierRegistry.push({ sourceDefId, modifier });
}

/**
 * 注册一个临界点修正
 * 
 * @param sourceDefId 提供修正的来源 defId
 * @param modifier 修正函数
 */
export function registerBreakpointModifier(
    sourceDefId: string,
    modifier: BreakpointModifierFn
): void {
    breakpointModifierRegistry.push({ sourceDefId, modifier });
}

/** 清空所有修正注册表（测试用） */
export function clearPowerModifierRegistry(): void {
    modifierRegistry.length = 0;
    breakpointModifierRegistry.length = 0;
}

/** 获取所有已注册的 sourceDefId（用于能力行为审计） */
export function getRegisteredModifierIds(): {
    powerModifierIds: Set<string>;
    breakpointModifierIds: Set<string>;
} {
    return {
        powerModifierIds: new Set(modifierRegistry.map(e => e.sourceDefId)),
        breakpointModifierIds: new Set(breakpointModifierRegistry.map(e => e.sourceDefId)),
    };
}

// ============================================================================
// 力量计算
// ============================================================================

/**
 * 计算随从的持续力量修正总和
 * 
 * 遍历所有注册的修正函数，累加结果。
 * 只有当基地上存在提供修正的随从时，对应修正才生效。
 */
export function getOngoingPowerModifier(
    state: SmashUpCore,
    minion: MinionOnBase,
    baseIndex: number
): number {
    if (modifierRegistry.length === 0) return 0;

    const base = state.bases[baseIndex];
    if (!base) return 0;

    let total = 0;
    const debug: string[] = [];
    for (const entry of modifierRegistry) {
        // 检查基地上是否有提供修正的随从（可以是任意基地，取决于修正函数自身逻辑）
        const ctx: PowerModifierContext = { state, minion, baseIndex, base };
        const delta = entry.modifier(ctx);
        if (delta !== 0) {
            debug.push(`${entry.sourceDefId}: ${delta}`);
        }
        total += delta;
    }
    if (debug.length > 0) {
        console.log(`[getOngoingPowerModifier] minion=${minion.defId} base=${baseIndex} modifiers:`, debug, `total=${total}`);
    }
    return total;
}

/**
 * 获取随从的有效力量（含持续修正）
 * 
 * = basePower + powerModifier（永久指示物） + tempPowerModifier（临时，回合结束清零） + ongoingModifier（持续能力）
 */
export function getEffectivePower(
    state: SmashUpCore,
    minion: MinionOnBase,
    baseIndex: number
): number {
    // 力量最低为 0（规则：睡眠孢子等负面修正不能使力量低于 0）
    return Math.max(0, minion.basePower + minion.powerModifier + (minion.tempPowerModifier ?? 0) + getOngoingPowerModifier(state, minion, baseIndex));
}

/**
 * 获取玩家在基地上的总有效力量（含持续修正）
 */
export function getPlayerEffectivePowerOnBase(
    state: SmashUpCore,
    base: BaseInPlay,
    baseIndex: number,
    playerId: PlayerId
): number {
    return base.minions
        .filter(m => m.controller === playerId)
        .reduce((sum, m) => sum + getEffectivePower(state, m, baseIndex), 0);
}

/**
 * 获取基地上的总有效力量（含持续修正）
 */
export function getTotalEffectivePowerOnBase(
    state: SmashUpCore,
    base: BaseInPlay,
    baseIndex: number
): number {
    return base.minions
        .reduce((sum, m) => sum + getEffectivePower(state, m, baseIndex), 0);
}

/**
 * 获取基地的有效临界点（含持续修正 + 临时修正）
 * 
 * = baseDef.breakpoint + 持续修正 + 临时修正（回合结束清零）
 */
export function getEffectiveBreakpoint(
    state: SmashUpCore,
    baseIndex: number
): number {
    const base = state.bases[baseIndex];
    if (!base) return Infinity;
    const baseDef = getBaseDef(base.defId);
    if (!baseDef) return Infinity;

    let total = 0;
    if (breakpointModifierRegistry.length > 0) {
        for (const entry of breakpointModifierRegistry) {
            const ctx: BreakpointModifierContext = {
                state,
                baseIndex,
                base,
                originalBreakpoint: baseDef.breakpoint,
            };
            total += entry.modifier(ctx);
        }
    }

    // 加上临时临界点修正（如 dino_rampage）
    const tempDelta = state.tempBreakpointModifiers?.[baseIndex] ?? 0;
    return Math.max(0, baseDef.breakpoint + total + tempDelta);
}
