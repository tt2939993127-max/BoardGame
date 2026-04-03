import { describe, it, expect } from 'vitest';
import { extractEmbeddedImages, extractText, hasEmbeddedImage } from '../../../pages/admin/feedback-shared';

const t = ((key: string) => key === 'feedback.content.onlyImage' ? '（仅图片）' : key) as any;

describe('反馈内容解析', () => {
    it('纯文本内容 — 无图片', () => {
        const content = '这是一个 bug 报告';
        expect(extractText(content, t)).toBe('这是一个 bug 报告');
        expect(hasEmbeddedImage(content)).toBe(false);
    });

    it('仅图片 — 无文本', () => {
        const content = '![Screenshot](data:image/jpeg;base64,/9j/4AAQ...)';
        expect(extractText(content, t)).toBe('（仅图片）');
        expect(hasEmbeddedImage(content)).toBe(true);
    });

    it('文本 + 图片混合', () => {
        const content = '页面白屏了\n\n![Screenshot](data:image/png;base64,iVBOR...)';
        const images = extractEmbeddedImages(content);
        expect(extractText(content, t)).toBe('页面白屏了');
        expect(images).toHaveLength(1);
        expect(images[0].src).toContain('data:image/png;base64,');
    });

    it('多张图片', () => {
        const content = '步骤1\n![s1](data:image/jpeg;base64,AAA)\n步骤2\n![s2](data:image/jpeg;base64,BBB)';
        const images = extractEmbeddedImages(content);
        const text = extractText(content, t);
        expect(images).toHaveLength(2);
        expect(text).toContain('步骤1');
        expect(text).toContain('步骤2');
    });

    it('普通 Markdown 链接不被误匹配', () => {
        const content = '参考 [这个链接](https://example.com)';
        expect(hasEmbeddedImage(content)).toBe(false);
        expect(extractText(content, t)).toBe(content);
    });

    it('连续调用 hasEmbeddedImage 不受全局正则 lastIndex 影响', () => {
        const content = '![img](data:image/jpeg;base64,test)';
        expect(hasEmbeddedImage(content)).toBe(true);
        expect(hasEmbeddedImage(content)).toBe(true);
        expect(hasEmbeddedImage(content)).toBe(true);
    });

    it('先判定有图再提取图片时，不会退化成只剩 base64 文本', () => {
        const content = '复现步骤\n\n![img](data:image/jpeg;base64,test)';
        expect(hasEmbeddedImage(content)).toBe(true);

        const images = extractEmbeddedImages(content);
        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('data:image/jpeg;base64,test');
    });
});
