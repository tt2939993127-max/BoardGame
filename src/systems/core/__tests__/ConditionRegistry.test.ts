/**
 * ConditionRegistry 单元测试
 */
import { describe, it, expect, vi } from 'vitest';
import { ConditionRegistry, type AttributeCondition, type HasTagCondition, type HasAnyTagMatchingCondition } from '../Condition';

describe('ConditionRegistry', () => {
  const registry = new ConditionRegistry();

  it('缺少默认实体时返回 false', () => {
    const context = {
      getAttribute: vi.fn(() => 0),
      hasTag: vi.fn(() => false),
      getTagStacks: vi.fn(() => 0),
      hasAnyTagMatching: vi.fn(() => false),
    };

    const attributeCond: AttributeCondition = {
      type: 'attribute',
      attrId: 'hp',
      op: '>',
      value: 0,
    };
    const tagCond: HasTagCondition = {
      type: 'hasTag',
      tagId: 'status.stun',
    };
    const matchCond: HasAnyTagMatchingCondition = {
      type: 'hasAnyTagMatching',
      pattern: 'status.*',
    };

    expect(registry.evaluate(attributeCond, context)).toBe(false);
    expect(registry.evaluate(tagCond, context)).toBe(false);
    expect(registry.evaluate(matchCond, context)).toBe(false);
  });

  it('有默认实体时正常评估', () => {
    const context = {
      defaultEntityId: 'p1',
      getAttribute: vi.fn(() => 5),
      hasTag: vi.fn(() => true),
      getTagStacks: vi.fn(() => 2),
      hasAnyTagMatching: vi.fn(() => true),
    };

    const attributeCond: AttributeCondition = {
      type: 'attribute',
      attrId: 'hp',
      op: '>=',
      value: 5,
    };
    const tagCond: HasTagCondition = {
      type: 'hasTag',
      tagId: 'status.stun',
      minStacks: 2,
    };

    expect(registry.evaluate(attributeCond, context)).toBe(true);
    expect(registry.evaluate(tagCond, context)).toBe(true);
  });
});
