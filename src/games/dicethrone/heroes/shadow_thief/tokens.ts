import type { TokenDef, TokenState } from '../../domain/tokenTypes';
import { TOKEN_IDS, STATUS_IDS, DICETHRONE_STATUS_ATLAS_IDS } from '../../domain/ids';

export const SHADOW_THIEF_TOKENS: TokenDef[] = [
    {
        id: TOKEN_IDS.SNEAK,
        name: '潜行 (Sneak)',
        category: 'buff',
        icon: '🥷',
        colorTheme: 'bg-gradient-to-br from-indigo-500 to-purple-800',
        description: ['拥有此标记时，若受到伤害，移除此标记并免除该伤害。'],
        stackLimit: 1,
        passiveTrigger: {
            timing: 'onDamageReceived',
            removable: false,
            actions: [
                { type: 'custom', customActionId: 'shadow_thief-sneak-prevent', target: 'self' }
            ]
        },
        frameId: 'shadow-soul',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.SHADOW_THIEF,
    },
    {
        id: TOKEN_IDS.SNEAK_ATTACK,
        name: '伏击 (Sneak Attack)',
        category: 'consumable',
        icon: '🗡️',
        colorTheme: 'bg-gradient-to-br from-red-500 to-orange-800',
        description: ['攻击结算时，投掷1个骰子并将结果加到伤害中。'],
        stackLimit: 1,
        activeUse: {
            timing: ['beforeDamageDealt'],
            consumeAmount: 1,
            effect: {
                type: 'modifyDamageDealt',
                value: 0, // 实际逻辑在 shadow_thief-sneak-attack-use custom action 中
            }
        },
        frameId: 'sneak-attack',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.SHADOW_THIEF,
    },
    // 中毒状态效果定义（暗影刺客引入）
    {
        id: STATUS_IDS.POISON,
        name: '中毒 (Poison)',
        category: 'debuff',
        icon: '☠️',
        colorTheme: 'bg-gradient-to-br from-green-600 to-emerald-900',
        description: ['回合开始时受到等同层数的伤害，然后移除1层。'],
        stackLimit: 3,
        passiveTrigger: {
            timing: 'onTurnStart',
            removable: true,
            // value 仅为占位，实际伤害按 stacks 数量计算（见 flowHooks.ts）
            actions: [{ type: 'damage', target: 'self', value: 1 }],
        },
        frameId: 'poison',
        atlasId: DICETHRONE_STATUS_ATLAS_IDS.SHADOW_THIEF,
    },
];

export const SHADOW_THIEF_INITIAL_TOKENS: TokenState = {
    [TOKEN_IDS.SNEAK]: 0,
    [TOKEN_IDS.SNEAK_ATTACK]: 0,
    [STATUS_IDS.POISON]: 0,
};
