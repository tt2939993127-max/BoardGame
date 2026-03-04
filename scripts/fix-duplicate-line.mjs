import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/domain/baseAbilities_expansion.ts';
const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 找到重复的注释行并删除
let fixed = false;
for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('── 印斯茅斯基地（Innsmouth Base）') && 
        lines[i+1].includes('── 印斯茅斯基地（Innsmouth Base）')) {
        // 删除第一行（重复的）
        lines.splice(i, 1);
        fixed = true;
        console.log(`✅ 删除第 ${i + 1} 行的重复注释`);
        break;
    }
}

if (!fixed) {
    console.log('❌ 未找到重复的注释行');
    process.exit(1);
}

writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('✅ 修复完成');
