#!/usr/bin/env node
/**
 * 修复多基地计分无限循环 bug
 * 
 * 问题根因：
 * 1. scoreOneBase 中 afterScoring 触发后，如果创建了交互（如大副移动），会延迟发出 BASE_CLEARED 事件
 * 2. 延迟事件存储在第一个交互的 continuationContext._deferredPostScoringEvents 中
 * 3. 但当有多个 afterScoring 交互时（如多个大副），第一个交互解决后没有传递延迟事件给下一个交互
 * 4. 导致最后一个交互解决时没有补发 BASE_CLEARED，scoringEligibleBaseIndices 没有更新
 * 5. getScoringEligibleBaseIndices 仍然返回已计分的基地，造成无限循环
 * 
 * 修复方案：
 * 在大副交互解决处理器中，检查是否有延迟事件，如果有则传递给下一个交互（如果队列中还有）
 * 或者直接补发（如果这是最后一个交互）。
 * 
 * 修复位置：src/games/smashup/abilities/pirates.ts pirate_first_mate_choose_base 交互解决处理器
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/abilities/pirates.ts';
const content = readFileSync(filePath, 'utf-8');

// 定位问题代码：大副交互解决处理器没有传递延迟事件
const oldCode = `    // 大副：选择目标基地后移动大副自身
    // 注意：BASE_CLEARED 可能已 reduce，计分基地已从 bases 数组移除，随从已进弃牌堆
    registerInteractionHandler('pirate_first_mate_choose_base', (state, _playerId, value, iData, _random, timestamp) => {
        const selected = value as { skip?: boolean; baseIndex?: number };
        if (selected.skip) return { state, events: [] };
        const { baseIndex: destBase } = selected;
        if (destBase === undefined) return undefined;
        const ctx = iData?.continuationContext as { mateUid: string; mateDefId: string; scoringBaseIndex: number } | undefined;
        if (!ctx) return undefined;
        const events: SmashUpEvent[] = [moveMinion(ctx.mateUid, ctx.mateDefId, ctx.scoringBaseIndex, destBase, 'pirate_first_mate', timestamp)];
        return { state, events };
    });`;

// 新代码：传递延迟事件给下一个交互或直接补发
const newCode = `    // 大副：选择目标基地后移动大副自身
    // 注意：BASE_CLEARED 可能已 reduce，计分基地已从 bases 数组移除，随从已进弃牌堆
    registerInteractionHandler('pirate_first_mate_choose_base', (state, _playerId, value, iData, _random, timestamp) => {
        const selected = value as { skip?: boolean; baseIndex?: number };
        if (selected.skip) {
            // 跳过时也需要传递延迟事件
            const deferredEvents = (iData?.continuationContext as any)?._deferredPostScoringEvents as 
                { type: string; payload: unknown; timestamp: number }[] | undefined;
            if (deferredEvents && deferredEvents.length > 0) {
                // 检查队列中是否还有其他交互
                const hasNextInteraction = state.sys.interaction?.queue && state.sys.interaction.queue.length > 0;
                if (hasNextInteraction) {
                    // 传递给下一个交互
                    const nextInteraction = state.sys.interaction!.queue[0];
                    if (nextInteraction?.data) {
                        const data = nextInteraction.data as Record<string, unknown>;
                        const ctx = (data.continuationContext ?? {}) as Record<string, unknown>;
                        ctx._deferredPostScoringEvents = deferredEvents;
                        data.continuationContext = ctx;
                    }
                    return { state, events: [] };
                } else {
                    // 这是最后一个交互，直接补发延迟事件
                    return { state, events: deferredEvents as any[] };
                }
            }
            return { state, events: [] };
        }
        const { baseIndex: destBase } = selected;
        if (destBase === undefined) return undefined;
        const ctx = iData?.continuationContext as { mateUid: string; mateDefId: string; scoringBaseIndex: number; _deferredPostScoringEvents?: any[] } | undefined;
        if (!ctx) return undefined;
        const events: SmashUpEvent[] = [moveMinion(ctx.mateUid, ctx.mateDefId, ctx.scoringBaseIndex, destBase, 'pirate_first_mate', timestamp)];
        
        // 【修复】传递延迟事件给下一个交互或直接补发
        const deferredEvents = ctx._deferredPostScoringEvents;
        if (deferredEvents && deferredEvents.length > 0) {
            // 检查队列中是否还有其他交互
            const hasNextInteraction = state.sys.interaction?.queue && state.sys.interaction.queue.length > 0;
            if (hasNextInteraction) {
                // 传递给下一个交互
                const nextInteraction = state.sys.interaction!.queue[0];
                if (nextInteraction?.data) {
                    const data = nextInteraction.data as Record<string, unknown>;
                    const nextCtx = (data.continuationContext ?? {}) as Record<string, unknown>;
                    nextCtx._deferredPostScoringEvents = deferredEvents;
                    data.continuationContext = nextCtx;
                }
            } else {
                // 这是最后一个交互，直接补发延迟事件
                events.push(...deferredEvents as SmashUpEvent[]);
            }
        }
        
        return { state, events };
    });`;

if (!content.includes(oldCode)) {
    console.error('❌ 未找到目标代码，可能已经修复或代码结构已变更');
    process.exit(1);
}

const newContent = content.replace(oldCode, newCode);

writeFileSync(filePath, newContent, 'utf-8');

console.log('✅ 修复完成！');
console.log('');
console.log('修复内容：');
console.log('- 在大副交互解决处理器中，检查是否有延迟事件');
console.log('- 如果队列中还有其他交互，传递延迟事件给下一个交互');
console.log('- 如果这是最后一个交互，直接补发延迟事件');
console.log('- 确保 BASE_CLEARED 事件最终被补发，scoringEligibleBaseIndices 被更新');
console.log('- 防止 getScoringEligibleBaseIndices 返回已计分的基地，避免无限循环');
