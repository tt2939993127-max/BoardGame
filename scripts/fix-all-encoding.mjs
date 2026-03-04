import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/dicethrone/debug-config.tsx';
let content = readFileSync(filePath, 'utf-8');

// 修复所有乱码
const fixes = [
    // Line 37
    ['鑾峰彇褰撳墠鐜╁牌库鍜屾墜鐗?', '获取当前玩家牌库和手牌'],
    // Line 40
    ['妫€鏌ョ墝搴撲腑鏄惁瀛樺湪鎸囧畾图集索引鐨勫崱鐗?', '检查牌库中是否存在指定图集索引的卡牌'],
    // Line 62
    ['// 鉁?✓ 应用骰子值', '// 应用骰子值'],
    // Line 76
    ['璧勬簮淇敼', '资源修改'],
    // Line 170
    ['鉁?✓ 应用骰子值', '✓ 应用骰子值'],
    // Line 336
    ['鉁?鍙彂', '✓可发'],
    // Line 280-288 (重复的 div)
    ['<div className="text-[9px] text-green-600 mb-1">\n                            <div className="text-[9px] text-green-600 mb-1">', '<div className="text-[9px] text-green-600 mb-1">'],
    // Line 289-293 (缺失的 button 和 onClick)
    ['</div>\n                        dispatch(\'SYS_CHEAT_DEAL_CARD_BY_ATLAS_INDEX\', {\n                            playerId: dealPlayer,\n                            atlasIndex: Number(deckIndex),\n                        });\n                        }}', '</div>\n                        <button\n                            onClick={() => {\n                                dispatch(\'SYS_CHEAT_DEAL_CARD_BY_ATLAS_INDEX\', {\n                                    playerId: dealPlayer,\n                                    atlasIndex: Number(deckIndex),\n                                });\n                            }}'],
];

fixes.forEach(([from, to]) => {
    content = content.replace(from, to);
});

writeFileSync(filePath, content, 'utf-8');
console.log('✅ Fixed all encoding issues');
