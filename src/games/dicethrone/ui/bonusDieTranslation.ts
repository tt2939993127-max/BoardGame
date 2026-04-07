type BonusDieI18nLike = {
    exists?: (key: string, options?: Record<string, unknown>) => boolean;
    getResource?: (language: string, namespace: string, key: string) => unknown;
    resolvedLanguage?: string;
    language?: string;
};

type BonusDieParams = Record<string, string | number> | undefined;

const BONUS_DIE_NAMESPACE = 'game-dicethrone';
const BONUS_DIE_EFFECT_PREFIX = 'bonusDie.effect.';

function interpolateTemplate(template: string, params?: BonusDieParams): string {
    if (!params) return template;
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawKey) => {
        const key = String(rawKey).trim();
        const value = params[key];
        return value === undefined ? `{{${key}}}` : String(value);
    });
}

function getFlatBonusDieTemplate(i18n: BonusDieI18nLike | undefined, key: string): string | null {
    if (!key.startsWith(BONUS_DIE_EFFECT_PREFIX)) return null;
    const language = i18n?.resolvedLanguage ?? i18n?.language;
    if (!language || typeof i18n?.getResource !== 'function') return null;

    const effectMap = i18n.getResource(language, BONUS_DIE_NAMESPACE, 'bonusDie.effect');
    if (!effectMap || typeof effectMap !== 'object') return null;

    const flatKey = key.slice(BONUS_DIE_EFFECT_PREFIX.length);
    const value = (effectMap as Record<string, unknown>)[flatKey];
    return typeof value === 'string' ? value : null;
}

export function resolveBonusDieText(
    key: string | undefined,
    options: {
        t: (translationKey: string, params?: BonusDieParams) => string;
        i18n?: BonusDieI18nLike;
        params?: BonusDieParams;
    },
): string | null {
    if (!key) return null;

    const { t, i18n, params } = options;
    if (typeof i18n?.exists === 'function' && i18n.exists(key, { ns: BONUS_DIE_NAMESPACE })) {
        return t(key, params);
    }

    const flatTemplate = getFlatBonusDieTemplate(i18n, key);
    if (flatTemplate) {
        return interpolateTemplate(flatTemplate, params);
    }

    return key;
}
