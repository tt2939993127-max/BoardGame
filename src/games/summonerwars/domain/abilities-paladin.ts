/**
 * 召唤师战争 - 先锋军团技能定义
 * 
 * 核心机制：城塞协同、治疗、守卫、信仰之力
 * 
 * 技能清单：
 * - fortress_power: 城塞之力（召唤师 - 攻击后从弃牌堆拿取城塞单位）
 * - guidance: 指引（瓦伦蒂娜 - 召唤阶段开始抓2张牌）
 * - fortress_elite: 城塞精锐（瓦伦蒂娜 - 2格内每有一个友方城塞单位+1战力）
 * - radiant_shot: 辉光射击（雅各布 - 每2点魔力+1战力）
 * - divine_shield: 神圣护盾（科琳 - 3格内友方城塞被攻击时投骰减伤）
 * - healing: 治疗（圣殿牧师 - 攻击友方时弃牌将伤害转为治疗）
 * - judgment: 裁决（城塞圣武士 - 攻击后按❤️数量抓牌）
 * - entangle: 缠斗（城塞骑士 - 相邻敌方远离时造成1伤害）
 * - guardian: 守卫（城塞骑士 - 相邻敌方攻击时必须攻击守卫单位）
 * - holy_arrow: 圣光箭（城塞弓箭手 - 攻击前弃牌获得魔力和战力加成）
 */

import type { AbilityDef } from './abilities';

