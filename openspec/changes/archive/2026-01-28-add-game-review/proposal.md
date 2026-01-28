# Change: 添加游戏评论系统

## Why

当前平台缺乏用户对游戏的反馈机制，新用户无法了解其他玩家对游戏的评价，也无法表达自己的游戏体验。需要构建一套简洁的评论系统，采用好评/差评模式，直观展示游戏口碑，同时为后续扩展多维度评分预留空间。

## What Changes

### 新增能力

- **`review-backend`**: NestJS Review 模块，提供评论 CRUD、好评率统计、基础防护
- **`review-frontend`**: 游戏评论页面组件，包含好评率进度条、评论列表、评论表单

### 现有组件修改

- **`Home.tsx`**: 在房间列表与排行榜之间新增"游戏评价"入口
- **`游戏详情区域`**: 展示好评率与最新评论摘要

## Impact

- **Affected specs**: 无（新建功能）
- **Affected code**:
  - `src/pages/Home.tsx` → 新增评价入口
  - `apps/api/src/modules/` → 新增 review 模块
- **New files**:
  - `apps/api/src/modules/review/` → Review 模块（Schema/Service/Controller）
  - `src/components/review/` → 评论组件目录
  - `src/components/review/GameReviewSection.tsx` → 游戏评价区域
  - `src/components/review/ReviewList.tsx` → 评论列表
  - `src/components/review/ReviewForm.tsx` → 评论表单
  - `src/components/review/ApprovalBar.tsx` → 好评率进度条

## 技术约束

1. **简洁优先**: MVP 采用好评/差评二元评分，不做多维度评分
2. **可扩展性**: 数据模型预留 `rating` 数值字段和 `tags` 数组字段，便于后续扩展
3. **低成本防护**: 登录才能评论 + 每用户每游戏限一条 + 简单关键词过滤
4. **入口位置**: 主页房间列表与排行榜之间
5. **展示形式**: 好评率进度条 + 评论列表（分页）
6. **数据存储**: MongoDB 存储评论，Redis 缓存好评率统计
7. **实时性**: 好评率缓存 5 分钟，评论列表实时查询
