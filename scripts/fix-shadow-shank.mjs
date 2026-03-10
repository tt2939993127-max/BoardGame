import { readFileSync, writeFileSync } from 'fs';

const path = 'src/games/dicethrone/domain/customActions/shadow_thief.ts';
let content = readFileSync(path, 'utf-8');

// 查找并替换 handleShadowShankDamage 函数中的 bonusCp 逻辑
const lines = content.split('\n');
let inFunction = false;
let functionStart = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('function handleShadowShankDamage')) {
        inFunction = true;
        functionStart = i;
        braceCount = 0;
    }
    
    if (inFunction) {
        // 计算大括号
        for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
        
        // 删除 bonusCp 相关的行
        if (line.includes('const params = action.params')) {
            lines[i] = '    // bonusCp 参数已废弃：gainCp(3) 在 preDefense 阶段已执行，currentCp 已包含增益';
        } else if (line.includes('const bonusCp =')) {
            lines[i] = '    // 伤害计算：CP + 5';
        } else if (line.includes('const damageAmt = currentCp + bonusCp + 5;')) {
            lines[i] = '    const damageAmt = currentCp + 5;';
        }
        
        // 函数结束
        if (braceCount === 0 && line.includes('}')) {
            inFunction = false;
            break;
        }
    }
}

content = lines.join('\n');
writeFileSync(path, content, 'utf-8');
console.log('✅ 修复完成：移除 handleShadowShankDamage 中的 bonusCp 重复计算');
