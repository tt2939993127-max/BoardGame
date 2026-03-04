import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/actionLog.ts';
const content = readFileSync(filePath, 'utf-8');

// 修复 ActionLog ID 生成逻辑，添加随机后缀确保唯一性
const fixed = content.replace(
    /id: `\$\{kind\}-\$\{entryActorId\}-\$\{entryTimestamp\}-\$\{index\}`/g,
    'id: `${kind}-${entryActorId}-${entryTimestamp}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`'
);

writeFileSync(filePath, fixed, 'utf-8');
console.log('✅ 修复完成：ActionLog ID 生成逻辑');
