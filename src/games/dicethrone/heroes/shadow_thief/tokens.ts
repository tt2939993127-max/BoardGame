import type { TokenDef } from '../../../../systems/TokenSystem';
import { TOKEN_IDS } from '../../domain/ids';

export const SHADOW_THIEF_TOKENS: TokenDef[] = [
    {
        id: TOKEN_IDS.SNEAK,
        name: '潜行 (Sneak)',
        category: 'buff',
        icon: 'assets/dicethrone/images/shadow_thief/status-icons/sneak.png',
        colorTheme: 'bg-gradient-to-br from-indigo-500 to-purple-800', // guess
        description: ['拥有此标记时，若受到伤害，移除此标记并免除该伤害。'],
        stackLimit: 1,
        passiveTrigger: {
            timing: 'onDamageReceived',
            removable: false, // consumed on trigger
            actions: [
                { type: 'custom', customActionId: 'shadow_thief-sneak-prevent', target: 'self' }
            ]
        }
    },
    {
        id: TOKEN_IDS.SNEAK_ATTACK,
        name: '伏击 (Sneak Attack)',
        category: 'consumable',
        icon: 'assets/dicethrone/images/shadow_thief/status-icons/sneak-attack.png',
        colorTheme: 'bg-gradient-to-br from-red-500 to-orange-800', // guess
        description: ['攻击结算时，投掷1个骰子并将结果加到伤害中。'],
        stackLimit: 1,
        activeUse: {
            timing: ['beforeDamageDealt'],
            consumeAmount: 1,
            effect: {
                type: 'modifyDamageDealt',
                value: 0 // Placeholder, real logic in custom hook or manually handled
            }
        }
    }
];
