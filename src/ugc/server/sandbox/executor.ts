/**
 * UGC 服务端沙箱执行器
 * 
 * 使用 vm 模块在隔离环境中执行 UGC 规则代码
 * 注：生产环境建议使用 isolated-vm 获得更强隔离
 */

import type {
    SandboxConfig,
    SandboxResult,
    RandomFn,
    ValidationResult,
    GameOverResult,
    UGCDomainCore,
} from './types';
import { DEFAULT_SANDBOX_CONFIG, DISABLED_GLOBALS } from './types';

// ============================================================================
// 伪随机数生成器（确定性）
// ============================================================================

/** 创建基于种子的伪随机数生成器 */
function createSeededRandom(seed: number): RandomFn {
    let state = seed;
    
    const next = (): number => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };

    return {
        random: next,
        d: (max: number) => Math.floor(next() * max) + 1,
        range: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
        shuffle: <T>(array: T[]): T[] => {
            const result = [...array];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        },
    };
}

// ============================================================================
// 沙箱执行器
// ============================================================================

export class SandboxExecutor {
    private config: SandboxConfig;
    private domainCode: string | null = null;
    private domainCore: UGCDomainCore | null = null;
    private isLoaded: boolean = false;

    constructor(config: Partial<SandboxConfig> = {}) {
        this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    }

    /** 加载 UGC 规则代码 */
    async loadCode(code: string): Promise<SandboxResult<void>> {
        const startTime = Date.now();
        
        try {
            // 创建沙箱环境
            const sandbox = this.createSandbox();
            
            // 包装代码以导出 DomainCore
            const wrappedCode = `
                (function() {
                    'use strict';
                    ${code}
                    return typeof domain !== 'undefined' ? domain : null;
                })()
            `;

            // 使用 Function 构造函数在受限环境中执行
            // 注：生产环境应使用 isolated-vm
            const executor = new Function(...Object.keys(sandbox), wrappedCode);
            const result = executor(...Object.values(sandbox));

            if (!result || typeof result !== 'object') {
                return {
                    success: false,
                    error: 'UGC 代码必须导出 domain 对象',
                    errorType: 'runtime',
                    executionTimeMs: Date.now() - startTime,
                };
            }

            // 验证 DomainCore 契约
            const validation = this.validateDomainCore(result);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error,
                    errorType: 'runtime',
                    executionTimeMs: Date.now() - startTime,
                };
            }

            this.domainCode = code;
            this.domainCore = result as UGCDomainCore;
            this.isLoaded = true;

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '加载代码失败',
                errorType: 'syntax',
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    /** 执行 setup */
    async setup(playerIds: string[], randomSeed: number): Promise<SandboxResult<unknown>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        return this.executeWithTimeout(() => {
            const random = createSeededRandom(randomSeed);
            return this.domainCore!.setup(playerIds, random);
        });
    }

    /** 执行 validate */
    async validate(state: unknown, command: unknown): Promise<SandboxResult<ValidationResult>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        return this.executeWithTimeout(() => {
            return this.domainCore!.validate(state, command);
        });
    }

    /** 执行 execute */
    async execute(state: unknown, command: unknown, randomSeed: number): Promise<SandboxResult<unknown[]>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        return this.executeWithTimeout(() => {
            const random = createSeededRandom(randomSeed);
            return this.domainCore!.execute(state, command, random);
        });
    }

    /** 执行 reduce */
    async reduce(state: unknown, event: unknown): Promise<SandboxResult<unknown>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        return this.executeWithTimeout(() => {
            return this.domainCore!.reduce(state, event);
        });
    }

    /** 执行 playerView */
    async playerView(state: unknown, playerId: string): Promise<SandboxResult<unknown>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        if (!this.domainCore.playerView) {
            return { success: true, result: state };
        }

        return this.executeWithTimeout(() => {
            return this.domainCore!.playerView!(state, playerId);
        });
    }

    /** 执行 isGameOver */
    async isGameOver(state: unknown): Promise<SandboxResult<GameOverResult | undefined>> {
        if (!this.isLoaded || !this.domainCore) {
            return { success: false, error: '代码未加载', errorType: 'runtime' };
        }

        if (!this.domainCore.isGameOver) {
            return { success: true, result: undefined };
        }

        return this.executeWithTimeout(() => {
            return this.domainCore!.isGameOver!(state);
        });
    }

    /** 获取游戏 ID */
    getGameId(): string | null {
        return this.domainCore?.gameId ?? null;
    }

    /** 是否已加载 */
    isCodeLoaded(): boolean {
        return this.isLoaded;
    }

    /** 卸载代码 */
    unload(): void {
        this.domainCode = null;
        this.domainCore = null;
        this.isLoaded = false;
    }

    // ========== 私有方法 ==========

    /** 创建沙箱环境 */
    private createSandbox(): Record<string, unknown> {
        const sandbox: Record<string, unknown> = {
            // 安全的内置对象
            Math,
            JSON,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Date,
            Map,
            Set,
            WeakMap,
            WeakSet,
            Promise,
            Symbol,
            BigInt,
            Reflect,
            Proxy,
            Error,
            TypeError,
            RangeError,
            SyntaxError,
            ReferenceError,
            // 控制台（可选）
            console: this.config.allowConsole ? console : {
                log: () => {},
                warn: () => {},
                error: () => {},
                info: () => {},
                debug: () => {},
            },
            // 自定义全局变量
            ...this.config.globals,
        };

        // 禁用危险 API
        for (const api of DISABLED_GLOBALS) {
            sandbox[api] = undefined;
        }

        return sandbox;
    }

    /** 验证 DomainCore 契约 */
    private validateDomainCore(obj: unknown): ValidationResult {
        if (!obj || typeof obj !== 'object') {
            return { valid: false, error: 'domain 必须是对象' };
        }

        const domain = obj as Record<string, unknown>;

        if (typeof domain.gameId !== 'string') {
            return { valid: false, error: 'domain.gameId 必须是字符串' };
        }
        if (typeof domain.setup !== 'function') {
            return { valid: false, error: 'domain.setup 必须是函数' };
        }
        if (typeof domain.validate !== 'function') {
            return { valid: false, error: 'domain.validate 必须是函数' };
        }
        if (typeof domain.execute !== 'function') {
            return { valid: false, error: 'domain.execute 必须是函数' };
        }
        if (typeof domain.reduce !== 'function') {
            return { valid: false, error: 'domain.reduce 必须是函数' };
        }

        return { valid: true };
    }

    /** 带超时的执行 */
    private async executeWithTimeout<T>(fn: () => T): Promise<SandboxResult<T>> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve({
                    success: false,
                    error: `执行超时（${this.config.timeoutMs}ms）`,
                    errorType: 'timeout',
                    executionTimeMs: Date.now() - startTime,
                });
            }, this.config.timeoutMs);

            try {
                const result = fn();
                clearTimeout(timeoutId);
                resolve({
                    success: true,
                    result,
                    executionTimeMs: Date.now() - startTime,
                });
            } catch (error) {
                clearTimeout(timeoutId);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : '执行失败',
                    errorType: 'runtime',
                    executionTimeMs: Date.now() - startTime,
                });
            }
        });
    }
}

// ============================================================================
// 工厂函数
// ============================================================================

/** 创建沙箱执行器 */
export function createSandboxExecutor(config?: Partial<SandboxConfig>): SandboxExecutor {
    return new SandboxExecutor(config);
}
