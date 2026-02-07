/**
 * 召唤师战争 - 顶部状态横幅
 * 
 * 显示当前交互模式的提示信息和操作按钮
 */

import React from 'react';
import type { GamePhase, CellCoord } from '../domain/types';
import { GameButton } from './GameButton';
import { ActionBanner } from './ActionBanner';
import type { AbilityModeState, SoulTransferModeState, MindCaptureModeState, AfterAttackAbilityModeState } from './useGameEvents';
import type { MindControlModeState, StunModeState, HypnoticLureModeState } from './useCellInteraction';

// ============================================================================
// 类型定义
// ============================================================================

/** 血契召唤模式状态 */
export interface BloodSummonModeState {
  step: 'selectTarget' | 'selectCard' | 'selectPosition' | 'confirm';
  cardId?: string;
  targetPosition?: CellCoord;
  summonCardId?: string;
  completedCount?: number;
}

/** 除灭模式状态 */
export interface AnnihilateModeState {
  step: 'selectTargets' | 'selectDamageTarget' | 'confirm';
  cardId: string;
  selectedTargets: CellCoord[];
  currentTargetIndex: number;
  damageTargets: (CellCoord | null)[];
}

/** 殉葬火堆模式状态 */
export interface FuneralPyreModeState {
  cardId: string;
  charges: number;
}

// ============================================================================
// Props
// ============================================================================

interface StatusBannersProps {
  currentPhase: GamePhase;
  isMyTurn: boolean;
  // 模式状态
  abilityMode: AbilityModeState | null;
  bloodSummonMode: BloodSummonModeState | null;
  annihilateMode: AnnihilateModeState | null;
  soulTransferMode: SoulTransferModeState | null;
  funeralPyreMode: FuneralPyreModeState | null;
  mindControlMode: MindControlModeState | null;
  stunMode: StunModeState | null;
  hypnoticLureMode: HypnoticLureModeState | null;
  mindCaptureMode: MindCaptureModeState | null;
  afterAttackAbilityMode: AfterAttackAbilityModeState | null;
  telekinesisTargetMode: { abilityId: string; targetPosition: CellCoord } | null;
  // 回调
  onCancelAbility: () => void;
  onCancelBloodSummon: () => void;
  onContinueBloodSummon: () => void;
  onCancelAnnihilate: () => void;
  onConfirmAnnihilateTargets: () => void;
  onConfirmSoulTransfer: () => void;
  onSkipSoulTransfer: () => void;
  onSkipFuneralPyre: () => void;
  onConfirmMindControl: () => void;
  onCancelMindControl: () => void;
  onConfirmStun: (direction: 'push' | 'pull', distance: number) => void;
  onCancelStun: () => void;
  onCancelHypnoticLure: () => void;
  onConfirmMindCapture: (choice: 'control' | 'damage') => void;
  onCancelAfterAttackAbility: () => void;
  onConfirmTelekinesis: (direction: 'push' | 'pull') => void;
  onCancelTelekinesis: () => void;
}

// ============================================================================
// 震慑方向选择子组件
// ============================================================================

