# 教程系统开发任务

- [x] **基础设施 (Infrastructure)**
    - [x] 创建 `src/contexts/TutorialContext.tsx` (教程上下文) <!-- id: 0 -->
    - [x] 定义 `TutorialStep` 和 `TutorialManifest` 类型
    - [x] 在 `App.tsx` 中包裹 `TutorialProvider`

- [x] **UI 组件 (UI Components)**
    - [x] 创建 `src/components/tutorial/TutorialOverlay.tsx` (遮罩与高亮组件) <!-- id: 1 -->
    - [x] 实现基于 `getBoundingClientRect` 的高亮定位逻辑
    - [x] 使用 Tailwind 实现 Tooltip/Dialog UI

- [x] **游戏集成 (井字棋)**
    - [x] 为 `TicTacToeBoard` 格子添加 `data-tutorial-id` 属性 <!-- id: 2 -->
    - [x] 创建 `src/games/default/tutorial.ts` (教程脚本)
    - [x] 在 Lobby/游戏 UI 中添加"开始教程"按钮

- [x] **逻辑与交互 (Logic & Interaction)**
    - [x] 连接游戏动作与教程进度（移动完成后自动进入下一步） <!-- id: 3 -->
    - [x] 为纯文本步骤实现"下一步"按钮

- [x] **验证 (Validation)**
    - [x] 在浏览器中验证教程流程
    - [x] 检查遮罩层在移动端的响应式表现
