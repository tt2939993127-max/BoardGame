/**
 * 单位操作面板（主动技能按钮）
 *
 * 从 Board.tsx 提取，在选中己方单位时显示可用的主动技能按钮。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SummonerWarsCore } from '../domain';
import { SW_COMMANDS, SummonerWarsDomain } from '../domain';
import type { UnitCard, PlayerId } from '../domain/types';
import { getPlayerUnits } from '../domain/helpers';
import { GameButton } from './GameButton';

interface AbilityMode {
  abilityId: string;
  step: string;
  sourceUnitId: string;
  context?: string;
  selectedCardIds?: string[];
  targetPosition?: unknown;
}

interface Props {
  core: SummonerWarsCore;
  currentPhase: string;
  isMyTurn: boolean;
  myPlayerId: string;
  myHand: Array<{ cardType: string; name: string; id: string }>;
  abilityMode: AbilityMode | null;
  bloodSummonMode: unknown;
  eventTargetMode: unknown;
  moves: Record<string, (payload?: unknown) => void>;
  setAbilityMode: (mode: AbilityMode | null) => void;
  setWithdrawMode: (mode: { sourceUnitId: string; step: string } | null) => void;
}

export const AbilityButtonsPanel: React.FC<Props> = ({
  core, currentPhase, isMyTurn, myPlayerId, myHand,
  abilityMode, bloodSummonMode, eventTargetMode,
  moves, setAbilityMode, setWithdrawMode,
}) => {
  const { t } = useTranslation('game-summonerwars');

  if (abilityMode || bloodSummonMode || eventTargetMode || !core.selectedUnit || !isMyTurn) return null;

  const cell = core.board[core.selectedUnit.row]?.[core.selectedUnit.col];
  const unit = cell?.unit;
  if (!unit || unit.owner !== myPlayerId) return null;

  const abilities = unit.card.abilities ?? [];
  const buttons: React.ReactNode[] = [];

  if (abilities.includes('revive_undead') && currentPhase === 'summon') {
    const hasUndeadInDiscard = core.players[myPlayerId as PlayerId]?.discard.some(c =>
      c.cardType === 'unit' && (c.id.includes('undead') || c.name.includes('亡灵') || (c as UnitCard).faction === 'necromancer')
    );
    if (hasUndeadInDiscard) {
      buttons.push(
        <GameButton key="revive_undead" onClick={() => setAbilityMode({ abilityId: 'revive_undead', step: 'selectCard', sourceUnitId: unit.cardId })} variant="primary" size="md">
          {t('abilityButtons.reviveUndead')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('fire_sacrifice_summon') && currentPhase === 'summon') {
    const hasOtherUnits = getPlayerUnits(core, myPlayerId as '0' | '1').some(u => u.cardId !== unit.cardId);
    if (hasOtherUnits) {
      buttons.push(
        <GameButton key="fire_sacrifice_summon" onClick={() => setAbilityMode({ abilityId: 'fire_sacrifice_summon', step: 'selectUnit', sourceUnitId: unit.cardId })} variant="secondary" size="md">
          {t('abilityButtons.fireSacrificeSummon')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('life_drain') && currentPhase === 'attack') {
    const nearbyUnits = getPlayerUnits(core, myPlayerId as '0' | '1')
      .filter(u => {
        if (u.cardId === unit.cardId) return false;
        const dist = Math.abs(u.position.row - core.selectedUnit!.row) + Math.abs(u.position.col - core.selectedUnit!.col);
        return dist <= 2;
      });
    if (nearbyUnits.length > 0) {
      buttons.push(
        <GameButton key="life_drain" onClick={() => setAbilityMode({ abilityId: 'life_drain', step: 'selectUnit', sourceUnitId: unit.cardId, context: 'beforeAttack' })} variant="secondary" size="md">
          {t('abilityButtons.lifeDrain')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('holy_arrow') && currentPhase === 'attack') {
    const hasValidDiscard = myHand.some(card => card.cardType === 'unit' && card.name !== unit.card.name);
    if (hasValidDiscard) {
      buttons.push(
        <GameButton key="holy_arrow" onClick={() => setAbilityMode({ abilityId: 'holy_arrow', step: 'selectCards', sourceUnitId: unit.cardId, context: 'beforeAttack', selectedCardIds: [] })} variant="secondary" size="md">
          {t('abilityButtons.holyArrow')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('healing') && currentPhase === 'attack') {
    const hasDiscard = myHand.length > 0;
    if (hasDiscard) {
      buttons.push(
        <GameButton key="healing" onClick={() => setAbilityMode({ abilityId: 'healing', step: 'selectCards', sourceUnitId: unit.cardId, context: 'beforeAttack', selectedCardIds: [] })} variant="secondary" size="md">
          {t('abilityButtons.healing')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('prepare') && currentPhase === 'move' && !unit.hasMoved) {
    // 使用通用的可用性判断（包含使用次数限制）
    const fullState = { core, sys: {} as any };
    const validationResult = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: { abilityId: 'prepare', sourceUnitId: unit.cardId },
      playerId: myPlayerId,
      timestamp: Date.now(),
    });
    
    buttons.push(
      <GameButton 
        key="prepare" 
        onClick={() => {
          moves[SW_COMMANDS.ACTIVATE_ABILITY]?.({ abilityId: 'prepare', sourceUnitId: unit.cardId });
        }} 
        variant="secondary" 
        size="md"
        disabled={!validationResult.valid}
        title={validationResult.valid ? undefined : validationResult.error}
      >
        {t('abilityButtons.prepare')}
      </GameButton>
    );
  }
  if (abilities.includes('fortress_power') && currentPhase === 'attack') {
    const hasFortressInDiscard = core.players[myPlayerId as PlayerId]?.discard.some(c => c.cardType === 'unit' && c.id.includes('fortress'));
    if (hasFortressInDiscard) {
      buttons.push(
        <GameButton key="fortress_power" onClick={() => setAbilityMode({ abilityId: 'fortress_power', step: 'selectCard', sourceUnitId: unit.cardId })} variant="secondary" size="md">
          {t('abilityButtons.fortressPower')}
        </GameButton>
      );
    }
  }
  // structure_shift / ancestral_bond / spirit_bond:
  // 已由 afterMove 管道自动触发 → 移动后 ABILITY_TRIGGERED → abilityMode
  // 静态按钮已移除
  if (abilities.includes('vanish') && currentPhase === 'attack') {
    const hasZeroCostAlly = getPlayerUnits(core, myPlayerId as '0' | '1')
      .some(u => u.cardId !== unit.cardId && u.card.cost === 0);
    if (hasZeroCostAlly) {
      buttons.push(
        <GameButton key="vanish" onClick={() => setAbilityMode({ abilityId: 'vanish', step: 'selectUnit', sourceUnitId: unit.cardId })} variant="secondary" size="md">
          {t('abilityButtons.vanish')}
        </GameButton>
      );
    }
  }
  if (abilities.includes('withdraw') && currentPhase === 'attack') {
    buttons.push(
      <GameButton key="withdraw" onClick={() => setWithdrawMode({ sourceUnitId: unit.cardId, step: 'selectCost' })} variant="secondary" size="md">
        {t('abilityButtons.withdraw')}
      </GameButton>
    );
  }

  if (buttons.length === 0) return null;
  return <div className="absolute bottom-[220px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex gap-2">{buttons}</div>;
};
