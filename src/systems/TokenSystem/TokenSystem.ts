/**
 * TokenSystem - 统一的 Token 系统实现
 * 
 * 合并了原 StatusEffectSystem 和 TokenSystem 的功能
 * 支持 buff/debuff/consumable 三种类型的 Token
 */

import type { TokenDef, TokenState, TokenInstance, ITokenSystem, TokenCategory, PassiveTiming } from './types';

/**
 * Token 系统实现
 */
class TokenSystemImpl implements ITokenSystem {
    private definitions = new Map<string, TokenDef>();

    // ============ 定义管理 ============

    /**
     * 注册 Token 定义
     */
    registerDefinition(def: TokenDef): void {
        if (this.definitions.has(def.id)) {
            console.warn(`[TokenSystem] Token ${def.id} 已存在，将被覆盖`);
        }
        this.definitions.set(def.id, def);
    }

    /**
     * 批量注册 Token 定义
     */
    registerDefinitions(defs: TokenDef[]): void {
        defs.forEach(def => this.registerDefinition(def));
    }

    /**
     * 获取 Token 定义
     */
    getDefinition(id: string): TokenDef | undefined {
        return this.definitions.get(id);
    }

    /**
     * 获取所有 Token 定义
     */
    getAllDefinitions(): TokenDef[] {
        return Array.from(this.definitions.values());
    }

    /**
     * 获取指定类型的 Token 定义
     */
    getDefinitionsByCategory(category: TokenCategory): TokenDef[] {
        return Array.from(this.definitions.values()).filter(def => def.category === category);
    }

    // ============ 状态管理 ============

    /**
     * 授予 Token
     */
    grant(tokens: TokenState, tokenId: string, amount: number, def?: TokenDef): TokenState {
        const definition = def ?? this.definitions.get(tokenId);
        const currentAmount = tokens[tokenId] ?? 0;
        const maxStacks = definition?.stackLimit || Infinity;
        const newAmount = Math.min(currentAmount + amount, maxStacks);

        return {
            ...tokens,
            [tokenId]: newAmount,
        };
    }

    /**
     * 消耗 Token
     */
    consume(tokens: TokenState, tokenId: string, amount = 1): { tokens: TokenState; consumed: number } {
        const currentAmount = tokens[tokenId] ?? 0;
        const consumed = Math.min(currentAmount, amount);
        const newAmount = currentAmount - consumed;

        return {
            tokens: {
                ...tokens,
                [tokenId]: newAmount,
            },
            consumed,
        };
    }

    /**
     * 检查是否有足够的 Token
     */
    hasEnough(tokens: TokenState, tokenId: string, amount = 1): boolean {
        return (tokens[tokenId] ?? 0) >= amount;
    }

    // ============ debuff/buff 特有操作 ============

    /**
     * 获取指定时机触发的 Token
     */
    getTokensByTiming(tokens: TokenState, timing: PassiveTiming): Array<{ def: TokenDef; stacks: number }> {
        const result: Array<{ def: TokenDef; stacks: number }> = [];
        
        for (const [tokenId, stacks] of Object.entries(tokens)) {
            if (stacks <= 0) continue;
            
            const def = this.definitions.get(tokenId);
            if (!def) continue;
            
            // 检查被动触发配置
            if (def.passiveTrigger?.timing === timing) {
                result.push({ def, stacks });
            }
        }
        
        return result;
    }

    /**
     * 获取可被移除的负面 Token
     */
    getRemovableDebuffs(tokens: TokenState): Array<{ def: TokenDef; stacks: number }> {
        const result: Array<{ def: TokenDef; stacks: number }> = [];
        
        for (const [tokenId, stacks] of Object.entries(tokens)) {
            if (stacks <= 0) continue;
            
            const def = this.definitions.get(tokenId);
            if (!def) continue;
            
            // 检查是否为可移除的 debuff
            if (def.category === 'debuff' && def.passiveTrigger?.removable) {
                result.push({ def, stacks });
            }
        }
        
        return result;
    }

    /**
     * 回合结束时处理持续时间
     */
    tickDurations(instances: TokenInstance[]): { updated: TokenInstance[]; expired: string[] } {
        const expired: string[] = [];
        const updated = instances
            .map(instance => {
                if (instance.remainingDuration === undefined) return instance;
                
                const newDuration = instance.remainingDuration - 1;
                if (newDuration <= 0) {
                    expired.push(instance.defId);
                    return null;
                }
                
                return {
                    ...instance,
                    remainingDuration: newDuration,
                };
            })
            .filter((instance): instance is TokenInstance => instance !== null);
        
        return { updated, expired };
    }
}

/** Token 系统单例 */
export const tokenSystem = new TokenSystemImpl();
