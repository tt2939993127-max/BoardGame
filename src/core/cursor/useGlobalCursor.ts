/**
 * 全局光标样式 Hook
 *
 * 在非游戏页面（主页等）应用用户选择的光标主题。
 * 通过修改 document.body.style.cursor 实现，无需包裹组件。
 */

import { useEffect } from 'react';
import { useCursorPreference } from './CursorPreferenceContext';
import { getCursorTheme, injectOutlineFilter, svgCursor } from './themes';

export function useGlobalCursor() {
    const { preference } = useCursorPreference();

    useEffect(() => {
        if (preference.cursorTheme === 'default') {
            document.body.style.cursor = '';
            return;
        }
        const theme = getCursorTheme(preference.cursorTheme);
        if (!theme) {
            document.body.style.cursor = '';
            return;
        }
        const cursorValue = preference.highContrast
            ? svgCursor(injectOutlineFilter(theme.previewSvgs.default), 6, 3, 'default')
            : theme.default;
        document.body.style.cursor = cursorValue;
        return () => {
            document.body.style.cursor = '';
        };
    }, [preference.cursorTheme, preference.highContrast]);
}
