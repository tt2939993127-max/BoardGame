/**
 * 召唤师战争 - 游戏事件流消费 Hook
 * 
 * 使用 EventStreamSystem 消费事件，驱动动画/特效/音效
 * 遵循 lastSeenEventId 模式，首次挂载跳过历史事件
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { EventStreamEntry, MatchState } from '../../../engine/types';
import type { SummonerWarsCore, PlayerId, CellCoord, UnitCard, StructureCard } from '../domain/types';
import { SW_EVENTS } from '../domain/types';
import { getEventStreamEntries } from '../../../engine/systems/EventStreamSystem';
import type { DestroyEffectData } from './DestroyEffect';
import type { DiceFace } from '../config/dice';
import { getDestroySpriteConfig } from './spriteHelpers';
import type { FxBus } from '../../../engine/fx';
import { SW_FX } from './fxSetup';

// ============================================================================
// 类型定义
// ============================================================================

/** 骰子结果状态 */
export interface DiceResultState {
  results: DiceFace[];
  attackType: 'melee' | 'ranged';
  hits: number;
  isOpponentAttack: boolean;
}

/** 待播放的攻击效果 */
export interface PendingAttack {
  attacker: CellCoord;
  target: CellCoord;
  attackType: 'melee' | 'ranged';
  hits: number;
  damages: Array<{ position: CellCoord; damage: number }>;
}

/** 临时可视缓存（死亡动画前保留本体） */
export interface DyingEntity {
  id: string;
  position: CellCoord;
  owner: PlayerId;
  type: 'unit' | 'structure';
  atlasId: string;
  frameIndex: number;
}

/** 技能模式状态 */
export interface AbilityModeState {
  abilityId: string;
  step: 'selectCard' | 'selectPosition' | 'selectUnit' | 'selectCards';
  sourceUnitId: string;
  selectedCardId?: string;
  selectedCardIds?: string[];
  selectedUnitId?: string;
  targetPosition?: CellCoord;
  context?: 'beforeAttack' | 'activated';
}

/** 灵魂转移模式状态 */
export interface SoulTransferModeState {
  sourceUnitId: string;
  sourcePosition: CellCoord;
  victimPosition: CellCoord;
}

/** 心灵捕获选择模式状态 */
export interface MindCaptureModeState {
  sourceUnitId: string;
  sourcePosition: CellCoord;
  targetPosition: CellCoord;
  targetUnitId: string;
  hits: number;
}

/** 攻击后技能模式状态（念力/高阶念力/读心传念） */
export interface AfterAttackAbilityModeState {
  abilityId: 'telekinesis' | 'high_telekinesis' | 'mind_transmission';
  sourceUnitId: string;
  sourcePosition: CellCoord;
}

interface EventStreamDelta {
  newEntries: EventStreamEntry[];
  nextLastSeenId: number;
  shouldReset: boolean;
}

export function computeEventStreamDelta(
  entries: EventStreamEntry[],
  lastSeenEventId: number
): EventStreamDelta {
  if (entries.length === 0) {
    return {
      newEntries: [],
      nextLastSeenId: lastSeenEventId > -1 ? -1 : lastSeenEventId,
      shouldReset: lastSeenEventId > -1,
    };
  }

  const lastEntryId = entries[entries.length - 1].id;
  if (lastSeenEventId > -1 && lastEntryId < lastSeenEventId) {
    return {
      newEntries: entries,
      nextLastSeenId: lastEntryId,
      shouldReset: true,
    };
  }

  const newEntries = lastSeenEventId < 0
    ? entries
    : entries.filter(entry => entry.id > lastSeenEventId);

  return {
    newEntries,
    nextLastSeenId: newEntries.length > 0
      ? newEntries[newEntries.length - 1].id
      : lastSeenEventId,
    shouldReset: false,
  };
}

// ============================================================================
// Hook 参数
// ============================================================================

