const LEGACY_TRANSLATE_SUPPORT_QUERY = 'not (translate: 0)';

const splitTranslateTokens = (value) =>
    value
        .replace(/\)(?=(var|calc|min|max|clamp)\()/g, ') ')
        .match(/var\([^)]*\)|calc\([^)]*\)|min\([^)]*\)|max\([^)]*\)|clamp\([^)]*\)|[^\s]+/g)
        ?? [];

const buildTransformTranslateValue = (value) => {
    const tokens = splitTranslateTokens(value.trim()).filter(Boolean);

    if (tokens.length === 0 || tokens[0] === 'none') {
        return null;
    }

    if (tokens.length === 1) {
        return `translate(${tokens[0]})`;
    }

    return `translate(${tokens[0]}, ${tokens[1]})`;
};

const tailwindLegacyTranslateFallback = () => ({
    postcssPlugin: 'tailwind-legacy-translate-fallback',
    OnceExit(root, { AtRule }) {
        root.walkRules((rule) => {
            if (rule.parent?.type === 'atrule' && rule.parent.name === 'supports' && rule.parent.params === LEGACY_TRANSLATE_SUPPORT_QUERY) {
                return;
            }

            const translateDecl = rule.nodes?.find(
                (node) => node.type === 'decl' && node.prop === 'translate',
            );

            if (!translateDecl || rule.nodes?.some((node) => node.type === 'decl' && node.prop === 'transform')) {
                return;
            }

            const fallbackTransformValue = buildTransformTranslateValue(translateDecl.value);
            if (!fallbackTransformValue) {
                return;
            }

            const fallbackRule = rule.clone();
            fallbackRule.append({
                prop: 'transform',
                value: fallbackTransformValue,
            });

            const supportsRule = new AtRule({
                name: 'supports',
                params: LEGACY_TRANSLATE_SUPPORT_QUERY,
            });
            supportsRule.append(fallbackRule);
            rule.after(supportsRule);
        });
    },
});

tailwindLegacyTranslateFallback.postcss = true;

export default tailwindLegacyTranslateFallback;
