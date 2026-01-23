/**
 * 僧侣英雄的状态效果定义
 * 使用通用 StatusEffectSystem
 */

import type { StatusEffectDef } from '../../../systems/StatusEffectSystem';

const statusEffectText = (id: string, field: 'name' | 'description') => `statusEffects.${id}.${field}`;

/**
 * 僧侣状态效果 ID 枚举
 */
export type MonkStatusEffectId = 'evasive' | 'taiji' | 'stun' | 'purify' | 'chi';

/**
 * 僧侣状态效果定义
 */
export const MONK_STATUS_EFFECTS: StatusEffectDef[] = [
    {
        id: 'evasive',
        name: statusEffectText('evasive', 'name'),
        type: 'buff',
        icon: '💨',
        colorTheme: 'from-cyan-500 to-blue-500',
        description: statusEffectText('evasive', 'description') as unknown as string[],
        stackLimit: 3,
        timing: 'manual',
        removable: false,
    },
    {
        id: 'taiji',
        name: statusEffectText('taiji', 'name'),
        type: 'buff',
        icon: '☯',
        colorTheme: 'from-purple-500 to-indigo-500',
        description: statusEffectText('taiji', 'description') as unknown as string[],
        stackLimit: 5,
        timing: 'manual',
        removable: false,
    },
    {
        id: 'stun',
        name: statusEffectText('stun', 'name'),
        type: 'debuff',
        icon: '💫',
        colorTheme: 'from-red-600 to-orange-500',
        description: statusEffectText('stun', 'description') as unknown as string[],
        stackLimit: 1,
        timing: 'onPhaseEnter',
        removable: true,
        removalCost: { resource: 'cp', amount: 2 },
    },
    {
        id: 'purify',
        name: statusEffectText('purify', 'name'),
        type: 'buff',
        icon: '✨',
        colorTheme: 'from-emerald-400 to-green-500',
        description: statusEffectText('purify', 'description') as unknown as string[],
        stackLimit: 3,
        timing: 'manual',
        removable: false,
    },
    {
        id: 'chi',
        name: statusEffectText('chi', 'name'),
        type: 'buff',
        icon: '🔥',
        colorTheme: 'from-orange-500 to-red-500',
        description: statusEffectText('chi', 'description') as unknown as string[],
        stackLimit: 10,
        timing: 'manual',
        removable: false,
    },
];

/**
 * 僧侣状态效果 ID 到定义的映射
 */
export const MONK_STATUS_EFFECT_MAP: Record<MonkStatusEffectId, StatusEffectDef> = 
    Object.fromEntries(MONK_STATUS_EFFECTS.map(e => [e.id, e])) as Record<MonkStatusEffectId, StatusEffectDef>;
