/**
 * TagManager 单元测试
 */
import { describe, it, expect } from 'vitest';
import { TagManager } from '../Tag';

describe('TagManager', () => {
  it('addTag 可注入 addedAt，未传则保持 undefined', () => {
    const manager = new TagManager();
    const entityId = 'p1';

    const withTimestamp = manager.addTag(entityId, 'status.buff', {
      stacks: 1,
      addedAt: 123,
    });
    expect(withTimestamp.addedAt).toBe(123);

    const withoutTimestamp = manager.addTag(entityId, 'status.debuff', { stacks: 1 });
    expect(withoutTimestamp.addedAt).toBeUndefined();
  });

  it('getTagsMatching 支持通配符并转义正则字符', () => {
    const manager = new TagManager();
    const entityId = 'p1';

    manager.addTag(entityId, 'status.buff');
    manager.addTag(entityId, 'status.+');
    manager.addTag(entityId, 'status.buff.extra');

    const wildcard = manager.getTagsMatching(entityId, 'status.*').map(t => t.id).sort();
    expect(wildcard).toEqual(['status.+', 'status.buff', 'status.buff.extra'].sort());

    const literalPlus = manager.getTagsMatching(entityId, 'status.+').map(t => t.id);
    expect(literalPlus).toEqual(['status.+']);
  });
});
