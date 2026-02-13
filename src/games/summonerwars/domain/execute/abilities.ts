/**
 * 召唤师战争 - ACTIVATE_ABILITY 子命令处理
 *
 * 通过 AbilityExecutorRegistry 分发，不再使用 switch-case。
 */

import type { GameEvent } from '../../../../engine/types';
import type { SummonerWarsCore, PlayerId } from '../types';
import { findBoardUnitByCardId, createAbilityTriggeredEvent } from './helpers';
import { abilityExecutorRegistry } from '../executors';
import type { SWAbilityContext } from '../executors/types';

/**
 * 执行主动技能命令
 *
 * 签名保持不变（push 到 events 数组），供 execute.ts 调用。
 */
export function executeActivateAbility(
  events: GameEvent[],
  core: SummonerWarsCore,
  playerId: PlayerId,
  payload: Record<string, unknown>,
  timestamp: number
): void {
  const abilityId = payload.abilityId as string;
  const sourceUnitId = payload.sourceUnitId as string;

  // 查找源单位
  const found = findBoardUnitByCardId(core, sourceUnitId);
  if (!found) {
    console.warn('[SummonerWars] 技能源单位未找到:', sourceUnitId);
    return;
  }
  const sourceUnit = found.unit;
  const sourcePosition = found.position;

  // 触发事件（UI 消费）
  events.push(createAbilityTriggeredEvent(abilityId, sourceUnitId, sourcePosition, timestamp));

  // 注册表分发
  const executor = abilityExecutorRegistry.resolve(abilityId);
  if (!executor) {
    console.warn('[SummonerWars] 未注册的技能执行器:', abilityId);
    return;
  }

  const ctx: SWAbilityContext = {
    sourceId: sourceUnitId,
    ownerId: playerId,
    timestamp,
    core,
    sourceUnit,
    sourcePosition,
    payload,
  };

  const result = executor(ctx);
  events.push(...result.events);
}