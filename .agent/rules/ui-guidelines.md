# UI 规范

## 动态提示 UI 规范

动态出现的提示 UI（如交互提示、等待提示、状态通知等）必须遵循以下规则：

### 1. 使用绝对定位
- 动态提示 UI **必须使用绝对定位（absolute）或固定定位（fixed）**
- 禁止使用会占用布局空间的定位方式（如 relative、static）
- 定位锚点应选择不会影响其他 UI 元素的位置

### 2. 避免挤压其他 UI
- 动态提示出现时，**不得挤压或移动其他 UI 元素**
- 新增动态 UI 前，必须检查其出现/消失时是否会影响周边布局
- 特别注意：右侧栏、手牌区、技能区等核心功能区不应被挤压

### 3
- 提示 UI 应有合适的 z-index，避免被遮挡或遮挡重要交互元素
- 一般提示：z-[100] ~ z-[150]
- 交互提示：z-[150] ~ z-[200]
- 模态框：z-[200]+

### 4. 常用提示位置
- **画面顶部中央**：交互选择提示（如"选择N颗骰子"）
- **画面正中央**：等待状态提示（如"思考中"）
- **手牌上方**：弃牌阶段提示

### 5. 样式规范
- 等待提示：无背景或半透明背景，使用缓慢闪烁效果（animate-[pulse_2s_ease-in-out_infinite]）
- 交互提示：带轻微背景增强可读性，可使用 animate-pulse
- 所有提示默认 pointer-events-none，除非需要交互

## 动画 / 特效规范

### 1. 自适应尺寸（强制）
- 所有特效组件（Canvas 2D 、WebGL Shader、CSS 动画）**必须自适应父容器尺寸**，禁止硬编码像素值
- Canvas 2D：通过 `container.offsetWidth / offsetHeight` 获取容器尺寸，粒子大小、半径等参数基于容器尺寸计算
- WebGL Shader：使用 `absolute inset-0` 填充容器，shader 内用 UV 坐标 + `uResolution` 处理宽高比
- 若需额外缩放控制，提供 `size` / `scale` prop（默认值不应依赖固定像素）

### 2. DPI 缩放
- Canvas 特效必须处理 `devicePixelRatio`：`canvas.width = cw * dpr`，然后 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`

### 3. 性能
- WebGL Shader 每像素噪声调用控制在 6 次 snoise 以内
- Canvas 2D 粒子数不超过 100，拖拽系数 > 0.9 以减少计算
- 使用 `requestAnimationFrame` 驱动，动画结束后必须 `cancelAnimationFrame` + 清理资源
