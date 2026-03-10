import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/domain/index.ts';
const content = readFileSync(filePath, 'utf-8');

// 在 registerMultiBaseScoringInteractionHandler 函数中添加延迟事件处理
const oldCode = `export function registerMultiBaseScoringInteractionHandler(): void {
    registerInteractionHandler('multi_base_scoring', (state, playerId, value, _iData, random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const events: SmashUpEvent[] = [];
        let currentState = state;
        let currentBaseDeck = state.core.baseDeck;

        // 1. 计分玩家选择的基地`;

const newCode = `export function registerMultiBaseScoringInteractionHandler(): void {
    registerInteractionHandler('multi_base_scoring', (state, playerId, value, _iData, random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const events: SmashUpEvent[] = [];
        let currentState = state;
        let currentBaseDeck = state.core.baseDeck;

        // 【修复】提取延迟的 BASE_CLEARED/BASE_REPLACED 事件
        const deferredEvents = (_iData?.continuationContext as any)?._deferredPostScoringEvents as 
            { type: string; payload: unknown; timestamp: number }[] | undefined;
        
        // 【修复】如果有延迟事件，先补发
        if (deferredEvents && deferredEvents.length > 0) {
            console.log('[multi_base_scoring] 补发延迟事件:', deferredEvents.length);
            events.push(...deferredEvents as SmashUpEvent[]);
            
            // 立即 reduce 到本地 core 副本，确保后续逻辑使用最新状态
            let updatedCore = currentState.core;
            for (const evt of deferredEvents) {
                updatedCore = reduce(updatedCore, evt as SmashUpEvent);
            }
            currentState = { ...currentState, core: updatedCore };
        }

        // 1. 计分玩家选择的基地`;

const fixed = content.replace(oldCode, newCode);

if (fixed === content) {
    console.error('❌ 未找到目标代码，修复失败');
    process.exit(1);
}

writeFileSync(filePath, fixed, 'utf-8');
console.log('✅ 修复完成：multi_base_scoring handler 补发延迟事件');
