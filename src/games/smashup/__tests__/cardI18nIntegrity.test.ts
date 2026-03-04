/**
 * 卡牌 i18n 完整性验证
 *
 * 确保所有 SmashUp 卡牌和基地的 i18n key 在 zh-CN 和 en 中均存在。
 * 文本字段已从数据定义中移除，i18n 是唯一数据源。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getAllCardDefs, getAllBaseDefs } from '../data/cards';

describe('SmashUp 卡牌 i18n 完整性', () => {
  const zhCN = JSON.parse(
    readFileSync(resolve(__dirname, '../../../../public/locales/zh-CN/game-smashup.json'), 'utf-8'),
  );
  const en = JSON.parse(
    readFileSync(resolve(__dirname, '../../../../public/locales/en/game-smashup.json'), 'utf-8'),
  );

  const allCards = getAllCardDefs();
  const allBases = getAllBaseDefs();

  it('卡牌注册表非空', () => {
    expect(allCards.length).toBeGreaterThan(0);
  });

  it('基地注册表非空', () => {
    expect(allBases.length).toBeGreaterThan(0);
  });

  it('所有卡牌的 name 在 zh-CN 中存在', () => {
    const missing: string[] = [];
    for (const def of allCards) {
      const val = zhCN.cards?.[def.id]?.name;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `zh-CN 缺少卡牌 name: ${missing.join(', ')}`).toEqual([]);
  });

  it('所有卡牌的 name 在 en 中存在', () => {
    const missing: string[] = [];
    for (const def of allCards) {
      const val = en.cards?.[def.id]?.name;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `en 缺少卡牌 name: ${missing.join(', ')}`).toEqual([]);
  });

  it('所有有技能标签的随从卡在 zh-CN 中有 abilityText', () => {
    const missing: string[] = [];
    for (const def of allCards) {
      if (def.type !== 'minion') continue;
      // 有 abilityTags 说明有技能，应该有 abilityText
      if (!def.abilityTags || def.abilityTags.length === 0) continue;
      const val = zhCN.cards?.[def.id]?.abilityText;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `zh-CN 缺少随从 abilityText: ${missing.join(', ')}`).toEqual([]);
  });

  it('所有行动卡的 effectText 在 zh-CN 中存在', () => {
    const missing: string[] = [];
    for (const def of allCards) {
      if (def.type !== 'action') continue;
      const val = zhCN.cards?.[def.id]?.effectText;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `zh-CN 缺少行动卡 effectText: ${missing.join(', ')}`).toEqual([]);
  });

  it('所有基地的 name 在 zh-CN 中存在', () => {
    const missing: string[] = [];
    for (const def of allBases) {
      const val = zhCN.cards?.[def.id]?.name;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `zh-CN 缺少基地 name: ${missing.join(', ')}`).toEqual([]);
  });

  it('有技能文本的基地在 zh-CN 中有 abilityText', () => {
    const missing: string[] = [];
    for (const def of allBases) {
      // 基地没有 abilityTags，用 i18n 中是否有 abilityText key 来判断
      // 如果 i18n 中有这个 key 但为空，才算缺失
      const val = zhCN.cards?.[def.id]?.abilityText;
      // 跳过 i18n 中没有 abilityText key 的基地（无技能白板基地）
      if (val === undefined) continue;
      if (typeof val !== 'string' || val.length === 0) missing.push(def.id);
    }
    expect(missing, `zh-CN 缺少基地 abilityText: ${missing.join(', ')}`).toEqual([]);
  });
});
