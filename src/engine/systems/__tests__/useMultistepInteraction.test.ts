/**
 * useMultistepInteraction hook 单元测试
 * 重点验证 getCompletedSteps 回调对 auto-confirm 的影响
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultistepInteraction } from '../useMultistepInteraction';
import type { InteractionDescriptor, MultistepChoiceData } from '../InteractionSystem';

// 模拟骰子修改场景的类型
interface DiceModifyResult {
    modifications: Record<number, number>;
    modCount: number;
}
interface DiceModifyStep {
    action: 'setAny';
    dieId: number;
    newValue: number;
}

function createDiceModifyInteraction(
    maxSteps: number,
    useGetCompletedSteps: boolean,
): InteractionDescriptor<MultistepChoiceData<DiceModifyStep, DiceModifyResult>> {
    return {
        id: 'test-dice-modify',
        kind: 'multistep-choice',
        playerId: '0',
        data: {
            title: '测试骰子修改',
            maxSteps,
            initialResult: { modifications: {}, modCount: 0 },
            localReducer: (current, step) => {
                const isNewDie = !(step.dieId in current.modifications);
                return {
                    modifications: { ...current.modifications, [step.dieId]: step.newValue },
                    modCount: isNewDie ? current.modCount + 1 : current.modCount,
                };
            },
            toCommands: (result) =>
                Object.entries(result.modifications).map(([dieId, newValue]) => ({
                    type: 'MODIFY_DIE',
                    payload: { dieId: Number(dieId), newValue },
                })),
            getCompletedSteps: useGetCompletedSteps
                ? (result) => result.modCount
                : undefined,
        },
    };
}

describe('useMultistepInteraction', () => {
    describe('getCompletedSteps 防止同一骰子多次调整触发提前 auto-confirm', () => {
        it('无 getCompletedSteps 时，对同一骰子 step 两次触发 auto-confirm（旧行为/bug）', async () => {
            const dispatch = vi.fn();
            const interaction = createDiceModifyInteraction(2, false);

            const { result } = renderHook(() =>
                useMultistepInteraction(interaction, dispatch),
            );

            // 对同一颗骰子（dieId=0）调整两次
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 3 }); });
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 5 }); });

            // 等待 queueMicrotask
            await vi.waitFor(() => {
                expect(dispatch).toHaveBeenCalled();
            });

            // 旧行为：stepCount=2 >= maxSteps=2，触发 auto-confirm
            // 只修改了 1 颗骰子但提前确认了（这是 bug）
            const calls = dispatch.mock.calls.map(c => c[0]);
            expect(calls).toContain('SYS_INTERACTION_CONFIRM');
            expect(result.current.result?.modCount).toBe(1); // 只改了 1 颗
        });

        it('有 getCompletedSteps 时，对同一骰子 step 两次不触发 auto-confirm', () => {
            const dispatch = vi.fn();
            const interaction = createDiceModifyInteraction(2, true);

            const { result } = renderHook(() =>
                useMultistepInteraction(interaction, dispatch),
            );

            // 对同一颗骰子（dieId=0）调整两次
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 3 }); });
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 5 }); });

            // 不应触发 auto-confirm（modCount=1 < maxSteps=2）
            expect(dispatch).not.toHaveBeenCalled();
            expect(result.current.stepCount).toBe(2);
            expect(result.current.result?.modCount).toBe(1);
        });

        it('有 getCompletedSteps 时，修改两颗不同骰子后触发 auto-confirm', async () => {
            const dispatch = vi.fn();
            const interaction = createDiceModifyInteraction(2, true);

            const { result } = renderHook(() =>
                useMultistepInteraction(interaction, dispatch),
            );

            // 修改两颗不同骰子
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 6 }); });
            act(() => { result.current.step({ action: 'setAny', dieId: 1, newValue: 6 }); });

            // 等待 queueMicrotask
            await vi.waitFor(() => {
                expect(dispatch).toHaveBeenCalled();
            });

            // modCount=2 >= maxSteps=2，触发 auto-confirm
            const calls = dispatch.mock.calls.map(c => c[0]);
            expect(calls).toContain('MODIFY_DIE');
            expect(calls).toContain('SYS_INTERACTION_CONFIRM');
            expect(result.current.result?.modCount).toBe(2);
        });

        it('有 getCompletedSteps 时，先调整同一骰子多次再改第二颗，正确触发 auto-confirm', async () => {
            const dispatch = vi.fn();
            const interaction = createDiceModifyInteraction(2, true);

            const { result } = renderHook(() =>
                useMultistepInteraction(interaction, dispatch),
            );

            // 对骰子 0 调整 3 次（模拟用户反复 +/-）
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 2 }); });
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 3 }); });
            act(() => { result.current.step({ action: 'setAny', dieId: 0, newValue: 4 }); });

            // 此时 modCount=1，不应 auto-confirm
            expect(dispatch).not.toHaveBeenCalled();

            // 修改第二颗骰子
            act(() => { result.current.step({ action: 'setAny', dieId: 2, newValue: 6 }); });

            // 等待 queueMicrotask
            await vi.waitFor(() => {
                expect(dispatch).toHaveBeenCalled();
            });

            // modCount=2 >= maxSteps=2，触发 auto-confirm
            const calls = dispatch.mock.calls.map(c => c[0]);
            expect(calls).toContain('SYS_INTERACTION_CONFIRM');
            expect(result.current.result?.modCount).toBe(2);
        });
    });
});
