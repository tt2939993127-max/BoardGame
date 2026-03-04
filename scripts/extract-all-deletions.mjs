#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('正在提取所有删除的代码...\n');

// 获取所有文件的变更统计
const numstat = execSync('git diff --numstat 6ea1f9f^..6ea1f9f', { encoding: 'utf-8' });
const lines = numstat.trim().split('\n');

const files = [];
for (const line of lines) {
  const parts = line.split(/\s+/);
  if (parts.length >= 3) {
    const add = parts[0] === '-' ? 0 : parseInt(parts[0]) || 0;
    const del = parts[1] === '-' ? 0 : parseInt(parts[1]) || 0;
    const path = parts.slice(2).join(' ');
    
    // 只关注有删除的文件
    if (del > 0) {
      files.push({ path, add, del, net: add - del });
    }
  }
}

// 按删除行数排序（从多到少）
files.sort((a, b) => b.del - a.del);

console.log(`找到 ${files.length} 个有删除代码的文件\n`);

// 生成报告
let report = `# POD 提交删除代码完整报告

## 文档说明

本文档列出所有被 POD 提交删除的代码，按删除行数排序。

**创建时间**: 2026-03-04  
**总文件数**: ${files.length} 个有删除的文件

---

## 删除代码统计

| 优先级 | 删除行数范围 | 文件数 |
|--------|--------------|--------|
| 🔴 P0 - 高 | ≥100 行 | ${files.filter(f => f.del >= 100).length} |
| 🟡 P1 - 中 | 50-99 行 | ${files.filter(f => f.del >= 50 && f.del < 100).length} |
| 🟢 P2 - 低 | 20-49 行 | ${files.filter(f => f.del >= 20 && f.del < 50).length} |
| ⚪ P3 - 微小 | <20 行 | ${files.filter(f => f.del < 20).length} |

---

## 按删除行数排序的文件清单

`;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const priority = file.del >= 100 ? '🔴 P0' : 
                   file.del >= 50 ? '🟡 P1' : 
                   file.del >= 20 ? '🟢 P2' : '⚪ P3';
  
  report += `### ${i + 1}. ${file.path}\n\n`;
  report += `**优先级**: ${priority}  \n`;
  report += `**变更**: +${file.add} -${file.del} (净: ${file.net >= 0 ? '+' : ''}${file.net})  \n`;
  report += `**审查状态**: ⏳ 待审查\n\n`;
  
  // 提取删除的代码（前30行）
  try {
    const diff = execSync(`git show 6ea1f9f -- "${file.path}"`, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 
    });
    
    const deletedLines = diff.split('\n')
      .filter(line => line.startsWith('-') && !line.startsWith('---'))
      .slice(0, 30);
    
    if (deletedLines.length > 0) {
      report += `**删除的代码（前30行）**:\n\n\`\`\`\n`;
      report += deletedLines.join('\n');
      report += `\n\`\`\`\n\n`;
      
      if (deletedLines.length === 30) {
        report += `*（还有更多删除的代码，共 ${file.del} 行）*\n\n`;
      }
    }
  } catch (error) {
    report += `*（无法提取删除的代码：${error.message}）*\n\n`;
  }
  
  report += `---\n\n`;
}

// 保存报告
writeFileSync('evidence/deletions-complete-report.md', report, 'utf-8');
console.log('✅ 已生成完整删除代码报告: evidence/deletions-complete-report.md');

// 生成 CSV 供进一步分析
const csv = 'Path,Add,Del,Net,Priority\n' + 
  files.map(f => {
    const priority = f.del >= 100 ? 'P0' : f.del >= 50 ? 'P1' : f.del >= 20 ? 'P2' : 'P3';
    return `"${f.path}",${f.add},${f.del},${f.net},${priority}`;
  }).join('\n');

writeFileSync('tmp/deletions-summary.csv', csv, 'utf-8');
console.log('✅ 已生成 CSV 摘要: tmp/deletions-summary.csv');

// 输出统计
console.log('\n=== 删除代码统计 ===');
console.log(`🔴 P0 (≥100行): ${files.filter(f => f.del >= 100).length} 文件`);
console.log(`🟡 P1 (50-99行): ${files.filter(f => f.del >= 50 && f.del < 100).length} 文件`);
console.log(`🟢 P2 (20-49行): ${files.filter(f => f.del >= 20 && f.del < 50).length} 文件`);
console.log(`⚪ P3 (<20行): ${files.filter(f => f.del < 20).length} 文件`);
console.log(`\n总计: ${files.length} 文件`);
