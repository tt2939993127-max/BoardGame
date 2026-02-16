/**
 * 伤害计算管线单元测试
 */

import { describe, expect, it } from 'vitest';
import {
  createDamageCalculation,
  createBatchDamageCalculation,
  type DamageCalculationConfig,
} from '../damageCalculation';

// ============================================================================
// Mock 数据工厂
// ============================================================================

function mockState(overrides?: any) {
  return {
    core: {
      players: {
        '0': {
          tokens: {},
          statusEffects: {},
          damageShields: [],
        },
        '1': {
          tokens: {},
          statusEffects: {},
          damageShields: [],
        },
      },
      tokenDefinitions: [],
      ...overrides?.core,
    },
    ...overrides,
  };
}

function mockStateWithTokens(playerId: string, tokens: Record<string, number>) {
  const state = mockState();
  state.core.players[playerId].tokens = tokens;
  state.core.tokenDefinitions = [
    { id: 'fire_mastery', name: 'tokens.fire_mastery.name', damageBonus: 1 },
    { id: 'taiji', name: 'tokens.taiji.name', damageBonus: 1 },
  ];
  return state;
}

function mockStateWithStatus(playerId: string, statusEffects: Record<string, number>) {
  const state = mockState();
  state.core.players[playerId].statusEffects = statusEffects;
  state.core.tokenDefinitions = [
    { id: 'armor', name: 'status.armor.name', damageReduction: 1 },
    { id: 'burn', name: 'status.burn.name' },
  ];
  return state;
}

function mockStateWithShield(shieldValue: number) {
  const state = mockState();
  state.core.players['1'].damageShields = [
    { value: shieldValue, sourceId: 'test-shield' },
  ];
  return state;
}

// ============================================================================
// 测试套件
// ============================================================================

