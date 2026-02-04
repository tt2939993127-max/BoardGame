/**
 * 场景画布组件
 * 
 * 用于放置和布局游戏组件（卡牌、Token、区域等）
 */

import { useState, useCallback, useRef, type DragEvent, type MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

export interface SceneComponent {
  id: string;
  type: string;           // 组件类型（card, token, zone, text, render-component 等）
  x: number;              // 位置 X
  y: number;              // 位置 Y
  width: number;          // 宽度
  height: number;         // 高度
  rotation?: number;      // 旋转角度
  data: Record<string, unknown>;  // 组件数据
  renderComponentId?: string;     // 关联的渲染组件ID（用于自定义渲染）
}

export interface SceneCanvasProps {
  components: SceneComponent[];
  onChange: (components: SceneComponent[]) => void;
  selectedId?: string;
  onSelect?: (id: string | null) => void;
  onNewRenderComponent?: (component: SceneComponent) => void;
  gridSize?: number;
  showGrid?: boolean;
  className?: string;
}

// ============================================================================
// 组件渲染器
// ============================================================================

function renderComponent(comp: SceneComponent, isSelected: boolean) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    transform: comp.rotation ? `rotate(${comp.rotation}deg)` : undefined,
  };

  switch (comp.type) {
    // 模板类（定义外观样式）
    case 'card-template':
      return (
        <div
          style={baseStyle}
          className={`
            bg-slate-800 border-2 rounded-lg shadow-lg flex flex-col p-1
            ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-500'}
          `}
        >
          <div className="text-[10px] font-bold text-white truncate px-1">卡牌</div>
          <div className="flex-1 bg-slate-700 rounded m-1" />
          <div className="text-[8px] text-slate-400 px-1 truncate">模板</div>
        </div>
      );

    case 'piece-template':
    case 'dice-template':
      return (
        <div
          style={baseStyle}
          className={`
            rounded-full flex items-center justify-center bg-indigo-600 text-white font-bold
            ${isSelected ? 'ring-2 ring-amber-500' : ''}
          `}
        >
          {comp.type === 'dice-template' ? '🎲' : '●'}
        </div>
      );

    // 布局区域
    case 'hand-zone':
    case 'deck-zone':
    case 'play-zone':
    case 'grid-board':
    case 'hex-board':
    case 'dice-tray':
      return (
        <div
          style={baseStyle}
          className={`
            border-2 border-dashed rounded-lg flex items-center justify-center
            ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-500 bg-slate-800/30'}
          `}
        >
          <span className="text-slate-300 text-sm">
            {String(comp.data.name || comp.type)}
          </span>
        </div>
      );

    // 玩家信息
    case 'player-info':
    case 'resource-bar':
    case 'status-panel':
      return (
        <div
          style={baseStyle}
          className={`
            bg-slate-800 border-2 rounded-lg flex flex-col p-2
            ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-600'}
          `}
        >
          <div className="text-xs font-bold text-white truncate">
            {String(comp.data.name || comp.type)}
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            {String(comp.data.description || '')}
          </div>
        </div>
      );

    // UI 元素
    case 'action-bar':
    case 'message-log':
    case 'turn-indicator':
      return (
        <div
          style={baseStyle}
          className={`
            bg-slate-700 border rounded-lg flex items-center justify-center
            ${isSelected ? 'border-amber-500' : 'border-slate-600'}
          `}
        >
          <span className="text-slate-200 text-xs">{String(comp.data.name || comp.type)}</span>
        </div>
      );

    // 自定义渲染组件
    case 'render-component':
      return (
        <div
          style={baseStyle}
          className={`
            bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border-2 rounded-lg flex flex-col items-center justify-center
            ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-cyan-500/50'}
          `}
        >
          <span className="text-cyan-300 text-xs font-medium">{String(comp.data.name || '渲染组件')}</span>
          <span className="text-slate-400 text-[10px] mt-1">点击预览查看效果</span>
        </div>
      );

    default:
      return (
        <div
          style={baseStyle}
          className={`
            border-2 border-dashed rounded flex items-center justify-center
            ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 bg-slate-800/30'}
          `}
        >
          <span className="text-slate-300 text-xs">{String(comp.data.name || comp.type)}</span>
        </div>
      );
  }
}

// ============================================================================
// 场景画布主组件
// ============================================================================

