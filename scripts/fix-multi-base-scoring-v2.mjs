import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/domain/index.ts';
const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 找到 registerMultiBaseScoringInteractionHandler 函数的开始行
const startLineIndex = lines.findIndex(line => line.includes('export function registerMultiBaseScoringInteractionHandler'));
if (startLineIndex === -1) {
    console.error('❌ 未找到 registerMultiBaseScoringInteractionHandler 函数');
    process.exit(1);
}

// 找到 "// 1. 计分玩家选择的基地" 这一行
const targetLineIndex = lines.findIndex((line, idx) => 
    idx > startLineIndex && line.trim() === '// 1. 计分玩家选择的基地'
);

if (targetLineIndex === -1) {
    console.error('❌ 未找到目标注释行');
    process.exit(1);
}

// 在目标行之前插入新代码
const newLines = [
    '',
    '        // 【修复】提取延迟的 BASE_CLEARED/BASE_REPLACED 事件',
    '        const deferredEvents = (_iData?.continuationContext as any)?._deferredPostScoringEvents as ',
    '            { type: string; payload: unknown; timestamp: number }[] | undefined;',
    '        ',
    '        // 【修复】如果有延迟事件，先补发',
    '        if (deferredEvents && deferredEvents.length > 0) {',
    '            console.log(\'[multi_base_scoring] 补发延迟事件:\', deferredEvents.length);',
    '            events.push(...deferredEvents as SmashUpEvent[]);',
    '            ',
    '            // 立即 reduce 到本地 core 副本，确保后续逻辑使用最新状态',
    '            let updatedCore = currentState.core;',
    '            for (const evt of deferredEvents) {',
    '                updatedCore = reduce(updatedCore, evt as SmashUpEvent);',
    '            }',
    '            currentState = { ...currentState, core: updatedCore };',
    '        }',
];

// 插入新代码
lines.splice(targetLineIndex, 0, ...newLines);

// 写回文件
writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('✅ 修复完成：multi_base_scoring handler 补发延迟事件');
console.log(`   插入位置：第 ${targetLineIndex + 1} 行`);
