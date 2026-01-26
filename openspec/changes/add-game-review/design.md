# 游戏评论系统设计文档

## Context

当前桌游平台已具备游戏列表、房间系统和社交功能，但缺乏用户对游戏的评价反馈。参考 Steam 的好评/差评模式，设计一套简洁直观的评论系统，让用户快速了解游戏口碑。

### 现有基础设施

- **NestJS API**: 已迁移至 `apps/api`，端口 18001
- **MongoDB**: 用户、好友、消息等数据存储
- **Redis**: 缓存层已接入
- **认证系统**: JWT + Guards 已完备

## Goals / Non-Goals

### Goals

1. 实现好评/差评二元评分系统
2. 展示好评率进度条，直观呈现游戏口碑
3. 支持用户撰写评论内容（可选）
4. 提供基础防护（登录限制、单用户单游戏限一评、关键词过滤）
5. 入口置于主页房间列表与排行榜之间
6. 数据模型预留扩展字段

### Non-Goals

- 多维度评分（MVP 不包含，但预留字段）
- 标签系统（MVP 不包含，但预留字段）
- 评论回复/讨论（MVP 不包含）
- 评论点赞/踩（MVP 不包含）
- 评论举报系统（MVP 不包含）

## 架构决策

### 1. 评分模式

**决策**: 采用好评/差评二元模式

**理由**:
- 用户决策成本最低（点一下即可）
- Steam 已验证该模式的有效性
- 好评率百分比直观易懂
- 避免"中庸评分"导致的区分度低问题

**数据模型预留**:
```typescript
interface IReview {
  // MVP 字段
  user: ObjectId;
  gameId: string;           // 游戏标识（如 'dicethrone'）
  isPositive: boolean;      // true=好评, false=差评
  content?: string;         // 评论内容（可选，限500字）
  createdAt: Date;
  updatedAt: Date;

  // 扩展预留字段
  rating?: number;          // 1-5 或 1-10 评分（未来扩展）
  tags?: string[];          // 特征标签（未来扩展）
  helpfulCount?: number;    // "有帮助"计数（未来扩展）
  playTime?: number;        // 游玩时长（未来扩展）
}
```

### 2. 好评率计算与缓存

**决策**: Redis 缓存好评率统计，5 分钟过期

**缓存结构**:
```
Key: review:stats:{gameId}
Value: { positive: number, negative: number, total: number, rate: number }
TTL: 300 秒
```

**计算逻辑**:
```
好评率 = positive / total * 100%
```

**展示规则**:
- 评价数 < 10：显示"评价较少"
- 评价数 >= 10：显示好评率百分比

### 3. 防护机制

**决策**: 低成本三层防护

| 防护层 | 实现方式 | 说明 |
|--------|----------|------|
| 登录验证 | JWT Guard | 必须登录才能评论 |
| 频率限制 | 每用户每游戏限一条 | 可修改，不可重复创建 |
| 内容过滤 | 简单关键词黑名单 | 屏蔽明显违规词汇 |

**关键词过滤策略**:
- 服务端维护黑名单数组
- 提交时检查 content 是否包含黑名单词汇
- 命中则返回 400 错误，提示"内容包含违规词汇"
- 黑名单可通过环境变量或配置文件维护

### 4. 入口与页面布局

**决策**: 不新增独立页面，在主页嵌入评价区域

**入口位置**:
```
主页布局（从上到下）：
├── 顶部导航栏
├── 游戏列表（游戏卡片）
├── 房间列表
├── 【游戏评价入口】 ← 新增
├── 排行榜
└── 页脚
```

**游戏评价区域布局**:
```
GameReviewSection
├── 标题："游戏评价"
├── 游戏选择器（Tab 或下拉，切换不同游戏）
├── ApprovalBar（好评率进度条）
│   └── [████████░░] 82% 好评 (128 条评价)
├── ReviewForm（评论表单，已登录显示）
│   ├── 好评/差评 按钮组
│   ├── 评论内容输入框（可选）
│   └── 提交按钮
└── ReviewList（评论列表，分页）
    ├── ReviewItem（单条评论）
    │   ├── 用户头像 + 用户名
    │   ├── 好评/差评 图标
    │   ├── 评论内容
    │   └── 发布时间
    └── 分页控件
```

