/**
 * 召唤师战争 - ACTIVATE_ABILITY 子命令处理
 *
 * 从 execute.ts 拆分，包含所有主动技能的执行逻辑。
 */

import type { GameEvent } from '../../../../engine/types';
import type {
  SummonerWarsCore,
  PlayerId,
  UnitCard,
  CellCoord,
} from '../types';
import { SW_EVENTS } from '../types';
import {
  getUnitAt,
  getStructureAt,
  getUnitAbilities,
  manhattanDistance,
  isValidCoord,
  isCellEmpty,
  BOARD_ROWS,
  BOARD_COLS,
} from '../helpers';
import { getEffectiveLife } from '../abilityResolver';
import {
  findBoardUnitByCardId,
  createAbilityTriggeredEvent,
  emitDestroyWithTriggers,
} from './helpers';

export function executeActivateAbility(
  events: GameEvent[],
  core: SummonerWarsCore,
  playerId: PlayerId,
  payload: Record<string, unknown>,
  timestamp: number
): void {
  const abilityId = payload.abilityId as string;
  const sourceUnitId = payload.sourceUnitId as string;
  const targetCardId = payload.targetCardId as string | undefined;
  const targetPosition = payload.targetPosition as CellCoord | undefined;
  const targetUnitId = payload.targetUnitId as string | undefined;
  
  // 查找源单位
  const found = findBoardUnitByCardId(core, sourceUnitId);
  if (!found) {
    console.warn('[SummonerWars] 技能源单位未找到:', sourceUnitId);
    return;
  }
  const sourceUnit = found.unit;
  const sourcePosition = found.position;

  events.push(createAbilityTriggeredEvent(abilityId, sourceUnitId, sourcePosition, timestamp));

  switch (abilityId) {
    case 'revive_undead': {
      if (!targetCardId || !targetPosition) break;
      events.push({
        type: SW_EVENTS.UNIT_DAMAGED,
        payload: { position: sourcePosition, damage: 2, reason: 'revive_undead', sourcePlayerId: playerId },
        timestamp,
      });
      const player = core.players[playerId];
      const card = player.discard.find(c => c.id === targetCardId);
      if (card && card.cardType === 'unit') {
        events.push({
          type: SW_EVENTS.UNIT_SUMMONED,
          payload: { playerId, cardId: targetCardId, position: targetPosition, card: card as UnitCard, fromDiscard: true },
          timestamp,
        });
      }
      break;
    }

    case 'fire_sacrifice_summon': {
      if (!targetUnitId) break;
      const fsVictim = findBoardUnitByCardId(core, targetUnitId, playerId);
      if (fsVictim) {
        events.push(...emitDestroyWithTriggers(core, fsVictim.unit, fsVictim.position, {
          playerId, timestamp, reason: 'fire_sacrifice_summon',
        }));
        events.push({
          type: SW_EVENTS.UNIT_MOVED,
          payload: { from: sourcePosition, to: fsVictim.position, unitId: sourceUnitId, reason: 'fire_sacrifice_summon' },
          timestamp,
        });
      }
      break;
    }

    case 'life_drain': {
      if (!targetUnitId) break;
      const ldVictim = findBoardUnitByCardId(core, targetUnitId, playerId);
      if (ldVictim) {
        events.push(...emitDestroyWithTriggers(core, ldVictim.unit, ldVictim.position, {
          playerId, timestamp, reason: 'life_drain',
        }));
        events.push({
          type: SW_EVENTS.STRENGTH_MODIFIED,
          payload: { position: sourcePosition, multiplier: 2, sourceAbilityId: 'life_drain' },
          timestamp,
        });
      }
      break;
    }

    case 'infection': {
      if (!targetCardId || !targetPosition) break;
      const player = core.players[playerId];
      const card = player.discard.find(c => c.id === targetCardId);
      if (card && card.cardType === 'unit') {
        events.push({
          type: SW_EVENTS.UNIT_SUMMONED,
          payload: { playerId, cardId: targetCardId, position: targetPosition, card: card as UnitCard, fromDiscard: true },
          timestamp,
        });
      }
      break;
    }

    case 'soul_transfer': {
      if (!targetPosition) break;
      events.push({
        type: SW_EVENTS.UNIT_MOVED,
        payload: { from: sourcePosition, to: targetPosition, unitId: sourceUnitId, reason: 'soul_transfer' },
        timestamp,
      });
      break;
    }

    case 'mind_capture_resolve': {
      // 心灵捕获决策：控制目标 or 造成伤害
      const choice = payload.choice as 'control' | 'damage';
      const captureTargetPos = payload.targetPosition as CellCoord | undefined;
      const captureHits = payload.hits as number | undefined;
      if (!captureTargetPos) break;
      
      if (choice === 'control') {
        // 控制目标：转移控制权
        const captureTarget = getUnitAt(core, captureTargetPos);
        if (captureTarget && captureTarget.owner !== playerId) {
          events.push({
            type: SW_EVENTS.CONTROL_TRANSFERRED,
            payload: {
              targetPosition: captureTargetPos,
              targetUnitId: captureTarget.cardId,
              newOwner: playerId,
              duration: 'permanent',
              sourceAbilityId: 'mind_capture',
            },
            timestamp,
          });
        }
      } else if (choice === 'damage' && captureHits) {
        // 造成伤害（正常攻击流程）
        events.push({
          type: SW_EVENTS.UNIT_DAMAGED,
          payload: { position: captureTargetPos, damage: captureHits, sourcePlayerId: playerId },
          timestamp,
        });
        const captureTarget = getUnitAt(core, captureTargetPos);
        if (captureTarget) {
          const newDamage = captureTarget.damage + captureHits;
          if (newDamage >= getEffectiveLife(captureTarget)) {
            events.push(...emitDestroyWithTriggers(core, captureTarget, captureTargetPos, {
              killer: { unit: sourceUnit, position: sourcePosition },
              playerId, timestamp, triggerOnKill: true, triggerOnDeath: true,
            }));
          }
        }
      }
      break;
    }

    case 'illusion': {
      // 幻化：复制3格内一个士兵的所有技能，直到回合结束
      const illusionTargetPos = payload.targetPosition as CellCoord | undefined;
      if (!illusionTargetPos) break;
      const illusionTarget = getUnitAt(core, illusionTargetPos);
      if (!illusionTarget) break;
      const copiedAbilities = getUnitAbilities(illusionTarget);
      if (copiedAbilities.length > 0) {
        events.push({
          type: SW_EVENTS.ABILITIES_COPIED,
          payload: {
            sourceUnitId,
            sourcePosition,
            targetUnitId: illusionTarget.cardId,
            targetPosition: illusionTargetPos,
            copiedAbilities,
          },
          timestamp,
        });
      }
      break;
    }

    case 'telekinesis':
    case 'high_telekinesis': {
      // 念力/高阶念力：推拉目标1格
      const pushPullTargetPos = payload.targetPosition as CellCoord | undefined;
      const pushPullDirection = payload.direction as 'push' | 'pull' | undefined;
      if (!pushPullTargetPos || !pushPullDirection) break;
      
      const pushPullTarget = getUnitAt(core, pushPullTargetPos);
      if (!pushPullTarget || pushPullTarget.card.unitClass === 'summoner') break;
      
      // 检查稳固免疫
      if (getUnitAbilities(pushPullTarget).includes('stable')) break;
      
      // 检查范围
      const maxRange = abilityId === 'high_telekinesis' ? 3 : 2;
      const dist = manhattanDistance(sourcePosition, pushPullTargetPos);
      if (dist > maxRange) break;
      
      // 计算推拉方向向量
      const dr = pushPullTargetPos.row - sourcePosition.row;
      const dc = pushPullTargetPos.col - sourcePosition.col;
      let moveRow = 0;
      let moveCol = 0;
      if (pushPullDirection === 'push') {
        if (Math.abs(dr) >= Math.abs(dc)) { moveRow = dr > 0 ? 1 : -1; }
        else { moveCol = dc > 0 ? 1 : -1; }
      } else {
        if (Math.abs(dr) >= Math.abs(dc)) { moveRow = dr > 0 ? -1 : 1; }
        else { moveCol = dc > 0 ? -1 : 1; }
      }
      
      const newPos = { row: pushPullTargetPos.row + moveRow, col: pushPullTargetPos.col + moveCol };
      if (isValidCoord(newPos) && isCellEmpty(core, newPos)) {
        const eventType = pushPullDirection === 'pull' ? SW_EVENTS.UNIT_PULLED : SW_EVENTS.UNIT_PUSHED;
        events.push({
          type: eventType,
          payload: { targetPosition: pushPullTargetPos, newPosition: newPos },
          timestamp,
        });
      }
      break;
    }

    case 'mind_transmission': {
      // 读心传念：给友方士兵额外攻击
      const extraAttackTargetPos = payload.targetPosition as CellCoord | undefined;
      if (!extraAttackTargetPos) break;
      
      const extraAttackTarget = getUnitAt(core, extraAttackTargetPos);
      if (!extraAttackTarget) break;
      if (extraAttackTarget.owner !== playerId) break;
      if (extraAttackTarget.card.unitClass !== 'common') break;
      
      const extraDist = manhattanDistance(sourcePosition, extraAttackTargetPos);
      if (extraDist > 3) break;
      
      events.push({
        type: SW_EVENTS.EXTRA_ATTACK_GRANTED,
        payload: {
          targetPosition: extraAttackTargetPos,
          targetUnitId: extraAttackTarget.cardId,
          sourceAbilityId: 'mind_transmission',
        },
        timestamp,
      });
      break;
    }

    // ============ 洞穴地精技能 ============

    case 'vanish': {
      // 神出鬼没：与0费友方单位交换位置
      const vanishTargetPos = payload.targetPosition as CellCoord | undefined;
      if (!vanishTargetPos) break;
      const vanishTarget = getUnitAt(core, vanishTargetPos);
      if (!vanishTarget || vanishTarget.owner !== playerId || vanishTarget.card.cost !== 0) break;
      
      events.push({
        type: SW_EVENTS.UNITS_SWAPPED,
        payload: {
          positionA: sourcePosition,
          positionB: vanishTargetPos,
          unitIdA: sourceUnit.cardId,
          unitIdB: vanishTarget.cardId,
        },
        timestamp,
      });
      break;
    }

    case 'blood_rune': {
      // 鲜血符文：自伤1 或 花1魔力充能
      const brChoice = payload.choice as 'damage' | 'charge';
      if (brChoice === 'damage') {
        events.push({
          type: SW_EVENTS.UNIT_DAMAGED,
          payload: { position: sourcePosition, damage: 1, reason: 'blood_rune', sourcePlayerId: playerId },
          timestamp,
        });
      } else {
        events.push({
          type: SW_EVENTS.MAGIC_CHANGED,
          payload: { playerId, delta: -1 },
          timestamp,
        });
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: 1 },
          timestamp,
        });
      }
      break;
    }

    case 'feed_beast': {
      // 喂养巨食兽：移除相邻友方单位或自毁
      const fbChoice = payload.choice as string | undefined;
      if (fbChoice === 'self_destroy') {
        events.push({
          type: SW_EVENTS.UNIT_DESTROYED,
          payload: {
            position: sourcePosition, cardId: sourceUnit.cardId,
            cardName: sourceUnit.card.name, owner: sourceUnit.owner,
            reason: 'feed_beast_self',
          },
          timestamp,
        });
      } else {
        const fbTargetPos = payload.targetPosition as CellCoord | undefined;
        if (!fbTargetPos) break;
        const fbTarget = getUnitAt(core, fbTargetPos);
        if (!fbTarget || fbTarget.owner !== playerId) break;
        events.push({
          type: SW_EVENTS.UNIT_DESTROYED,
          payload: {
            position: fbTargetPos, cardId: fbTarget.cardId,
            cardName: fbTarget.card.name, owner: fbTarget.owner,
            reason: 'feed_beast',
          },
          timestamp,
        });
      }
      break;
    }

    case 'magic_addiction': {
      // 魔力成瘾：有魔力扣1，无魔力自毁
      if (core.players[playerId].magic >= 1) {
        events.push({
          type: SW_EVENTS.MAGIC_CHANGED,
          payload: { playerId, delta: -1 },
          timestamp,
        });
      } else {
        events.push({
          type: SW_EVENTS.UNIT_DESTROYED,
          payload: {
            position: sourcePosition, cardId: sourceUnit.cardId,
            cardName: sourceUnit.card.name, owner: sourceUnit.owner,
            reason: 'magic_addiction',
          },
          timestamp,
        });
      }
      break;
    }

    case 'grab': {
      // 抓附跟随：将抓附手移动到目标位置
      const grabTargetPos = payload.targetPosition as CellCoord | undefined;
      if (!grabTargetPos) break;
      if (!isCellEmpty(core, grabTargetPos)) break;
      events.push({
        type: SW_EVENTS.UNIT_MOVED,
        payload: { from: sourcePosition, to: grabTargetPos, unitId: sourceUnitId, reason: 'grab' },
        timestamp,
      });
      break;
    }

    // ============ 先锋军团技能 ============

    case 'fortress_power': {
      // 城塞之力：从弃牌堆拿取一张城塞单位到手牌
      if (!targetCardId) break;
      const fpPlayer = core.players[playerId];
      const fpCard = fpPlayer.discard.find(c => c.id === targetCardId);
      if (!fpCard || fpCard.cardType !== 'unit') break;
      if (!(fpCard as UnitCard).id.includes('fortress')) break;
      events.push({
        type: SW_EVENTS.CARD_RETRIEVED,
        payload: { playerId, cardId: targetCardId, source: 'discard' },
        timestamp,
      });
      break;
    }

    case 'guidance': {
      // 指引：抓取2张卡牌
      const guidancePlayer = core.players[playerId];
      const guidanceDraw = Math.min(2, guidancePlayer.deck.length);
      if (guidanceDraw > 0) {
        events.push({
          type: SW_EVENTS.CARD_DRAWN,
          payload: { playerId, count: guidanceDraw },
          timestamp,
        });
      }
      break;
    }

    case 'holy_arrow': {
      // 圣光箭：弃除手牌中非同名单位，每张+1魔力+1战力
      const discardCardIds = payload.discardCardIds as string[] | undefined;
      if (!discardCardIds || discardCardIds.length === 0) break;
      const haPlayer = core.players[playerId];
      const validDiscards = discardCardIds.filter(id => haPlayer.hand.some(c => c.id === id));
      if (validDiscards.length > 0) {
        // 获得魔力
        events.push({
          type: SW_EVENTS.MAGIC_CHANGED,
          payload: { playerId, delta: validDiscards.length },
          timestamp,
        });
        // 弃除卡牌
        for (const cardId of validDiscards) {
          events.push({
            type: SW_EVENTS.CARD_DISCARDED,
            payload: { playerId, cardId },
            timestamp,
          });
        }
        // 战力加成（通过 boosts 标记）
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: validDiscards.length },
          timestamp,
        });
      }
      break;
    }

    case 'healing': {
      // 治疗：弃除手牌，标记本单位为治疗模式
      const healDiscardId = payload.targetCardId as string | undefined;
      if (!healDiscardId) break;
      const healPlayer = core.players[playerId];
      if (!healPlayer.hand.some(c => c.id === healDiscardId)) break;
      // 弃除卡牌
      events.push({
        type: SW_EVENTS.CARD_DISCARDED,
        payload: { playerId, cardId: healDiscardId },
        timestamp,
      });
      // 标记治疗模式
      events.push({
        type: SW_EVENTS.HEALING_MODE_SET,
        payload: { position: sourcePosition, unitId: sourceUnit.cardId },
        timestamp,
      });
      break;
    }

    // ============ 极地矮人技能 ============

    case 'structure_shift': {
      // 结构变换：推拉3格内友方建筑1格
      const ssTargetPos = payload.targetPosition as CellCoord | undefined;
      const ssNewPos = payload.newPosition as CellCoord | undefined;
      if (!ssTargetPos) break;
      const ssStructure = getStructureAt(core, ssTargetPos);
      if (!ssStructure || ssStructure.owner !== playerId) break;
      const ssDist = manhattanDistance(sourcePosition, ssTargetPos);
      if (ssDist > 3) break;
      if (ssNewPos && isValidCoord(ssNewPos) && isCellEmpty(core, ssNewPos)
        && manhattanDistance(ssTargetPos, ssNewPos) === 1) {
        events.push({
          type: SW_EVENTS.UNIT_PUSHED,
          payload: { targetPosition: ssTargetPos, newPosition: ssNewPos, isStructure: true },
          timestamp,
        });
      }
      break;
    }

    case 'ice_shards': {
      // 寒冰碎屑：消耗1点充能，对每个和友方建筑相邻的敌方单位造成1伤
      if ((sourceUnit.boosts ?? 0) < 1) break;
      // 消耗1点充能
      events.push({
        type: SW_EVENTS.UNIT_CHARGED,
        payload: { position: sourcePosition, delta: -1 },
        timestamp,
      });
      // 收集所有和友方建筑相邻的敌方单位（去重）
      const damagedSet = new Set<string>();
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const structure = getStructureAt(core, { row: r, col: c });
          // 友方建筑 或 友方活体结构单位
          const structureUnit = getUnitAt(core, { row: r, col: c });
          const isAllyStructure = (structure && structure.owner === playerId)
            || (structureUnit && structureUnit.owner === playerId
              && getUnitAbilities(structureUnit).includes('mobile_structure'));
          if (!isAllyStructure) continue;
          const adjDirs = [
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 },
          ];
          for (const d of adjDirs) {
            const adjPos = { row: r + d.row, col: c + d.col };
            if (!isValidCoord(adjPos)) continue;
            const adjUnit = getUnitAt(core, adjPos);
            if (adjUnit && adjUnit.owner !== playerId && !damagedSet.has(adjUnit.cardId)) {
              damagedSet.add(adjUnit.cardId);
              events.push({
                type: SW_EVENTS.UNIT_DAMAGED,
                payload: { position: adjPos, damage: 1, reason: 'ice_shards' },
                timestamp,
              });
            }
          }
        }
      }
      break;
    }

    // ============ 炽原精灵技能 ============

    case 'ancestral_bond': {
      // 祖灵羁绊：充能目标并将自身所有充能转移到目标
      const abTargetPos = payload.targetPosition as CellCoord | undefined;
      if (!abTargetPos) break;
      const abTarget = getUnitAt(core, abTargetPos);
      if (!abTarget || abTarget.owner !== playerId) break;
      const abDist = manhattanDistance(sourcePosition, abTargetPos);
      if (abDist > 3) break;
      // 先充能目标1点
      events.push({
        type: SW_EVENTS.UNIT_CHARGED,
        payload: { position: abTargetPos, delta: 1, sourceAbilityId: 'ancestral_bond' },
        timestamp,
      });
      // 转移自身所有充能到目标
      const selfCharges = sourceUnit.boosts ?? 0;
      if (selfCharges > 0) {
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: -selfCharges, sourceAbilityId: 'ancestral_bond' },
          timestamp,
        });
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: abTargetPos, delta: selfCharges, sourceAbilityId: 'ancestral_bond' },
          timestamp,
        });
      }
      break;
    }

    case 'prepare': {
      // 预备：充能自身（代替移动）
      events.push({
        type: SW_EVENTS.UNIT_CHARGED,
        payload: { position: sourcePosition, delta: 1, sourceAbilityId: 'prepare' },
        timestamp,
      });
      break;
    }

    case 'inspire': {
      // 启悟：将相邻所有友方单位充能
      const adjDirs = [
        { row: -1, col: 0 }, { row: 1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
      ];
      for (const d of adjDirs) {
        const adjPos = { row: sourcePosition.row + d.row, col: sourcePosition.col + d.col };
        if (!isValidCoord(adjPos)) continue;
        const adjUnit = getUnitAt(core, adjPos);
        if (adjUnit && adjUnit.owner === playerId && adjUnit.cardId !== sourceUnit.cardId) {
          events.push({
            type: SW_EVENTS.UNIT_CHARGED,
            payload: { position: adjPos, delta: 1, sourceAbilityId: 'inspire' },
            timestamp,
          });
        }
      }
      break;
    }

    case 'withdraw': {
      // 撤退：消耗1充能或1魔力，推拉自身1-2格
      const wdCostType = payload.costType as 'charge' | 'magic';
      const wdNewPos = payload.targetPosition as CellCoord | undefined;
      if (!wdNewPos) break;
      if (wdCostType === 'charge') {
        if ((sourceUnit.boosts ?? 0) < 1) break;
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: -1, sourceAbilityId: 'withdraw' },
          timestamp,
        });
      } else {
        if (core.players[playerId].magic < 1) break;
        events.push({
          type: SW_EVENTS.MAGIC_CHANGED,
          payload: { playerId, delta: -1 },
          timestamp,
        });
      }
      // 移动自身到目标位置
      const wdDist = manhattanDistance(sourcePosition, wdNewPos);
      if (wdDist >= 1 && wdDist <= 2 && isCellEmpty(core, wdNewPos)) {
        events.push({
          type: SW_EVENTS.UNIT_MOVED,
          payload: { from: sourcePosition, to: wdNewPos, unitId: sourceUnitId, reason: 'withdraw' },
          timestamp,
        });
      }
      break;
    }

    case 'spirit_bond': {
      // 祖灵交流：充能自身，或消耗1充能给3格内友方充能
      const sbChoice = payload.choice as 'self' | 'transfer';
      if (sbChoice === 'self') {
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: 1, sourceAbilityId: 'spirit_bond' },
          timestamp,
        });
      } else if (sbChoice === 'transfer') {
        const sbTargetPos = payload.targetPosition as CellCoord | undefined;
        if (!sbTargetPos) break;
        if ((sourceUnit.boosts ?? 0) < 1) break;
        const sbTarget = getUnitAt(core, sbTargetPos);
        if (!sbTarget || sbTarget.owner !== playerId) break;
        const sbDist = manhattanDistance(sourcePosition, sbTargetPos);
        if (sbDist > 3) break;
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: -1, sourceAbilityId: 'spirit_bond' },
          timestamp,
        });
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sbTargetPos, delta: 1, sourceAbilityId: 'spirit_bond' },
          timestamp,
        });
      }
      break;
    }

    case 'frost_axe': {
      // 冰霜战斧：充能自身，或消耗所有充能附加到3格内友方士兵
      const fxChoice = payload.choice as 'self' | 'attach';
      if (fxChoice === 'self') {
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, delta: 1, sourceAbilityId: 'frost_axe' },
          timestamp,
        });
      } else if (fxChoice === 'attach') {
        const fxTargetPos = payload.targetPosition as CellCoord | undefined;
        if (!fxTargetPos) break;
        const fxTarget = getUnitAt(core, fxTargetPos);
        if (!fxTarget || fxTarget.owner !== playerId || fxTarget.card.unitClass !== 'common') break;
        const fxDist = manhattanDistance(sourcePosition, fxTargetPos);
        if (fxDist > 3) break;
        const charges = sourceUnit.boosts ?? 0;
        if (charges < 1) break;
        // 消耗所有充能
        events.push({
          type: SW_EVENTS.UNIT_CHARGED,
          payload: { position: sourcePosition, newValue: 0, delta: -charges, sourceAbilityId: 'frost_axe' },
          timestamp,
        });
        // 将源单位附加到目标底层
        events.push({
          type: SW_EVENTS.UNIT_ATTACHED,
          payload: {
            sourcePosition,
            targetPosition: fxTargetPos,
            sourceUnitId,
            sourceCard: sourceUnit.card,
            sourceOwner: playerId,
          },
          timestamp,
        });
      }
      break;
    }

    default:
      console.warn('[SummonerWars] 未处理的技能:', abilityId);
  }
}
