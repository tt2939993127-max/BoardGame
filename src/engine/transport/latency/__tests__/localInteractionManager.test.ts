/**
 * LocalInteractionManager 属性测试 + 单元测试
 *
 * Feature: transport-latency-optimization
 * Property 7：本地交互取消的往返一致性
 * Property 8：本地交互中间步骤不产生网络命令
 * Property 9：本地交互提交产生单一命令
 * Validates: Requirements 3.1–3.4
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { createLocalInteractionManager } from '../localInteractionManager';
import type { LocalInteractionDeclaration } from '../types';

// ============================================================================
// 测试用 localReducer：简单累加器
// ============================================================================

interface CounterState {
    count: number;
    history: string[];
}

const counterDeclaration: LocalInteractionDeclaration<CounterState> = {
    localSteps: ['INCREMENT', 'DECREMENT', 'RESET'],
    localReducer: (state, stepType, payload) => {
        const delta = (payload as { delta?: number })?.delta ?? 1;
        switch (stepType) {
            case 'INCREMENT':
                return { count: state.count + delta, history: [...state.history, `+${delta}`] };
            case 'DECREMENT':
                return { count: state.count - delta, history: [...state.history, `-${delta}`] };
            case 'RESET':
                return { count: 0, history: [...state.history, 'reset'] };
            default:
                return state;
        }
    },
};

// ============================================================================
// Property 7：本地交互取消的往返一致性
// ============================================================================

describe('LocalInteractionManager — Property 7: 取消的往返一致性', () => {
    it('任意步骤后取消，状态恢复到初始快照', () => {
        fc.assert(
            fc.property(
                // 生成 0~10 个随机步骤
                fc.array(
                    fc.record({
                        stepType: fc.constantFrom('INCREMENT', 'DECREMENT', 'RESET'),
                        payload: fc.record({ delta: fc.integer({ min: 1, max: 5 }) }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                fc.integer({ min: -100, max: 100 }), // 初始 count
                (steps, initialCount) => {
                    const manager = createLocalInteractionManager<CounterState>({
                        interactions: { 'COMMIT_COUNTER': counterDeclaration },
                    });

                    const initialState: CounterState = { count: initialCount, history: [] };
                    manager.begin('COMMIT_COUNTER', initialState);

                    // 执行任意步骤
                    for (const step of steps) {
                        manager.update(step.stepType, step.payload);
                    }

                    // 取消后状态应与初始完全相同
                    const restored = manager.cancel();
                    expect(restored).toEqual(initialState);
                    expect(manager.isActive()).toBe(false);
                    expect(manager.getState()).toBeNull();
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 8：本地交互中间步骤不产生网络命令
// ============================================================================

describe('LocalInteractionManager — Property 8: 中间步骤不产生网络命令', () => {
    it('update 调用不触发任何外部副作用', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        stepType: fc.constantFrom('INCREMENT', 'DECREMENT'),
                        payload: fc.record({ delta: fc.integer({ min: 1, max: 3 }) }),
                    }),
                    { minLength: 1, maxLength: 10 },
                ),
                (steps) => {
                    // 用 spy 模拟网络发送
                    const networkSpy = vi.fn();

                    const manager = createLocalInteractionManager<CounterState>({
                        interactions: { 'COMMIT_COUNTER': counterDeclaration },
                        // buildCommitPayload 不应在 update 时被调用
                        buildCommitPayload: (id, s, state) => {
                            networkSpy(id, s, state);
                            return { steps: s };
                        },
                    });

                    manager.begin('COMMIT_COUNTER', { count: 0, history: [] });

                    for (const step of steps) {
                        manager.update(step.stepType, step.payload);
                    }

                    // update 期间不应触发 buildCommitPayload（即不产生网络命令）
                    expect(networkSpy).not.toHaveBeenCalled();

                    manager.cancel();
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 9：本地交互提交产生单一命令
// ============================================================================

describe('LocalInteractionManager — Property 9: 提交产生单一命令', () => {
    it('任意步骤后 commit，恰好产生一个命令', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        stepType: fc.constantFrom('INCREMENT', 'DECREMENT'),
                        payload: fc.record({ delta: fc.integer({ min: 1, max: 3 }) }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                (steps) => {
                    const manager = createLocalInteractionManager<CounterState>({
                        interactions: { 'COMMIT_COUNTER': counterDeclaration },
                    });

                    manager.begin('COMMIT_COUNTER', { count: 0, history: [] });

                    for (const step of steps) {
                        manager.update(step.stepType, step.payload);
                    }

                    const result = manager.commit();

                    // 恰好产生一个命令
                    expect(result).toBeDefined();
                    expect(result.commandType).toBe('COMMIT_COUNTER');
                    expect(result.payload).toBeDefined();

                    // commit 后交互结束
                    expect(manager.isActive()).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ===============================================================

// ============================================================================
// 单元测试 — Task 3.5
// ============================================================================

describe('LocalInteractionManager 单元测试', () => {
    const createManager = () =>
        createLocalInteractionManager<CounterState>({
            interactions: { 'COMMIT_COUNTER': counterDeclaration },
        });

    it('空步骤 commit 返回有效命令', () => {
        const manager = createManager();
        manager.begin('COMMIT_COUNTER', { count: 0, history: [] });

        const result = manager.commit();
        expect(result.commandType).toBe('COMMIT_COUNTER');
        expect(result.payload).toEqual({ steps: [] });
        expect(manager.isActive()).toBe(false);
    });

    it('重复 begin 覆盖前一个交互', () => {
        const manager = createManager();

        manager.begin('COMMIT_COUNTER', { count: 10, history: [] });
        manager.update('INCREMENT', { delta: 1 });
        expect(manager.getState()!.count).toBe(11);

        // 第二次 begin 覆盖
        manager.begin('COMMIT_COUNTER', { count: 99, history: [] });
        expect(manager.getState()!.count).toBe(99);
        expect(manager.isActive()).toBe(true);

        // cancel 恢复到第二次 begin 的初始状态
        const restored = manager.cancel();
        expect(restored!.count).toBe(99);
    });

    it('cancel 后可以 begin 新交互', () => {
        const manager = createManager();

        manager.begin('COMMIT_COUNTER', { count: 0, history: [] });
        manager.update('INCREMENT', { delta: 5 });
        manager.cancel();

        expect(manager.isActive()).toBe(false);

        manager.begin('COMMIT_COUNTER', { count: 100, history: [] });
        expect(manager.isActive()).toBe(true);
        expect(manager.getState()!.count).toBe(100);

        const result = manager.commit();
        expect(result.commandType).toBe('COMMIT_COUNTER');
    });

    it('localReducer 抛出异常时自动取消交互', () => {
        const throwingDeclaration: LocalInteractionDeclaration<CounterState> = {
            localSteps: ['BOOM'],
            localReducer: (_state, stepType) => {
                if (stepType === 'BOOM') {
                    throw new Error('reducer 爆炸');
                }
                return _state;
            },
        };

        const manager = createLocalInteractionManager<CounterState>({
            interactions: { 'COMMIT_BOOM': throwingDeclaration },
        });

        manager.begin('COMMIT_BOOM', { count: 42, history: [] });
        expect(manager.isActive()).toBe(true);

        expect(() => manager.update('BOOM', {})).toThrow('reducer 爆炸');

        expect(manager.isActive()).toBe(false);
        expect(manager.getState()).toBeNull();
    });

    it('无活跃交互时 commit 抛出异常', () => {
        const manager = createManager();
        expect(() => manager.commit()).toThrow('没有活跃交互');
    });

    it('无活跃交互时 update 抛出异常', () => {
        const manager = createManager();
        expect(() => manager.update('INCREMENT', { delta: 1 })).toThrow('没有活跃交互');
    });

    it('无活跃交互时 cancel 返回 null', () => {
        const manager = createManager();
        expect(manager.cancel()).toBeNull();
    });

    it('getInteractionState 返回完整交互状态', () => {
        const manager = createManager();
        manager.begin('COMMIT_COUNTER', { count: 0, history: [] });
        manager.update('INCREMENT', { delta: 3 });

        const state = manager.getInteractionState();
        expect(state).not.toBeNull();
        expect(state!.interactionId).toBe('COMMIT_COUNTER');
        expect(state!.initialSnapshot).toEqual({ count: 0, history: [] });
        expect(state!.currentState).toEqual({ count: 3, history: ['+3'] });
        expect(state!.steps).toHaveLength(1);
        expect(state!.steps[0]).toEqual({ stepType: 'INCREMENT', payload: { delta: 3 } });
    });
});
