/**
 * Moon Elf 英雄的 Token 定义
 * 
 * 包含：
 * - Evasive (闪避): Monk 复用
 * - Blinded (致盲)
 * - Entangle (缠绕)
 * - Targeted (锁定)
 */
import type { TokenDef, TokenState } from '../../../../systems/TokenSystem';
import { TOKEN_IDS, STATUS_IDS } from '../../domain/ids';
import { RESOURCE_IDS } from '../../domain/resources';

// 复用 Monk 的 Evasive 定义，但在 Moon Elf 中重新声明以保持独立性结构，
// 或者引用已有的定义如果完全一致。这里为了方便维护（如果音效/描述有微调），我们复制并适配。
// 实际上 Evasive 是通用的，这里我们重新定义一份以确保正确引用 Text key。

const tokenText = (id: string, field: 'name' | 'description') => `tokens.${id}.${field}`;
const statusText = (id: string, field: 'name' | 'description') => `statusEffects.${id}.${field}`;

export const MOON_ELF_TOKENS: TokenDef[] = [
    // ============================================
    // Positive Status / Tokens
    // ============================================

    /**
     * 闪避 (Evasive) - Stack limit 3
     */
    {
        id: TOKEN_IDS.EVASIVE,
        name: tokenText(TOKEN_IDS.EVASIVE, 'name'),
        icon: '💨', // Replace with correct icon asset if available
        colorTheme: 'from-cyan-500 to-blue-500',
        description: tokenText(TOKEN_IDS.EVASIVE, 'description') as unknown as string[],
        stackLimit: 3,
        category: 'consumable',
        activeUse: {
            timing: ['beforeDamageReceived'],
            consumeAmount: 1,
            effect: {
                type: 'rollToNegate',
                rollSuccess: { range: [1, 2] }, // 1-2 成功减伤至0 (Wait, image says 1-2 prevents damage? "如果结果为1-2, 伤害减至0"。 通常 DiceThrone 是 6 成功？不，Monk Evasive 也是 1-2 吗？需确认。Monk Tokens 说 range [1,2]。)
                // Image text: "掷骰1颗。如果结果为1-2，伤害减至0" matches Monk logic.
            },
        },
        frameId: 'dodge', // Reuse existing frame asset
    },

    // ============================================
    // Negative Status (Debuffs)
    // ============================================

    /**
     * 致盲 (Blinded) - Does not stack
     * 效果：攻击掷骰阶段结算时，掷骰1颗。1-2：攻击无效。
     */
    {
        id: STATUS_IDS.BLINDED,
        name: statusText(STATUS_IDS.BLINDED, 'name'),
        icon: '👁️',
        colorTheme: 'from-gray-700 to-black',
        description: statusText(STATUS_IDS.BLINDED, 'description') as unknown as string[],
        stackLimit: 1,
        category: 'debuff',
        // Logic will be handled by complex triggers in engine
        // TODO: Implement Blinded logic hook
    },

    /**
     * 缠绕 (Entangle) - Does not stack
     * 效果：下次攻击掷骰少一次 (3 -> 2)。
     */
    {
        id: STATUS_IDS.ENTANGLE,
        name: statusText(STATUS_IDS.ENTANGLE, 'name'),
        icon: '🌿',
        colorTheme: 'from-green-700 to-emerald-900',
        description: statusText(STATUS_IDS.ENTANGLE, 'description') as unknown as string[],
        stackLimit: 1,
        category: 'debuff',
        // Logic handled by roll limit modifier
        // TODO: Implement Entangle logic hook
    },

    /**
     * 锁定 (Targeted) - Does not stack
     * 效果：受到的伤害 +2。
     */
    {
        id: STATUS_IDS.TARGETED,
        name: statusText(STATUS_IDS.TARGETED, 'name'),
        icon: '🎯',
        colorTheme: 'from-red-600 to-rose-700',
        description: statusText(STATUS_IDS.TARGETED, 'description') as unknown as string[],
        stackLimit: 1,
        category: 'debuff',
        // Logic handled by damage modifier
        // TODO: Implement Targeted logic hook
    },
];

export const MOON_ELF_TOKEN_MAP: Record<string, TokenDef> =
    Object.fromEntries(MOON_ELF_TOKENS.map(t => [t.id, t])) as Record<string, TokenDef>;

export const MOON_ELF_INITIAL_TOKENS: TokenState = {
    [TOKEN_IDS.EVASIVE]: 0,
    [STATUS_IDS.BLINDED]: 0,
    [STATUS_IDS.ENTANGLE]: 0,
    [STATUS_IDS.TARGETED]: 0,
};
