# Proposal: Implement Modal Lobby and Routing

## Goal Description
实现基于 **模态框 (Modal)** 的游戏大厅体验。
用户在首页点击卡片后，直接在当前页弹窗中完成“查看详情”、“浏览房间”、“创建房间”等操作，仅在开始对局时跳转。
增加顶部“分类胶囊”以筛选游戏。

## User Review Required
> [!IMPORTANT]
> 架构变更：大厅不再是独立页面，而是首页的一个弹窗状态。

## Proposed Changes

### Dependencies
- Add `react-router-dom` (用于对局跳转)
- Add `clsx` / `tailwind-merge` (用于样式管理，可选)

### Components

#### [NEW] `src/components/lobby/`
- `CategoryPills.tsx`: 分类筛选器。
- `GameDetailsModal.tsx`: 集成的大厅模态框。
- `RoomList.tsx`: 模态框内的房间列表子组件。

#### [NEW] `src/pages/`
- `Home.tsx`: 包含 `CategoryPills`, `GameGrid`, `GameDetailsModal`。
- `MatchRoom.tsx`: 独立的游戏对局容器。

### Routing
- `/`: 首页 (Home)。
- `/match/:matchID`: 游戏对局。

## Verification Plan
1.  **分类测试**: 点击不同胶囊，控制台打印筛选逻辑（目前仅有一款游戏，效果不明显但需验证状态变化）。
2.  **模态框测试**:
    - 点击卡片 -> 弹窗出现。
    - 点击遮罩/关闭 -> 弹窗消失。
3.  **大厅功能**:
    - 弹窗内点击“创建” -> 模拟创建房间。
    - 弹窗内点击“教程” -> 进入教程（覆盖或跳转）。
