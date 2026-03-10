#!/usr/bin/env node
/**
 * 审计所有 BONUS_DIE_ROLLED 事件的特效描述
 * 
 * 检查项：
 * 1. 是否有 effectKey
 * 2. effectKey 是否在 i18n 中定义
 * 3. 是否根据投掷结果显示不同的描述（如果有多种结果）
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const customActionsDir = 'src/games/dicethrone/domain/customActions';
const customActionsFiles = readdirSync(customActionsDir)
    .filter(f => f.endsWith('.ts'))
    .map(f => join(customActionsDir, f));

const zhI18n = JSON.parse(readFileSync('public/locales/zh-CN/game-dicethrone.json', 'utf-8'));
const enI18n = JSON.parse(readFileSync('public/locales/en/game-dicethrone.json', 'utf-8'));

const issues = [];
const bonusDieEvents = [];

// 解析所有 BONUS_DIE_ROLLED 事件
for (const file of customActionsFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // 查找 BONUS_DIE_ROLLED 事件
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("type: 'BONUS_DIE_ROLLED'") || line.includes('type: "BONUS_DIE_ROLLED"')) {
            // 向下查找 effectKey
            let effectKey = null;
            let contextLines = [];
            for (let j = i; j < Math.min(i + 20, lines.length); j++) {
                contextLines.push(lines[j]);
                const match = lines[j].match(/effectKey:\s*['"]([^'"]+)['"]/);
                if (match) {
                    effectKey = match[1];
                    break;
                }
                // 检查是否是动态 effectKey
                if (lines[j].includes('effectKey,') || lines[j].includes('effectKey:')) {
                    // 向上查找 effectKey 的赋值
                    for (let k = i - 1; k >= Math.max(0, i - 30); k--) {
                        const assignMatch = lines[k].match(/effectKey\s*=\s*['"]([^'"]+)['"]/);
                        if (assignMatch) {
                            effectKey = assignMatch[1];
                            break;
                        }
                        if (lines[k].includes('let effectKey') || lines[k].includes('const effectKey')) {
                            effectKey = '<dynamic>';
                            break;
                        }
                    }
                    break;
                }
            }
            
            // 向上查找函数名
            let functionName = null;
            for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
                const funcMatch = lines[j].match(/function\s+(\w+)/);
                if (funcMatch) {
                    functionName = funcMatch[1];
                    break;
                }
            }
            
            bonusDieEvents.push({
                file: file.replace('src/games/dicethrone/domain/customActions/', ''),
                function: functionName,
                line: i + 1,
                effectKey,
                context: contextLines.slice(0, 10).join('\n')
            });
        }
    }
}

console.log(`\n找到 ${bonusDieEvents.length} 个 BONUS_DIE_ROLLED 事件\n`);

// 检查每个事件
for (const event of bonusDieEvents) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`文件: ${event.file}`);
    console.log(`函数: ${event.function}`);
    console.log(`行号: ${event.line}`);
    console.log(`effectKey: ${event.effectKey}`);
    
    if (!event.effectKey) {
        issues.push({
            file: event.file,
            function: event.function,
            issue: '❌ 缺少 effectKey'
        });
        console.log('❌ 缺少 effectKey');
        continue;
    }
    
    if (event.effectKey === '<dynamic>') {
        console.log('✅ 使用动态 effectKey（根据投掷结果变化）');
        continue;
    }
    
    // 检查 i18n
    const i18nKey = event.effectKey.replace('bonusDie.effect.', '');
    const zhText = zhI18n.bonusDie?.effect?.[i18nKey];
    const enText = enI18n.bonusDie?.effect?.[i18nKey];
    
    if (!zhText && !enText) {
        issues.push({
            file: event.file,
            function: event.function,
            issue: `❌ i18n 缺失: ${i18nKey}`
        });
        console.log(`❌ i18n 缺失: ${i18nKey}`);
    } else {
        console.log(`✅ i18n 存在`);
        console.log(`   中文: ${zhText || '(缺失)'}`);
        console.log(`   英文: ${enText || '(缺失)'}`);
        
        // 检查是否只显示骰值，没有显示效果
        if (zhText && zhText.includes('{{value}}') && !zhText.includes('：') && !zhText.includes(':')) {
            issues.push({
                file: event.file,
                function: event.function,
                issue: `⚠️  可能缺少效果描述（只显示骰值）: ${zhText}`
            });
            console.log(`⚠️  可能缺少效果描述（只显示骰值）`);
        }
    }
}

// 输出问题汇总
console.log(`\n${'='.repeat(80)}`);
console.log(`\n问题汇总 (${issues.length} 个):\n`);

if (issues.length === 0) {
    console.log('✅ 没有发现问题');
} else {
    for (const issue of issues) {
        console.log(`${issue.file} - ${issue.function}`);
        console.log(`  ${issue.issue}\n`);
    }
}

// 输出所有 bonusDie.effect 的 i18n keys
console.log(`\n${'='.repeat(80)}`);
console.log(`\n所有 bonusDie.effect i18n keys:\n`);

const allKeys = new Set([
    ...Object.keys(zhI18n.bonusDie?.effect || {}),
    ...Object.keys(enI18n.bonusDie?.effect || {})
]);

for (const key of Array.from(allKeys).sort()) {
    const zh = zhI18n.bonusDie?.effect?.[key];
    const en = enI18n.bonusDie?.effect?.[key];
    console.log(`${key}:`);
    console.log(`  中文: ${zh || '(缺失)'}`);
    console.log(`  英文: ${en || '(缺失)'}`);
}
