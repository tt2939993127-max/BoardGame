import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/dicethrone/debug-config.tsx';
const content = readFileSync(filePath, 'utf-8');

// 修复编码问题和语法错误
const fixed = content
    // 修复中文注释的编码问题
    .replace(/妫€鏌ョ墝搴撲腑鏄惁瀛樺湪鎸囧畾图集索引鐨勫崱鐗?/g, '检查牌库中是否存在指定图集索引的卡牌')
    .replace(/鑾峰彇褰撳墠鐜╁牌库鍜屾墜鐗?/g, '获取当前玩家牌库和手牌')
    .replace(/牌库涓瓨鍦?/g, '牌库中存在')
    .replace(/牌库涓笉瀛樺湪/g, '牌库中不存在')
    .replace(/鉁?鍙彂/g, '✓可发')
    .replace(/鉁?应用骰子值/g, '✓ 应用骰子值');

writeFileSync(filePath, fixed, 'utf-8');
console.log('✅ 修复完成');
