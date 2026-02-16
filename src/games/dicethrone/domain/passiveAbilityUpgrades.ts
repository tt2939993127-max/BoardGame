/**
 * 被动能力升级注册表
 * 将被动能力 ID 映射到其升级版定义
 */

import type { PassiveAbilityDef } from './passiveAbility';
import { PALADIN_TITHES_UPGRADED } from '../heroes/paladin/abilities';

const upgradeMap: Record<string, PassiveAbilityDef> = {
    tithes: PALADIN_TITHES_UPGRADED,
};

/**
 * 获取被动能力的升级版定义
 */
export function getPassiveAbilityUpgrade(passiveId: string): PassiveAbilityDef | undefined {
    return upgradeMap[passiveId];
}
