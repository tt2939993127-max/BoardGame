import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTHOR_NAME, resolveGameAuthorName } from '../gameDetailsContent';

describe('resolveGameAuthorName', () => {
    it('优先返回 manifest 中声明的作者名', () => {
        expect(resolveGameAuthorName({ authorName: '  桌游作者  ' })).toBe('桌游作者');
    });

    it('缺少作者名时回退到默认值或传入的 fallback', () => {
        expect(resolveGameAuthorName(undefined)).toBe(DEFAULT_AUTHOR_NAME);
        expect(resolveGameAuthorName({ authorName: '   ' }, 'Unknown')).toBe('Unknown');
    });
});
