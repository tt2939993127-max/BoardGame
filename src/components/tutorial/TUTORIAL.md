# 🎓 教程系统开发指南（Tutorial System）

本系统旨在为所有游戏提供统一、现代化且高度灵活的教学引导体验。采用“极简气泡”设计风格，支持动态定位和可选的焦点遮罩。

---

## 🏗️ 核心架构

### 1. 数据结构 (`TutorialStep`)
每个教学步骤由 `TutorialStep` 对象定义：

```typescript
export interface TutorialStep {
    id: string;          // 步骤唯一标识
    content: string;     // 气泡内显示的文本内容
    highlightTarget?: string; // 高亮目标（通过 data-tutorial-id 标识匹配）
    position?: string;   // 建议位置（系统会自动智能计算最佳位置）
    requireAction?: boolean; // 是否需要用户执行特定操作才能继续
    aiMove?: number;     // 智能方自动落子的索引。设置后，该步骤不显示气泡，智能方动作完成后自动进入下一步。
    showMask?: boolean;  // 是否开启暗色焦点遮罩。重要步骤建议开启，默认关闭（极简气泡）。
}
```

### 2. UI 规范（`TutorialOverlay`）
- **风格**：白色圆角卡片（`bg-white rounded-xl`），带有柔和深邃的阴影（`shadow-[0_8px_30px_rgb(0,0,0,0.12)]`）。
- **高亮环**：采用 Apple 风格的蓝色发光光圈，具有脉冲动画效果。
- **气泡箭头**：位于卡片边缘的 45 度旋转方块，与卡片完美融合，指向目标。
- **遮罩层**：SVG 挖孔遮罩，支持点击穿透（用户只能点击“洞”里的元素）。

---

## 💡 开发指南

### 如何为新游戏添加教程？

1. **准备 DOM**：
   在游戏的 `Board.tsx` 中，为需要引导的元素添加 `data-tutorial-id`。
   ```tsx
   <div data-tutorial-id="cell-4" onClick={...}>...</div>
   ```

2. **定义脚本**：
   在游戏目录下创建 `tutorial.ts`，定义 `TutorialManifest`。
   ```typescript
   export const MyGameTutorial: TutorialManifest = {
       id: 'my-game-basic',
       steps: [
           { 
               id: 'step1', 
               content: '欢迎！点击中间开始。', 
               highlightTarget: 'cell-4', 
               requireAction: true,
               showMask: true // 强引导模式
           }
       ]
   };
   ```

3. **注册并启动**：
   在 `Board` 组件中使用 `useTutorial` Hook 启动。
   ```tsx
   const { startTutorial } = useTutorial();
   // 在合适时机触发
   startTutorial(MyGameTutorial);
   ```

---

## ⚠️ 最佳实践与注意事项

1. **智能回合处理**：
   如果一个步骤包含 `aiMove`，`TutorialOverlay` 会**自动隐藏**。不要在智能回合步骤写长篇大论的内容，用户看不到。应该在智能回合之后添加一个新的纯文本步骤来解释刚才发生了什么。

2. **遮罩使用时机**：
   - **开启遮罩**：当界面非常复杂，或者需要用户精准点击某个位置时开启。
   - **关闭遮罩**：一般的规则解释、非交互性的提示建议关闭，保持界面通透。

3. **智能定位逻辑**：
   气泡定位优先级为：**右侧 > 左侧 > 下方 > 上方**。系统会自动检测边缘空间并进行约束（Clamping，防止超出屏幕）。

4. **Hooks 限制**：
   修改 `TutorialOverlay` 时，严格遵守 React Hooks 规则：所有 Hooks 必须在任何 `return null` 之前调用。

---

*最后更新：2026-01-20*
