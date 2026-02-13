/**
 * 召唤师战争 - 事件卡交互模式子 Hook
 *
 * 管理所有事件卡多步骤交互模式的状态、高亮计算、点击处理和确认回调。
 * 由 useCellInteraction 编排层调用。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SummonerWarsCore, CellCoord, EventCard, GamePhase } from '../domain/types';
import { SW_COMMANDS } from '../domain/types';
import {
  getPlayerUnits, isCellEmpty, getAdjacentCells,
  manhattanDistance, isInStraightLine,
  getStructureAt, isValidCoord, getSummoner, findUnitPosition,
} from '../domain/helpers';
import { BOARD_ROWS, BOARD_COLS } from '../config/board';
import { getBaseCardId, CARD_IDS } from '../domain/ids';
import type { SoulTransferModeState, MindCaptureModeState, AfterAttackAbilityModeState } from './useGameEvents';
import type { BloodSummonModeState, AnnihilateModeState, FuneralPyreModeState } from './StatusBanners';
import type {
  EventTargetModeState, MindControlModeState, ChantEntanglementModeState,
  WithdrawModeState, GlacialShiftModeState, SneakModeState,
  StunModeState, HypnoticLureModeState, TelekinesisTargetModeState,
} from './modeTypes';

// ============================================================================
// 参数
// ============================================================================

interface UseEventCardModesParams {
  core: SummonerWarsCore;
  moves: Record<string, (payload?: unknown) => void>;
  currentPhase: GamePhase;
  myPlayerId: string;
  myHand: import('../domain/types').Card[];
  setSelectedHandCardId: (id: string | null) => void;
  // 外部模式（仅用于 click 早期返回判断，不由本 hook 管理）
  soulTransferMode: SoulTransferModeState | null;
  mindCaptureMode: MindCaptureModeState | null;
  afterAttackAbilityMode: AfterAttackAbilityModeState | null;
  setAfterAttackAbilityMode: (mode: AfterAttackAbilityModeState | null) => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useEventCardModes({
  core, moves, currentPhase, myPlayerId, myHand, setSelectedHandCardId,
  soulTransferMode, mindCaptureMode,
  afterAttackAbilityMode, setAfterAttackAbilityMode,
}: UseEventCardModesParams) {

  // ---------- 状态 ----------
  const [eventTargetMode, setEventTargetMode] = useState<EventTargetModeState | null>(null);
  const [bloodSummonMode, setBloodSummonMode] = useState<BloodSummonModeState | null>(null);
  const [funeralPyreMode, setFuneralPyreMode] = useState<FuneralPyreModeState | null>(null);
  const [annihilateMode, setAnnihilateMode] = useState<AnnihilateModeState | null>(null);
  const [mindControlMode, setMindControlMode] = useState<MindControlModeState | null>(null);
  const [stunMode, setStunMode] = useState<StunModeState | null>(null);
  const [hypnoticLureMode, setHypnoticLureMode] = useState<HypnoticLureModeState | null>(null);
  const [chantEntanglementMode, setChantEntanglementMode] = useState<ChantEntanglementModeState | null>(null);
  const [sneakMode, setSneakMode] = useState<SneakModeState | null>(null);
  const [glacialShiftMode, setGlacialShiftMode] = useState<GlacialShiftModeState | null>(null);
  const [withdrawMode, setWithdrawMode] = useState<WithdrawModeState | null>(null);
  const [telekinesisTargetMode, setTelekinesisTargetMode] = useState<TelekinesisTargetModeState | null>(null);

  // ---------- 派生 ----------
  const clearAllEventModes = useCallback(() => {
    setEventTargetMode(null);
    setBloodSummonMode(null);
    setAnnihilateMode(null);
    setMindControlMode(null);
    setStunMode(null);
    setHypnoticLureMode(null);
    setChantEntanglementMode(null);
    setSneakMode(null);
    setGlacialShiftMode(null);
    setWithdrawMode(null);
    setSelectedHandCardId(null);
  }, [setSelectedHandCardId]);

  const hasActiveEventMode = !!(eventTargetMode || bloodSummonMode || annihilateMode
    || mindControlMode || stunMode || hypnoticLureMode || chantEntanglementMode
    || sneakMode || glacialShiftMode);

  // 阶段切换时自动取消所有多步骤事件卡模式
  // eslint-disable-next-line react-hooks/set-state-in-effect -- phase change batch reset internal state
  useEffect(() => { clearAllEventModes(); }, [currentPhase, clearAllEventModes]);

  // ---------- 高亮计算 ----------

  const validEventTargets = useMemo(() => {
    if (!eventTargetMode) return [];
    return eventTargetMode.validTargets;
  }, [eventTargetMode]);

  const bloodSummonHighlights = useMemo(() => {
    if (!bloodSummonMode) return [];
    if (bloodSummonMode.step === 'selectTarget') {
      return getPlayerUnits(core, myPlayerId as '0' | '1').map(u => u.position);
    }
    if (bloodSummonMode.step === 'selectPosition' && bloodSummonMode.targetPosition) {
      const tp = bloodSummonMode.targetPosition;
      const adj: CellCoord[] = [
        { row: tp.row - 1, col: tp.col },
        { row: tp.row + 1, col: tp.col },
        { row: tp.row, col: tp.col - 1 },
        { row: tp.row, col: tp.col + 1 },
      ];
      return adj.filter(p => isCellEmpty(core, p));
    }
    return [];
  }, [bloodSummonMode, core, myPlayerId]);

  const annihilateHighlights = useMemo(() => {
    if (!annihilateMode) return [];
    if (annihilateMode.step === 'selectTargets') {
      return getPlayerUnits(core, myPlayerId as '0' | '1')
        .filter(u => u.card.unitClass !== 'summoner')
        .map(u => u.position);
    }
    if (annihilateMode.step === 'selectDamageTarget') {
      const currentTarget = annihilateMode.selectedTargets[annihilateMode.currentTargetIndex];
      if (currentTarget) {
        return getAdjacentCells(currentTarget).filter(adj => {
          const unit = core.board[adj.row]?.[adj.col]?.unit;
          return unit !== undefined;
        });
      }
    }
    return [];
  }, [annihilateMode, core, myPlayerId]);

  const mindControlHighlights = useMemo(() => {
    if (!mindControlMode) return [];
    return mindControlMode.validTargets;
  }, [mindControlMode]);

  const entanglementHighlights = useMemo(() => {
    if (!chantEntanglementMode) return [];
    return chantEntanglementMode.validTargets;
  }, [chantEntanglementMode]);

  const glacialShiftHighlights = useMemo(() => {
    if (!glacialShiftMode) return [];
    if (glacialShiftMode.step === 'selectBuilding') {
      const recordedKeys = new Set(glacialShiftMode.recorded.map(r => `${r.position.row}-${r.position.col}`));
      return glacialShiftMode.validBuildings.filter(p => !recordedKeys.has(`${p.row}-${p.col}`));
    }
    if (glacialShiftMode.step === 'selectDestination' && glacialShiftMode.currentBuilding) {
      const result: CellCoord[] = [];
      const { row, col } = glacialShiftMode.currentBuilding;
      for (let r = row - 2; r <= row + 2; r++) {
        for (let c = col - 2; c <= col + 2; c++) {
          const pos = { row: r, col: c };
          if (!isValidCoord(pos)) continue;
          const dist = manhattanDistance(glacialShiftMode.currentBuilding, pos);
          if (dist >= 1 && dist <= 2 && isCellEmpty(core, pos)) result.push(pos);
        }
      }
      return result;
    }
    return [];
  }, [glacialShiftMode, core]);

  const sneakHighlights = useMemo(() => {
    if (!sneakMode) return [];
    if (sneakMode.step === 'selectUnit') {
      const recordedKeys = new Set(sneakMode.recorded.map(r => `${r.position.row}-${r.position.col}`));
      return sneakMode.validUnits.filter(p => !recordedKeys.has(`${p.row}-${p.col}`));
    }
    if (sneakMode.step === 'selectDirection' && sneakMode.currentUnit) {
      return getAdjacentCells(sneakMode.currentUnit).filter(p => isCellEmpty(core, p));
    }
    return [];
  }, [sneakMode, core]);

  const stunHighlights = useMemo(() => {
    if (!stunMode) return [];
    return stunMode.validTargets;
  }, [stunMode]);

  const hypnoticLureHighlights = useMemo(() => {
    if (!hypnoticLureMode) return [];
    return hypnoticLureMode.validTargets;
  }, [hypnoticLureMode]);

  const withdrawHighlights = useMemo(() => {
    if (!withdrawMode || withdrawMode.step !== 'selectPosition') return [];
    const sourcePos = findUnitPosition(core, withdrawMode.sourceUnitId);
    if (!sourcePos) return [];
    const result: CellCoord[] = [];
    for (let r = sourcePos.row - 2; r <= sourcePos.row + 2; r++) {
      for (let c = sourcePos.col - 2; c <= sourcePos.col + 2; c++) {
        const pos = { row: r, col: c };
        if (!isValidCoord(pos)) continue;
        const dist = manhattanDistance(sourcePos, pos);
        if (dist >= 1 && dist <= 2 && isCellEmpty(core, pos)) result.push(pos);
      }
    }
    return result;
  }, [withdrawMode, core]);

  // 攻击后技能有效位置（念力/高阶念力/读心传念）
  const afterAttackAbilityHighlights = useMemo(() => {
    if (!afterAttackAbilityMode) return [];
    const { abilityId, sourcePosition } = afterAttackAbilityMode;
    const positions: CellCoord[] = [];
    if (abilityId === 'telekinesis' || abilityId === 'high_telekinesis') {
      const maxRange = abilityId === 'high_telekinesis' ? 3 : 2;
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const unit = core.board[row]?.[col]?.unit;
          if (!unit || unit.card.unitClass === 'summoner') continue;
          if ((unit.card.abilities ?? []).includes('stable')) continue;
          const dist = manhattanDistance(sourcePosition, { row, col });
          if (dist > 0 && dist <= maxRange) {
            positions.push({ row, col });
          }
        }
      }
    } else if (abilityId === 'mind_transmission') {
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const unit = core.board[row]?.[col]?.unit;
          if (!unit || unit.owner !== myPlayerId || unit.card.unitClass !== 'common') continue;
          const dist = manhattanDistance(sourcePosition, { row, col });
          if (dist > 0 && dist <= 3) {
            positions.push({ row, col });
          }
        }
      }
    }
    return positions;
  }, [afterAttackAbilityMode, core, myPlayerId]);

  // ---------- 事件模式点击处理 ----------

  /**
   * 尝试处理事件卡/多步骤模式的格子点击。
   * 返回 true 表示已处理（调用方应 return），false 表示未匹配任何模式。
   */
  const handleEventModeClick = useCallback((gameRow: number, gameCol: number): boolean => {
    // 殉葬火堆治疗目标选择
    if (funeralPyreMode) {
      const targetUnit = core.board[gameRow]?.[gameCol]?.unit;
      if (targetUnit && targetUnit.damage > 0) {
        moves[SW_COMMANDS.FUNERAL_PYRE_HEAL]?.({
          cardId: funeralPyreMode.cardId,
          targetPosition: { row: gameRow, col: gameCol },
        });
        setFuneralPyreMode(null);
      }
      return true;
    }

    // 灵魂转移确认模式下不处理其他点击
    if (soulTransferMode) return true;

    // 心灵捕获选择模式下不处理其他点击
    if (mindCaptureMode) return true;

    // 攻击后技能目标选择模式
    if (afterAttackAbilityMode) {
      const isValid = afterAttackAbilityHighlights.some(p => p.row === gameRow && p.col === gameCol);
      if (isValid) {
        if (afterAttackAbilityMode.abilityId === 'mind_transmission') {
          moves[SW_COMMANDS.ACTIVATE_ABILITY]?.({
            abilityId: 'mind_transmission',
            sourceUnitId: afterAttackAbilityMode.sourceUnitId,
            targetPosition: { row: gameRow, col: gameCol },
          });
          setAfterAttackAbilityMode(null);
        } else {
          setAfterAttackAbilityMode(null);
          setTelekinesisTargetMode({
            abilityId: afterAttackAbilityMode.abilityId,
            sourceUnitId: afterAttackAbilityMode.sourceUnitId,
            targetPosition: { row: gameRow, col: gameCol },
          });
        }
      }
      return true;
    }

    // 念力推拉方向选择模式下不处理其他点击
    if (telekinesisTargetMode) return true;

    // 血契召唤多步骤模式
    if (bloodSummonMode) {
      if (bloodSummonMode.step === 'selectTarget') {
        const isValid = bloodSummonHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          setBloodSummonMode({ ...bloodSummonMode, step: 'selectCard', targetPosition: { row: gameRow, col: gameCol } });
        }
      } else if (bloodSummonMode.step === 'selectPosition' && bloodSummonMode.targetPosition && bloodSummonMode.summonCardId) {
        const isValid = bloodSummonHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          const isFirstUse = (bloodSummonMode.completedCount ?? 0) === 0;
          if (isFirstUse && bloodSummonMode.cardId) {
            moves[SW_COMMANDS.PLAY_EVENT]?.({ cardId: bloodSummonMode.cardId });
          }
          moves[SW_COMMANDS.BLOOD_SUMMON_STEP]?.({
            targetUnitPosition: bloodSummonMode.targetPosition,
            summonCardId: bloodSummonMode.summonCardId,
            summonPosition: { row: gameRow, col: gameCol },
          });
          setBloodSummonMode({
            step: 'confirm', cardId: bloodSummonMode.cardId,
            completedCount: (bloodSummonMode.completedCount ?? 0) + 1,
          });
        }
      }
      return true;
    }

    // 除灭多步骤模式
    if (annihilateMode) {
      if (annihilateMode.step === 'selectTargets') {
        const friendlyUnits = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.unitClass !== 'summoner');
        const isValid = friendlyUnits.some(u => u.position.row === gameRow && u.position.col === gameCol);
        if (isValid) {
          const alreadySelected = annihilateMode.selectedTargets.some(p => p.row === gameRow && p.col === gameCol);
          if (alreadySelected) {
            setAnnihilateMode({
              ...annihilateMode,
              selectedTargets: annihilateMode.selectedTargets.filter(p => !(p.row === gameRow && p.col === gameCol)),
            });
          } else {
            setAnnihilateMode({
              ...annihilateMode,
              selectedTargets: [...annihilateMode.selectedTargets, { row: gameRow, col: gameCol }],
            });
          }
        }
      } else if (annihilateMode.step === 'selectDamageTarget') {
        const currentTarget = annihilateMode.selectedTargets[annihilateMode.currentTargetIndex];
        if (currentTarget) {
          const adjacentUnits = getAdjacentCells(currentTarget)
            .filter(adj => core.board[adj.row]?.[adj.col]?.unit !== undefined);
          const isValid = adjacentUnits.some(p => p.row === gameRow && p.col === gameCol);
          if (isValid) {
            const newDamageTargets = [...annihilateMode.damageTargets];
            newDamageTargets[annihilateMode.currentTargetIndex] = { row: gameRow, col: gameCol };
            const nextIndex = annihilateMode.currentTargetIndex + 1;
            if (nextIndex < annihilateMode.selectedTargets.length) {
              setAnnihilateMode({ ...annihilateMode, damageTargets: newDamageTargets, currentTargetIndex: nextIndex });
            } else {
              moves[SW_COMMANDS.PLAY_EVENT]?.({
                cardId: annihilateMode.cardId,
                targets: annihilateMode.selectedTargets,
                damageTargets: newDamageTargets,
              });
              setAnnihilateMode(null);
            }
          }
        }
      }
      return true;
    }

    // 心灵操控多目标选择模式
    if (mindControlMode) {
      const isValid = mindControlMode.validTargets.some(p => p.row === gameRow && p.col === gameCol);
      if (isValid) {
        const alreadySelected = mindControlMode.selectedTargets.some(p => p.row === gameRow && p.col === gameCol);
        if (alreadySelected) {
          setMindControlMode({
            ...mindControlMode,
            selectedTargets: mindControlMode.selectedTargets.filter(p => !(p.row === gameRow && p.col === gameCol)),
          });
        } else {
          setMindControlMode({
            ...mindControlMode,
            selectedTargets: [...mindControlMode.selectedTargets, { row: gameRow, col: gameCol }],
          });
        }
      }
      return true;
    }

    // 震慑目标选择模式
    if (stunMode) {
      if (stunMode.step === 'selectTarget') {
        const isValid = stunMode.validTargets.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          setStunMode({ ...stunMode, step: 'selectDirection', targetPosition: { row: gameRow, col: gameCol } });
        }
      }
      return true;
    }

    // 撤退位置选择模式
    if (withdrawMode && withdrawMode.step === 'selectPosition') {
      const isValid = withdrawHighlights.some(p => p.row === gameRow && p.col === gameCol);
      if (isValid) {
        moves[SW_COMMANDS.ACTIVATE_ABILITY]?.({
          abilityId: 'withdraw',
          sourceUnitId: withdrawMode.sourceUnitId,
          costType: withdrawMode.costType,
          targetPosition: { row: gameRow, col: gameCol },
        });
        setWithdrawMode(null);
      }
      return true;
    }

    // 冰川位移目标选择模式
    if (glacialShiftMode) {
      if (glacialShiftMode.step === 'selectBuilding') {
        const isValid = glacialShiftHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          setGlacialShiftMode({ ...glacialShiftMode, step: 'selectDestination', currentBuilding: { row: gameRow, col: gameCol } });
        }
      } else if (glacialShiftMode.step === 'selectDestination' && glacialShiftMode.currentBuilding) {
        const isValid = glacialShiftHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          const newRecorded = [...glacialShiftMode.recorded, { position: glacialShiftMode.currentBuilding, newPosition: { row: gameRow, col: gameCol } }];
          if (newRecorded.length >= 3) {
            moves[SW_COMMANDS.PLAY_EVENT]?.({
              cardId: glacialShiftMode.cardId,
              shiftDirections: newRecorded,
            });
            setGlacialShiftMode(null);
            setSelectedHandCardId(null);
          } else {
            setGlacialShiftMode({ ...glacialShiftMode, step: 'selectBuilding', currentBuilding: undefined, recorded: newRecorded });
          }
        }
      }
      return true;
    }

    // 潜行目标选择模式
    if (sneakMode) {
      if (sneakMode.step === 'selectUnit') {
        const isValid = sneakHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          setSneakMode({ ...sneakMode, step: 'selectDirection', currentUnit: { row: gameRow, col: gameCol } });
        }
      } else if (sneakMode.step === 'selectDirection' && sneakMode.currentUnit) {
        const isValid = sneakHighlights.some(p => p.row === gameRow && p.col === gameCol);
        if (isValid) {
          const newRecorded = [...sneakMode.recorded, { position: sneakMode.currentUnit, newPosition: { row: gameRow, col: gameCol } }];
          setSneakMode({ ...sneakMode, step: 'selectUnit', currentUnit: undefined, recorded: newRecorded });
        }
      }
      return true;
    }

    // 交缠颂歌目标选择模式
    if (chantEntanglementMode) {
      const isValid = entanglementHighlights.some(p => p.row === gameRow && p.col === gameCol);
      if (isValid) {
        const key = `${gameRow}-${gameCol}`;
        const selectedKeys = new Set(chantEntanglementMode.selectedTargets.map(p => `${p.row}-${p.col}`));
        if (selectedKeys.has(key)) {
          setChantEntanglementMode({
            ...chantEntanglementMode,
            selectedTargets: chantEntanglementMode.selectedTargets.filter(p => !(p.row === gameRow && p.col === gameCol)),
          });
        } else if (chantEntanglementMode.selectedTargets.length < 2) {
          setChantEntanglementMode({
            ...chantEntanglementMode,
            selectedTargets: [...chantEntanglementMode.selectedTargets, { row: gameRow, col: gameCol }],
          });
        }
      }
      return true;
    }

    // 催眠引诱目标选择模式
    if (hypnoticLureMode) {
      const isValid = hypnoticLureMode.validTargets.some(p => p.row === gameRow && p.col === gameCol);
      if (isValid) {
        moves[SW_COMMANDS.PLAY_EVENT]?.({
          cardId: hypnoticLureMode.cardId,
          targets: [{ row: gameRow, col: gameCol }],
        });
        setHypnoticLureMode(null);
        setSelectedHandCardId(null);
      }
      return true;
    }

    // 事件目标选择模式
    if (eventTargetMode) {
      const isValidTarget = eventTargetMode.validTargets.some(p => p.row === gameRow && p.col === gameCol);
      if (isValidTarget) {
        moves[SW_COMMANDS.PLAY_EVENT]?.({ cardId: eventTargetMode.cardId, targets: [{ row: gameRow, col: gameCol }] });
      }
      setEventTargetMode(null);
      setSelectedHandCardId(null);
      return true;
    }

    // 未匹配任何事件模式
    return false;
  }, [core, moves, myPlayerId, setSelectedHandCardId,
    funeralPyreMode, soulTransferMode, mindCaptureMode,
    afterAttackAbilityMode, afterAttackAbilityHighlights, setAfterAttackAbilityMode,
    telekinesisTargetMode,
    bloodSummonMode, bloodSummonHighlights,
    annihilateMode, mindControlMode, stunMode,
    withdrawMode, withdrawHighlights,
    glacialShiftMode, glacialShiftHighlights,
    sneakMode, sneakHighlights,
    chantEntanglementMode, entanglementHighlights,
    hypnoticLureMode, eventTargetMode]);

  // ---------- 打出事件卡 ----------

  const handlePlayEvent = useCallback((cardId: string) => {
    const card = myHand.find(c => c.id === cardId);
    if (!card || card.cardType !== 'event') return;
    const eventCard = card as EventCard;
    const baseId = getBaseCardId(eventCard.id);

    switch (baseId) {
      case 'necro-hellfire-blade': {
        const friendlyCommons = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.unitClass === 'common');
        if (friendlyCommons.length === 0) return;
        setEventTargetMode({ cardId, card: eventCard, validTargets: friendlyCommons.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'necro-blood-summon': {
        const friendlyUnits = getPlayerUnits(core, myPlayerId as '0' | '1');
        if (friendlyUnits.length === 0) return;
        setBloodSummonMode({ step: 'selectTarget', cardId });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'necro-annihilate': {
        const friendlyUnits = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.unitClass !== 'summoner');
        if (friendlyUnits.length === 0) return;
        setAnnihilateMode({ step: 'selectTargets', cardId, selectedTargets: [], currentTargetIndex: 0, damageTargets: [] });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'trickster-mind-control': {
        const summoner = getSummoner(core, myPlayerId as '0' | '1');
        if (!summoner) return;
        const opponentId = myPlayerId === '0' ? '1' : '0';
        const enemyUnits = getPlayerUnits(core, opponentId as '0' | '1')
          .filter(u => u.card.unitClass !== 'summoner' && manhattanDistance(summoner.position, u.position) <= 2);
        if (enemyUnits.length === 0) return;
        setMindControlMode({ cardId, validTargets: enemyUnits.map(u => u.position), selectedTargets: [] });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'trickster-stun': {
        const stunSummoner = getSummoner(core, myPlayerId as '0' | '1');
        if (!stunSummoner) return;
        const stunOpponentId = myPlayerId === '0' ? '1' : '0';
        const stunTargets = getPlayerUnits(core, stunOpponentId as '0' | '1')
          .filter(u => {
            if (u.card.unitClass === 'summoner') return false;
            const dist = manhattanDistance(stunSummoner.position, u.position);
            return dist <= 3 && dist > 0 && isInStraightLine(stunSummoner.position, u.position);
          });
        if (stunTargets.length === 0) return;
        setStunMode({ step: 'selectTarget', cardId, validTargets: stunTargets.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'trickster-hypnotic-lure': {
        const lureOpponentId = myPlayerId === '0' ? '1' : '0';
        const lureTargets = getPlayerUnits(core, lureOpponentId as '0' | '1')
          .filter(u => u.card.unitClass !== 'summoner');
        if (lureTargets.length === 0) return;
        setHypnoticLureMode({ cardId, validTargets: lureTargets.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'barbaric-chant-of-power': {
        const cpSummoner = getSummoner(core, myPlayerId as '0' | '1');
        if (!cpSummoner) return;
        const cpTargets = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.unitClass !== 'summoner' && manhattanDistance(cpSummoner.position, u.position) <= 3);
        if (cpTargets.length === 0) return;
        setEventTargetMode({ cardId, card: eventCard, validTargets: cpTargets.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'barbaric-chant-of-growth': {
        const cgTargets = getPlayerUnits(core, myPlayerId as '0' | '1');
        if (cgTargets.length === 0) return;
        setEventTargetMode({ cardId, card: eventCard, validTargets: cgTargets.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'barbaric-chant-of-weaving': {
        const cwTargets = getPlayerUnits(core, myPlayerId as '0' | '1');
        if (cwTargets.length === 0) return;
        setEventTargetMode({ cardId, card: eventCard, validTargets: cwTargets.map(u => u.position) });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'frost-glacial-shift': {
        const gsSummoner = getSummoner(core, myPlayerId as '0' | '1');
        if (!gsSummoner) return;
        const gsBuildings: CellCoord[] = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
          for (let c = 0; c < BOARD_COLS; c++) {
            const structure = getStructureAt(core, { row: r, col: c });
            if (structure && structure.owner === (myPlayerId as '0' | '1')
              && manhattanDistance(gsSummoner.position, { row: r, col: c }) <= 3) {
              gsBuildings.push({ row: r, col: c });
            }
          }
        }
        if (gsBuildings.length === 0) return;
        setGlacialShiftMode({ cardId, step: 'selectBuilding', validBuildings: gsBuildings, recorded: [] });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'goblin-sneak': {
        const sneakUnits = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.cost === 0 && u.card.unitClass !== 'summoner');
        if (sneakUnits.length === 0) return;
        setSneakMode({ cardId, step: 'selectUnit', validUnits: sneakUnits.map(u => u.position), recorded: [] });
        setSelectedHandCardId(cardId);
        return;
      }
      case 'barbaric-chant-of-entanglement': {
        const summoner = getSummoner(core, myPlayerId as '0' | '1');
        if (!summoner) return;
        const friendlyCommons = getPlayerUnits(core, myPlayerId as '0' | '1')
          .filter(u => u.card.unitClass === 'common' && manhattanDistance(summoner.position, u.position) <= 3);
        if (friendlyCommons.length < 2) return;
        setChantEntanglementMode({ cardId, validTargets: friendlyCommons.map(u => u.position), selectedTargets: [] });
        setSelectedHandCardId(cardId);
        return;
      }
      default: {
        moves[SW_COMMANDS.PLAY_EVENT]?.({ cardId });
        return;
      }
    }
  }, [core, myHand, myPlayerId, moves, setSelectedHandCardId]);

  // ---------- 确认回调 ----------

  const handleConfirmMindControl = useCallback(() => {
    if (!mindControlMode || mindControlMode.selectedTargets.length === 0) return;
    moves[SW_COMMANDS.PLAY_EVENT]?.({
      cardId: mindControlMode.cardId,
      targets: mindControlMode.selectedTargets,
    });
    setMindControlMode(null);
    setSelectedHandCardId(null);
  }, [moves, mindControlMode, setSelectedHandCardId]);

  const handleConfirmStun = useCallback((direction: 'push' | 'pull', distance: number) => {
    if (!stunMode || !stunMode.targetPosition) return;
    moves[SW_COMMANDS.PLAY_EVENT]?.({
      cardId: stunMode.cardId,
      targets: [stunMode.targetPosition],
      stunDirection: direction,
      stunDistance: distance,
    });
    setStunMode(null);
    setSelectedHandCardId(null);
  }, [moves, stunMode, setSelectedHandCardId]);

  const handleConfirmGlacialShift = useCallback(() => {
    if (!glacialShiftMode || glacialShiftMode.recorded.length === 0) return;
    moves[SW_COMMANDS.PLAY_EVENT]?.({
      cardId: glacialShiftMode.cardId,
      shiftDirections: glacialShiftMode.recorded,
    });
    setGlacialShiftMode(null);
    setSelectedHandCardId(null);
  }, [moves, glacialShiftMode, setSelectedHandCardId]);

  const handleConfirmSneak = useCallback(() => {
    if (!sneakMode || sneakMode.recorded.length === 0) return;
    moves[SW_COMMANDS.PLAY_EVENT]?.({
      cardId: sneakMode.cardId,
      sneakDirections: sneakMode.recorded,
    });
    setSneakMode(null);
    setSelectedHandCardId(null);
  }, [moves, sneakMode, setSelectedHandCardId]);

  const handleConfirmEntanglement = useCallback(() => {
    if (!chantEntanglementMode || chantEntanglementMode.selectedTargets.length < 2) return;
    moves[SW_COMMANDS.PLAY_EVENT]?.({
      cardId: chantEntanglementMode.cardId,
      targets: chantEntanglementMode.selectedTargets,
    });
    setChantEntanglementMode(null);
    setSelectedHandCardId(null);
  }, [moves, chantEntanglementMode, setSelectedHandCardId]);

  const handleConfirmTelekinesis = useCallback((direction: 'push' | 'pull') => {
    if (!telekinesisTargetMode) return;
    moves[SW_COMMANDS.ACTIVATE_ABILITY]?.({
      abilityId: telekinesisTargetMode.abilityId,
      sourceUnitId: telekinesisTargetMode.sourceUnitId,
      targetPosition: telekinesisTargetMode.targetPosition,
      direction,
    });
    setTelekinesisTargetMode(null);
  }, [moves, telekinesisTargetMode]);

  // ---------- 副作用 ----------

  // 检测殉葬火堆充能
  useEffect(() => {
    if (funeralPyreMode) return;
    const player = core.players[myPlayerId as '0' | '1'];
    if (!player) return;
    for (const ev of player.activeEvents) {
      const baseId = getBaseCardId(ev.id);
      if (baseId === CARD_IDS.NECRO_FUNERAL_PYRE && (ev.charges ?? 0) > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync game state to UI mode
        setFuneralPyreMode({ cardId: ev.id, charges: ev.charges ?? 0 });
        return;
      }
    }
  }, [core.players, myPlayerId, funeralPyreMode]);

  // ---------- 返回 ----------

  return {
    // 模式状态
    eventTargetMode, bloodSummonMode, setBloodSummonMode,
    annihilateMode, setAnnihilateMode,
    funeralPyreMode, setFuneralPyreMode,
    mindControlMode, setMindControlMode,
    stunMode, setStunMode,
    hypnoticLureMode, setHypnoticLureMode,
    chantEntanglementMode, setChantEntanglementMode,
    sneakMode, setSneakMode,
    glacialShiftMode, setGlacialShiftMode,
    withdrawMode, setWithdrawMode,
    telekinesisTargetMode, setTelekinesisTargetMode,
    // 派生
    clearAllEventModes, hasActiveEventMode,
    // 高亮
    validEventTargets, bloodSummonHighlights, annihilateHighlights,
    mindControlHighlights, entanglementHighlights, glacialShiftHighlights,
    sneakHighlights, stunHighlights, hypnoticLureHighlights,
    withdrawHighlights, afterAttackAbilityHighlights,
    // 回调
    handleEventModeClick, handlePlayEvent,
    handleConfirmMindControl, handleConfirmStun,
    handleConfirmGlacialShift, handleConfirmSneak,
    handleConfirmEntanglement, handleConfirmTelekinesis,
  };
}