interface UseGameEventsParams {
  G: MatchState<SummonerWarsCore>;
  core: SummonerWarsCore;
  myPlayerId: string;
  pushDestroyEffect: (data: Omit<DestroyEffectData, 'id'>) => void;
  fxBus: FxBus;
  triggerShake: (intensity: string, type: string) => void;
  /** 摧毁特效触发时的音效回调 */
  onDestroySound?: (type: 'unit' | 'structure', isGate?: boolean) => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useGameEvents({
  G, core, myPlayerId,
  pushDestroyEffect, fxBus, triggerShake, onDestroySound,
}: UseGameEventsParams) {
  // 骰子结果状态
  const [diceResult, setDiceResult] = useState<DiceResultState | null>(null);

  // 临时本体缓存（攻击动画期间保留）
  const [dyingEntities, setDyingEntities] = useState<DyingEntity[]>([]);

  // 技能模式
  const [abilityMode, setAbilityMode] = useState<AbilityModeState | null>(null);

  // 灵魂转移确认模式
  const [soulTransferMode, setSoulTransferMode] = useState<SoulTransferModeState | null>(null);

  // 心灵捕获选择模式
  const [mindCaptureMode, setMindCaptureMode] = useState<MindCaptureModeState | null>(null);

  // 攻击后技能模式（念力/高阶念力/读心传念）
  const [afterAttackAbilityMode, setAfterAttackAbilityMode] = useState<AfterAttackAbilityModeState | null>(null);

  // 待播放的攻击效果队列
  const pendingAttackRef = useRef<PendingAttack | null>(null);

  // 待延迟播放的摧毁效果（含 isGate 标记用于音效区分）
  const pendingDestroyRef = useRef<(DestroyEffectData & { isGate?: boolean })[]>([]);

  // ============================================================================
  // 回调函数稳定化（避免 useLayoutEffect 因回调引用变化而重复执行）
  // ============================================================================
  const pushDestroyEffectRef = useRef(pushDestroyEffect);
  pushDestroyEffectRef.current = pushDestroyEffect;
  const fxBusRef = useRef(fxBus);
  fxBusRef.current = fxBus;
  const triggerShakeRef = useRef(triggerShake);
  triggerShakeRef.current = triggerShake;
  const onDestroySoundRef = useRef(onDestroySound);
  onDestroySoundRef.current = onDestroySound;

  // 事件流诊断日志控制
  const eventStreamLogRef = useRef(0);
  const eventBatchLogRef = useRef(0);
  const EVENT_STREAM_WARN = 180;
  const EVENT_STREAM_STEP = 10;
  const EVENT_BATCH_WARN = 20;
  const EVENT_BATCH_STEP = 10;

  // 追踪已处理的事件流 ID
  const lastSeenEventId = useRef<number>(-1);
  const isFirstMount = useRef(true);

  // 监听事件流
  useLayoutEffect(() => {
    const entries = getEventStreamEntries(G);

    if (entries.length >= EVENT_STREAM_WARN && entries.length >= eventStreamLogRef.current + EVENT_STREAM_STEP) {
      eventStreamLogRef.current = entries.length;
      console.warn(`[SW-EVENT] event=stream_backlog size=${entries.length} max=${EVENT_STREAM_WARN}`);
    }

    // 首次挂载：将指针推进到当前事件末尾，不回放历史特效
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (entries.length > 0) {
        lastSeenEventId.current = entries[entries.length - 1].id;
      }
      return;
    }

    const { newEntries, nextLastSeenId, shouldReset } = computeEventStreamDelta(
      entries,
      lastSeenEventId.current
    );

    if (shouldReset) {
      pendingAttackRef.current = null;
      pendingDestroyRef.current = [];
      setDiceResult(null);
      setDyingEntities([]);
    }

    lastSeenEventId.current = nextLastSeenId;

    if (newEntries.length === 0) return;
    if (newEntries.length >= EVENT_BATCH_WARN && newEntries.length >= eventBatchLogRef.current + EVENT_BATCH_STEP) {
      eventBatchLogRef.current = newEntries.length;
      console.warn(`[SW-EVENT] event=batch size=${newEntries.length}`);
    }

    for (const entry of newEntries) {
      const event = entry.event;

      // 召唤事件 - 落场震动 + 全屏震动
      if (event.type === SW_EVENTS.UNIT_SUMMONED) {
        const p = event.payload as { position: CellCoord; card: { unitClass?: string } };
        const intensity = p.card?.unitClass === 'champion' ? 'strong' : 'normal';
        fxBusRef.current.push(SW_FX.SUMMON, { cell: p.position, intensity });
        triggerShakeRef.current(intensity, 'impact');
      }

      // 攻击事件 - 显示骰子，效果队列化
      if (event.type === SW_EVENTS.UNIT_ATTACKED) {
        const p = event.payload as {
          attackType: 'melee' | 'ranged'; diceResults: DiceFace[]; hits: number;
          target: CellCoord; attacker: CellCoord;
        };
        const attackerUnit = core.board[p.attacker.row]?.[p.attacker.col]?.unit;
        const isOpponentAttack = attackerUnit ? attackerUnit.owner !== myPlayerId : false;

        pendingAttackRef.current = {
          attacker: p.attacker, target: p.target,
          attackType: p.attackType, hits: p.hits, damages: [],
        };

        setDiceResult({
          results: p.diceResults, attackType: p.attackType,
          hits: p.hits, isOpponentAttack,
        });
      }

      // 受伤事件 - 存入待播放队列或立即播放
      if (event.type === SW_EVENTS.UNIT_DAMAGED) {
        const p = event.payload as { position: CellCoord; damage: number };
        if (pendingAttackRef.current) {
          pendingAttackRef.current.damages.push({ position: p.position, damage: p.damage });
        } else {
          fxBusRef.current.push(SW_FX.COMBAT_DAMAGE, {
            cell: p.position,
            intensity: p.damage >= 3 ? 'strong' : 'normal',
          }, { damageAmount: p.damage });
        }
      }

      // 单位摧毁事件
      if (event.type === SW_EVENTS.UNIT_DESTROYED) {
        handleDestroyEvent(event.payload as Record<string, unknown>, 'unit');
      }

      // 建筑摧毁事件
      if (event.type === SW_EVENTS.STRUCTURE_DESTROYED) {
        handleDestroyEvent(event.payload as Record<string, unknown>, 'structure');
      }

      // 充能事件 - 旋涡动画反馈
      if (event.type === SW_EVENTS.UNIT_CHARGED) {
        const p = event.payload as { position: CellCoord; delta: number; sourceAbilityId?: string };
        if (p.delta > 0) {
          fxBusRef.current.push(SW_FX.CHARGE_VORTEX, { cell: p.position, intensity: 'normal' });
        }
      }

      // 感染触发
      if (event.type === SW_EVENTS.SUMMON_FROM_DISCARD_REQUESTED) {
        const p = event.payload as {
          playerId: string; cardType: string; position: CellCoord;
          sourceAbilityId: string; sourceUnitId?: string;
        };
        if (p.playerId === myPlayerId) {
          const player = core.players[myPlayerId as PlayerId];
          const hasValidCard = player?.discard.some(c => {
            if (p.cardType === 'plagueZombie') {
              return c.cardType === 'unit' && (c.id.includes('plague-zombie') || c.name.includes('疫病体'));
            }
            return false;
          });
          if (hasValidCard) {
            setAbilityMode({
              abilityId: 'infection', step: 'selectCard',
              sourceUnitId: p.sourceUnitId ?? '', targetPosition: p.position,
            });
          }
        }
      }

      // 灵魂转移请求
      if (event.type === SW_EVENTS.SOUL_TRANSFER_REQUESTED) {
        const p = event.payload as {
          sourceUnitId: string; sourcePosition: CellCoord;
          victimPosition: CellCoord; ownerId: string;
        };
        if (p.ownerId === myPlayerId) {
          setSoulTransferMode({
            sourceUnitId: p.sourceUnitId,
            sourcePosition: p.sourcePosition,
            victimPosition: p.victimPosition,
          });
        }
      }

      // 心灵捕获请求
      if (event.type === SW_EVENTS.MIND_CAPTURE_REQUESTED) {
        const p = event.payload as {
          sourceUnitId: string; sourcePosition: CellCoord;
          targetPosition: CellCoord; targetUnitId: string;
          ownerId: string; hits: number;
        };
        if (p.ownerId === myPlayerId) {
          setMindCaptureMode({
            sourceUnitId: p.sourceUnitId,
            sourcePosition: p.sourcePosition,
            targetPosition: p.targetPosition,
            targetUnitId: p.targetUnitId,
            hits: p.hits,
          });
        }
      }

      // 攻击后技能触发（念力/高阶念力/读心传念）
      if (event.type === SW_EVENTS.ABILITY_TRIGGERED) {
        const p = event.payload as {
          abilityId: string; sourceUnitId: string; sourcePosition: CellCoord;
        };
        if (['telekinesis', 'high_telekinesis', 'mind_transmission'].includes(p.abilityId)) {
          // 检查是否是我的单位
          const unit = core.board[p.sourcePosition.row]?.[p.sourcePosition.col]?.unit;
          if (unit && unit.owner === myPlayerId) {
            setAfterAttackAbilityMode({
              abilityId: p.abilityId as 'telekinesis' | 'high_telekinesis' | 'mind_transmission',
              sourceUnitId: p.sourceUnitId,
              sourcePosition: p.sourcePosition,
            });
          }
        }
        // 幻化：移动阶段开始时自动进入目标选择模式
        if (p.abilityId === 'illusion_copy') {
          const unit = core.board[p.sourcePosition?.row]?.[p.sourcePosition?.col]?.unit;
          if (unit && unit.owner === myPlayerId) {
            setAbilityMode({
              abilityId: 'illusion',
              step: 'selectUnit',
              sourceUnitId: p.sourceUnitId,
            });
          }
        }
        // 指引：召唤阶段开始时自动抓牌（已在 abilityResolver 中直接处理，无需 UI 交互）
        // 鲜血符文：攻击阶段开始时进入选择模式
        if (p.abilityId === 'blood_rune_choice') {
          const unit = core.board[p.sourcePosition?.row]?.[p.sourcePosition?.col]?.unit;
          if (unit && unit.owner === myPlayerId) {
            setAbilityMode({
              abilityId: 'blood_rune',
              step: 'selectUnit', // 复用 selectUnit 步骤表示等待选择
              sourceUnitId: p.sourceUnitId,
            });
          }
        }
        // 寒冰碎屑：建造阶段结束时进入确认模式
        if (p.abilityId === 'ice_shards_damage') {
          const unit = core.board[p.sourcePosition?.row]?.[p.sourcePosition?.col]?.unit;
          if (unit && unit.owner === myPlayerId) {
            setAbilityMode({
              abilityId: 'ice_shards',
              step: 'selectUnit', // 复用表示等待确认
              sourceUnitId: p.sourceUnitId,
            });
          }
        }
        // 喂养巨食兽：攻击阶段结束时进入选择模式
        if (p.abilityId === 'feed_beast_check') {
          const unit = core.board[p.sourcePosition?.row]?.[p.sourcePosition?.col]?.unit;
          if (unit && unit.owner === myPlayerId) {
            setAbilityMode({
              abilityId: 'feed_beast',
              step: 'selectUnit', // 选择相邻友方单位或自毁
              sourceUnitId: p.sourceUnitId,
            });
          }
        }
      }
    }
  // 依赖数组不包含回调函数，回调通过 ref 访问，避免因回调引用变化导致 effect 重复执行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G, core, myPlayerId]);

  /** 查找被摧毁的卡牌（弃牌堆/手牌兜底） */
  const resolveDestroyedCard = (owner: PlayerId, cardId?: string) => {
    if (!cardId) return undefined;
    const player = core.players[owner];
    if (!player) return undefined;
    return (
      player.discard.find(c => c.id === cardId)
      ?? player.hand.find(c => c.id === cardId)
    );
  };

  /** 处理摧毁事件（单位/建筑通用） */
  function handleDestroyEvent(payload: Record<string, unknown>, type: 'unit' | 'structure') {
    const position = payload.position as CellCoord;
    const cardName = payload.cardName as string;
    const cardId = payload.cardId as string | undefined;
    const owner = (payload.owner as PlayerId) ?? (myPlayerId as PlayerId);
    const destroyedCard = resolveDestroyedCard(owner, cardId);

    // 检测是否为传送门（用于音效区分）
    const isGate = type === 'structure' && destroyedCard?.cardType === 'structure' && !!(destroyedCard as StructureCard).isGate;

    // 查找弃牌堆中的卡牌，获取精灵图信息用于碎裂特效
    let atlasId: string | undefined;
    let frameIndex: number | undefined;
    if (destroyedCard && (destroyedCard.cardType === 'unit' || destroyedCard.cardType === 'structure')) {
      const sprite = getDestroySpriteConfig(destroyedCard as UnitCard | StructureCard);
      atlasId = sprite.atlasId;
      frameIndex = sprite.frameIndex;
    }

    const destroyEffect: DestroyEffectData = { id: '', position, cardName, type, atlasId, frameIndex };
    const pending = pendingAttackRef.current;
    // 延迟条件：攻击目标位置 或 任何受伤位置（含溅射/反击等）
    const shouldDelay = pending && (
      (pending.target.row === position.row && pending.target.col === position.col)
      || pending.damages.some(d => d.position.row === position.row && d.position.col === position.col)
    );

    if (shouldDelay) {
      pendingDestroyRef.current.push({ ...destroyEffect, isGate });
      if (atlasId !== undefined && frameIndex !== undefined) {
        setDyingEntities(prev => ([
          ...prev,
          {
            id: `dying-${cardId ?? 'unknown'}-${Date.now()}`,
            position,
            owner,
            type,
            atlasId,
            frameIndex,
          },
        ]));
      }
    } else {
      pushDestroyEffectRef.current({ position, cardName, type, atlasId, frameIndex });
      // 非延迟摧毁：立即播放音效
      onDestroySoundRef.current?.(type, isGate);
    }
  }

  // 关闭骰子结果 → 播放攻击动画
  const handleCloseDiceResult = useCallback(() => {
    setDiceResult(null);
    return pendingAttackRef.current;
  }, []);

  // 清理待播放数据
  const clearPendingAttack = useCallback(() => {
    pendingAttackRef.current = null;
  }, []);

  // 播放延迟的摧毁特效（含音效）
  const flushPendingDestroys = useCallback(() => {
    if (pendingDestroyRef.current.length > 0) {
      for (const effect of pendingDestroyRef.current) {
        pushDestroyEffectRef.current({
          position: effect.position, cardName: effect.cardName, type: effect.type,
          atlasId: effect.atlasId, frameIndex: effect.frameIndex,
        });
        // 死亡/摧毁音效（传送门 vs 城墙区分）
        onDestroySoundRef.current?.(effect.type, effect.isGate);
      }
      pendingDestroyRef.current = [];
      setDyingEntities([]);
    }
  }, []);

  return {
    diceResult,
    dyingEntities,
    abilityMode,
    setAbilityMode,
    soulTransferMode,
    setSoulTransferMode,
    mindCaptureMode,
    setMindCaptureMode,
    afterAttackAbilityMode,
    setAfterAttackAbilityMode,
    pendingAttackRef,
    handleCloseDiceResult,
    clearPendingAttack,
    flushPendingDestroys,
  };
}
