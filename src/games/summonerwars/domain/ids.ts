/**
 * 召唤师战争 - 领域 ID 常量表
 *
 * 所有稳定 ID 在此定义（as const），禁止字符串字面量。
 * 包含事件卡 baseId、工具函数等。
 */

import type { FactionId, UnitCard } from './types';

// ============================================================================
// 阵营 ID
// ============================================================================

/** 所有合法阵营 ID（从 FactionId 类型派生） */
export const VALID_FACTION_IDS: readonly FactionId[] = [
  'necromancer', 'trickster', 'paladin', 'goblin', 'frost', 'barbaric',
] as const;

// ============================================================================
// 事件卡 / 技能卡 baseId 常量
// ============================================================================

/** 亡灵法师 */
export const CARD_IDS = {
  // 亡灵法师事件卡
  NECRO_HELLFIRE_BLADE: 'necro-hellfire-blade',
  NECRO_FUNERAL_PYRE: 'necro-funeral-pyre',

  // 欺心巫族事件卡
  TRICKSTER_MIND_CONTROL: 'trickster-mind-control',
  TRICKSTER_STORM_ASSAULT: 'trickster-storm-assault',
  TRICKSTER_HYPNOTIC_LURE: 'trickster-hypnotic-lure',

  // 圣堂骑士事件卡
  PALADIN_REKINDLE_HOPE: 'paladin-rekindle-hope',
  PALADIN_HOLY_JUDGMENT: 'paladin-holy-judgment',
  PALADIN_HOLY_PROTECTION: 'paladin-holy-protection',

  // 洞穴地精事件卡
  GOBLIN_RELENTLESS: 'goblin-relentless',
  GOBLIN_SWARM: 'goblin-swarm',
} as const;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从带后缀的卡牌 ID 中提取 baseId
 *
 * 卡牌 ID 格式：`<baseId>-<playerId>-<index>` 或 `<baseId>-<playerId>`
 * 例：`necro-hellfire-blade-0-2` → `necro-hellfire-blade`
 */
export function getBaseCardId(id: string): string {
  return id.replace(/-\d+-\d+$/, '').replace(/-\d+$/, '');
}

/**
 * 判断卡牌是否为亡灵单位
 *
 * 亡灵判定：id 含 'undead'、名称含 '亡灵'、或阵营为 necromancer
 */
export function isUndeadCard(card: { id: string; name: string; cardType: string; faction?: string }): boolean {
  if (card.cardType !== 'unit') return false;
  return card.id.includes('undead')
    || card.name.includes('亡灵')
    || (card as UnitCard).faction === 'necromancer';
}
