import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/dicethrone/debug-config.tsx';
const content = readFileSync(filePath, 'utf-8');

// 检查第 45 行附近的内容
const lines = content.split('\n');
console.log('Line 44:', JSON.stringify(lines[43]));
console.log('Line 45:', JSON.stringify(lines[44]));
console.log('Line 46:', JSON.stringify(lines[45]));
console.log('Line 47:', JSON.stringify(lines[46]));
console.log('Line 48:', JSON.stringify(lines[47]));

// 查找问题行
const problemLineIndex = lines.findIndex((line, idx) => {
    return idx >= 40 && idx <= 50 && line.includes('}, [playerDeck, deckIndex]);');
});

if (problemLineIndex !== -1) {
    console.log(`\nFound problem at line ${problemLineIndex + 1}`);
    console.log('Content:', JSON.stringify(lines[problemLineIndex]));
    
    // 检查是否有不可见字符
    const bytes = Buffer.from(lines[problemLineIndex], 'utf-8');
    console.log('Bytes:', bytes);
}

// 重新写入文件，确保使用 UTF-8 without BOM
writeFileSync(filePath, content, 'utf-8');
console.log('\nFile rewritten with UTF-8 encoding');
