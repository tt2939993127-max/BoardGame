export type BrowserCompatibilityReason =
    | 'css-oklch'
    | 'css-translate'
    | 'css-register-property';

export interface BrowserCompatibilityReport {
    isCompatible: boolean;
    reasons: BrowserCompatibilityReason[];
    isAndroidWebView: boolean;
    browserName: string;
    browserVersion: string | null;
}

export const BROWSER_COMPATIBILITY_BYPASS_KEY = 'bg.compatibility.bypass';

const UNKNOWN_BROWSER_NAME = 'Unknown Browser';

interface BrowserSignature {
    name: string;
    pattern: RegExp;
}

const BROWSER_SIGNATURES: BrowserSignature[] = [
    { name: 'Edge', pattern: /Edg\/([\d.]+)/i },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
    { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/i },
    { name: 'Android WebView', pattern: /Version\/([\d.]+).*Chrome\/[\d.]+.*\bwv\b/i },
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/i },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/i },
];

const supportsCssFeature = (property: string, value: string): boolean => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
        return false;
    }

    return CSS.supports(property, value);
};

const parseBrowserIdentity = (userAgent: string): { browserName: string; browserVersion: string | null } => {
    for (const signature of BROWSER_SIGNATURES) {
        const match = userAgent.match(signature.pattern);
        if (match) {
            return {
                browserName: signature.name,
                browserVersion: match[1] ?? null,
            };
        }
    }

    return {
        browserName: UNKNOWN_BROWSER_NAME,
        browserVersion: null,
    };
};

export const detectBrowserCompatibility = (): BrowserCompatibilityReport => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return {
            isCompatible: true,
            reasons: [],
            isAndroidWebView: false,
            browserName: UNKNOWN_BROWSER_NAME,
            browserVersion: null,
        };
    }

    const userAgent = navigator.userAgent || '';
    const browserIdentity = parseBrowserIdentity(userAgent);
    const reasons: BrowserCompatibilityReason[] = [];

    if (!supportsCssFeature('color', 'oklch(62.3% 0.214 259.815)')) {
        reasons.push('css-oklch');
    }

    if (!supportsCssFeature('translate', '1px')) {
        reasons.push('css-translate');
    }

    if (typeof CSS === 'undefined' || typeof (CSS as CSS & { registerProperty?: unknown }).registerProperty !== 'function') {
        reasons.push('css-register-property');
    }

    return {
        isCompatible: reasons.length === 0,
        reasons,
        isAndroidWebView: /\bwv\b|; wv\)/i.test(userAgent),
        browserName: browserIdentity.browserName,
        browserVersion: browserIdentity.browserVersion,
    };
};

export const readBrowserCompatibilityBypass = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.sessionStorage.getItem(BROWSER_COMPATIBILITY_BYPASS_KEY) === '1';
    } catch {
        return false;
    }
};

export const writeBrowserCompatibilityBypass = (enabled: boolean): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (enabled) {
            window.sessionStorage.setItem(BROWSER_COMPATIBILITY_BYPASS_KEY, '1');
            return;
        }

        window.sessionStorage.removeItem(BROWSER_COMPATIBILITY_BYPASS_KEY);
    } catch {
        // sessionStorage 不可用时，保持静默降级
    }
};
