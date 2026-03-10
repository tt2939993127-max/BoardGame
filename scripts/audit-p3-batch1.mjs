#!/usr/bin/env node
/**
 * P3 Batch 1 审计脚本 - 页面组件
 * 快速扫描删除内容，重点关注 API 变更
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const COMMIT = '6ea1f9f';

// P3 Batch 1: 页面组件
const files = [
    { path: 'src/pages/admin/Matches.tsx', deletions: 458, risk: 'medium' },
    { path: 'src/pages/MatchRoom.tsx', deletions: 91, risk: 'medium' },
    { path: 'src/pages/admin/Feedback.tsx', deletions: 70, risk: 'low' },
    { path: 'src/pages/admin/index.tsx', deletions: 70, risk: 'low' },
    { path: 'src/pages/admin/Notifications.tsx', deletions: 30, risk: 'low' },
    { path: 'src/pages/Home.tsx', deletions: 25, risk: 'low' },
    { path: 'src/pages/devtools/AudioBrowser.tsx', deletions: 2, risk: 'low' },
];

console.log('正在审计 P3 Batch 1 - 页面组件...\n');

const results = [];

for (const file of files) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`审计文件: ${file.path}`);
    console.log(`删除行数: ${file.deletions} | 风险等级: ${file.risk}`);
    console.log('='.repeat(80));

    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);

    // 检查文件是否存在
    if (!exists) {
        console.log('❌ 文件不存在（已被完全删除）');
        results.push({
            file: file.path,
            status: '❌ 文件不存在',
            decision: '✅ 保持删除',
            reason: '文件已被完全删除',
            apiChanges: [],
            uiChanges: [],
        });
        continue;
    }

    // 获取删除的内容（前 30 行）
    try {
        const diff = execSync(
            `git diff ${COMMIT}^..${COMMIT} -- "${file.path}"`,
            { cwd: rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        );

        const deletedLines = diff
            .split('\n')
            .filter(line => line.startsWith('-') && !line.startsWith('---'))
            .slice(0, 30);

        console.log('\n删除内容预览（前 30 行）:');
        console.log(deletedLines.join('\n'));

        // 快速分析
        const apiChanges = [];
        const uiChanges = [];

        // 检查 API 变更
        if (diff.includes('fetch') || diff.includes('axios') || diff.includes('api')) {
            apiChanges.push('包含 API 调用变更');
        }
        if (diff.includes('socket') || diff.includes('emit') || diff.includes('on(')) {
            apiChanges.push('包含 Socket 通信变更');
        }

        // 检查 UI 变更
        if (diff.includes('useState') || diff.includes('useEffect')) {
            uiChanges.push('包含 React Hooks 变更');
        }
        if (diff.includes('className') || diff.includes('style')) {
            uiChanges.push('包含样式变更');
        }

        // 判断决策
        let decision = '✅ 保持删除';
        let reason = 'POD 相关代码清理';

        if (apiChanges.length > 0) {
            decision = '⚠️ 需要检查';
            reason = `包含 API 变更: ${apiChanges.join(', ')}`;
        }

        console.log(`\n决策: ${decision}`);
        console.log(`原因: ${reason}`);
        if (apiChanges.length > 0) {
            console.log(`API 变更: ${apiChanges.join(', ')}`);
        }
        if (uiChanges.length > 0) {
            console.log(`UI 变更: ${uiChanges.join(', ')}`);
        }

        results.push({
            file: file.path,
            status: '✅ 文件存在',
            decision,
            reason,
            apiChanges,
            uiChanges,
        });
    } catch (error) {
        console.error(`❌ 审计失败: ${error.message}`);
        results.push({
            file: file.path,
            status: '❌ 审计失败',
            decision: '⚠️ 需要手动检查',
            reason: error.message,
            apiChanges: [],
            uiChanges: [],
        });
    }
}

// 生成总结
console.log('\n\n' + '='.repeat(80));
console.log('P3 Batch 1 审计总结');
console.log('='.repeat(80));

const keepDeleted = results.filter(r => r.decision === '✅ 保持删除').length;
const needCheck = results.filter(r => r.decision === '⚠️ 需要检查').length;
const needRestore = results.filter(r => r.decision === '❌ 需要恢复').length;

console.log(`\n总文件数: ${results.length}`);
console.log(`✅ 保持删除: ${keepDeleted} (${((keepDeleted / results.length) * 100).toFixed(1)}%)`);
console.log(`⚠️ 需要检查: ${needCheck} (${((needCheck / results.length) * 100).toFixed(1)}%)`);
console.log(`❌ 需要恢复: ${needRestore} (${((needRestore / results.length) * 100).toFixed(1)}%)`);

// 输出需要检查的文件
if (needCheck > 0) {
    console.log('\n需要检查的文件:');
    results
        .filter(r => r.decision === '⚠️ 需要检查')
        .forEach(r => {
            console.log(`  - ${r.file}`);
            console.log(`    原因: ${r.reason}`);
        });
}

// 输出需要恢复的文件
if (needRestore > 0) {
    console.log('\n需要恢复的文件:');
    results
        .filter(r => r.decision === '❌ 需要恢复')
        .forEach(r => {
            console.log(`  - ${r.file}`);
            console.log(`    原因: ${r.reason}`);
        });
}

console.log('\n审计完成！\n');
