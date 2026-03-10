import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/domain/baseAbilities_expansion.ts';
const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 找到印斯茅斯基地能力的起始行
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('── 印斯茅斯基地（Innsmouth Base）')) {
        startLine = i;
    }
    if (startLine !== -1 && lines[i].trim() === '});' && lines[i+1]?.trim() === '});') {
        endLine = i + 1; // 包含第二个 });
        break;
    }
}

if (startLine === -1 || endLine === -1) {
    console.error('❌ 未找到印斯茅斯基地能力代码块');
    process.exit(1);
}

console.log(`找到代码块：第 ${startLine + 1} 行到第 ${endLine + 1} 行`);

// 新的实现
const newCode = `    // ── 印斯茅斯基地（Innsmouth Base）────────────────────────────
    // "在一个玩家打出一个随从到这后，该玩家可以将任意玩家弃牌堆中的一张卡放到其拥有者的牌库底"
    // 第一步：选择从哪个玩家的弃牌堆选卡
    registerBaseAbility('base_innsmouth_base', 'onMinionPlayed', (ctx) => {
        // 收集有弃牌堆卡牌的玩家
        const playersWithDiscard: string[] = [];
        for (const [pid, player] of Object.entries(ctx.state.players)) {
            if (player.discard.length > 0) {
                playersWithDiscard.push(pid);
            }
        }

        if (playersWithDiscard.length === 0) return { events: [] };

        const options = [
            { id: 'skip', label: '跳过', value: { skip: true } },
            ...playersWithDiscard.map((pid, i) => ({
                id: \`player-\${i}\`,
                label: pid === ctx.playerId ? '你自己的弃牌堆' : \`\${getPlayerLabel(pid)}的弃牌堆\`,
                value: { targetPlayerId: pid },
            })),
        ];

        if (!ctx.matchState) return { events: [] };
        const interaction = createSimpleChoice(
            \`base_innsmouth_base_choose_player_\${ctx.now}\`, ctx.playerId,
            '印斯茅斯基地：选择从哪个玩家的弃牌堆选卡', options as any[],
            { sourceId: 'base_innsmouth_base_choose_player', autoCancelOption: true },
        );
        return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
    });`;

// 替换代码
const newLines = [
    ...lines.slice(0, startLine),
    newCode,
    ...lines.slice(endLine + 1)
];

writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('✅ 已修改印斯茅斯基地能力（第一步：选择玩家）');
