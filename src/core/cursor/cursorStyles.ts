/**
 * 共享光标样式模板
 *
 * 存放可跨游戏复用的 SVG 样式定义。
 * 游戏的 cursor.ts 通过 createThemeFromStyle() 工厂函数引用样式模板，
 * 只需提供 gameId/label 等元数据，无需复制 SVG。
 *
 * 新增共享样式只需在本文件添加一个 CursorStyleTemplate 对象。
 */

import type { CursorTheme, CursorPreviewSvgs } from './types';
import { buildCursors } from './themes';

/** 共享样式模板：SVG 定义 + 热点配置 */
export interface CursorStyleTemplate {
    /** 样式模板 ID（如 'neon-cyan'），用于去重和引用 */
    styleId: string;
    /** 样式显示名称（中文，用于变体选择弹窗） */
    styleLabel: string;
    /** 各形态的 SVG 字符串 */
    svgs: CursorPreviewSvgs & { default: string; pointer: string; grabbing?: string; zoomIn?: string; notAllowed?: string };
    /** 热点偏移配置 */
    hotspots?: { grabbing?: [number, number]; zoomIn?: [number, number]; notAllowed?: [number, number] };
}

/**
 * 从共享样式模板创建游戏光标主题
 *
 * @param style 共享样式模板
 * @param meta 游戏元数据（gameId, label, 可选的 id 覆盖和 variantLabel 覆盖）
 */
export function createThemeFromStyle(
    style: CursorStyleTemplate,
    meta: { gameId: string; label: string; id?: string; variantLabel?: string },
): CursorTheme {
    return {
        id: meta.id ?? `${meta.gameId}-${style.styleId}`,
        gameId: meta.gameId,
        label: meta.label,
        variantLabel: meta.variantLabel ?? style.styleLabel,
        previewSvgs: style.svgs,
        ...buildCursors(style.svgs, style.hotspots),
    };
}

// ===========================================================================
// 共享样式模板库
// ===========================================================================

/** 霓虹青 — 发光线条，青色霓虹管风格 */
export const STYLE_NEON_CYAN: CursorStyleTemplate = {
    styleId: 'neon-cyan',
    styleLabel: '霓虹青',
    svgs: {
        default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="rgba(8,145,178,0.2)" stroke="none"/></svg>`,
        pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 3 C14 3 14 14 14 14 L10 12 C9 11.5 7.5 12 8 13.5 L12 20 L12 27 L22 27 L24 20 C24 20 26 14 26 13 C26 11.5 24 11 23 12 L22 13 C22 12 21 10.5 19.5 11 L19 12 C19 11 17.5 9.5 16.5 10.5 L16 12 L16 3 C16 1.5 14 1.5 14 3 Z" fill="rgba(8,145,178,0.2)" stroke="#22d3ee" stroke-width="2" stroke-linejoin="round"/></svg>`,
        grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="rgba(8,145,178,0.2)" stroke="#22d3ee" stroke-width="2" stroke-linejoin="round"/></svg>`,
        zoomIn: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="13" cy="13" r="9" fill="none" stroke="#22d3ee" stroke-width="2.5"/><line x1="20" y1="20" x2="28" y2="28" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/><line x1="9" y1="13" x2="17" y2="13" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="9" x2="13" y2="17" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg>`,
        notAllowed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#22d3ee" stroke-width="2.5"/><line x1="8" y1="16" x2="24" y2="16" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/></svg>`,
    },
    hotspots: { zoomIn: [13, 13] },
};

/** 霓虹粉 — 发光线条，粉紫霓虹管风格 */
export const STYLE_NEON_PINK: CursorStyleTemplate = {
    styleId: 'neon-pink',
    styleLabel: '霓虹粉',
    svgs: {
        default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="none" stroke="#e879f9" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="rgba(168,85,247,0.15)" stroke="none"/></svg>`,
        pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 3 C14 3 14 14 14 14 L10 12 C9 11.5 7.5 12 8 13.5 L12 20 L12 27 L22 27 L24 20 C24 20 26 14 26 13 C26 11.5 24 11 23 12 L22 13 C22 12 21 10.5 19.5 11 L19 12 C19 11 17.5 9.5 16.5 10.5 L16 12 L16 3 C16 1.5 14 1.5 14 3 Z" fill="rgba(168,85,247,0.15)" stroke="#e879f9" stroke-width="2" stroke-linejoin="round"/></svg>`,
        grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="rgba(168,85,247,0.15)" stroke="#e879f9" stroke-width="2" stroke-linejoin="round"/></svg>`,
        zoomIn: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="13" cy="13" r="9" fill="none" stroke="#e879f9" stroke-width="2.5"/><line x1="20" y1="20" x2="28" y2="28" stroke="#e879f9" stroke-width="3" stroke-linecap="round"/><line x1="9" y1="13" x2="17" y2="13" stroke="#e879f9" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="9" x2="13" y2="17" stroke="#e879f9" stroke-width="2" stroke-linecap="round"/></svg>`,
        notAllowed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#e879f9" stroke-width="2.5"/><line x1="8" y1="16" x2="24" y2="16" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/></svg>`,
    },
    hotspots: { zoomIn: [13, 13] },
};
