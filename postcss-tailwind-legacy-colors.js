import { color, serializeRGB } from '@csstools/css-color-parser';
import { parseComponentValue } from '@csstools/css-parser-algorithms';
import { tokenize } from '@csstools/css-tokenizer';

const MODERN_COLOR_PATTERN = /\boklch\([^()]*\)|\boklab\([^()]*\)/gi;

const convertModernColorToLegacyRgb = (input) => {
    try {
        const parsedValue = parseComponentValue(tokenize({ css: input }));
        const colorData = color(parsedValue);

        if (!colorData) {
            return null;
        }

        return String(serializeRGB(colorData));
    } catch {
        return null;
    }
};

const replaceModernColors = (value) =>
    value.replace(MODERN_COLOR_PATTERN, (matchedValue) => {
        const legacyColor = convertModernColorToLegacyRgb(matchedValue);
        return legacyColor ?? matchedValue;
    });

const tailwindLegacyColorFallback = () => ({
    postcssPlugin: 'tailwind-legacy-color-fallback',
    Declaration(decl) {
        if (!decl.value || !MODERN_COLOR_PATTERN.test(decl.value)) {
            MODERN_COLOR_PATTERN.lastIndex = 0;
            return;
        }

        MODERN_COLOR_PATTERN.lastIndex = 0;
        decl.value = replaceModernColors(decl.value);
    },
});

tailwindLegacyColorFallback.postcss = true;

export default tailwindLegacyColorFallback;
