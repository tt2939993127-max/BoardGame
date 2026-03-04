#!/usr/bin/env node

/**
 * P0 文件恢复验证脚本
 * 
 * 检查 P0 审计中标记为"需要恢复"的文件是否已经恢复
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// P0 审计中标记为需要恢复的关键函数/变量
const P0_CHECKS = [
    {
        file: 'src/games/dicethrone/domain/reduceCombat.ts',
        checks: [
            { name: 'shieldsConsumed', type: 'variable', critical: true },
            { name: 'reductionPercent', type: 'variable', critical: true },
            { name: 'percentShields', type: 'variable', critical: true },
            { name: 'fixedShields', type: 'variable', critical: true, aliases: ['valueShields'] }, // 重命名: valueShields → fixedShields
        ],
        description: '护盾系统'
    },
    {
        file: 'src/games/smashup/domain/reducer.ts',
        checks: [
            { name: 'processDestroyMoveCycle', type: 'function', critical: true },
            { name: 'filterProtectedReturnEvents', type: 'function', critical: true },
            { name: 'filterProtectedDeckBottomEvents', type: 'function', critical: true },
            { name: 'ACTIVATE_SPECIAL', type: 'command', critical: true },
        ],
        description: '消灭-移动循环和保护机制'
    },
    {
        file: 'src/pages/admin/Matches.tsx',
        checks: [
            { name: 'MatchDetailModal', type: 'component', critical: true },
            { name: 'fetchMatchDetail', type: 'function', critical: true },
            { name: 'detailMatch', type: 'state', critical: true },
            { name: 'detailLoading', type: 'state', critical: true },
        ],
        description: '管理员对局详情'
    },
    {
        file: 'src/games/dicethrone/Board.tsx',
        checks: [
            { name: 'tokenUsableOverrides', type: 'variable', critical: true },
            { name: 'isResponseAutoSwitch', type: 'variable', critical: false },
            { name: 'autoResponseEnabled', type: 'state', critical: false },
            { name: 'buildVariantToBaseIdMap', type: 'function', critical: false },
        ],
        description: 'DiceThrone Board 功能'
    },
    {
        file: 'src/games/smashup/__tests__/newOngoingAbilities.test.ts',
        checks: [
            { name: '伊万将军保护己方随从不被暗杀', type: 'test', critical: false },
            { name: 'processDestroyTriggers', type: 'test', critical: false },
        ],
        description: 'SmashUp ongoing 测试'
    },
    {
        file: 'src/games/smashup/__tests__/factionAbilities.test.ts',
        checks: [
            { name: 'dino_rampage', type: 'test', critical: false },
            { name: 'dino_survival_of_the_fittest', type: 'test', critical: false },
        ],
        description: 'SmashUp 派系测试'
    },
    {
        file: 'src/games/dicethrone/__tests__/monk-coverage.test.ts',
        checks: [
            { name: 'SKIP_TOKEN_RESPONSE', type: 'test', critical: false },
            { name: '和谐被闪避后仍获得太极', type: 'test', critical: false },
        ],
        description: 'DiceThrone Monk 测试'
    },
];

function checkFile(fileInfo) {
    const filePath = join(rootDir, fileInfo.file);
    
    if (!existsSync(filePath)) {
        return {
            file: fileInfo.file,
            exists: false,
            checks: [],
            status: '❌ 文件不存在'
        };
    }

    const content = readFileSync(filePath, 'utf-8');
    const results = fileInfo.checks.map(check => {
        // 检查主名称或别名
        let found = content.includes(check.name);
        if (!found && check.aliases) {
            found = check.aliases.some(alias => content.includes(alias));
        }
        return {
            name: check.name,
            type: check.type,
            critical: check.critical,
            found,
            status: found ? '✅' : (check.critical ? '❌' : '⚠️')
        };
    });

    const criticalMissing = results.filter(r => r.critical && !r.found).length;
    const nonCriticalMissing = results.filter(r => !r.critical && !r.found).length;
    
    let status;
    if (criticalMissing > 0) {
        status = `❌ 缺失 ${criticalMissing} 个关键项`;
    } else if (nonCriticalMissing > 0) {
        status = `⚠️ 缺失 ${nonCriticalMissing} 个非关键项`;
    } else {
        status = '✅ 完全恢复';
    }

    return {
        file: fileInfo.file,
        description: fileInfo.description,
        exists: true,
        checks: results,
        status
    };
}

function generateReport(results) {
    console.log('# P0 文件恢复验证报告\n');
    console.log(`**验证时间**: ${new Date().toISOString()}\n`);
    console.log('---\n');

    let totalFiles = results.length;
    let fullyRestored = 0;
    let partiallyRestored = 0;
    let notRestored = 0;
    let missing = 0;

    results.forEach(result => {
        if (!result.exists) {
            missing++;
        } else if (result.status.startsWith('✅')) {
            fullyRestored++;
        } else if (result.status.startsWith('⚠️')) {
            partiallyRestored++;
        } else {
            notRestored++;
        }
    });

    console.log('## 总体统计\n');
    console.log(`| 状态 | 文件数 | 占比 |`);
    console.log(`|------|--------|------|`);
    console.log(`| ✅ 完全恢复 | ${fullyRestored} | ${(fullyRestored/totalFiles*100).toFixed(1)}% |`);
    console.log(`| ⚠️ 部分恢复 | ${partiallyRestored} | ${(partiallyRestored/totalFiles*100).toFixed(1)}% |`);
    console.log(`| ❌ 未恢复 | ${notRestored} | ${(notRestored/totalFiles*100).toFixed(1)}% |`);
    console.log(`| ❌ 文件不存在 | ${missing} | ${(missing/totalFiles*100).toFixed(1)}% |`);
    console.log(`| **总计** | **${totalFiles}** | **100%** |\n`);

    console.log('---\n');
    console.log('## 详细检查结果\n');

    results.forEach((result, index) => {
        console.log(`### ${index + 1}. ${result.file}`);
        console.log(`**描述**: ${result.description}`);
        console.log(`**状态**: ${result.status}\n`);

        if (!result.exists) {
            console.log('❌ 文件不存在\n');
            return;
        }

        console.log('**检查项**:\n');
        result.checks.forEach(check => {
            const criticalTag = check.critical ? '(关键)' : '(可选)';
            console.log(`- ${check.status} \`${check.name}\` ${criticalTag} - ${check.type}`);
        });
        console.log('');
    });

    console.log('---\n');
    console.log('## 恢复建议\n');

    const criticalIssues = results.filter(r => r.status.startsWith('❌'));
    if (criticalIssues.length > 0) {
        console.log('### 🔴 立即修复（Critical）\n');
        criticalIssues.forEach(issue => {
            console.log(`- **${issue.file}**`);
            console.log(`  - 描述: ${issue.description}`);
            if (!issue.exists) {
                console.log(`  - 问题: 文件不存在`);
            } else {
                const missing = issue.checks.filter(c => c.critical && !c.found);
                console.log(`  - 缺失: ${missing.map(m => m.name).join(', ')}`);
            }
            console.log('');
        });
    }

    const warnings = results.filter(r => r.status.startsWith('⚠️'));
    if (warnings.length > 0) {
        console.log('### 🟡 建议修复（Optional）\n');
        warnings.forEach(warning => {
            console.log(`- **${warning.file}**`);
            console.log(`  - 描述: ${warning.description}`);
            const missing = warning.checks.filter(c => !c.found);
            console.log(`  - 缺失: ${missing.map(m => m.name).join(', ')}`);
            console.log('');
        });
    }

    const success = results.filter(r => r.status.startsWith('✅'));
    if (success.length > 0) {
        console.log('### ✅ 已完全恢复\n');
        success.forEach(s => {
            console.log(`- **${s.file}** - ${s.description}`);
        });
        console.log('');
    }

    console.log('---\n');
    console.log('## 结论\n');
    
    if (notRestored === 0 && missing === 0) {
        console.log('✅ **所有 P0 文件已完全恢复**\n');
    } else if (notRestored > 0 || missing > 0) {
        console.log(`❌ **仍有 ${notRestored + missing} 个文件需要恢复**\n`);
        console.log('建议按照上述"立即修复"清单进行恢复。\n');
    }

    if (partiallyRestored > 0) {
        console.log(`⚠️ **有 ${partiallyRestored} 个文件部分恢复**\n`);
        console.log('这些文件的非关键功能缺失，可以根据需要选择性恢复。\n');
    }
}

// 执行检查
console.log('正在检查 P0 文件恢复情况...\n');
const results = P0_CHECKS.map(checkFile);
generateReport(results);
