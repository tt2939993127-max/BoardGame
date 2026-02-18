/**
 * LocalInteractionManager 属性测试
 *
 * Feature: transport-latency-optimization
 * Property 7: 本地交互取消的往返一致性
 * Property 8: 本地交互中间步骤不产生网络命令
 * Property 9: 本地交互提交产生单一命令
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { createLocalInteractionManager } from '../localInteractionManager';
import type { LocalInteractionDeclaration } from '../types';

// ============================================================================
// 测试用类型与 reducer
// ============================================================================

/** 通用测试状态：记录步骤和累计值 */
interface TestState {
    value: number;
    steps: Array<{ stepType: string; payload: unknown }>;
}

/** 步骤类型常量 */
const STEP_TYPES = ['ADD', 'SUB', 'MUL', 'SET'] as const;

/**
 * 测试用 localReducer
 *
 * 根据步骤类型更新 value，并记录所有步骤。
 * 确保每次 update 都产生新的状态对象（不可变更新）。
 */
const testReducer = (state: TestState, stepType: string, payload: unknown): TestState => {
    const p = payload as { amount: number };
    let newValue = state.value;
    switch (stepType) {
        case 'ADD':
            newValue = state.value + p.amount;
            break;
        case 'SUB':
            newValue = state.value - p.amount;
            break;
        case 'MUL':
            newValue = state.value * p.amount;
            break;
        case 'SET':
            newValue = p.amount;
            break;
        default:
            break;
    }
    return {
        value: newValue,
        steps: [...state.steps, { stepType, payload }],
    };
};

const testDeclaration: LocalInteractionDeclaration<TestState> = {
    localSteps: [...STEP_TYPES],
    localReducer: testReducer,
};

// ============================================================================
// 生成器
// ============================================================================

/** 生成随机中间步骤 */
const arbStep = () =>
    fc.record({
        stepType: fc.constantFrom(...STEP_TYPES),
        payload: fc.record({ amount: fc.integer({ min: -50, max: 50 }) }),
    });

/** 生成随机步骤序列（0~20 步） */
const arbSteps = (opts?: { minLength?: number; maxLength?: number }) =>
    fc.array(arbStep(), {
        minLength: opts?.minLength ?? 0,
        maxLength: opts?.maxLength ?? 20,
    });

/** 生成随机初始状态 */
const arbInitialState = (): fc.Arbitrary<TestState> =>
    fc.integer({ min: -1000, max: 1000 }).map((value) => ({
        value,
        steps: [],
    }));

/** 生成随机交互 ID */
const arbInteractionId = () =>
    fc.constantFrom('COMMIT_TEST', 'SUBMIT_CHOICE', 'FINALIZE_SELECTION');

// ============================================================================
// Feature: transport-latency-optimization, Property 7: 本地交互取消的往返一致性
// Validates: Requirements 3.4
// ============================================================================

describe('LocalInteractionManager — Property 7: 本地交互取消的往返一致性', () => {
    it('对于任意本地交互，执行任意数量的中间步骤后取消，返回的状态应与交互开始时的初始状态完全相同', () => {
        fc.assert(
            fc.property(
                arbInteractionId(),
                arbInitialState(),
                arbSteps(),
                (interactionId, initialState, steps) => {
                    const manager = createLocalInteractionManager<TestState>({
                        interactions: {
                            COMMIT_TEST: testDeclaration,
                            SUBMIT_CHOICE: testDeclaration,
                            FINALIZE_SELECTION: testDeclaration,
                        },
                    });

                    // 开始交互
                    manager.begin(interactionId, initialState);
                    expect(manager.isActive()).toBe(true);

                    // 执行任意数量的中间步骤
                    for (const step of steps) {
                        manager.update(step.stepType, step.payload);
                    }

                    // 取消交互
                    const restored = manager.cancel();

                    // 返回的状态应与初始状态完全相同（深度相等）
                    expect(restored).toEqual(initialState);

                    // 交互应已结束
                    expect(manager.isActive()).toBe(false);
                    expect(manager.getState()).toBeNull();
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Feature: transport-latency-optimization, Property 8: 本地交互中间步骤不产生网络命令
// Validates: Requirements 3.2
// ============================================================================

describe('LocalInteractionManager — Property 8: 本地交互中间步骤不产生网络命令', () => {
    it('对于任意中间步骤，LocalInteractionManager.update 仅返回新的本地状态，不触发任何网络命令', () => {
        fc.assert(
            fc.property(
                arbInitialState(),
                arbSteps({ minLength: 1, maxLength: 20 }),
                (initialState, steps) => {
                    // 用 spy 监控 buildCommitPayload（只有 commit 时才应被调用）
                    const commitPayloadSpy = vi.fn();

                    const manager = createLocalInteractionManager<TestState>({
                        interactions: { COMMIT_TEST: testDeclaration },
                        buildCommitPayload: (...args) => {
                            commitPayloadSpy(...args);
                            return { steps: args[1] };
                        },
                    });

                    manager.begin('COMMIT_TEST', initialState);

                    // 执行所有中间步骤
                    for (const step of steps) {
                        const newState = manager.update(step.stepType, step.payload);

                        // update 应返回新的本地状态（非 null）
                        expect(newState).toBeDefined();
                        expect(newState).not.toBeNull();
                    }

                    // 在整个 update 过程中，buildCommitPayload 不应被调用
                    // （buildCommitPayload 只在 commit 时调用，代表产生网络命令）
                    expect(commitPayloadSpy).not.toHaveBeenCalled();

                    // 交互仍然活跃（未提交、未取消）
                    expect(manager.isActive()).toBe(true);

                    // 清理
                    manager.cancel();
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Feature: transport-latency-optimization, Property 9: 本地交互提交产生单一命令
// Validates: Requirements 3.3
// ============================================================================

describe('LocalInteractionManager — Property 9: 本地交互提交产生单一命令', () => {
    it('对于任意已完成的本地交互（经过任意数量的中间步骤），commit 应恰好产生一个命令结果', () => {
        fc.assert(
            fc.property(
                arbInteractionId(),
                arbInitialState(),
                arbSteps(),
                (interactionId, initialState, steps) => {
                    const manager = createLocalInteractionManager<TestState>({
                        interactions: {
                            COMMIT_TEST: testDeclaration,
                            SUBMIT_CHOICE: testDeclaration,
                            FINALIZE_SELECTION: testDeclaration,
                        },
                    });

                    manager.begin(interactionId, initialState);

                    // 执行任意数量的中间步骤
                    for (const step of steps) {
                        manager.update(step.stepType, step.payload);
                    }

                    // 提交交互
                    const result = manager.commit();

                    // 恰好产生一个命令结果
                    expect(result).toBeDefined();

                    // commandType 应为字符串
                    expect(typeof result.commandType).toBe('string');
                    expect(result.commandType.length).toBeGreaterThan(0);

                    // payload 应已定义
                    expect(result.payload).toBeDefined();

                    // commit 后交互应已结束
                    expect(manager.isActive()).toBe(false);
                    expect(manager.getState()).toBeNull();

                    // 再次 commit 应抛出错误（不会产生第二个命令）
                    expect(() => manager.commit()).toThrow();
                },
            ),
            { numRuns: 100 },
        );
    });
});
