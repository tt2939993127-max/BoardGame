/**
 * DiceThrone 领域内的稳定 ID 常量表（单一真源）
 *
 * 目的：
 * - 避免在 domain/UI/tests 里散落字符串字面量，降低重命名/新增成本
 * - 仍然保留字符串 id 的序列化优势（存档/回放/日志/网络同步）
 */

// ============================================================================
// 状态效果 ID
// ============================================================================

export const STATUS_IDS = {
    /** 击倒/倒地（原先误用 stun） */
    KNOCKDOWN: 'knockdown',

    /** 眩晕（给后续新角色预留） */
    STUN: 'stun',

    /** 脑震荡（狂战士） - 跳过下个收入阶段 */
    CONCUSSION: 'concussion',

    /** 晕眩（狂战士） - 无法行动，攻击结束后再次攻击 */
    DAZE: 'daze',
} as const;

export type StatusId = (typeof STATUS_IDS)[keyof typeof STATUS_IDS];

// ============================================================================
// Token ID（僧侣角色）
// ============================================================================

export const TOKEN_IDS = {
    /** 太极 - 可用于增减伤害 */
    TAIJI: 'taiji',

    /** 闪避 - 投掷闪避判定 */
    EVASIVE: 'evasive',

    /** 净化 - 移除负面状态 */
    PURIFY: 'purify',
} as const;

export type TokenId = (typeof TOKEN_IDS)[keyof typeof TOKEN_IDS];

// ============================================================================
// 骰面 ID（僧侣骰子）
// ============================================================================

export const DICE_FACE_IDS = {
    /** 拳 - 骰值 1, 2 */
    FIST: 'fist',

    /** 掌 - 骰值 3 */
    PALM: 'palm',

    /** 太极 - 骰值 4, 5 */
    TAIJI: 'taiji',

    /** 莲花 - 骰值 6 */
    LOTUS: 'lotus',
} as const;

export type DiceFaceId = (typeof DICE_FACE_IDS)[keyof typeof DICE_FACE_IDS];

// ============================================================================
// 骰面 ID（狂战士骰子）
// ============================================================================

export const BARBARIAN_DICE_FACE_IDS = {
    /** 剑 - 骰值 1, 2, 3 */
    SWORD: 'sword',

    /** 恢复/心 - 骰值 4, 5 */
    HEART: 'heart',

    /** 力量/星 - 骰值 6 */
    STRENGTH: 'strength',
} as const;

export type BarbarianDiceFaceId = (typeof BARBARIAN_DICE_FACE_IDS)[keyof typeof BARBARIAN_DICE_FACE_IDS];

// ============================================================================
// DiceThrone 领域命令 ID
// ============================================================================

export const DICETHRONE_COMMANDS = {
    PAY_TO_REMOVE_KNOCKDOWN: 'PAY_TO_REMOVE_KNOCKDOWN',
    SELECT_CHARACTER: 'SELECT_CHARACTER',
    HOST_START_GAME: 'HOST_START_GAME',
} as const;

export type DiceThroneCommandType = (typeof DICETHRONE_COMMANDS)[keyof typeof DICETHRONE_COMMANDS];
export type PayToRemoveKnockdownCommandType = typeof DICETHRONE_COMMANDS.PAY_TO_REMOVE_KNOCKDOWN;

// ============================================================================
// 卡牌图集 ID
// ============================================================================

export const DICETHRONE_CARD_ATLAS_IDS = {
    MONK: 'dicethrone:monk-cards',
    BARBARIAN: 'dicethrone:barbarian-cards',
} as const;
