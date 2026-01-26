/**
 * DiceThrone 游戏特定条件注册
 * 
 * 框架层不再默认注册游戏特定条件，由游戏层显式注册。
 * 此文件在游戏初始化时执行一次。
 */

import { conditionRegistry } from '../../systems/AbilitySystem';

let registered = false;

/**
 * 注册 DiceThrone 用到的技能触发条件
 * 此函数幂等，多次调用不会重复注册
 */
export function registerDiceThroneConditions(): void {
    if (registered) return;
    registered = true;

    // 骰子组合条件（如 3 个拳头）
    conditionRegistry.register('diceSet', (cond: { faces: Record<string, number> }, ctx) => {
        const faceCounts = ctx.faceCounts as Record<string, number> | undefined;
        if (!faceCounts) return false;
        return Object.entries(cond.faces).every(
            ([face, required]) => (faceCounts[face] ?? 0) >= required
        );
    });

    // 小顺子（4 个连续数字）
    conditionRegistry.register('smallStraight', (_cond, ctx) => {
        const diceValues = ctx.diceValues as number[] | undefined;
        if (!diceValues) return false;
        const unique = Array.from(new Set(diceValues));
        const sequences = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
        return sequences.some(seq => seq.every(v => unique.includes(v)));
    });

    // 大顺子（5 个连续数字）
    conditionRegistry.register('largeStraight', (_cond, ctx) => {
        const diceValues = ctx.diceValues as number[] | undefined;
        if (!diceValues) return false;
        const unique = Array.from(new Set(diceValues));
        const sequences = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
        return sequences.some(seq => seq.every(v => unique.includes(v)));
    });

    // 阶段条件（防御阶段等）
    conditionRegistry.register('phase', (cond: { phaseId: string; diceCount?: number }, ctx) => {
        if (ctx.currentPhase !== cond.phaseId) return false;
        if (cond.diceCount !== undefined) {
            const diceValues = ctx.diceValues as number[] | undefined;
            if (diceValues && diceValues.length < cond.diceCount) return false;
        }
        return true;
    });
}
