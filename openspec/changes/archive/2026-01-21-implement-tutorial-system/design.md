# 教程系统设计

## 架构 (Architecture)

### 1. 数据结构：教程脚本 (The Tutorial Script)
教程被定义为一系列有序的步骤 (`TutorialStep`)。

```typescript
interface TutorialStep {
  id: string;
  content: string;            // 提示文本
  position?: 'top' | 'bottom' | 'left' | 'right'; // Tooltip 位置
  highlight?: string;         // 目标元素的 data-tutorial-id
  
  // 交互控制
  requireAction?: boolean;    // 是否需要玩家操作才能进入下一步（如果是 false，则显示"下一步"按钮）
  allowedMoves?: string[];    // 在此步骤允许执行的 move 名称 (e.g., ['clickCell'])
  
  // 自动化演示（可选）
  autoPlay?: () => void;      // 自动演示的操作
}

interface TutorialManifest {
  gameId: string;
  steps: TutorialStep[];
}
```

### 2. 状态管理：`TutorialContext`
我们使用 React Context 来管理教程的运行时状态。

- `active`: boolean - 教程是否开启
- `currentStepIndex`: number - 当前步骤
- `nextStep()`: function - 进入下一步
- `closeTutorial()`: function - 关闭教程

### 3. 视觉层：`TutorialOverlay`
一个全屏的绝对定位 `div` (`z-index: 50`)。
- **遮罩 (Mask)**: 半透明黑色背景，覆盖整个屏幕。
- **高亮 (Cutout / Highlight)**: 
    - *方案选择*: 提升目标元素 `z-index` 会破坏布局上下文。
    - **建议方案**: 使用一个覆盖层，计算目标元素的 `getBoundingClientRect()`，然后在 Cover 层上绘制一个高亮框（透明背景 + 强边框/发光效果）。

### 4. 集成策略
- 在 `src/App.tsx` 中包裹 `<TutorialProvider>`。
- 在 `src/games/default/Board.tsx` 中，为棋盘格子添加 `data-tutorial-id="cell-${id}"`。
- 在 `TutorialOverlay` 中监听 DOM 变化或 Resize 事件以更新高亮位置。

## 井字棋教程脚本 (草稿)
1. **欢迎**: "欢迎来到井字棋！目标是连成一条线。" (无高亮，点击下一步)
2. **第一步**: "点击中间的格子，占据优势位置。" (高亮 `cell-4`，等待点击)
3. **对手行动**: "轮到对手了..." (自动模拟或等待对手落子)
4. **阻挡/获胜**: "现在，尝试连成一线！"

## 稳定性策略
为了防止 DOM 结构变化导致的高亮失效，我们规定所有交互元素必须拥有 `data-tutorial-id` 属性。

