import { readFileSync } from 'fs';

const filePath = 'src/games/dicethrone/debug-config.tsx';
const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Scanning for encoding issues...\n');

// 常见的乱码模式
const garbledPatterns = [
    /鐗屽簱/g,  // 牌库
    /涓瓨鍦?/g,  // 中存在
    /涓笉瀛樺湪/g,  // 中不存在
    /璇ョ储寮?/g,  // 该索引
    /鍙彂/g,  // 可发
    /璧勬簮/g,  // 资源
    /淇敼/g,  // 修改
    /楠板瓙/g,  // 骰子
    /璋冩暣/g,  // 调整
    /鉁?/g,  // ✓
];

lines.forEach((line, index) => {
    garbledPatterns.forEach(pattern => {
        if (pattern.test(line)) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
        }
    });
});