describe('DamageCalculation', () => {
  describe('基础功能', () => {
    it('无修正时返回基础伤害', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(5);
      expect(result.modifiers).toHaveLength(0);
      expect(result.breakdown.base.value).toBe(5);
      expect(result.breakdown.steps).toHaveLength(0);
    });
    
    it('加法修正正确应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { id: 'mod1', type: 'flat', value: 3, source: 'token1' },
          { id: 'mod2', type: 'flat', value: 2, source: 'token2' },
        ],
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(10); // 5 + 3 + 2
      expect(result.modifiers).toHaveLength(2);
      expect(result.breakdown.steps).toHaveLength(2);
      expect(result.breakdown.steps[1].runningTotal).toBe(10);
    });
    
    it('乘法修正在加法后应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { id: 'mod1', type: 'flat', value: 3, source: 'token', priority: 10 },
          { id: 'mod2', type: 'percent', value: 100, source: 'status', priority: 20 },
        ],
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(16); // (5 + 3) * 2
      expect(result.breakdown.steps).toHaveLength(2);
    });
    
    it('护盾减免在最后应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 10,
        state: mockStateWithShield(3),
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(7); // 10 - 3
      expect(result.actualDamage).toBe(7);
    });
    
    it('伤害不会为负数', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 3,
        state: mockStateWithShield(10),
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(0);
      expect(result.actualDamage).toBe(0);
    });
  });
  
  describe('自动收集', () => {
    it('自动收集 Token 修正', () => {
      const state = mockStateWithTokens('0', { fire_mastery: 3 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        autoCollectTokens: true,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(8); // 5 + 3
      expect(result.modifiers.some(m => m.sourceId === 'fire_mastery')).toBe(true);
    });
    
    it('自动收集状态修正', () => {
      const state = mockStateWithStatus('1', { armor: 2 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 10,
        state,
        autoCollectTokens: false,
        autoCollectStatus: true,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(8); // 10 - 2
    });
    
    it('自动收集多个护盾', () => {
      const state = mockState();
      state.core.players['1'].damageShields = [
        { value: 2, sourceId: 'shield1' },
        { value: 3, sourceId: 'shield2' },
      ];
      
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 10,
        state,
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(5); // 10 - 5
    });
  });
  
  describe('条件修正', () => {
    it('条件满足时应用修正', () => {
      const state = mockStateWithStatus('1', { burn: 1 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        additionalModifiers: [
          {
            id: 'burn-bonus',
            type: 'flat',
            value: 2,
            source: 'burn-bonus',
            condition: (ctx) => {
              const targetPlayer = ctx.state.core.players[ctx.target.playerId];
              return (targetPlayer.statusEffects.burn || 0) > 0;
            },
          },
        ],
        autoCollectStatus: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(7); // 5 + 2
    });
    
    it('条件不满足时跳过修正', () => {
      const state = mockState();
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        additionalModifiers: [
          {
            id: 'burn-bonus',
            type: 'flat',
            value: 2,
            source: 'burn-bonus',
            condition: (ctx) => {
              const targetPlayer = ctx.state.core.players[ctx.target.playerId];
              return (targetPlayer.statusEffects.burn || 0) > 0;
            },
          },
        ],
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(5); // 条件不满足，不加成
    });
  });
  
  describe('事件生成', () => {
    it('生成标准 DAMAGE_DEALT 事件', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        timestamp: 1000,
      });
      
      const events = calc.toEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DAMAGE_DEALT');
      expect(events[0].payload.targetId).toBe('1');
      expect(events[0].payload.amount).toBe(5);
      expect(events[0].payload.breakdown).toBeDefined();
      expect(events[0].timestamp).toBe(1000);
    });
    
    it('breakdown 包含完整计算链路', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'flame-strike' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { 
            id: 'fm', 
            type: 'flat', 
            value: 3, 
            source: 'fire_mastery', 
            description: 'tokens.fire_mastery.name' 
          },
        ],
      });
      
      const events = calc.toEvents();
      const breakdown = events[0].payload.breakdown;
      
      expect(breakdown.base.value).toBe(5);
      expect(breakdown.base.sourceId).toBe('flame-strike');
      expect(breakdown.steps).toHaveLength(1);
      expect(breakdown.steps[0].value).toBe(3);
      expect(breakdown.steps[0].sourceId).toBe('fire_mastery');
      expect(breakdown.steps[0].runningTotal).toBe(8);
    });
  });
  
  describe('批处理', () => {
    it('批量计算多个目标的伤害', () => {
      const calcs = createBatchDamageCalculation({
        source: { playerId: '0', abilityId: 'aoe' },
        targets: [
          { playerId: '1' },
          { playerId: '2' },
        ],
        baseDamage: 5,
        state: mockState({
          core: {
            players: {
              '0': { tokens: {}, statusEffects: {}, damageShields: [] },
              '1': { tokens: {}, statusEffects: {}, damageShields: [] },
              '2': { tokens: {}, statusEffects: {}, damageShields: [] },
            },
            tokenDefinitions: [],
          },
        }),
      });
      
      expect(calcs).toHaveLength(2);
      expect(calcs[0].resolve().finalDamage).toBe(5);
      expect(calcs[1].resolve().finalDamage).toBe(5);
    });
  });
  
  describe('复杂场景', () => {
    it('Token + 状态 + 护盾的完整链路', () => {
      const state = mockState({
        core: {
          players: {
            '0': {
              tokens: { fire_mastery: 3 },
              statusEffects: {},
              damageShields: [],
            },
            '1': {
              tokens: {},
              statusEffects: { armor: 1 },
              damageShields: [{ value: 2, sourceId: 'shield' }],
            },
          },
          tokenDefinitions: [
            { id: 'fire_mastery', name: 'tokens.fire_mastery.name', damageBonus: 1 },
            { id: 'armor', name: 'status.armor.name', damageReduction: 1 },
          ],
        },
      });
      
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'flame-strike' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
      });
      
      const result = calc.resolve();
      
      // 5 (base) + 3 (fire_mastery) - 1 (armor) - 2 (shield) = 5
      expect(result.finalDamage).toBe(5);
      expect(result.breakdown.steps.length).toBeGreaterThan(0);
    });
  });
});
