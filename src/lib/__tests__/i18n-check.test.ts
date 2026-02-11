import { describe, it, expect } from 'vitest';
import { parseNamespaceLiteral, collectReferencesFromContent } from '../../../scripts/verify/i18n-check';

describe('i18n 静态检查工具', () => {
    it('解析 namespace 数组字面量', () => {
        expect(parseNamespaceLiteral("['lobby', 'auth']")).toEqual(['lobby', 'auth']);
    });

    it('识别 useTranslation/Toast/i18nKey 的引用', () => {
        const content = `
            import { useTranslation } from 'react-i18next';
            const { t } = useTranslation(['lobby', 'auth']);
            t('home.title');
            t('auth:login.title');
            t('welcome', { ns: 'lobby' });
            toast.error({ kind: 'i18n', key: 'error.roomFull', ns: 'lobby' });
        `;
        const result = collectReferencesFromContent(content, 'demo.tsx', {
            defaultNamespace: 'common',
            knownNamespaces: new Set(['common', 'lobby', 'auth']),
        });
        const byKey = (key: string) => result.references.find((item) => item.key === key);

        expect(byKey('home.title')?.namespaces).toEqual(['lobby', 'auth']);
        expect(byKey('login.title')?.namespaces).toEqual(['auth']);
        expect(byKey('welcome')?.namespaces).toEqual(['lobby']);
        expect(byKey('error.roomFull')?.namespaces).toEqual(['lobby']);
    });

    it('动态 key 会产生警告', () => {
        const content = `
            import { useTranslation } from 'react-i18next';
            const { t } = useTranslation('lobby');
            t(\`home.${'${id}'}\`);
        `;
        const result = collectReferencesFromContent(content, 'demo.tsx', {
            defaultNamespace: 'common',
            knownNamespaces: new Set(['common', 'lobby']),
        });
        expect(result.warnings.some((warning) => warning.type === 'dynamic-key')).toBe(true);
    });
});
