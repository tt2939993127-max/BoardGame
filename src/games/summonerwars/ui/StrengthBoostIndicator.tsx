/**
 * 召唤师战争 - 动态增益指示器（游戏层）
 * 
 * UI 层只负责组装增益条目，检测逻辑由领域层函数提供：
 * - getStrengthBoostForDisplay() → 战力增幅
 * - getDynamicMoveBoostForDisplay() → 动态移动增强
 * 渲染由框架层 BoostIndicator 处理。
 */

import React, { useMemo } from 'react';
import { Swords, Feather } from 'lucide-react';
import type { BoardUnit, SummonerWarsCore } from '../domain/types';
import { getStrengthBoostForDisplay } from '../domain/abilityResolver';
import { getDynamicMoveBoostForDisplay } from '../domain/helpers';
import { BoostIndicator, type BoostEntry } from '../../../components/game/framework/widgets/BoostIndicator';

interface StrengthBoostIndicatorProps {
  unit: BoardUnit;
  core: SummonerWarsCore;
  /** 附加卡数量，用于计算底部偏移避开名条 */
  attachedCount?: number;
}

export const StrengthBoostIndicator: React.FC<StrengthBoostIndicatorProps> = ({
  unit,
  core,
  attachedCount = 0,
}) => {
  const boosts = useMemo<BoostEntry[]>(() => {
    const entries: BoostEntry[] = [];

    const strengthDelta = getStrengthBoostForDisplay(unit, core);
    if (strengthDelta > 0) {
      entries.push({
        type: 'strength',
        count: strengthDelta,
        icon: Swords,
        color: 'text-red-500',
        glow: 'rgba(239,68,68,0.9)',
      });
    }

    const moveDelta = getDynamicMoveBoostForDisplay(core, unit.position);
    if (moveDelta > 0) {
      entries.push({
        type: 'move',
        count: moveDelta,
        icon: Feather,
        color: 'text-cyan-400',
        glow: 'rgba(34,211,238,0.9)',
      });
    }

    return entries;
  }, [unit, core]);

  // 每张附加卡名条占 14% 高度
  const bottomOffset = 3 + attachedCount * 14;

  return (
    <BoostIndicator
      boosts={boosts}
      position="bottom-right"
      bottomOffset={bottomOffset}
    />
  );
};