const StunBanner: React.FC<{
  stunMode: StunModeState;
  onConfirmStun: (direction: 'push' | 'pull', distance: number) => void;
  onCancelStun: () => void;
}> = ({ stunMode, onConfirmStun, onCancelStun }) => {
  const [direction, setDirection] = React.useState<'push' | 'pull'>('push');
  const [distance, setDistance] = React.useState(1);

  if (stunMode.step === 'selectTarget') {
    return (
      <div className="bg-yellow-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-yellow-200 text-sm font-bold">
          震慑：选择召唤师直线3格内的敌方单位
        </span>
        <GameButton onClick={onCancelStun} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  // selectDirection 步骤
  return (
    <div className="bg-yellow-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/40 flex items-center gap-3 shadow-lg">
      <span className="text-yellow-200 text-sm font-bold">震慑方向：</span>
      <div className="flex gap-1">
        <GameButton
          onClick={() => setDirection('push')}
          variant={direction === 'push' ? 'primary' : 'secondary'}
          size="sm"
        >推开</GameButton>
        <GameButton
          onClick={() => setDirection('pull')}
          variant={direction === 'pull' ? 'primary' : 'secondary'}
          size="sm"
        >拉近</GameButton>
      </div>
      <span className="text-yellow-200 text-sm font-bold">距离：</span>
      <div className="flex gap-1">
        {[1, 2, 3].map(d => (
          <GameButton
            key={d}
            onClick={() => setDistance(d)}
            variant={distance === d ? 'primary' : 'secondary'}
            size="sm"
          >{d}</GameButton>
        ))}
      </div>
      <GameButton onClick={() => onConfirmStun(direction, distance)} variant="primary" size="sm">确认</GameButton>
      <GameButton onClick={onCancelStun} variant="secondary" size="sm">取消</GameButton>
    </div>
  );
};

// ============================================================================
// 组件
// ============================================================================

export const StatusBanners: React.FC<StatusBannersProps> = ({
  currentPhase, isMyTurn,
  abilityMode, bloodSummonMode, annihilateMode, soulTransferMode, funeralPyreMode,
  mindControlMode, stunMode, hypnoticLureMode,
  mindCaptureMode, afterAttackAbilityMode, telekinesisTargetMode,
  onCancelAbility, onCancelBloodSummon, onContinueBloodSummon,
  onCancelAnnihilate, onConfirmAnnihilateTargets,
  onConfirmSoulTransfer, onSkipSoulTransfer, onSkipFuneralPyre,
  onConfirmMindControl, onCancelMindControl,
  onConfirmStun, onCancelStun,
  onCancelHypnoticLure,
  onConfirmMindCapture, onCancelAfterAttackAbility,
  onConfirmTelekinesis, onCancelTelekinesis,
}) => {
  if (abilityMode) {
    return (
      <div className="bg-amber-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-amber-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-amber-200 text-sm font-bold">
          {abilityMode.abilityId === 'revive_undead' && abilityMode.step === 'selectCard' && '复活死灵：从弃牌堆选择亡灵单位'}
          {abilityMode.abilityId === 'revive_undead' && abilityMode.step === 'selectPosition' && '复活死灵：选择召唤师相邻的空格放置'}
          {abilityMode.abilityId === 'fire_sacrifice_summon' && '火祀召唤：选择要消灭的友方单位'}
          {abilityMode.abilityId === 'life_drain' && '吸取生命：选择2格内的友方单位消灭'}
          {abilityMode.abilityId === 'infection' && abilityMode.step === 'selectCard' && '感染：从弃牌堆选择疫病体'}
          {abilityMode.abilityId === 'infection' && abilityMode.step === 'selectPosition' && '感染：确认放置位置'}
        </span>
        <GameButton onClick={onCancelAbility} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  if (bloodSummonMode) {
    return (
      <div className="bg-rose-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-rose-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-rose-200 text-sm font-bold">
          {bloodSummonMode.step === 'selectTarget' && '血契召唤：选择一个友方单位（将承受2点伤害）'}
          {bloodSummonMode.step === 'selectCard' && '血契召唤：从手牌选择费用≤2的单位卡'}
          {bloodSummonMode.step === 'selectPosition' && '血契召唤：选择目标相邻的空格放置单位'}
          {bloodSummonMode.step === 'confirm' && `血契召唤完成 ${bloodSummonMode.completedCount ?? 1} 次，是否继续？`}
        </span>
        {bloodSummonMode.step === 'confirm' ? (
          <>
            <GameButton onClick={onContinueBloodSummon} variant="primary" size="sm">继续</GameButton>
            <GameButton onClick={onCancelBloodSummon} variant="secondary" size="sm">完成</GameButton>
          </>
        ) : (
          <GameButton onClick={onCancelBloodSummon} variant="secondary" size="sm">取消</GameButton>
        )}
      </div>
    );
  }

  if (annihilateMode) {
    return (
      <div className="bg-purple-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-purple-200 text-sm font-bold">
          {annihilateMode.step === 'selectTargets' && `除灭：选择要牺牲的友方单位（已选 ${annihilateMode.selectedTargets.length} 个）`}
          {annihilateMode.step === 'selectDamageTarget' && `除灭：为第 ${annihilateMode.currentTargetIndex + 1} 个目标选择相邻单位造成2点伤害`}
        </span>
        {annihilateMode.step === 'selectTargets' && annihilateMode.selectedTargets.length > 0 && (
          <GameButton onClick={onConfirmAnnihilateTargets} variant="primary" size="sm">确认选择</GameButton>
        )}
        <GameButton onClick={onCancelAnnihilate} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  if (soulTransferMode) {
    return (
      <div className="bg-cyan-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-cyan-200 text-sm font-bold">灵魂转移：是否将弓箭手移动到被消灭单位的位置？</span>
        <GameButton onClick={onConfirmSoulTransfer} variant="primary" size="sm">确认移动</GameButton>
        <GameButton onClick={onSkipSoulTransfer} variant="secondary" size="sm">跳过</GameButton>
      </div>
    );
  }

  if (funeralPyreMode) {
    return (
      <div className="bg-orange-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-orange-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-orange-200 text-sm font-bold">
          殉葬火堆弃除：选择一个受伤单位治疗 {funeralPyreMode.charges} 点（点击棋盘上的单位）
        </span>
        <GameButton onClick={onSkipFuneralPyre} variant="secondary" size="sm">跳过</GameButton>
      </div>
    );
  }

  if (mindControlMode) {
    return (
      <div className="bg-cyan-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-cyan-200 text-sm font-bold">
          心灵操控：选择召唤师2格内的敌方单位（已选 {mindControlMode.selectedTargets.length} 个）
        </span>
        {mindControlMode.selectedTargets.length > 0 && (
          <GameButton onClick={onConfirmMindControl} variant="primary" size="sm">确认控制</GameButton>
        )}
        <GameButton onClick={onCancelMindControl} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  if (stunMode) {
    return (
      <StunBanner
        stunMode={stunMode}
        onConfirmStun={onConfirmStun}
        onCancelStun={onCancelStun}
      />
    );
  }

  if (hypnoticLureMode) {
    return (
      <div className="bg-pink-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-pink-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-pink-200 text-sm font-bold">
          催眠引诱：选择一个敌方单位
        </span>
        <GameButton onClick={onCancelHypnoticLure} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  if (mindCaptureMode) {
    return (
      <div className="bg-indigo-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-indigo-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-indigo-200 text-sm font-bold">
          心灵捕获：控制目标还是造成 {mindCaptureMode.hits} 点伤害？
        </span>
        <GameButton onClick={() => onConfirmMindCapture('control')} variant="primary" size="sm">控制</GameButton>
        <GameButton onClick={() => onConfirmMindCapture('damage')} variant="secondary" size="sm">伤害</GameButton>
      </div>
    );
  }

  if (telekinesisTargetMode) {
    const abilityName = telekinesisTargetMode.abilityId === 'high_telekinesis' ? '高阶念力' : '念力';
    return (
      <div className="bg-teal-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-teal-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-teal-200 text-sm font-bold">{abilityName}：选择推拉方向</span>
        <GameButton onClick={() => onConfirmTelekinesis('push')} variant="primary" size="sm">推开</GameButton>
        <GameButton onClick={() => onConfirmTelekinesis('pull')} variant="secondary" size="sm">拉近</GameButton>
        <GameButton onClick={onCancelTelekinesis} variant="secondary" size="sm">取消</GameButton>
      </div>
    );
  }

  if (afterAttackAbilityMode) {
    const nameMap: Record<string, string> = {
      telekinesis: '念力', high_telekinesis: '高阶念力', mind_transmission: '读心传念',
    };
    return (
      <div className="bg-teal-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-teal-500/40 flex items-center gap-3 shadow-lg">
        <span className="text-teal-200 text-sm font-bold">
          {nameMap[afterAttackAbilityMode.abilityId] ?? afterAttackAbilityMode.abilityId}：选择目标
        </span>
        <GameButton onClick={onCancelAfterAttackAbility} variant="secondary" size="sm">跳过</GameButton>
      </div>
    );
  }

  return <ActionBanner phase={currentPhase} isMyTurn={isMyTurn} />;
};
