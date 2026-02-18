/**
 * 状态注入器
 * 
 * 提供直接读写游戏状态的能力，绕过 WebSocket 同步。
 * 
 * @example
 * ```typescript
 * // E2E 测试中
 * const state = await window.__BG_TEST_HARNESS__.state.get();
 * state.players['0'].resources.hp = 10;
 * await window.__BG_TEST_HARNESS__.state.set(state);
 * ```
 */

export class StateInjector {
    private getStateFn?: () => any;
    private setStateFn?: (state: any) => void;

    /**
     * 注册状态访问器（由游戏引擎调用）
     */
    register(getState: () => any, setState: (state: any) => void) {
        this.getStateFn = getState;
        this.setStateFn = setState;
        console.log('[StateInjector] 状态访问器已注册');
    }

    /**
     * 获取当前状态
     */
    get(): any {
        if (!this.getStateFn) {
            throw new Error('[StateInjector] 状态访问器未注册，请确保游戏已加载');
        }
        const state = this.getStateFn();
        console.log('[StateInjector] 获取状态:', state);
        return state;
    }

    /**
     * 设置状态（完全替换）
     */
    set(state: any) {
        if (!this.setStateFn) {
            throw new Error('[StateInjector] 状态访问器未注册，请确保游戏已加载');
        }
        console.log('[StateInjector] 设置状态:', state);
        this.setStateFn(state);
    }

    /**
     * 修改状态（部分更新）
     * 
     * @example
     * ```typescript
     * // 只修改玩家 HP
     * harness.state.patch({
     *     players: {
     *         '0': { resources: { hp: 10 } }
     *     }
     * });
     * ```
     */
    patch(patch: any) {
        const current = this.get();
        const updated = this.deepMerge(current, patch);
        this.set(updated);
        console.log('[StateInjector] 应用补丁:', patch);
    }

    /**
     * 深度合并对象
     */
    private deepMerge(target: any, source: any): any {
        if (typeof target !== 'object' || target === null) return source;
        if (typeof source !== 'object' || source === null) return source;

        const result = Array.isArray(target) ? [...target] : { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * 检查状态访问器是否已注册
     */
    isRegistered(): boolean {
        return !!(this.getStateFn && this.setStateFn);
    }
}
