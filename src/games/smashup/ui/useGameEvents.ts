/**
 * 大杀四方 - 游戏事件流消费 Hook
 *
 * 使用 EventStreamSystem 消费事件，驱动动画/特效
 * 遵循 lastSeenEventId 模式，首次挂载跳过历史事件
 */

import { useCallback, useEffect, useState } from 'react';
import type { MatchState } from '../../../engine/types';
import type { SmashUpCore } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { getEventStreamEntries } from '../../../engine/systems/EventStreamSystem';
import { useEventStreamCursor } from '../../../engine/hooks';

// ============================================================================
// 类型
// ============================================================================

/** 随从入场动画数据 */
export interface MinionEntryEffect {
  id: string;
  defId: string;
  baseIndex: number;
  power: number;
  playerId: string;
}

/** 行动卡展示动画数据 */
export interface ActionShowEffect {
  id: string;
  defId: string;
  playerId: string;
}

/** 基地记分动画数据 */
export interface BaseScoredEffect {
  id: string;
  baseDefId: string;
  baseIndex: number;
  rankings: Array<{ playerId: string; power: number; vp: number }>;
}

/** 力量变化浮字数据 */
export interface PowerChangeEffect {
  id: string;
  baseIndex: number;
  delta: number;
}

/** 抽牌动画数据 */
export interface CardDrawnEffect {
  id: string;
  playerId: string;
  count: number;
}

// ============================================================================
// Hook
// ============================================================================

interface UseGameEventsParams {
  G: MatchState<SmashUpCore>;
  myPlayerId: string;
}

export function useGameEvents({ G }: UseGameEventsParams) {
  const entries = getEventStreamEntries(G);
  const { consumeNew } = useEventStreamCursor({ entries });

  // 动画队列
  const [minionEntries, setMinionEntries] = useState<MinionEntryEffect[]>([]);
  const [actionShows, setActionShows] = useState<ActionShowEffect[]>([]);
  const [baseScored, setBaseScored] = useState<BaseScoredEffect[]>([]);
  const [powerChanges, setPowerChanges] = useState<PowerChangeEffect[]>([]);
  const [cardDrawns, setCardDrawns] = useState<CardDrawnEffect[]>([]);

  // 消费事件流
  useEffect(() => {
    const { entries: newEntries } = consumeNew();
    if (newEntries.length === 0) return;

    let uidCounter = Date.now();

    for (const entry of newEntries) {
      const event = entry.event;

      switch (event.type) {
        case SU_EVENTS.MINION_PLAYED: {
          const p = event.payload as {
            playerId: string; cardUid: string; defId: string;
            baseIndex: number; power: number;
          };
          setMinionEntries(prev => [...prev, {
            id: `me-${uidCounter++}`,
            defId: p.defId,
            baseIndex: p.baseIndex,
            power: p.power,
            playerId: p.playerId,
          }]);
          // 力量变化浮字
          setPowerChanges(prev => [...prev, {
            id: `pc-${uidCounter++}`,
            baseIndex: p.baseIndex,
            delta: p.power,
          }]);
          break;
        }

        case SU_EVENTS.ACTION_PLAYED: {
          const p = event.payload as {
            playerId: string; cardUid: string; defId: string;
          };
          setActionShows(prev => [...prev, {
            id: `as-${uidCounter++}`,
            defId: p.defId,
            playerId: p.playerId,
          }]);
          break;
        }

        case SU_EVENTS.BASE_SCORED: {
          const p = event.payload as {
            baseIndex: number; baseDefId: string;
            rankings: Array<{ playerId: string; power: number; vp: number }>;
          };
          setBaseScored(prev => [...prev, {
            id: `bs-${uidCounter++}`,
            baseDefId: p.baseDefId,
            baseIndex: p.baseIndex,
            rankings: p.rankings,
          }]);
          break;
        }

        case SU_EVENTS.CARDS_DRAWN: {
          const p = event.payload as {
            playerId: string; count: number; cardUids: string[];
          };
          setCardDrawns(prev => [...prev, {
            id: `cd-${uidCounter++}`,
            playerId: p.playerId,
            count: p.count,
          }]);
          break;
        }
      }
    }
  }, [G, consumeNew]);

  // 清除已完成的效果
  const removeMinionEntry = useCallback((id: string) => {
    setMinionEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const removeActionShow = useCallback((id: string) => {
    setActionShows(prev => prev.filter(e => e.id !== id));
  }, []);

  const removeBaseScored = useCallback((id: string) => {
    setBaseScored(prev => prev.filter(e => e.id !== id));
  }, []);

  const removePowerChange = useCallback((id: string) => {
    setPowerChanges(prev => prev.filter(e => e.id !== id));
  }, []);

  const removeCardDrawn = useCallback((id: string) => {
    setCardDrawns(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    minionEntries, removeMinionEntry,
    actionShows, removeActionShow,
    baseScored, removeBaseScored,
    powerChanges, removePowerChange,
    cardDrawns, removeCardDrawn,
  };
}