### 5. 数据模型

#### Review Schema

```typescript
@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, index: true })
  gameId: string;

  @Prop({ required: true })
  isPositive: boolean;

  @Prop({ maxlength: 500 })
  content?: string;

  // 扩展预留
  @Prop({ min: 1, max: 10 })
  rating?: number;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ default: 0 })
  helpfulCount?: number;
}
```

**索引**:
- `{ gameId: 1, createdAt: -1 }` 游戏评论列表查询
- `{ user: 1, gameId: 1 }` 唯一复合索引（限制单用户单游戏）
- `{ gameId: 1, isPositive: 1 }` 好评率统计

### 6. API 设计

#### Review API (`/auth/reviews`)

| Method | Path | 说明 |
|--------|------|------|
| GET | `/:gameId` | 获取游戏评论列表（分页） |
| GET | `/:gameId/stats` | 获取游戏好评率统计 |
| GET | `/:gameId/mine` | 获取当前用户对该游戏的评论 |
| POST | `/:gameId` | 创建/更新评论（好评或差评） |
| DELETE | `/:gameId` | 删除自己的评论 |

#### 请求/响应示例

**获取评论列表** `GET /auth/reviews/dicethrone?page=1&limit=20`
```json
{
  "items": [
    {
      "id": "...",
      "user": { "id": "...", "username": "player1", "avatar": null },
      "isPositive": true,
      "content": "非常好玩的骰子游戏！",
      "createdAt": "2026-01-25T10:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 128,
  "hasMore": true
}
```

**获取好评率统计** `GET /auth/reviews/dicethrone/stats`
```json
{
  "gameId": "dicethrone",
  "positive": 105,
  "negative": 23,
  "total": 128,
  "rate": 82
}
```

**创建/更新评论** `POST /auth/reviews/dicethrone`
```json
{
  "isPositive": true,
  "content": "非常好玩的骰子游戏！"
}
```

### 7. 前端组件结构

```
src/components/review/
├── GameReviewSection.tsx   # 游戏评价区域主组件
├── ApprovalBar.tsx         # 好评率进度条
├── ReviewForm.tsx          # 评论表单（好评/差评 + 内容）
├── ReviewList.tsx          # 评论列表
├── ReviewItem.tsx          # 单条评论
└── index.ts                # 导出
```

### 8. 状态管理

评论系统相对独立，不需要全局 Context，使用组件内 state + React Query 即可：

```typescript
// 使用 React Query 管理评论数据
const { data: stats } = useQuery(['reviewStats', gameId], () => fetchReviewStats(gameId));
const { data: reviews } = useQuery(['reviews', gameId, page], () => fetchReviews(gameId, page));
const { data: myReview } = useQuery(['myReview', gameId], () => fetchMyReview(gameId));
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 恶意刷评 | 登录 + 单用户单游戏限制 + 关键词过滤 |
| 好评率被少量差评影响 | 评价数 < 10 时显示"评价较少"而非百分比 |
| 评论内容低质量 | MVP 接受，后续可加"有帮助"投票排序 |
| 缓存与实时性平衡 | 5 分钟缓存，用户提交后主动刷新本地状态 |

## 扩展路线图

### Phase 2（可选）
- 标签系统：用户可选择"规则简单""策略深度"等标签
- "有帮助"投票：评论可被点赞，按有帮助数排序

### Phase 3（可选）
- 多维度评分：游戏性/规则复杂度/重玩价值
- 评论回复：支持讨论

## Open Questions

1. **关键词黑名单维护**: 初期手动维护，后续是否需要社区举报机制？
2. **匿名评论**: 是否允许匿名评论？（当前方案：不允许，必须登录）
3. **编辑历史**: 用户修改评论是否保留历史记录？（当前方案：不保留，直接覆盖）
