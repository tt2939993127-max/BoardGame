/**
 * 技能辅助函数
 * 
 * 提供通用的技能可用性判断逻辑
 */

import type { SummonerWarsCore, PlayerId } from './types';
import { SW_COMMANDS } from './types';
import { SummonerWarsDomain } from './index';

/**
 * 检查技能是否可用
 * 
 * @param core 游戏状态
 * @param abilityId 技能 ID
 * @param sourceUnitId 源单位 ID
 * @param playerId 玩家 ID
 * @param additionalPayload 额外的 payload（如 targetPosition）
 * @returns 技能是否可用
 */
export function canUseAbility(
  core: SummonerWarsCore,
  abilityId: string,
  sourceUnitId: string,
  playerId: PlayerId,
  additionalPayload?: Record<string, unknown>
): boolean {
  const fullState = { core, sys: {} as any };
  const result = SummonerWarsDomain.validate(fullState, {
    type: SW_COMMANDS.ACTIVATE_ABILITY,
    payload: {
      abilityId,
      sourceUnitId,
      ...additionalPayload,
    },
    playerId,
    timestamp: Date.now(),
  });
  
  return result.valid;
}

/**
 * 获取技能不可用的原因
 * 
 * @param core 游戏状态
 * @param abilityId 技能 ID
 * @param sourceUnitId 源单位 ID
 * @param playerId 玩家 ID
 * @param additionalPayload 额外的 payload
 * @returns 不可用原因，如果可用则返回 null
 */
export function getAbilityDisabledReason(
  core: SummonerWarsCore,
  abilityId: string,
  sourceUnitId: string,
  playerId: PlayerId,
  additionalPayload?: Record<string, unknown>
): string | null {
  const fullState = { core, sys: {} as any };
  const result = SummonerWarsDomain.validate(fullState, {
    type: SW_COMMANDS.ACTIVATE_ABILITY,
    payload: {
      abilityId,
      sourceUnitId,
      ...additionalPayload,
    },
    playerId,
    timestamp: Date.now(),
  });
  
  return result.valid ? null : (result.error ?? '技能不可用');
}
