/**
 * Cardia 光标主题
 */

import type { CursorTheme } from '../../core/cursor/types';
import { registerCursorThemes } from '../../core/cursor/themes';

const cardia: CursorTheme = {
    id: 'cardia',
    gameId: 'cardia',
    label: 'Cardia',
    variantLabel: '幻想',
    previewSvgs: {
        // Cardia 目前使用 .cur 文件，这里提供最小可用预览 SVG，避免设置页空白。
        default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 2 L4 26 L10 20 L16 28 L20 26 L14 18 L22 18 Z" fill="#c7d2fe" stroke="#312e81" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
        pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 2 L12 8 L10 6 L12 14 L8 16 L14 18 L12 24 L16 20 L18 28 L20 20 L24 22 L20 16 L26 14 L18 12 L20 6 L16 10 Z" fill="#a7f3d0" stroke="#064e3b" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
        grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="#fde68a" stroke="#92400e" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    },
    default: 'url(/cursors/fantasy/sword.cur), auto',
    pointer: 'url(/cursors/fantasy/hand.cur), pointer',
    grab: 'url(/cursors/fantasy/grab.cur), grab',
    grabbing: 'url(/cursors/fantasy/grabbing.cur), grabbing',
};

registerCursorThemes([cardia]);
