import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import tailwindLegacyStructureFallback from './postcss-tailwind-legacy-structure.js';
import tailwindLegacyColorFallback from './postcss-tailwind-legacy-colors.js';
import tailwindLegacyTranslateFallback from './postcss-tailwind-legacy-translate.js';

export default {
    plugins: [
        tailwindcss(),
        tailwindLegacyStructureFallback(),
        tailwindLegacyColorFallback(),
        tailwindLegacyTranslateFallback(),
        autoprefixer(),
    ],
}
