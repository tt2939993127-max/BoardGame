/**
 * 召唤师战争 - 地图容器组件
 * 支持拖拽、鼠标滚轮缩放，区分点击和拖拽
 * 支持教程自动平移（panToTarget）
 */

import React, { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

/** 判定为拖拽的最小移动距离（像素） */
const DRAG_THRESHOLD = 5;

export interface MapContainerProps {
  /** 子元素（地图内容） */
  children: ReactNode;
  /** 初始缩放 */
  initialScale?: number;
  /** 最小缩放 */
  minScale?: number;
  /** 最大缩放 */
  maxScale?: number;
  /** 纵向拖拽边界放松比例（相对容器高度） */
  dragBoundsPaddingRatioY?: number;
  /** 禁用拖拽和缩放（教程非交互步骤时使用） */
  interactionDisabled?: boolean;
  /** 教程自动平移：传入 data-tutorial-id 值，地图会平滑移动使该元素居中 */
  panToTarget?: string | null;
  /** 教程自动平移时的缩放倍率（不传则保持当前缩放） */
  panToScale?: number;
  /** 测试标识（容器） */
  containerTestId?: string;
  /** 测试标识（地图内容） */
  contentTestId?: string;
  /** 测试标识（缩放倍率） */
  scaleTestId?: string;
  /** 额外类名 */
  className?: string;
}

/** 地图容器（支持拖拽和缩放，区分点击和拖拽） */
export const MapContainer: React.FC<MapContainerProps> = ({
  children,
  initialScale = 0.6,
  minScale = 0.5,
  maxScale = 3,
  dragBoundsPaddingRatioY = 0,
  interactionDisabled = false,
  panToTarget,
  panToScale,
  containerTestId,
  contentTestId,
  scaleTestId,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initialScale);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // 平滑过渡标记：panToTarget 触发时启用较长 transition
  const [isAnimating, setIsAnimating] = useState(false);

  // 拖拽状态 ref
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);

  const clampPosition = useCallback((x: number, y: number, nextScale = scale) => {
    if (!containerSize.width || !containerSize.height || !contentSize.width || !contentSize.height) {
      return { x, y };
    }
    const scaledWidth = contentSize.width * nextScale;
    const scaledHeight = contentSize.height * nextScale;
    const maxOffsetX = Math.max(0, (scaledWidth - containerSize.width) / 2);
    const extraPaddingY = containerSize.height * dragBoundsPaddingRatioY;
    const maxOffsetY = Math.max(0, (scaledHeight - containerSize.height) / 2 + extraPaddingY);
    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y)),
    };
  }, [containerSize, contentSize, scale, dragBoundsPaddingRatioY]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContentSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // 鼠标按下（只在容器内触发）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只响应左键
    if (interactionDisabled) return; // 教程非交互步骤时禁止拖拽

    isPointerDownRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { x: position.x, y: position.y };
  }, [position, interactionDisabled]);

  // 全局鼠标移动和松开（使用 useEffect 注册）
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPointerDownRef.current) return;

      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 超过阈值才开始拖拽
      if (distance > DRAG_THRESHOLD) {
        setIsDragging(true);
        setIsAnimating(false);

        const nextPosition = {
          x: positionStartRef.current.x + dx,
          y: positionStartRef.current.y + dy,
        };
        setPosition(clampPosition(nextPosition.x, nextPosition.y));
      }
    };

    const handleGlobalMouseUp = () => {
      isPointerDownRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [clampPosition]);

  // 滚轮缩放
  const handleWheel = useCallback((e: WheelEvent) => {
    if (interactionDisabled) return; // 教程非交互步骤时禁止缩放
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => {
      const nextScale = Math.max(minScale, Math.min(maxScale, prev + delta));
      setPosition(current => clampPosition(current.x, current.y, nextScale));
      return nextScale;
    });
  }, [minScale, maxScale, clampPosition, interactionDisabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    setPosition(prev => {
      const next = clampPosition(prev.x, prev.y);
      return next.x === prev.x && next.y === prev.y ? prev : next;
    });
  }, [clampPosition]);

  // 教程禁用交互时，若没有 panToTarget 则重置地图到默认位置和缩放
  useEffect(() => {
    if (interactionDisabled && !panToTarget) {
      setIsAnimating(true);
      setScale(initialScale);
      setPosition({ x: 0, y: 0 });
      const timerId = window.setTimeout(() => setIsAnimating(false), 400);
      return () => window.clearTimeout(timerId);
    }
  }, [interactionDisabled, initialScale, panToTarget]);

  // 教程自动平移：当 panToTarget 变化时，计算目标元素在内容区域中的位置并平移使其居中
  // 同时支持 panToScale 指定聚焦时的缩放倍率
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  useEffect(() => {
    if (!panToTarget || !contentRef.current || !containerRef.current) return;
    // Wait for container/content to be measured by ResizeObserver before calculating pan position.
    // Without valid sizes, clampPosition won't clamp and the map can fly off to wrong coordinates.
    // The effect will re-run when sizes become available (clampPosition dep changes).
    if (!containerSize.width || !containerSize.height || !contentSize.width || !contentSize.height) return;
    // 延迟一帧确保 DOM 已更新（教程步骤切换后元素可能刚挂载）
    const rafId = requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`[data-tutorial-id="${panToTarget}"]`);
      if (!el || !contentRef.current || !containerRef.current) return;

      const contentEl = contentRef.current;
      const contentW = contentEl.offsetWidth;
      const contentH = contentEl.offsetHeight;
      if (!contentW || !contentH) return;

      const currentScale = scaleRef.current;
      const targetScale = panToScale != null
        ? Math.max(minScale, Math.min(maxScale, panToScale))
        : currentScale;

      // Reset any scroll offset caused by external scrollIntoView before measuring
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;

      // 临时重置 transform 为无偏移状态来测量目标的真实 CSS 布局位置
      const savedTransform = contentEl.style.transform;
      const savedTransition = contentEl.style.transition;
      contentEl.style.transition = 'none';
      contentEl.style.transform = 'translate(0px, 0px) scale(1)';
      contentEl.getBoundingClientRect(); // 强制回流

      const contentRect = contentEl.getBoundingClientRect();
      const elRect = (el as HTMLElement).getBoundingClientRect();

      const targetCenterX = (elRect.left + elRect.right) / 2 - contentRect.left;
      const targetCenterY = (elRect.top + elRect.bottom) / 2 - contentRect.top;

      // 恢复原始 transform
      contentEl.style.transform = savedTransform;
      contentEl.getBoundingClientRect(); // 强制回流
      contentEl.style.transition = savedTransition;

      const contentCenterX = contentW / 2;
      const contentCenterY = contentH / 2;
      const targetTx = (contentCenterX - targetCenterX) * targetScale;
      const targetTy = (contentCenterY - targetCenterY) * targetScale;

      const clamped = clampPosition(targetTx, targetTy, targetScale);
      setIsAnimating(true);
      if (targetScale !== currentScale) setScale(targetScale);
      setPosition(clamped);
      const timerId = window.setTimeout(() => setIsAnimating(false), 400);
      return () => window.clearTimeout(timerId);
    });
    return () => cancelAnimationFrame(rafId);
  }, [panToTarget, panToScale, minScale, maxScale, clampPosition]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className}`}
      onMouseDown={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      data-testid={containerTestId}
      style={{
        cursor: interactionDisabled ? 'default' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* 左上角缩放倍率显示 */}
      <div
        className="absolute top-3 left-3 z-20 text-sm font-bold text-white bg-black/70 px-3 py-1.5 rounded-lg border border-white/20 pointer-events-none shadow-lg"
        data-testid={scaleTestId}
      >
        {Math.round(scale * 100)}%
      </div>

      {/* 地图内容 */}
      <div
        ref={contentRef}
        className="origin-center"
        data-testid={contentTestId}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : isAnimating ? 'transform 350ms ease-out' : 'transform 75ms',
          willChange: 'transform',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MapContainer;
