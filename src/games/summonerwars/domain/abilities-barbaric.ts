/**
 * 召唤师战争 - 炽原精灵技能定义
 * 
 * 核心机制：充能协同、力量/生命/速度强化、连续射击
 * 
 * 技能清单：
 * - ancestral_bond: 祖灵羁绊（召唤师 - 移动后充能目标并转移自身充能）
 * - power_up: 力量强化（蒙威尊者 - 每点充能+1战力，最多+5）
 * - trample: 践踏（蒙威尊者/犀牛 - 已在 frost 定义，共享）
 * - prepare: 预备（梅肯达·露/边境弓箭手 - 充能代替移动）
 * - rapid_fire: 连续射击（梅肯达·露/边境弓箭手 - 攻击后消耗1充能额外攻击）
 * - inspire: 启悟（凯鲁尊者 - 移动后将相邻友方单位充能）
 * - withdraw: 撤退（凯鲁尊者 - 攻击后消耗1充能/魔力推拉自身1-2格）
 * - intimidate: 威势（雌狮 - 攻击后充能，每回合一次）
 * - life_up: 生命强化（雌狮 - 每点充能+1生命，最多+5）
 * - speed_up: 速度强化（犀牛 - 每点充能+1移动，最多+5）
 * - gather_power: 聚能（祖灵法师 - 召唤后充能）
 * - spirit_bond: 祖灵交流（祖灵法师 - 移动后充能自身或消耗充能给友方）
 */

import type { AbilityDef } from './abilities';
import { getUnitAt, manhattanDistance, isCellEmpty } from './helpers';
import type { CellCoord } from './types';

