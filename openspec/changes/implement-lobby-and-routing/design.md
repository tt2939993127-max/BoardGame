# 设计：大厅与游戏导航

## 用户界面设计 (User Interface Design)

**风格：极简现代 (Modern Minimal)**
**交互模式：单页应用 + 详情弹窗 (SPA + Modal)**

### 1. 平台首页 (Platform Home) - `/`
- **布局**:
    - **顶部**: 胶囊分类选择器 (Categories Pills) - [全部 | 策略 | 休闲 | ...]
    - **主体**: 游戏卡片网格。
- **交互**:
    - 点击游戏卡片（如“井字棋”）：**不跳转页面**，而是打开一个**大型详情弹窗 (Game Details Modal)**。

### 2. 游戏详情弹窗 (Game Details Modal)
- **大尺寸弹窗**: 覆盖屏幕大部分区域 (如 `w-4/5 h-5/6`)，背景模糊遮罩。
- **布局分栏**:
    - **左侧 (25%)**: 
        - 游戏封面/图标。
        - 游戏简介。
        - **“教程模式”** 按钮。
    - **右侧 (75%)**: 
        - **控制区**:
            - **“创建房间”** 按钮 (限制：同时只能创建一个/简化创建流程)。
        - **房间列表区 (Room List)**:
            - 嵌入在弹窗内的滚动列表。
            - 显示房间 ID、人数、加入按钮。

### 3. 游戏对局 (Game Match) - `/match/:matchId`
- **跳转**: 仅在模态框中点击“进入游戏/创建成功”后，才路由跳转至独立的对局页面。
- **内容**: 纯粹的游戏棋盘与控制。

## 路由逻辑 (Revised)
- `/`: 渲染 `PlatformHome`。
    - 模态框通过 URL 查询参数控制 (推荐 `/?game=tictactoe`) 或 内部 State 控制。
    - *建议使用 URL Query 以支持分享。*
- `/match/:matchId`: 渲染 `GameRoom`。

## 组件架构
- `components/layout/CategoryFilter.tsx`: 顶部胶囊组件。
- `components/lobby/GameCard.tsx`: 单个游戏入口。
- `components/lobby/GameDetailsModal.tsx`: **核心组件**，包含大厅逻辑。
- `pages/Home.tsx`: 组合上述组件。
- `pages/MatchRoom.tsx`: 游戏对局页。

## 数据流
- **Home**: 管理分类状态。
- **GameDetailsModal**: 
    - 挂载时请求房间列表。
    - 处理创建房间逻辑。
