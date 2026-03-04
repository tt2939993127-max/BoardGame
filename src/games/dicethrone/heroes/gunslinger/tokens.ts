/**
 * Gunslinger (枪手) Token 定义
 * 复用现有 Token：闪避（EVASIVE）、击倒（KNOCKDOWN）
 * 新增 Token：装填弹药（LOADED）、赏金（BOUNTY）
 */

import type { TokenDef } from '../../domain/tokenTypes';
import { STATUS_IDS, TOKEN_IDS } from '../../domain/ids';
import { RESOURCE_IDS } from '../../domain/resources';

const tokenText = (id: string, field: 'name' | 'description') => `tokens.${id}.${field}`;
const statusText = (id: string, field: 'name' | 'description') => `statusEffects.${id}.${field}`;

export const GUNSLINGER_TOKENS: TokenDef[] = [
    // ============================================
    // 复用现有 Token（效果完全一致）
    // ============================================
    
    /**
     * 闪避（EVASIVE）- 正面状态效果（复用 Monk 的定义）
     * 
     * 堆叠限制：3
     * 
     * 效果描述：
     * 花费指示物并掷1骰，点数结果为1或2点来闪避攻击：
     * 当有闪避指示物的玩家受到伤害，他们可以选择花费
     * 闪避指示物然后掷1颗骰子，骰面结果为1或2，则
     * 不会受到任何伤害（盖管存在其他相关效果指示物仍然
     * 适用）。可以花费多个闪避指示物来防止相同的伤害
     * 来源。
     * 
     * 使用时机：受到伤害前（beforeDamageReceived）
     * 消耗数量：1个
     * 成功条件：掷骰结果为 1 或 2
     * 成功效果：完全闪避伤害（伤害减为0）
     * 
     * 注意：复用 Monk 的 Token 定义和图标
     */
    {
        id: TOKEN_IDS.EVASIVE,
        name: tokenText(TOKEN_IDS.EVASIVE, 'name'),
        colorTheme: 'from-cyan-500 to-blue-500',
        description: tokenText(TOKEN_IDS.EVASIVE, 'description') as unknown as string[],
        sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.ice.glacial_shield',
        stackLimit: 3,
        category: 'consumable',
        activeUse: {
            timing: ['beforeDamageReceived'],
            consumeAmount: 1,
            effect: {
                type: 'rollToNegate',
                rollSuccess: { range: [1, 2] },
            },
        },
        frameId: 'dodge', // 复用 Monk 的图标
        atlasId: 'dicethrone:monk-status', // 使用 Monk 的图集
    },
    
    /**
     * 击倒（KNOCKDOWN）- 负面状态效果（复用通用定义）
     * 
     * 堆叠限制：1
     * 
     * 效果描述：
     * 对手花费2CP或跳过掷骰攻击阶段：
     * 受到此效果影响的玩家在掷骰攻击阶段之前必须花费
     * 2CP才能移除此指示物，如果玩家不能这么做，此玩家
     * 必须跳过掷骰攻击阶段然后移除此指示物。
     * 
     * 触发时机：进入主要行动阶段1（main1）时
     * 移除方式：
     *   1. 花费 2CP 移除（可选）
     *   2. 跳过掷骰攻击阶段后自动移除（强制）
     * 
     * 注意：复用通用 Token 定义和图标
     */
    {
        id: STATUS_IDS.KNOCKDOWN,
        name: statusText(STATUS_IDS.KNOCKDOWN, 'name'),
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
        frameId: 'knockdown', // 复用通用图标
        atlasId: 'dicethrone:monk-status', // 使用 Monk 的图集
    },
    
    // ============================================
    // Gunslinger 特有 Token
    // ============================================
    
    /**
     * 装填弹药（LOADED）- 正面状态效果
     * 
     * 堆叠限制：2
     * 
     * 效果描述：
     * 花费指示物并掷1骰，增加½点数伤害：
     * 如果玩家结束掷骰攻击阶段的攻击，他们可以花费
     * 此指示物然后掷1颗骰子，伤害值为其点数结果的½
     * （无条件进位）可以增加到攻击总值中，此为攻击修正。
     * 
     * 使用时机：结束掷骰攻击阶段后
     * 消耗数量：1个
     * 伤害计算：掷骰点数 × 0.5，向上取整
     * 示例：掷出1点→+1伤害，掷出3点→+2伤害，掷出5点→+3伤害
     */
    {
        id: TOKEN_IDS.LOADED,
        name: tokenText(TOKEN_IDS.LOADED, 'name'),
        colorTheme: 'from-amber-500 to-orange-500',
        description: tokenText(TOKEN_IDS.LOADED, 'description') as unknown as string[],
        sfxKey: 'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a',
        stackLimit: 2,
        category: 'consumable',
        activeUse: {
            timing: ['onOffensiveRollEnd'], // 攻击掷骰阶段结束后
            consumeAmount: 1,
            effect: {
                type: 'rollForDamageBonus',
                multiplier: 0.5,
                roundUp: true, // 向上取整（无条件进位）
            },
        },
        frameId: TOKEN_IDS.LOADED,
        atlasId: 'dicethrone:gunslinger-status',
    },
    
    /**
     * 赏金（BOUNTY）- 负面状态效果
     * 
     * 堆叠限制：1
     * 
     * 效果描述：
     * 对手获得+1伤害且攻击方获得1CP：
     * 当受到此指示物效果的玩家遭到对手攻击时，
     * 攻击者会增加他们 1 攻击伤害力且获得1CP，此为
     * 持续性效果（直到游戏结束）。
     * 
     * 触发时机：被动触发，当持有此 Token 的玩家受到攻击时
     * 效果对象：攻击者（不是持有者）
     * 伤害加成：+1 点
     * CP 奖励：+1 点
     * 持续时间：直到游戏结束
     * 
     * 注意：这不是主动使用的 Token，而是持续性的被动效果
     * 类似机制：圣骑士的 Retribution（神罚）Token
     */
    {
        id: TOKEN_IDS.BOUNTY,
        name: tokenText(TOKEN_IDS.BOUNTY, 'name'),
        colorTheme: 'from-yellow-500 to-amber-600',
        description: tokenText(TOKEN_IDS.BOUNTY, 'description') as unknown as string[],
        sfxKey: 'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a',
        stackLimit: 1,
        category: 'debuff',
        // 持续性效果：当受到此效果的玩家遭到对手攻击时
        // 攻击者会增加 1 攻击伤害力且获得 1CP
        // TODO(gunslinger): 赏金的攻击者加伤+得CP效果接入被动触发执行链
        passiveTrigger: {
            timing: 'onDamageReceived',
            removable: false,
        },
        frameId: TOKEN_IDS.BOUNTY,
        atlasId: 'dicethrone:gunslinger-status',
    },
];

export const GUNSLINGER_INITIAL_TOKENS: Record<string, number> = {
    [TOKEN_IDS.EVASIVE]: 0,
    [STATUS_IDS.KNOCKDOWN]: 0,
    [TOKEN_IDS.LOADED]: 0,
    [TOKEN_IDS.BOUNTY]: 0,
};
