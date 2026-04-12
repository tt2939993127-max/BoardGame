import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * HUD 级 Portal 根节点
 *
 * 目的：避开 board-shell 的 transform 缩放上下文，保证 fixed/absolute 对齐视口。
 * 约定：新 HUD/Overlay 组件必须通过该入口渲染。
 */
export const getHudPortalRoot = () => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('hud-root') ?? document.body;
};

export const HudPortal = ({ children }: { children: ReactNode }) => {
    const portalRoot = getHudPortalRoot();
    return portalRoot ? createPortal(children, portalRoot) : <>{children}</>;
};
