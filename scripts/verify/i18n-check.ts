import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { I18N_NAMESPACES, SUPPORTED_LANGUAGES } from '../../src/lib/i18n/types';

type LocaleNamespace = Record<string, unknown>;

type LocalesByLanguage = Record<string, Record<string, LocaleNamespace>>;

type I18nReference = {
    key: string;
    namespaces: string[];
    file: string;
    line: number;
    source: string;
};

type I18nWarning = {
    type: 'dynamic-namespace' | 'ambiguous-namespace' | 'unknown-namespace' | 'dynamic-key';
    key: string;
    file: string;
    line: number;
    source: string;
    detail?: string;
};

type MissingTranslation = {
    namespaces: string[];
    key: string;
    languages: string[];
    refs: I18nReference[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.join(ROOT_DIR, 'public', 'locales');

const DEFAULT_NAMESPACE = 'common';
const SCAN_DIRS = ['src', 'apps'];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRS = new Set([
    '.git',
    '.agent',
    '.windsurf',
    '.claude',
    'node_modules',
    'dist',
    'build',
    'public',
    'docs',
    'design-system',
    'openspec',
    'e2e',
    'test',
    '__tests__',
    'scripts',
    'uploads',
    'coverage',
    'evidence',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const parseNamespaceLiteral = (value: string): string[] => {
    const trimmed = value.trim();
    const namespaces: string[] = [];
    const regex = /['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(trimmed)) !== null) {
        namespaces.push(match[1]);
    }
    return namespaces;
};

const parseNamespaceArgument = (argument: string): { namespaces: string[]; dynamic: boolean; fromArray: boolean } => {
    const trimmed = argument.trim();
    if (!trimmed) {
        return { namespaces: [DEFAULT_NAMESPACE], dynamic: false, fromArray: false };
    }
    const firstMatch = trimmed.match(/^([\s\S]*?]|['"][^'"]+['"])/);
    if (!firstMatch) {
        return { namespaces: [DEFAULT_NAMESPACE], dynamic: true, fromArray: false };
    }
    const token = firstMatch[1];
    const namespaces = parseNamespaceLiteral(token);
    if (namespaces.length === 0) {
        return { namespaces: [DEFAULT_NAMESPACE], dynamic: true, fromArray: token.startsWith('[') };
    }
    let dynamic = false;
    if (token.startsWith('[')) {
        const cleaned = token
            .replace(/['"][^'"]*['"]/g, '')
            .replace(/[\s,[\]]/g, '');
        if (cleaned.length > 0) {
            dynamic = true;
        }
    }
    return { namespaces, dynamic, fromArray: token.startsWith('[') };
};

const getLineNumber = (content: string, index: number): number => {
    if (index <= 0) return 1;
    return content.slice(0, index).split('\n').length;
};

const hasKeyPath = (namespaceData: LocaleNamespace, keyPath: string): boolean => {
    if (!keyPath) return false;
    const segments = keyPath.split('.');
    let cursor: unknown = namespaceData;
    for (const segment of segments) {
        if (!isPlainObject(cursor) || !(segment in cursor)) {
            return false;
        }
        cursor = cursor[segment];
    }
    return true;
};

const loadLocales = (): { locales: LocalesByLanguage; namespaceFiles: string[] } => {
    const locales: LocalesByLanguage = {};
    const namespaceFiles = new Set<string>();

    for (const language of SUPPORTED_LANGUAGES) {
        const langDir = path.join(LOCALES_DIR, language);
        if (!fs.existsSync(langDir)) continue;
        const files = fs.readdirSync(langDir).filter((file) => file.endsWith('.json'));
        const namespaces: Record<string, LocaleNamespace> = {};
        for (const file of files) {
            const ns = path.basename(file, '.json');
            namespaceFiles.add(ns);
            const filePath = path.join(langDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            namespaces[ns] = JSON.parse(content) as LocaleNamespace;
        }
        locales[language] = namespaces;
    }

    return { locales, namespaceFiles: Array.from(namespaceFiles) };
};

const findNsOverride = (snippet: string): string[] => {
    const match = snippet.match(/\bns\s*:\s*(\[[^\]]*\]|['"][^'"]+['"])/);
    if (!match) return [];
    return parseNamespaceLiteral(match[1]);
};

const parseI18nKey = (rawKey: string, knownNamespaces: Set<string>): { namespace?: string; key: string } => {
    const delimiterIndex = rawKey.indexOf(':');
    if (delimiterIndex <= 0) return { key: rawKey };
    const possibleNamespace = rawKey.slice(0, delimiterIndex);
    if (!knownNamespaces.has(possibleNamespace)) return { key: rawKey };
    return { namespace: possibleNamespace, key: rawKey.slice(delimiterIndex + 1) };
};

type AliasInfo = {
    namespaces: Set<string>;
    dynamic: boolean;
    fromArray: boolean;
};

const extractAliasName = (bindings: string): string | null => {
    const aliasMatch = bindings.match(/\bt\s*(?::\s*([A-Za-z_$][\w$]*))?/);
    if (!aliasMatch) return null;
    return aliasMatch[1] ?? 't';
};

const addAliasInfo = (map: Map<string, AliasInfo>, alias: string, namespace: string, dynamic: boolean, fromArray: boolean) => {
    const info = map.get(alias) ?? { namespaces: new Set<string>(), dynamic: false, fromArray: false };
    if (namespace) info.namespaces.add(namespace);
    info.dynamic = info.dynamic || dynamic;
    info.fromArray = info.fromArray || fromArray;
    map.set(alias, info);
};

const buildAliasMap = (content: string, defaultNamespace: string): Map<string, AliasInfo> => {
    const aliasMap = new Map<string, AliasInfo>();
    const destructureRegex = /\b(const|let|var)\s+\{([\s\S]*?)\}\s*=\s*useTranslation\s*\(([\s\S]*?)\)/g;
    let match: RegExpExecArray | null;
    while ((match = destructureRegex.exec(content)) !== null) {
        const bindings = match[2];
        const argument = match[3];
        const aliasName = extractAliasName(bindings);
        if (!aliasName) continue;
        const { namespaces, dynamic, fromArray } = parseNamespaceArgument(argument || '');
        for (const ns of namespaces) {
            addAliasInfo(aliasMap, aliasName, ns, dynamic, fromArray);
        }
    }

    const serverI18nRegex = /\bconst\s+\{([\s\S]*?)\}\s*=\s*createServerI18n\s*\(/g;
    while ((match = serverI18nRegex.exec(content)) !== null) {
        const bindings = match[1];
        const aliasName = extractAliasName(bindings);
        if (aliasName) {
            addAliasInfo(aliasMap, aliasName, 'server', false, false);
        }
    }

    const serverAliasRegex = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*tServer\b/g;
    while ((match = serverAliasRegex.exec(content)) !== null) {
        addAliasInfo(aliasMap, match[1], 'server', false, false);
    }

    const serverAliasDirectRegex = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*tServer\b/g;
    while ((match = serverAliasDirectRegex.exec(content)) !== null) {
        addAliasInfo(aliasMap, match[1], 'server', false, false);
    }

    if (aliasMap.size === 0 && content.includes('useTranslation')) {
        const fallbackMatch = content.match(/useTranslation\s*\(([\s\S]*?)\)/);
        const argument = fallbackMatch?.[1] ?? '';
        const { namespaces, dynamic, fromArray } = parseNamespaceArgument(argument);
        for (const ns of namespaces) {
            addAliasInfo(aliasMap, 't', ns || defaultNamespace, dynamic, fromArray);
        }
    }

    return aliasMap;
};

const parseStringLiteral = (quote: string, value: string): { value: string; dynamic: boolean } => {
    if (quote === '`' && value.includes('${')) {
        return { value, dynamic: true };
    }
    return { value, dynamic: false };
};

const extractLiteralKeysFromExpression = (expression: string): { keys: string[]; dynamic: boolean } => {
    const trimmed = expression.trim();
    if (trimmed.includes('`') && trimmed.includes('${')) {
        return { keys: [], dynamic: true };
    }
    if (trimmed.includes('+')) {
        return { keys: [], dynamic: true };
    }
    const keys: string[] = [];
    const regex = /['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(trimmed)) !== null) {
        const before = trimmed.slice(Math.max(0, match.index - 6), match.index);
        if (/(===|!==|==|!=)\s*$/.test(before)) {
            continue;
        }
        if (/\bcase\s*$/.test(before)) {
            continue;
        }
        keys.push(match[1]);
    }
    if (keys.length === 0) {
        return { keys: [], dynamic: true };
    }
    return { keys, dynamic: false };
};

const resolveIdentifierKeys = (content: string, identifier: string, position: number): { keys: string[]; dynamic: boolean } => {
    const regex = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\s*=\\s*([\\s\\S]*?);`, 'g');
    let match: RegExpExecArray | null;
    let expression: string | null = null;
    while ((match = regex.exec(content)) !== null) {
        if (match.index > position) break;
        expression = match[1];
    }
    if (!expression) {
        return { keys: [], dynamic: true };
    }
    return extractLiteralKeysFromExpression(expression);
};

const findCallEnd = (content: string, startIndex: number): number => {
    let depth = 0;
    for (let i = startIndex; i < content.length; i++) {
        const c = content[i];
        if (c === '(') depth++;
        else if (c === ')') {
            if (depth === 0) return i + 1;
            depth--;
        }
    }
    return Math.min(startIndex + 200, content.length);
};

export const collectReferencesFromContent = (
    content: string,
    filePath: string,
    options: { defaultNamespace: string; knownNamespaces: Set<string> }
): { references: I18nReference[]; warnings: I18nWarning[] } => {
    const { defaultNamespace, knownNamespaces } = options;
    const references: I18nReference[] = [];
    const warnings: I18nWarning[] = [];
    const aliasMap = buildAliasMap(content, defaultNamespace);

    const addWarning = (warning: I18nWarning) => {
        warnings.push(warning);
    };

    const pushReference = (key: string, namespaces: string[], line: number, source: string) => {
        const resolvedNamespaces = namespaces.filter((ns) => !!ns);
        if (resolvedNamespaces.length === 0) return;
        const known = resolvedNamespaces.filter((ns) => {
            if (!knownNamespaces.has(ns)) {
                addWarning({
                    type: 'unknown-namespace',
                    key,
                    file: filePath,
                    line,
                    source,
                    detail: `命名空间不存在: ${ns}`,
                });
                return false;
            }
            return true;
        });
        if (known.length === 0) return;
        references.push({
            key,
            namespaces: known,
            file: filePath,
            line,
            source,
        });
    };

    const resolveAliasNamespaces = (alias: string, line: number, source: string): string[] => {
        const info = aliasMap.get(alias);
        if (!info) return [defaultNamespace];
        if (info.dynamic) {
            addWarning({
                type: 'dynamic-namespace',
                key: '',
                file: filePath,
                line,
                source,
                detail: 'useTranslation 命名空间为动态值',
            });
            return [];
        }
        const namespaces = Array.from(info.namespaces);
        if (namespaces.length > 1 && !info.fromArray) {
            addWarning({
                type: 'ambiguous-namespace',
                key: '',
                file: filePath,
                line,
                source,
                detail: `同一别名绑定多个命名空间: ${namespaces.join(', ')}`,
            });
            return [];
        }
        return namespaces.length ? namespaces : [defaultNamespace];
    };

    for (const aliasName of aliasMap.keys()) {
        const regex = new RegExp("\\b" + aliasName + "\\s*\\(\\s*(['\"`])((?:\\\\.|(?!\\1).)*)\\1", 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
            const quote = match[1];
            const literal = parseStringLiteral(quote, match[2]);
            const line = getLineNumber(content, match.index);
            const source = `${aliasName}(${literal.value})`;
            if (literal.dynamic) {
                addWarning({ type: 'dynamic-key', key: literal.value, file: filePath, line, source });
                continue;
            }
            const callEnd = findCallEnd(content, match.index + match[0].length);
            const snippet = content.slice(match.index, callEnd);
            const overrideNamespaces = findNsOverride(snippet);
            const parsed = parseI18nKey(literal.value, knownNamespaces);
            const namespaces = parsed.namespace
                ? [parsed.namespace]
                : (overrideNamespaces.length ? overrideNamespaces : resolveAliasNamespaces(aliasName, line, source));
            if (!namespaces.length) continue;
            pushReference(parsed.key, namespaces, line, source);
        }
    }

    const i18nCallRegex = /\bi18n\.(t|exists)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
    let i18nMatch: RegExpExecArray | null;
    while ((i18nMatch = i18nCallRegex.exec(content)) !== null) {
        const literal = parseStringLiteral(i18nMatch[2], i18nMatch[3]);
        const line = getLineNumber(content, i18nMatch.index);
        const source = `i18n.${i18nMatch[1]}(${literal.value})`;
        if (literal.dynamic) {
            addWarning({ type: 'dynamic-key', key: literal.value, file: filePath, line, source });
            continue;
        }
        const callEnd = findCallEnd(content, i18nMatch.index + i18nMatch[0].length);
        const snippet = content.slice(i18nMatch.index, callEnd);
        const overrideNamespaces = findNsOverride(snippet);
        const parsed = parseI18nKey(literal.value, knownNamespaces);
        const namespaces = parsed.namespace
            ? [parsed.namespace]
            : (overrideNamespaces.length ? overrideNamespaces : [defaultNamespace]);
        pushReference(parsed.key, namespaces, line, source);
    }

    const toastRegex = /toast\.\w+\s*\(\s*\{[\s\S]*?kind\s*:\s*['"]i18n['"][\s\S]*?\}\s*[,)\n]/g;
    let toastMatch: RegExpExecArray | null;
    while ((toastMatch = toastRegex.exec(content)) !== null) {
        const contextStart = Math.max(0, toastMatch.index - 300);
        const context = content.slice(contextStart, toastMatch.index + 300);
        const snippet = content.slice(toastMatch.index, toastMatch.index + 300);
        const line = getLineNumber(content, toastMatch.index);
        const source = 'toast.i18n';
        const keyMatch = snippet.match(/\bkey\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/);
        const keyIdentifierMatch = snippet.match(/\bkey\s*:\s*([A-Za-z_$][\w$]*)/);
        const keyShorthandMatch = snippet.match(/\bkey\b\s*(?=[,}])/);
        const keyIdentifierName = keyIdentifierMatch?.[1] ?? (keyShorthandMatch ? 'key' : null);
        const hasI18nExistsCheck = keyIdentifierName
            ? new RegExp(`i18n\\.exists\\s*\\(\\s*${keyIdentifierName}\\b`).test(context)
            : false;
        let keyValues: string[] = [];
        let keyDynamic = false;
        if (keyMatch) {
            const literal = parseStringLiteral(keyMatch[1], keyMatch[2]);
            keyDynamic = literal.dynamic;
            keyValues = literal.dynamic ? [] : [literal.value];
        } else if (keyIdentifierName) {
            const resolved = resolveIdentifierKeys(content, keyIdentifierName, toastMatch.index);
            keyDynamic = resolved.dynamic;
            keyValues = resolved.keys;
        } else {
            keyDynamic = true;
        }

        if (keyDynamic || keyValues.length === 0) {
            if (hasI18nExistsCheck) {
                continue;
            }
            addWarning({ type: 'dynamic-key', key: keyValues[0] ?? '', file: filePath, line, source, detail: 'Toast i18n key 不是字符串字面量' });
            continue;
        }

        const overrideNamespaces = findNsOverride(snippet);
        if (overrideNamespaces.length === 0 && /\bns\s*:\s*/.test(snippet)) {
            if (hasI18nExistsCheck) {
                continue;
            }
            addWarning({ type: 'dynamic-namespace', key: keyValues[0], file: filePath, line, source, detail: 'Toast i18n ns 不是字符串字面量' });
            continue;
        }
        for (const keyValue of keyValues) {
            const parsed = parseI18nKey(keyValue, knownNamespaces);
            const namespaces = parsed.namespace
                ? [parsed.namespace]
                : (overrideNamespaces.length ? overrideNamespaces : [defaultNamespace]);
            pushReference(parsed.key, namespaces, line, source);
        }
    }

    const transRegex = /<Trans[^>]*>/g;
    let transMatch: RegExpExecArray | null;
    while ((transMatch = transRegex.exec(content)) !== null) {
        const snippet = transMatch[0];
        const keyMatch = snippet.match(/i18nKey\s*=\s*(?:\{)?(['"`])([^'"`]+)\1(?:\})?/);
        if (!keyMatch) continue;
        const literal = parseStringLiteral(keyMatch[1], keyMatch[2]);
        const line = getLineNumber(content, transMatch.index);
        const source = '<Trans>'; 
        if (literal.dynamic) {
            addWarning({ type: 'dynamic-key', key: literal.value, file: filePath, line, source });
            continue;
        }
        const nsMatch = snippet.match(/\bns\s*=\s*(?:\{)?(['"`])([^'"`]+)\1(?:\})?/);
        const overrideNamespaces = nsMatch ? [nsMatch[2]] : [];
        const parsed = parseI18nKey(literal.value, knownNamespaces);
        const namespaces = parsed.namespace
            ? [parsed.namespace]
            : (overrideNamespaces.length ? overrideNamespaces : [defaultNamespace]);
        pushReference(parsed.key, namespaces, line, source);
    }

    const tServerRegex = /\btServer\s*\(\s*[^,]+,\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
    let tServerMatch: RegExpExecArray | null;
    while ((tServerMatch = tServerRegex.exec(content)) !== null) {
        const literal = parseStringLiteral(tServerMatch[1], tServerMatch[2]);
        const line = getLineNumber(content, tServerMatch.index);
        const source = 'tServer';
        if (literal.dynamic) {
            addWarning({ type: 'dynamic-key', key: literal.value, file: filePath, line, source });
            continue;
        }
        const parsed = parseI18nKey(literal.value, knownNamespaces);
        const namespaces = parsed.namespace ? [parsed.namespace] : ['server'];
        pushReference(parsed.key, namespaces, line, source);
    }

    return { references, warnings };
};

const scanFilePaths = (rootDir: string): string[] => {
    const results: string[] = [];
    const visit = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (IGNORED_DIRS.has(entry.name)) continue;
                visit(fullPath);
            } else if (entry.isFile()) {
                if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
                    results.push(fullPath);
                }
            }
        }
    };

    for (const dir of SCAN_DIRS) {
        const target = path.join(rootDir, dir);
        if (fs.existsSync(target)) visit(target);
    }

    return results;
};

const formatRefs = (refs: I18nReference[]): string => (
    refs.map((ref) => `${ref.file}:${ref.line}`).join(', ')
);

const main = () => {
    const { locales, namespaceFiles } = loadLocales();
    const knownNamespaces = new Set([...namespaceFiles, ...I18N_NAMESPACES]);
    const files = scanFilePaths(ROOT_DIR);

    const references: I18nReference[] = [];
    const warnings: I18nWarning[] = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const result = collectReferencesFromContent(content, file, { defaultNamespace: DEFAULT_NAMESPACE, knownNamespaces });
        references.push(...result.references);
        warnings.push(...result.warnings);
    }

    const missingMap = new Map<string, MissingTranslation>();
    for (const ref of references) {
        const missingLanguages = SUPPORTED_LANGUAGES.filter((lang) => {
            const hasAny = ref.namespaces.some((namespace) => {
                const localeData = locales[lang]?.[namespace];
                if (!localeData) return false;
                return hasKeyPath(localeData, ref.key);
            });
            return !hasAny;
        });
        if (missingLanguages.length === 0) continue;
        const namespacesKey = ref.namespaces.slice().sort().join(',');
        const id = `${namespacesKey}:${ref.key}`;
        const existing = missingMap.get(id);
        if (existing) {
            existing.languages = Array.from(new Set([...existing.languages, ...missingLanguages]));
            existing.refs.push(ref);
            continue;
        }
        missingMap.set(id, {
            namespaces: ref.namespaces.slice().sort(),
            key: ref.key,
            languages: missingLanguages,
            refs: [ref],
        });
    }

    const missing = Array.from(missingMap.values());
    if (missing.length === 0 && warnings.length === 0) {
        console.log('i18n-check: no missing keys detected.');
        return;
    }

    if (missing.length) {
        console.log(`i18n-check: missing ${missing.length} key(s).`);
        for (const item of missing) {
            console.log(`- [${item.namespaces.join('|')}] ${item.key} (missing: ${item.languages.join(', ')})`);
            console.log(`  refs: ${formatRefs(item.refs)}`);
        }
    }

    if (warnings.length) {
        console.log(`\nWarnings (${warnings.length}):`);
        for (const warning of warnings) {
            console.log(`- ${warning.type} ${warning.file}:${warning.line} ${warning.source} ${warning.detail ?? ''}`);
        }
    }

    if (missing.length > 0) {
        process.exitCode = 1;
    }
};

main();
