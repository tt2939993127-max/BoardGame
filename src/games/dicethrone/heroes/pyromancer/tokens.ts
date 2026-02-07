/**
 * 炎术士英雄的 Token 定义
 * 使用统一的 TokenSystem
 * 
 * 包含：
 * - consumable 类型：火焰精通（可主动消耗，增加伤害）
 * - debuff 类型：击倒、燃烧（被动触发）
 */

import type { TokenDef, TokenState } from '../../../../systems/TokenSystem';
import { TOKEN_IDS, STATUS_IDS } from '../../domain/ids';
import { RESOURCE_IDS } from '../../domain/resources';

const tokenText = (id: string, field: 'name' | 'description') => `tokens.${id}.${field}`;
const statusText = (id: string, field: 'name' | 'description') => `statusEffects.${id}.${field}`;

/**
 * 炎术士 Token 定义（统一架构）
 * 包含 consumable 和 debuff 类型
 */
export const PYROMANCER_TOKENS: TokenDef[] = [
    // ============================================
    // consumable 类型（可主动消耗）
    // ============================================

    /**
     * 火焰精通 - 增加火焰伤害
     * 效果：可用于增加伤害或触发特殊效果
     * 上限：5（可通过升级卡提高）
     */
    {
        id: TOKEN_IDS.FIRE_MASTERY,
        name: tokenText(TOKEN_IDS.FIRE_MASTERY, 'name'),
        icon: '🔥',
        colorTheme: 'from-orange-500 to-red-600',
        description: tokenText(TOKEN_IDS.FIRE_MASTERY, 'description') as unknown as string[],
        sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.fire.flame_armor',
        stackLimit: 5,
        category: 'consumable',
        activeUse: {
            timing: ['beforeDamageDealt'],
            consumeAmount: 1,
            effect: {
                type: 'modifyDamageDealt',
                value: 1,
            },
        },
        frameId: 'fire-mastery',
    },

    // ============================================
    // debuff 类型（被动触发）
    // ============================================

    /**
     * 击倒 - 跳过下个回合的进攻投掷阶段
     */
    {
        id: STATUS_IDS.KNOCKDOWN,
        name: statusText(STATUS_IDS.KNOCKDOWN, 'name'),
        icon: '💫',
        colorTheme: 'from-red-600 to-orange-500',
        description: statusText(STATUS_IDS.KNOCKDOWN, 'description') as unknown as string[],
        sfxKey: 'fantasy.medieval_fantasy_sound_fx_pack_vol.weapons.pot_explosion',
        stackLimit: 1,
        category: 'debuff',
        passiveTrigger: {
            timing: 'onPhaseEnter',
            removable: true,
            removalCost: { resource: RESOURCE_IDS.CP, amount: 2 },
        },
    },

    /**
     * 燃烧 - 回合开始时受到伤害
     */
    {
        id: STATUS_IDS.BURN,
        name: statusText(STATUS_IDS.BURN, 'name'),
        icon: '🔥',
        colorTheme: 'from-orange-600 to-red-500',
        description: statusText(STATUS_IDS.BURN, 'description') as unknown as string[],
        sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.fire.flame_chain_a',
        stackLimit: 3,
        category: 'debuff',
        passiveTrigger: {
            timing: 'onTurnStart',
            removable: true,
            actions: [{ type: 'damage', target: 'self', value: 1 }],
        },
    },

    /**
     * 眩晕 - 无法行动
     */
    {
        id: STATUS_IDS.STUN,
        name: statusText(STATUS_IDS.STUN, 'name'),
        icon: '⚡',
        colorTheme: 'from-yellow-500 to-amber-600',
        description: statusText(STATUS_IDS.STUN, 'description') as unknown as string[],
        sfxKey: 'fantasy.medieval_fantasy_sound_fx_pack_vol.weapons.pot_lightning',
        stackLimit: 1,
        category: 'debuff',
        passiveTrigger: {
            timing: 'onPhaseEnter',
            removable: true,
        },
    },
];

/**
 * 炎术士 Token ID 到定义的映射
 */
export const PYROMANCER_TOKEN_MAP: Record<string, TokenDef> =
    Object.fromEntries(PYROMANCER_TOKENS.map(t => [t.id, t])) as Record<string, TokenDef>;

/**
 * 炎术士初始 Token 状态
 */
export const PYROMANCER_INITIAL_TOKENS: TokenState = {
    [TOKEN_IDS.FIRE_MASTERY]: 0,
    [STATUS_IDS.KNOCKDOWN]: 0,
    [STATUS_IDS.BURN]: 0,
    [STATUS_IDS.STUN]: 0,
};