export const BARBARIC_ABILITIES: AbilityDef[] = [
  // ============================================================================
  // 召唤师 - 阿布亚·石
  // ============================================================================

  {
    id: 'ancestral_bond',
    name: '祖灵羁绊',
    description: '在本单位移动之后，可以指定其3个区格以内的一个友方单位为目标。将目标充能并且将本单位的所有充能移动到目标上。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_01',
    trigger: 'activated',
    effects: [
      { type: 'custom', actionId: 'ancestral_bond_transfer' },
    ],
    requiresTargetSelection: true,
    targetSelection: {
      type: 'unit',
      count: 1,
    },
    validation: {
      requiredPhase: 'move',
      customValidator: (ctx) => {
        const targetPosition = ctx.payload.targetPosition as CellCoord | undefined;
        if (!targetPosition) {
          return { valid: false, error: '必须选择目标友方单位' };
        }
        
        const abTarget = getUnitAt(ctx.core, targetPosition);
        if (!abTarget) {
          return { valid: false, error: '目标位置没有单位' };
        }
        
        if (abTarget.owner !== ctx.playerId) {
          return { valid: false, error: '必须选择友方单位' };
        }
        
        if (abTarget.cardId === ctx.sourceUnit.cardId) {
          return { valid: false, error: '不能选择自己' };
        }
        
        const abDist = manhattanDistance(ctx.sourcePosition, targetPosition);
        if (abDist > 3) {
          return { valid: false, error: '目标必须在3格以内' };
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'move',
      buttonLabel: 'abilityButtons.ancestralBond',
      buttonVariant: 'secondary',
    },
  },

  // ============================================================================
  // 冠军 - 蒙威尊者
  // ============================================================================

  {
    id: 'power_up',
    name: '力量强化',
    description: '本单位每有1点充能，则获得战力+1，至多为+5。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_02',
    trigger: 'onDamageCalculation',
    effects: [
      {
        type: 'modifyStrength',
        target: 'self',
        value: { type: 'attribute', target: 'self', attr: 'charge' },
      },
    ],
  },

  // 践踏已在 frost 定义，共享（trample）

  // ============================================================================
  // 冠军 - 梅肯达·露 / 边境弓箭手
  // ============================================================================

  {
    id: 'prepare',
    name: '预备',
    description: '你可以将本单位充能，以代替本单位的移动。',
    sfxKey: 'fantasy.elemental_sword_earthattack_01',
    trigger: 'activated',
    effects: [
      { type: 'addCharge', target: 'self', value: 1 },
    ],
    usesPerTurn: 1,
    validation: {
      requiredPhase: 'move',
      customValidator: (ctx) => {
        if (ctx.sourceUnit.hasMoved) {
          return { valid: false, error: '该单位本回合已移动' };
        }
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'move',
      buttonLabel: 'abilityButtons.prepare',
      buttonVariant: 'secondary',
    },
  },

  {
    id: 'rapid_fire',
    name: '连续射击',
    description: '每回合一次，在本单位攻击之后，你可以消耗1点充能以使其进行一次额外的攻击。',
    sfxKey: 'fantasy.elemental_bow_fireattack_01',
    trigger: 'afterAttack',
    effects: [
      { type: 'custom', actionId: 'rapid_fire_extra_attack' },
    ],
    usesPerTurn: 1,
    validation: {
      customValidator: (ctx) => {
        // 检查充能是否足够
        if ((ctx.sourceUnit.boosts ?? 0) < 1) {
          return { valid: false, error: '没有充能可消耗' };
        }
        return { valid: true };
      },
    },
  },

  // ============================================================================
  // 冠军 - 凯鲁尊者
  // ============================================================================

  {
    id: 'inspire',
    name: '启悟',
    description: '在本单位移动之后，将其相邻的所有友方单位充能。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_01',
    trigger: 'activated',
    effects: [
      { type: 'addCharge', target: 'adjacentAllies', value: 1 },
    ],
    validation: {
      requiredPhase: 'move',
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'move',
      buttonLabel: 'abilityButtons.inspire',
      buttonVariant: 'secondary',
    },
  },

  {
    id: 'withdraw',
    name: '撤退',
    description: '在本单位攻击之后，你可以消耗1点充能或魔力。如果你这样做，则将本单位推拉1至2个区格。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_02',
    trigger: 'afterAttack',
    effects: [
      { type: 'custom', actionId: 'withdraw_push_pull' },
    ],
    validation: {
      requiredPhase: 'attack',
      customValidator: (ctx) => {
        const wdCostType = ctx.payload.costType as string | undefined;
        if (!wdCostType || (wdCostType !== 'charge' && wdCostType !== 'magic')) {
          return { valid: false, error: '必须选择消耗充能或魔力' };
        }
        
        if (wdCostType === 'charge' && (ctx.sourceUnit.boosts ?? 0) < 1) {
          return { valid: false, error: '没有充能可消耗' };
        }
        
        if (wdCostType === 'magic' && ctx.core.players[ctx.playerId].magic < 1) {
          return { valid: false, error: '魔力不足' };
        }
        
        const targetPosition = ctx.payload.targetPosition as CellCoord | undefined;
        if (!targetPosition) {
          return { valid: false, error: '必须选择移动目标位置' };
        }
        
        const wdDist = manhattanDistance(ctx.sourcePosition, targetPosition);
        if (wdDist < 1 || wdDist > 2) {
          return { valid: false, error: '必须移动1-2格' };
        }
        
        if (!isCellEmpty(ctx.core, targetPosition)) {
          return { valid: false, error: '目标位置必须为空' };
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'attack',
      buttonLabel: 'abilityButtons.withdraw',
      buttonVariant: 'secondary',
    },
  },

  // ============================================================================
  // 雌狮
  // ============================================================================

  {
    id: 'intimidate',
    name: '威势',
    description: '每回合一次，在本单位攻击一个敌方单位之后，将本单位充能。',
    sfxKey: 'fantasy.elemental_sword_earthattack_01',
    trigger: 'afterAttack',
    effects: [
      { type: 'addCharge', target: 'self', value: 1 },
    ],
    usesPerTurn: 1,
  },

  {
    id: 'life_up',
    name: '生命强化',
    description: '本单位每有1点充能，则获得生命+1，至多+5。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_01',
    trigger: 'passive',
    effects: [
      {
        type: 'modifyLife',
        target: 'self',
        value: { type: 'attribute', target: 'self', attr: 'charge' },
      },
    ],
  },

  // ============================================================================
  // 犀牛
  // ============================================================================

  {
    id: 'speed_up',
    name: '速度强化',
    description: '本单位每有1点充能，则当本单位移动时，可以额外移动1个区格，至多额外移动5个区格。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_02',
    trigger: 'onMove',
    effects: [
      { type: 'custom', actionId: 'speed_up_extra_move' },
    ],
  },

  // ============================================================================
  // 祖灵法师
  // ============================================================================

  {
    id: 'gather_power',
    name: '聚能',
    description: '在召唤本单位之后，将其充能。',
    sfxKey: 'magic.rock.35.earth_magic_whoosh_01',
    trigger: 'onSummon',
    effects: [
      { type: 'addCharge', target: 'self', value: 1 },
    ],
  },

  {
    id: 'spirit_bond',
    name: '祖灵交流',
    description: '在本单位移动之后，将其充能，或者消耗1点充能以将其3个区格以内的一个友方单位充能。',
    sfxKey: 'fantasy.elemental_sword_earthattack_01',
    trigger: 'activated',
    effects: [
      { type: 'custom', actionId: 'spirit_bond_action' },
    ],
    requiresTargetSelection: true,
    targetSelection: {
      type: 'unit',
      count: 1,
    },
    validation: {
      requiredPhase: 'move',
      customValidator: (ctx) => {
        const sbChoice = ctx.payload.choice as string | undefined;
        if (!sbChoice || (sbChoice !== 'self' && sbChoice !== 'transfer')) {
          return { valid: false, error: '必须选择充能自身或转移充能' };
        }
        
        if (sbChoice === 'transfer') {
          if ((ctx.sourceUnit.boosts ?? 0) < 1) {
            return { valid: false, error: '没有充能可消耗' };
          }
          
          const targetPosition = ctx.payload.targetPosition as CellCoord | undefined;
          if (!targetPosition) {
            return { valid: false, error: '必须选择目标友方单位' };
          }
          
          const sbTarget = getUnitAt(ctx.core, targetPosition);
          if (!sbTarget) {
            return { valid: false, error: '目标位置没有单位' };
          }
          
          if (sbTarget.owner !== ctx.playerId) {
            return { valid: false, error: '必须选择友方单位' };
          }
          
          if (sbTarget.cardId === ctx.sourceUnit.cardId) {
            return { valid: false, error: '不能选择自己' };
          }
          
          const sbDist = manhattanDistance(ctx.sourcePosition, targetPosition);
          if (sbDist > 3) {
            return { valid: false, error: '目标必须在3格以内' };
          }
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'move',
      buttonLabel: 'abilityButtons.spiritBond',
      buttonVariant: 'secondary',
    },
  },
];