export const PALADIN_ABILITIES: AbilityDef[] = [
  // ============================================================================
  // 召唤师 - 瑟拉·艾德温
  // ============================================================================

  {
    id: 'fortress_power',
    name: '城塞之力',
    description: '在本单位攻击一个敌方单位之后，如果战场上有一个或更多友方城塞单位，则你可以从你的弃牌堆中拿取一张城塞单位，展示并且加入你的手牌。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_001',
    trigger: 'afterAttack',
    effects: [
      { type: 'custom', actionId: 'fortress_power_retrieve' },
    ],
    requiresTargetSelection: true,
    targetSelection: {
      type: 'card',
      count: 1,
    },
    validation: {
      requiredPhase: 'attack',
      customValidator: (ctx) => {
        const targetCardId = ctx.payload.targetCardId as string | undefined;
        if (!targetCardId) {
          return { valid: false, error: '必须选择弃牌堆中的城塞单位' };
        }
        
        // 检查战场上是否有友方城塞单位
        let hasFortressOnBoard = false;
        for (let row = 0; row < ctx.core.board.length; row++) {
          for (let col = 0; col < (ctx.core.board[0]?.length ?? 0); col++) {
            const u = ctx.core.board[row]?.[col]?.unit;
            if (u && u.owner === ctx.playerId && u.card.id.includes('fortress')) {
              hasFortressOnBoard = true;
              break;
            }
          }
          if (hasFortressOnBoard) break;
        }
        
        if (!hasFortressOnBoard) {
          return { valid: false, error: '战场上没有友方城塞单位' };
        }
        
        const fpPlayer = ctx.core.players[ctx.playerId];
        const fpCard = fpPlayer.discard.find(c => c.id === targetCardId);
        
        if (!fpCard || fpCard.cardType !== 'unit') {
          return { valid: false, error: '弃牌堆中没有该单位卡' };
        }
        
        if (!(fpCard as import('./types').UnitCard).id.includes('fortress')) {
          return { valid: false, error: '只能拿取城塞单位' };
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'attack',
      buttonLabel: 'abilityButtons.fortressPower',
      buttonVariant: 'secondary',
    },
  },

  // ============================================================================
  // 冠军 - 瓦伦蒂娜·斯托哈特
  // ============================================================================

  {
    id: 'guidance',
    name: '指引',
    description: '在你的召唤阶段开始时，抓取两张卡牌。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_002',
    trigger: 'onPhaseStart',
    effects: [
      { type: 'custom', actionId: 'guidance_draw' },
    ],
    validation: {
      requiredPhase: 'summon',
      customValidator: (ctx) => {
        const guidancePlayer = ctx.core.players[ctx.playerId];
        if (guidancePlayer.deck.length === 0) {
          return { valid: false, error: '牌组为空' };
        }
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'summon',
      buttonLabel: 'abilityButtons.guidance',
      buttonVariant: 'secondary',
    },
  },

  {
    id: 'fortress_elite',
    name: '城塞精锐',
    description: '本单位2个区格以内每有一个友方城塞单位，则获得战力+1。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_003',
    trigger: 'onDamageCalculation',
    effects: [
      { type: 'custom', actionId: 'fortress_elite_boost' },
    ],
  },

  // ============================================================================
  // 冠军 - 雅各布·艾德温
  // ============================================================================

  {
    id: 'radiant_shot',
    name: '辉光射击',
    description: '你每拥有2点魔力，则本单位获得战力+1。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_004',
    trigger: 'onDamageCalculation',
    effects: [
      { type: 'custom', actionId: 'radiant_shot_boost' },
    ],
  },

  // ============================================================================
  // 冠军 - 科琳·布莱顿
  // ============================================================================

  {
    id: 'divine_shield',
    name: '神圣护盾',
    description: '每当本单位3个区格以内的一个友方城塞单位成为攻击的目标时，投掷2个骰子。每掷出一个❤️，则攻击单位在本次攻击的战力-1，战力最少为1点。',
    sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.light.holy_ward',
    trigger: 'passive',
    effects: [
      { type: 'custom', actionId: 'divine_shield_check' },
    ],
  },

  // ============================================================================
  // 士兵 - 圣殿牧师
  // ============================================================================

  {
    id: 'healing',
    name: '治疗',
    description: '在本单位攻击一个友方士兵或英雄之前，你可以从你的手牌弃除一张卡牌。如果你这样做，则本次攻击掷出的每个⚔️或❤️会从目标上移除1点伤害，以代替造成伤害。',
    sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.light.holy_light',
    trigger: 'beforeAttack',
    effects: [
      { type: 'custom', actionId: 'healing_convert' },
    ],
    requiresTargetSelection: true,
    targetSelection: {
      type: 'card',
      count: 1,
    },
    validation: {
      requiredPhase: 'attack',
      customValidator: (ctx) => {
        const healDiscardId = ctx.payload.targetCardId as string | undefined;
        if (!healDiscardId) {
          return { valid: false, error: '必须选择要弃除的手牌' };
        }
        
        const healPlayer = ctx.core.players[ctx.playerId];
        const healCard = healPlayer.hand.find(c => c.id === healDiscardId);
        if (!healCard) {
          return { valid: false, error: '手牌中没有该卡牌' };
        }
        
        // 检查目标是否为友方士兵或英雄
        const healTargetPos = ctx.payload.targetPosition as import('./types').CellCoord | undefined;
        if (!healTargetPos) {
          return { valid: false, error: '必须选择攻击目标' };
        }
        
        const healTarget = ctx.core.board[healTargetPos.row]?.[healTargetPos.col]?.unit;
        if (!healTarget || healTarget.owner !== ctx.playerId) {
          return { valid: false, error: '目标必须是友方单位' };
        }
        
        if (healTarget.card.unitClass !== 'common' && healTarget.card.unitClass !== 'champion') {
          return { valid: false, error: '目标必须是士兵或英雄' };
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'attack',
      buttonLabel: 'abilityButtons.healing',
      buttonVariant: 'secondary',
    },
  },

  // ============================================================================
  // 士兵 - 城塞圣武士
  // ============================================================================

  {
    id: 'judgment',
    name: '裁决',
    description: '在本单位攻击一个敌方单位之后，抓取数量等于所掷出❤️数量的卡牌。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_005',
    trigger: 'afterAttack',
    effects: [
      { type: 'custom', actionId: 'judgment_draw' },
    ],
  },

  // ============================================================================
  // 士兵 - 城塞骑士
  // ============================================================================

  {
    id: 'entangle',
    name: '缠斗',
    description: '每当一个相邻敌方单位因为移动或被推拉而远离本单位时，立刻对该单位造成1点伤害。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_006',
    trigger: 'onAdjacentEnemyLeave',
    effects: [
      { type: 'damage', target: 'target', value: 1 },
    ],
  },

  {
    id: 'guardian',
    name: '守卫',
    description: '当一个相邻敌方单位攻击时，必须指定一个具有守卫技能的单位为目标。',
    sfxKey: 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_smite_007',
    trigger: 'passive',
    effects: [
      { type: 'custom', actionId: 'guardian_force_target' },
    ],
  },

  // ============================================================================
  // 士兵 - 城塞弓箭手
  // ============================================================================

  {
    id: 'holy_arrow',
    name: '圣光箭',
    description: '在本单位攻击之前，从你的手牌展示并弃除任意数量的非同名单位。每以此法弃除一张卡牌，则获得1点魔力并且本单位在本次攻击获得战力+1。',
    sfxKey: 'magic.general.simple_magic_sound_fx_pack_vol.light.holy_shock',
    trigger: 'beforeAttack',
    effects: [
      { type: 'custom', actionId: 'holy_arrow_discard' },
    ],
    requiresTargetSelection: true,
    targetSelection: {
      type: 'card',
      count: -1, // 任意数量
    },
    validation: {
      requiredPhase: 'attack',
      customValidator: (ctx) => {
        const discardCardIds = ctx.payload.discardCardIds as string[] | undefined;
        if (!discardCardIds || discardCardIds.length === 0) {
          return { valid: false, error: '必须选择要弃除的卡牌' };
        }
        
        const haPlayer = ctx.core.players[ctx.playerId];
        const names = new Set<string>();
        
        for (const cardId of discardCardIds) {
          const card = haPlayer.hand.find(c => c.id === cardId);
          if (!card || card.cardType !== 'unit') {
            return { valid: false, error: '只能弃除单位卡' };
          }
          
          const unitCard = card as import('./types').UnitCard;
          if (unitCard.name === ctx.sourceUnit.card.name) {
            return { valid: false, error: '不能弃除同名单位' };
          }
          
          if (names.has(unitCard.name)) {
            return { valid: false, error: '不能弃除多张同名单位' };
          }
          
          names.add(unitCard.name);
        }
        
        return { valid: true };
      },
    },
    ui: {
      requiresButton: true,
      buttonPhase: 'attack',
      buttonLabel: 'abilityButtons.holyArrow',
      buttonVariant: 'secondary',
    },
  },
];
