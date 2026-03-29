const tailwindLegacyStructureFallback = () => ({
    postcssPlugin: 'tailwind-legacy-structure-fallback',
    OnceExit(root) {
        root.walkAtRules((atRule) => {
            if (atRule.name === 'property') {
                atRule.remove();
                return;
            }

            if (atRule.name !== 'layer') {
                return;
            }

            if (!atRule.nodes?.length) {
                atRule.remove();
                return;
            }

            atRule.replaceWith(...atRule.nodes);
        });
    },
});

tailwindLegacyStructureFallback.postcss = true;

export default tailwindLegacyStructureFallback;
