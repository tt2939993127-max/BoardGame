import type { SupportedLanguage } from '../../../../src/lib/i18n/types';
import { getServerLocale, tServer } from '../../../../src/server/i18n';

export type RequestLike = {
    headers?: Record<string, string | string[] | undefined>;
};

export const getRequestLocale = (request?: RequestLike): SupportedLanguage => {
    return getServerLocale({ headers: request?.headers ?? {} } as never);
};

export const createRequestI18n = (request?: RequestLike) => {
    const locale = getRequestLocale(request);
    return {
        locale,
        t: (key: string, params?: Record<string, string | number>) => tServer(locale, key, params),
    };
};