export function SceneCanvas({
  components,
  onChange,
  selectedId,
  onSelect,
  onNewRenderComponent,
  gridSize = 20,
  showGrid = true,
  className = '',
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string; corner: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  // 对齐到网格
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / gridSize) * gridSize;
  }, [gridSize]);

  // 处理拖放（从组件面板拖入）
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = snapToGrid(e.clientX - rect.left - (data.width || 80) / 2);
      const y = snapToGrid(e.clientY - rect.top - (data.height || 100) / 2);

      const newComponent: SceneComponent = {
        id: `comp-${Date.now()}`,
        type: data.type || 'card',
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: data.width || 80,
        height: data.height || 100,
        data: data.data || {},
      };

      onChange([...components, newComponent]);
      onSelect?.(newComponent.id);

      // 如果是新建渲染组件，触发回调
      if (data.type === 'render-component' && data.data?.isNew && onNewRenderComponent) {
        onNewRenderComponent(newComponent);
      }
    } catch (err) {
      console.error('Drop parse error:', err);
    }
  }, [components, onChange, onSelect, onNewRenderComponent, snapToGrid]);

  // 处理组件拖动（在画布内移动）
  const handleComponentMouseDown = useCallback((e: MouseEvent, comp: SceneComponent) => {
    e.stopPropagation();
    onSelect?.(comp.id);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedId(comp.id);
    setDragOffset({
      x: e.clientX - rect.left - comp.x,
      y: e.clientY - rect.top - comp.y,
    });
  }, [onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedId || !dragOffset) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = snapToGrid(e.clientX - rect.left - dragOffset.x);
    const newY = snapToGrid(e.clientY - rect.top - dragOffset.y);

    onChange(components.map(c => 
      c.id === draggedId 
        ? { ...c, x: Math.max(0, newX), y: Math.max(0, newY) }
        : c
    ));
  }, [draggedId, dragOffset, components, onChange, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    setDraggedId(null);
    setDragOffset(null);
  }, []);

  // 点击空白处取消选中
  const handleCanvasClick = useCallback(() => {
    onSelect?.(null);
  }, [onSelect]);

  // 删除选中组件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      onChange(components.filter(c => c.id !== selectedId));
      onSelect?.(null);
    }
  }, [selectedId, components, onChange, onSelect]);

  // 删除组件
  const handleDeleteComponent = useCallback((id: string) => {
    onChange(components.filter(c => c.id !== id));
    if (selectedId === id) onSelect?.(null);
  }, [components, onChange, selectedId, onSelect]);

  // 调整尺寸
  const handleResizeStart = useCallback((e: MouseEvent, comp: SceneComponent) => {
    e.stopPropagation();
    setResizing({
      id: comp.id,
      corner: 'se',
      startX: e.clientX,
      startY: e.clientY,
      startW: comp.width,
      startH: comp.height,
    });
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    
    const deltaX = e.clientX - resizing.startX;
    const deltaY = e.clientY - resizing.startY;
    const newW = snapToGrid(Math.max(40, resizing.startW + deltaX));
    const newH = snapToGrid(Math.max(40, resizing.startH + deltaY));

    onChange(components.map(c => 
      c.id === resizing.id ? { ...c, width: newW, height: newH } : c
    ));
  }, [resizing, components, onChange, snapToGrid]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  return (
    <div
      ref={canvasRef}
      className={`relative overflow-auto bg-slate-950 border border-slate-700 ${className}`}
      style={{
        backgroundImage: showGrid
          ? `linear-gradient(to right, #334155 1px, transparent 1px),
             linear-gradient(to bottom, #334155 1px, transparent 1px)`
          : undefined,
        backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={resizing ? handleResizeMove : handleMouseMove}
      onMouseUp={() => { handleMouseUp(); handleResizeEnd(); }}
      onMouseLeave={() => { handleMouseUp(); handleResizeEnd(); }}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 渲染所有组件 */}
      {components.map(comp => {
        const isSelected = comp.id === selectedId;
        return (
          <div
            key={comp.id}
            onMouseDown={e => handleComponentMouseDown(e, comp)}
            onClick={e => e.stopPropagation()}
            style={{ cursor: draggedId === comp.id ? 'grabbing' : 'grab' }}
          >
            {renderComponent(comp, isSelected)}
            
            {/* 选中时显示操作按钮和调整手柄 */}
            {isSelected && (
              <>
                {/* 删除按钮 */}
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteComponent(comp.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-lg z-10"
                  style={{ left: comp.x + comp.width - 6, top: comp.y - 6, position: 'absolute' }}
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
                
                {/* 调整尺寸手柄 (右下角) */}
                <div
                  onMouseDown={e => handleResizeStart(e, comp)}
                  className="absolute w-3 h-3 bg-amber-500 rounded-sm cursor-se-resize z-10"
                  style={{ left: comp.x + comp.width - 6, top: comp.y + comp.height - 6, position: 'absolute' }}
                />
              </>
            )}
          </div>
        );
      })}

      {/* 空状态提示 */}
      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
          <div className="text-center">
            <div className="text-lg mb-1">点击左侧组件添加</div>
            <div className="text-sm">支持卡牌、棋盘、骰子等多种组件</div>
          </div>
        </div>
      )}
    </div>
  );
}
