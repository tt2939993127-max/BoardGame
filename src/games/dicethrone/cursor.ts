/**
 * 王权骰铸 (Dice Throne) 光标主题
 *
 * 变体 1: 琥珀金 — 渐变金属箭头
 * 变体 2: 烈焰战魂 — 火焰形状，红橙渐变
 * 变体 3: 骰面之王 — 骰子形状箭头，骰点装饰
 */

import type { CursorTheme } from '../../core/cursor/types';
import { buildCursors, registerCursorThemes } from '../../core/cursor/themes';

// --- 琥珀金（渐变金属箭头） ---
const goldSvgs = {
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="url(#dg)" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M14 3 C14 3 14 14 14 14 L10 12 C9 11.5 7.5 12 8 13.5 L12 20 L12 27 L22 27 L24 20 C24 20 26 14 26 13 C26 11.5 24 11 23 12 L22 13 C22 12 21 10.5 19.5 11 L19 12 C19 11 17.5 9.5 16.5 10.5 L16 12 L16 3 C16 1.5 14 1.5 14 3 Z" fill="url(#dp)" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="url(#dgr)" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
};

const gold: CursorTheme = {
    id: 'dicethrone', gameId: 'dicethrone', label: '王权骰铸', variantLabel: '琥珀金',
    previewSvgs: goldSvgs, ...buildCursors(goldSvgs),
};

// --- 烈焰战魂（火焰形状箭头，红橙渐变） ---
const flameSvgs = {
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M8 2 L6 14 L4 16 L8 18 L6 24 L10 20 L12 26 L14 18 L18 22 L16 14 L22 16 L12 8 Z" fill="url(#fg)" stroke="#7c2d12" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="fp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M14 2 L12 8 L10 6 L12 14 L8 16 L14 18 L12 24 L16 20 L18 28 L20 20 L24 22 L20 16 L26 14 L18 12 L20 6 L16 10 Z" fill="url(#fp)" stroke="#7c2d12" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="fgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M6 14 L8 8 L12 12 L16 6 L20 12 L24 8 L26 14 L26 20 C26 24 22 28 16 28 C10 28 6 24 6 20 Z" fill="url(#fgr)" stroke="#7c2d12" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="18" r="1.5" fill="#7c2d12" opacity="0.5"/><circle cx="20" cy="18" r="1.5" fill="#7c2d12" opacity="0.5"/></svg>`,
    notAllowed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="fn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><circle cx="16" cy="16" r="12" fill="url(#fn)" stroke="#7c2d12" stroke-width="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/></svg>`,
};

const flame: CursorTheme = {
    id: 'dicethrone-flame', gameId: 'dicethrone', label: '王权骰铸', variantLabel: '烈焰战魂',
    previewSvgs: flameSvgs, ...buildCursors(flameSvgs),
};

// --- 骰面之王（骰子形状箭头 + 骰点装饰，深紫金配色） ---
const diceSvgs = {
    // 默认：倾斜的骰子形状箭头，左上角为尖端，3 个骰点
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M4 2 L4 20 L8 16 L12 24 L16 22 L12 14 L20 14 Z" fill="url(#dcg)" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/><rect x="18" y="16" width="12" height="12" rx="2.5" fill="#1c1917" stroke="#d97706" stroke-width="1.2"/><circle cx="21" cy="19" r="1.3" fill="#fcd34d"/><circle cx="24" cy="22" r="1.3" fill="#fcd34d"/><circle cx="27" cy="25" r="1.3" fill="#fcd34d"/></svg>`,
    // 指针：竖立的手指 + 骰子装饰
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dcp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M14 3 C14 3 14 14 14 14 L10 12 C9 11.5 7.5 12 8 13.5 L12 20 L12 27 L22 27 L24 20 C24 20 26 14 26 13 C26 11.5 24 11 23 12 L22 13 C22 12 21 10.5 19.5 11 L19 12 C19 11 17.5 9.5 16.5 10.5 L16 12 L16 3 C16 1.5 14 1.5 14 3 Z" fill="url(#dcp)" stroke="#78350f" stroke-width="1.3" stroke-linejoin="round"/><rect x="3" y="3" width="8" height="8" rx="1.5" fill="#1c1917" stroke="#d97706" stroke-width="1"/><circle cx="5.5" cy="5.5" r="1" fill="#fcd34d"/><circle cx="8.5" cy="5.5" r="1" fill="#fcd34d"/><circle cx="5.5" cy="8.5" r="1" fill="#fcd34d"/><circle cx="8.5" cy="8.5" r="1" fill="#fcd34d"/></svg>`,
    // 抓取：握拳 + 骰子在手中
    grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="dcgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="url(#dcgr)" stroke="#78350f" stroke-width="1.3" stroke-linejoin="round"/><rect x="21" y="8" width="9" height="9" rx="2" fill="#1c1917" stroke="#d97706" stroke-width="1"/><circle cx="23.5" cy="10.5" r="1" fill="#fcd34d"/><circle cx="25.5" cy="12.5" r="1" fill="#fcd34d"/><circle cx="27.5" cy="14.5" r="1" fill="#fcd34d"/></svg>`,
    // 禁止：骰子上画叉
    notAllowed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="5" fill="#1c1917" stroke="#d97706" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="#fcd34d"/><circle cx="22" cy="10" r="2" fill="#fcd34d"/><circle cx="16" cy="16" r="2" fill="#fcd34d"/><circle cx="10" cy="22" r="2" fill="#fcd34d"/><circle cx="22" cy="22" r="2" fill="#fcd34d"/><line x1="6" y1="6" x2="26" y2="26" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/></svg>`,
};

const dice: CursorTheme = {
    id: 'dicethrone-dice', gameId: 'dicethrone', label: '王权骰铸', variantLabel: '骰面之王',
    previewSvgs: diceSvgs, ...buildCursors(diceSvgs, { notAllowed: [16, 16] }),
};

registerCursorThemes([gold, flame, dice]);
