/**
 * 大杀四方 - 交互完整性审计测试
 *
 * 验证 Interaction 链的完整性：
 * 1. Handler 注册覆盖 — 所有能力创建的 sourceId 都有对应 handler
 * 2. 链式完整性 — handler 产出的后续 sourceId 也有对应 handler
 * 3. 孤儿 Handler — 注册了 handler 但无能力引用
 *
 * 审计输入由代码自动抽取（createSimpleChoice + registerInteractionHandler），
 * 避免手工 Map 漂移。
 */

import { describe, expect, it } from 'vitest';
import { createInteractionCompletenessAuditSuite } from '../../../engine/testing/interactionCompletenessAudit';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { getRegisteredInteractionHandlerIds, clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { collectSmashupInteractionAuditAuto } from './helpers/interactionAuditAuto';

// ============================================================================
// 初始化
// ============================================================================

let _initialized = false;

function ensureInit(): void {
  if (_initialized) return;
  _initialized = true;
  clearRegistry();
  clearBaseAbilityRegistry();
  clearInteractionHandlers();
  resetAbilityInit();
  initAllAbilities();
}

function getHandlerIds(): Set<string> {
  ensureInit();
  return getRegisteredInteractionHandlerIds();
}

// ============================================================================
// 自动抽取审计输入
// ============================================================================

const AUTO_AUDIT = collectSmashupInteractionAuditAuto();

describe('SmashUp 交互审计输入自动抽取', () => {
  it('自动抽取到有效 source 与链式声明', () => {
    expect(AUTO_AUDIT.sources.length).toBeGreaterThan(0);
    expect(AUTO_AUDIT.chains.length).toBeGreaterThan(0);
  });

  it('不允许动态 sourceId（必须字面量，确保可审计）', () => {
    expect(AUTO_AUDIT.warnings).toEqual([]);
  });
});

// ============================================================================
// 测试套件
// ============================================================================

ensureInit();

createInteractionCompletenessAuditSuite({
  suiteName: 'SmashUp 交互完整性',
  sources: AUTO_AUDIT.sources,
  registeredHandlerIds: getHandlerIds(),
  chains: AUTO_AUDIT.chains,
});
