#!/usr/bin/env node
/**
 * 深度审计脚本 - 分析所有 pendingAttack 相关的删除
 * 目标：找出所有可能被误删的代码
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const COMMIT = '6ea1f9f';

console.log('开始深度审计 pendingAttack 相关删除...\n');

// 获取完整的 diff
console.log('正在获取 diff...');
const diff = execSync(`git show ${COMMIT}`, { 
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024 
});

console.log(`Diff 大小: ${(diff.length / 1024 / 1024).toFixed(2)} MB\n`);

// 分析删除的行
const lines = diff.split('\n');
const deletions = [];
let currentFile = '';
let lineNumber = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跟踪当前文件
    if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) {
            currentFile = match[1];
            lineNumber = 0;
        }
    }
    
    // 跟踪行号
    if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)/);
        if (match) {
            lineNumber = parseInt(match[1]);
        }
    }
    
    // 收集删除的行
    if (line.startsWith('-') && !line.startsWith('---')) {
        if (line.includes('pendingAttack')) {
            deletions.push({
                file: currentFile,
                line: lineNumber,
                content: line.substring(1).trim(),
                context: {
                    before: lines[i - 2]?.substring(1) || '',
                    after: lines[i + 1]?.substring(1) || '',
                }
            });
        }
        lineNumber++;
    }
}

console.log(`找到 ${deletions.length} 行包含 pendingAttack 的删除\n`);

// 分类删除
const categories = {
    ultimate: [],           // Ultimate 相关
    sneak: [],             // 潜行相关
    tokenResponse: [],     // Token 响应相关
    validation: [],        // 验证相关
    flowControl: [],       // 流程控制
    test: [],              // 测试
    comment: [],           // 注释
    typeDefinition: [],    // 类型定义
    assignment: [],        // 赋值
    condition: [],         // 条件判断
    other: []              // 其他
};

for (const deletion of deletions) {
    const content = deletion.content.toLowerCase();
    const file = deletion.file.toLowerCase();
    
    // 分类
    if (content.includes('ultimate') || content.includes('isultimate')) {
        categories.ultimate.push(deletion);
    } else if (content.includes('sneak') || content.includes('潜行')) {
        categories.sneak.push(deletion);
    } else if (content.includes('token') || content.includes('响应')) {
        categories.tokenResponse.push(deletion);
    } else if (content.includes('validate') || content.includes('校验') || content.includes('验证')) {
        categories.validation.push(deletion);
    } else if (content.includes('if (') || content.includes('if(')) {
        categories.condition.push(deletion);
    } else if (file.includes('test.ts') || file.includes('spec.ts')) {
        categories.test.push(deletion);
    } else if (content.startsWith('//') || content.startsWith('*')) {
        categories.comment.push(deletion);
    } else if (content.includes('interface') || content.includes('type ') || content.includes(': ')) {
        categories.typeDefinition.push(deletion);
    } else if (content.includes('=') && !content.includes('==') && !content.includes('===')) {
        categories.assignment.push(deletion);
    } else if (content.includes('phase') || content.includes('阶段') || content.includes('flow')) {
        categories.flowControl.push(deletion);
    } else {
        categories.other.push(deletion);
    }
}

// 生成报告
let report = '# pendingAttack 删除深度审计报告\n\n';
report += `**审计时间**: ${new Date().toISOString()}\n`;
report += `**提交**: ${COMMIT}\n`;
report += `**总删除行数**: ${deletions.length}\n\n`;

report += '---\n\n';
report += '## 📊 分类统计\n\n';
report += '| 分类 | 数量 | 占比 | 风险等级 |\n';
report += '|------|------|------|----------|\n';

const total = deletions.length;
for (const [category, items] of Object.entries(categories)) {
    const count = items.length;
    const percentage = ((count / total) * 100).toFixed(1);
    let risk = '低';
    
    // 评估风险
    if (category === 'ultimate' || category === 'sneak' || category === 'validation') {
        risk = '高';
    } else if (category === 'condition' || category === 'flowControl' || category === 'tokenResponse') {
        risk = '中';
    } else if (category === 'test' || category === 'comment') {
        risk = '低';
    }
    
    report += `| ${category} | ${count} | ${percentage}% | ${risk} |\n`;
}

report += '\n---\n\n';

// 详细列出高风险删除
report += '## 🚨 高风险删除（需要人工审查）\n\n';

const highRiskCategories = ['ultimate', 'sneak', 'validation', 'condition', 'flowControl'];

for (const category of highRiskCategories) {
    const items = categories[category];
    if (items.length === 0) continue;
    
    report += `### ${category} (${items.length} 项)\n\n`;
    
    // 只显示前 20 项，避免报告过长
    const displayItems = items.slice(0, 20);
    
    for (const item of displayItems) {
        report += `**文件**: \`${item.file}\` (行 ${item.line})\n`;
        report += '```typescript\n';
        if (item.context.before) report += `  ${item.context.before}\n`;
        report += `- ${item.content}\n`;
        if (item.context.after) report += `  ${item.context.after}\n`;
        report += '```\n\n';
    }
    
    if (items.length > 20) {
        report += `_（还有 ${items.length - 20} 项未显示）_\n\n`;
    }
}

// 保存报告
const reportPath = 'evidence/pendingattack-deletions-summary.md';
writeFileSync(reportPath, report, 'utf-8');

console.log(`\n报告已保存到: ${reportPath}`);
console.log('\n分类统计:');
for (const [category, items] of Object.entries(categories)) {
    console.log(`  ${category}: ${items.length}`);
}

console.log('\n审计完成！');
