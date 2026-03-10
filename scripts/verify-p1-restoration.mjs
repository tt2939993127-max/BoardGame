#!/usr/bin/env node

/**
 * P1 文件恢复验证脚本
 * 
 * 验证 P1 审计中标记为"需要修复"的 4 个文件是否已恢复
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// P1 需要修复的文件列表
const P1_FILES_TO_CHECK = [
    {
        path: 'src/games/smashup/ui/BaseZone.tsx',
        name: 'SmashUp BaseZone.tsx',
        checks: [
            {
                name: 'special 能力系统',
                patterns: [
                    'isSpecialLimitBlocked',
                    'canActivateSpecial',
                    'ACTIVATE_SPECIAL',
                ],
                description: '忍者侍从等带 special 标签的随从能力',
            },
        ],
    },
    {
        path: 'src/games/dicethrone/domain/customActions/shadow_thief.ts',
        name: 'DiceThrone shadow_thief customActions',
        checks: [
            {
                name: '伤害预估回调',
                patterns: [
                    'estimateDamage',
                    'estimateHalfCpDamage',
                    'estimateFullCpDamage',
                    'estimateCpPlus5Damage',
                ],
                description: 'Token 门控系统伤害预估',
            },
        ],
    },
    {
        path: 'src/games/dicethrone/heroes/paladin/abilities.ts',
        name: 'DiceThrone paladin abilities',
        checks: [
            {
                name: '音效配置',
                patterns: [
                    'PALADIN_SFX_LIGHT',
                    'PALADIN_SFX_HEAVY',
                    'PALADIN_SFX_ULTIMATE',
                    'sfxKey',
                ],
                description: '所有技能的音效配置',
            },
        ],
    },
    {
        path: 'src/games/dicethrone/domain/attack.ts',
        name: 'DiceThrone attack.ts',
        checks: [
            {
                name: '防御事件 Token 处理',
                patterns: [
                    'defenseEvents',
                    'TOKEN_GRANTED',
                    'tokenGrantedEvents',
                    'stateAfterDefense',
                ],
                description: '防御技能获得 Token 后的状态更新',
            },
        ],
    },
];

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(fileInfo) {
    const filePath = join(rootDir, fileInfo.path);
    
    log(`\n检查文件: ${fileInfo.name}`, 'cyan');
    log(`路径: ${fileInfo.path}`, 'blue');
    
    if (!existsSync(filePath)) {
        log(`  ❌ 文件不存在`, 'red');
        return { file: fileInfo.name, status: 'missing', checks: [] };
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const checkResults = [];
    
    for (const check of fileInfo.checks) {
        log(`\n  检查: ${check.name}`, 'yellow');
        log(`  描述: ${check.description}`, 'blue');
        
        const foundPatterns = [];
        const missingPatterns = [];
        
        for (const pattern of check.patterns) {
            const found = content.includes(pattern);
            if (found) {
                foundPatterns.push(pattern);
                log(`    ✅ ${pattern}`, 'green');
            } else {
                missingPatterns.push(pattern);
                log(`    ❌ ${pattern}`, 'red');
            }
        }
        
        const allFound = missingPatterns.length === 0;
        const status = allFound ? 'restored' : 'partial';
        
        checkResults.push({
            name: check.name,
            status,
            foundPatterns,
            missingPatterns,
            foundCount: foundPatterns.length,
            totalCount: check.patterns.length,
        });
        
        if (allFound) {
            log(`  ✅ ${check.name} 已完全恢复`, 'green');
        } else {
            log(`  ⚠️  ${check.name} 部分恢复 (${foundPatterns.length}/${check.patterns.length})`, 'yellow');
        }
    }
    
    const allChecksRestored = checkResults.every(c => c.status === 'restored');
    const fileStatus = allChecksRestored ? 'restored' : 'partial';
    
    return {
        file: fileInfo.name,
        path: fileInfo.path,
        status: fileStatus,
        checks: checkResults,
    };
}

function main() {
    log('='.repeat(80), 'cyan');
    log('P1 文件恢复验证', 'cyan');
    log('='.repeat(80), 'cyan');
    
    const results = [];
    
    for (const fileInfo of P1_FILES_TO_CHECK) {
        const result = checkFile(fileInfo);
        results.push(result);
    }
    
    // 生成总结报告
    log('\n' + '='.repeat(80), 'cyan');
    log('验证总结', 'cyan');
    log('='.repeat(80), 'cyan');
    
    const restoredFiles = results.filter(r => r.status === 'restored');
    const partialFiles = results.filter(r => r.status === 'partial');
    const missingFiles = results.filter(r => r.status === 'missing');
    
    log(`\n总文件数: ${results.length}`, 'blue');
    log(`✅ 完全恢复: ${restoredFiles.length} (${(restoredFiles.length / results.length * 100).toFixed(1)}%)`, 'green');
    log(`⚠️  部分恢复: ${partialFiles.length} (${(partialFiles.length / results.length * 100).toFixed(1)}%)`, 'yellow');
    log(`❌ 文件缺失: ${missingFiles.length} (${(missingFiles.length / results.length * 100).toFixed(1)}%)`, 'red');
    
    if (restoredFiles.length > 0) {
        log('\n完全恢复的文件:', 'green');
        for (const file of restoredFiles) {
            log(`  ✅ ${file.file}`, 'green');
        }
    }
    
    if (partialFiles.length > 0) {
        log('\n部分恢复的文件:', 'yellow');
        for (const file of partialFiles) {
            log(`  ⚠️  ${file.file}`, 'yellow');
            for (const check of file.checks) {
                if (check.status === 'partial') {
                    log(`      ${check.name}: ${check.foundCount}/${check.totalCount} 已恢复`, 'yellow');
                    if (check.missingPatterns.length > 0) {
                        log(`      缺失: ${check.missingPatterns.join(', ')}`, 'red');
                    }
                }
            }
        }
    }
    
    if (missingFiles.length > 0) {
        log('\n缺失的文件:', 'red');
        for (const file of missingFiles) {
            log(`  ❌ ${file.file}`, 'red');
            log(`      路径: ${file.path}`, 'blue');
        }
    }
    
    // 生成 Markdown 报告
    const mdReport = generateMarkdownReport(results);
    log('\n' + '='.repeat(80), 'cyan');
    log('Markdown 报告已生成（见下方）', 'cyan');
    log('='.repeat(80), 'cyan');
    console.log(mdReport);
    
    // 返回退出码
    const allRestored = results.every(r => r.status === 'restored');
    process.exit(allRestored ? 0 : 1);
}

function generateMarkdownReport(results) {
    const lines = [];
    
    lines.push('# P1 文件恢复验证报告');
    lines.push('');
    lines.push(`**验证时间**: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('## 统计数据');
    lines.push('');
    const restoredCount = results.filter(r => r.status === 'restored').length;
    const partialCount = results.filter(r => r.status === 'partial').length;
    const missingCount = results.filter(r => r.status === 'missing').length;
    
    lines.push('| 状态 | 文件数 | 占比 |');
    lines.push('|------|--------|------|');
    lines.push(`| ✅ 完全恢复 | ${restoredCount} | ${(restoredCount / results.length * 100).toFixed(1)}% |`);
    lines.push(`| ⚠️ 部分恢复 | ${partialCount} | ${(partialCount / results.length * 100).toFixed(1)}% |`);
    lines.push(`| ❌ 文件缺失 | ${missingCount} | ${(missingCount / results.length * 100).toFixed(1)}% |`);
    lines.push(`| **总计** | **${results.length}** | **100%** |`);
    lines.push('');
    
    lines.push('## 详细结果');
    lines.push('');
    
    for (const result of results) {
        const statusIcon = result.status === 'restored' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
        lines.push(`### ${statusIcon} ${result.file}`);
        lines.push('');
        lines.push(`**路径**: \`${result.path}\``);
        lines.push(`**状态**: ${result.status === 'restored' ? '完全恢复' : result.status === 'partial' ? '部分恢复' : '文件缺失'}`);
        lines.push('');
        
        if (result.checks && result.checks.length > 0) {
            lines.push('**检查项**:');
            lines.push('');
            for (const check of result.checks) {
                const checkIcon = check.status === 'restored' ? '✅' : '⚠️';
                lines.push(`- ${checkIcon} **${check.name}**: ${check.foundCount}/${check.totalCount} 已恢复`);
                if (check.missingPatterns && check.missingPatterns.length > 0) {
                    lines.push(`  - 缺失: ${check.missingPatterns.map(p => `\`${p}\``).join(', ')}`);
                }
            }
            lines.push('');
        }
    }
    
    lines.push('## 结论');
    lines.push('');
    const allRestored = results.every(r => r.status === 'restored');
    if (allRestored) {
        lines.push('✅ **所有 P1 文件已完全恢复，无需进一步操作。**');
    } else {
        lines.push('⚠️ **部分 P1 文件需要进一步恢复。**');
        lines.push('');
        lines.push('### 需要恢复的文件');
        lines.push('');
        for (const result of results) {
            if (result.status !== 'restored') {
                lines.push(`- ${result.file} (\`${result.path}\`)`);
            }
        }
    }
    
    return lines.join('\n');
}

main();
