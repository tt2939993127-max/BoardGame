import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/dicethrone/debug-config.tsx';
let content = readFileSync(filePath, 'utf-8');

// 找到并修复第 281-287 行
const lines = content.split('\n');

// 找到包含 "牌库剩余" 的行
const targetLineIndex = lines.findIndex(line => line.includes('牌库剩余'));

if (targetLineIndex !== -1) {
    console.log(`Found target at line ${targetLineIndex + 1}`);
    
    // 替换接下来的几行
    const fixedLines = [
        '                        <div className="text-[9px] text-green-600 mb-1">',
        '                            牌库剩余: {playerDeck.length} 张',
        '                            {cardInDeck ? (',
        '                                <span className="ml-1 text-green-700">| 牌库中存在: {resolveCardDisplayName(cardInDeck, t)}</span>',
        '                            ) : (',
        '                                <span className="ml-1 text-red-400">| 牌库中不存在该索引</span>',
        '                            )}',
        '                        </div>',
    ];
    
    // 替换从 targetLineIndex 开始的 8 行
    lines.splice(targetLineIndex, 8, ...fixedLines);
    
    content = lines.join('\n');
    writeFileSync(filePath, content, 'utf-8');
    console.log('✅ Fixed lines', targetLineIndex + 1, 'to', targetLineIndex + 8);
} else {
    console.log('❌ Could not find target line');
}
