/**
 * 本地交互管理器
 *
 * 管理多步交互的客户端本地状态，仅在最终确认时发送一条网络命令。
 * 中间步骤通过 localReducer 更新本地状态，不产生任何网络请求。
 *
 * 生命周期：begin → update(×N) → commit | cancel
 */

import type {
    LocalInteractionState,
    LocalInteractionStep,
    LocalInteractionCommitResult,
    LocalInteractionDeclaration,
} from './types';

// ============================================================================
// 公共接口
// ============================================================================

/** 本地交互管理器接口 */
export interface LocalInteractionManager<TLocalState = unknown> {
    /**
     * 开始一个本地交互
     *
     * 保存初始状态快照，记录对应的最终提交命令类型。
     * 若已有活跃交互，会覆盖（取消前一个）。
     */
    begin(interactionId: string, initialState: TLocalState): void;

    /**
     * 更新本地交互状态（中间步骤）
     *
     * 调用 localReducer 更新本地状态，记录步骤。
     * 不产生任何网络命令。
     *
     * @throws 若 localReducer 抛出异常，自动取消交互并重新抛出
     */
    update(stepType: string, payload: unknown): TLocalState;

    /**
     * 提交本地交互
     *
     * 基于累积步骤生成最终命令 payload，清理交互状态。
     * 调用方负责将返回的命令发送到网络。
     *
     * @throws 若当前没有活跃交互
     */
    commit(): LocalInteractionCommitResult;

    /**
     * 取消本地交互
     *
     * 恢复初始状态快照，清理交互状态。
     *
     * @returns 恢复后的初始状态（若无活跃交互则返回 null）
     */
    cancel(): TLocalState | null;

    /** 当前是否在本地交互中 */
    isActive(): boolean;

    /** 获取当前本地状态（若无活跃交互则返回 null） */
    getState(): TLocalState | null;

    /** 获取完整的交互状态（调试用） */
    getInteractionState(): LocalInteractionState<TLocalState> | null;
}

// ============================================================================
// 工厂函数配置
// ============================================================================

/** createLocalInteractionManager 的配置参数 */
export interface LocalInteractionManagerConfig<TLocalState = unknown> {
    /**
     * 本地交互声明映射
     *
     * key: 最终提交的命令类型
     * value: 该交互的中间步骤声明（localSteps + localReducer）
     */
    interactions: Record<string, LocalInteractionDeclaration<TLocalState>>;

    /**
     * 提交 payload 生成器（可选）
     *
     * 将累积的步骤转换为最终命令 payload。
     * 默认行为：将所有步骤的 payload 合并为数组 `{ steps: [...] }`。
     */
    buildCommitPayload?: (
        interactionId: string,
        steps: LocalInteractionStep[],
        finalState: TLocalState,
    ) => unknown;
}

// ============================================================================
// 工厂函数实现
// ============================================================================

/**
 * 创建本地交互管理器
 *
 * @param config 管理器配置
 * @returns LocalInteractionManager 实例
 */
export function createLocalInteractionManager<TLocalState = unknown>(
    config: LocalInteractionManagerConfig<TLocalState>,
): LocalInteractionManager<TLocalState> {
    /** 当前活跃的交互状态（null 表示无活跃交互） */
    let current: LocalInteractionState<TLocalState> | null = null;

    /**
     * 根据 interactionId 查找对应的交互声明
     *
     * 先按 commitCommandType 查找，再按 interactionId 查找。
     */
    function findDeclaration(
        interactionId: string,
        commitCommandType: string,
    ): LocalInteractionDeclaration<TLocalState> | undefined {
        // 优先按 commitCommandType 查找
        if (config.interactions[commitCommandType]) {
            return config.interactions[commitCommandType];
        }
        // 回退：按 interactionId 查找（兼容直接用 interactionId 作为 key 的场景）
        return config.interactions[interactionId];
    }

    /**
     * 默认 commit payload 生成器
     *
     * 将所有步骤的 payload 合并为 `{ steps: [...] }` 格式。
     */
    function defaultBuildCommitPayload(
        _interactionId: string,
        steps: LocalInteractionStep[],
        _finalState: TLocalState,
    ): unknown {
        return { steps: steps.map((s) => ({ type: s.stepType, payload: s.payload })) };
    }

    const buildCommitPayload = config.buildCommitPayload ?? defaultBuildCommitPayload;

    return {
        begin(interactionId: string, initialState: TLocalState): void {
            // 覆盖前一个交互（不报错，静默取消）
            current = {
                interactionId,
                initialSnapshot: initialState,
                currentState: initialState,
                steps: [],
                // 默认 commitCommandType 与 interactionId 相同
                // 调用方可通过 interactions 配置覆盖
                commitCommandType: interactionId,
            };
        },

        update(stepType: string, payload: unknown): TLocalState {
            if (!current) {
                throw new Error('[LocalInteractionManager] update 调用时没有活跃交互');
            }

            // 查找对应的交互声明
            const declaration = findDeclaration(current.interactionId, current.commitCommandType);
            if (!declaration) {
                throw new Error(
                    `[LocalInteractionManager] 未找到交互声明: interactionId=${current.interactionId}`,
                );
            }

            // 调用 localReducer 更新状态
            let newState: TLocalState;
            try {
                newState = declaration.localReducer(current.currentState, stepType, payload);
            } catch (err) {
                // localReducer 抛出异常时自动取消交互
                current = null;
                throw err;
            }

            // 记录步骤并更新状态
            current.steps.push({ stepType, payload });
            current.currentState = newState;

            return newState;
        },

        commit(): LocalInteractionCommitResult {
            if (!current) {
                throw new Error('[LocalInteractionManager] commit 调用时没有活跃交互');
            }

            const { interactionId, steps, currentState, commitCommandType } = current;

            // 生成最终命令 payload
            const payload = buildCommitPayload(interactionId, steps, currentState);

            // 清理交互状态
            current = null;

            return {
                commandType: commitCommandType,
                payload,
            };
        },

        cancel(): TLocalState | null {
            if (!current) {
                return null;
            }

            const { initialSnapshot } = current;
            current = null;
            return initialSnapshot;
        },

        isActive(): boolean {
            return current !== null;
        },

        getState(): TLocalState | null {
            return current?.currentState ?? null;
        },

        getInteractionState(): LocalInteractionState<TLocalState> | null {
            return current;
        },
    };
}
