# review-frontend 规格

## 概述

游戏评论前端组件，包含好评率进度条、评论列表、评论表单，集成于主页房间列表与排行榜之间。

## 组件结构

```
src/components/review/
├── GameReviewSection.tsx   # 游戏评价区域主组件
├── ApprovalBar.tsx         # 好评率进度条
├── ReviewForm.tsx          # 评论表单
├── ReviewList.tsx          # 评论列表
├── ReviewItem.tsx          # 单条评论
├── hooks/
│   └── useReviews.ts       # 评论相关 hooks
├── api/
│   └── reviewApi.ts        # API 调用封装
└── index.ts
```

## 组件规格

### GameReviewSection

游戏评价区域主组件，整合所有子组件。

**Props**:
```typescript
interface GameReviewSectionProps {
  className?: string;
}
```

**内部状态**:
- `selectedGameId`: 当前选中的游戏 ID
- 使用 React Query 管理数据

**布局**:
```
┌────────────────────────────────────────────┐
│  游戏评价                                    │
├────────────────────────────────────────────┤
│  [井字棋] [王权骰铸] [...]  ← 游戏 Tab 切换   │
├────────────────────────────────────────────┤
│  ApprovalBar                               │
│  [████████░░] 82% 好评 (128 条评价)         │
├────────────────────────────────────────────┤
│  ReviewForm (已登录时显示)                   │
│  [👍 好评] [👎 差评]                         │
│  [评论内容输入框...]                         │
│  [提交]                                     │
├────────────────────────────────────────────┤
│  ReviewList                                │
│  ├── ReviewItem                            │
│  ├── ReviewItem                            │
│  └── ...                                   │
│  [加载更多]                                 │
└────────────────────────────────────────────┘
```

### ApprovalBar

好评率进度条组件。

**Props**:
```typescript
interface ApprovalBarProps {
  stats: {
    positive: number;
    negative: number;
    total: number;
    rate: number;
  } | null;
  loading?: boolean;
}
```

**显示逻辑**:
- `total < 10`: 显示"评价较少，暂无好评率"
- `total >= 10`: 显示进度条 + "XX% 好评 (N 条评价)"

**样式**:
- 进度条背景：灰色
- 好评部分：绿色渐变
- 差评部分：红色渐变

### ReviewForm

评论表单组件。

**Props**:
```typescript
interface ReviewFormProps {
  gameId: string;
  existingReview?: Review | null;  // 用户已有评论则显示
  onSuccess?: () => void;
}
```

**状态**:
- `isPositive`: boolean | null (未选择时为 null)
- `content`: string
- `isSubmitting`: boolean

**行为**:
- 未登录：显示"登录后可发表评价"
- 已有评论：显示当前评论，可修改/删除
- 无评论：显示空表单

**验证**:
- 必须选择好评或差评
- 评论内容可选，限 500 字
- 提交后刷新统计和列表

### ReviewList

评论列表组件，支持分页。

**Props**:
```typescript
interface ReviewListProps {
  gameId: string;
  className?: string;
}
```

**分页策略**:
- 初始加载 20 条
- "加载更多"按钮加载下一页
- 使用 React Query 的 `useInfiniteQuery`

### ReviewItem

单条评论组件。

**Props**:
```typescript
interface ReviewItemProps {
  review: {
    id: string;
    user: { id: string; username: string; avatar?: string };
    isPositive: boolean;
    content?: string;
    createdAt: string;
  };
  isOwn?: boolean;  // 是否是当前用户的评论
  onDelete?: () => void;
}
```

**布局**:
```
┌──────────────────────────────────────┐
│ [头像] player1  👍  2026-01-25       │
│ 非常好玩的骰子游戏！                   │
│                        [删除] (仅自己) │
└──────────────────────────────────────┘
```

## API 封装

```typescript
// src/components/review/api/reviewApi.ts

export const reviewApi = {
  // 获取评论列表
  getReviews: (gameId: string, page: number, limit: number) =>
    fetch(`/auth/reviews/${gameId}?page=${page}&limit=${limit}`),

  // 获取好评率统计
  getStats: (gameId: string) =>
    fetch(`/auth/reviews/${gameId}/stats`),

  // 获取当前用户的评论
  getMyReview: (gameId: string) =>
    fetch(`/auth/reviews/${gameId}/mine`),

  // 创建/更新评论
  submitReview: (gameId: string, data: { isPositive: boolean; content?: string }) =>
    fetch(`/auth/reviews/${gameId}`, { method: 'POST', body: JSON.stringify(data) }),

  // 删除评论
  deleteReview: (gameId: string) =>
    fetch(`/auth/reviews/${gameId}`, { method: 'DELETE' }),
};
```

## Hooks

```typescript
// src/components/review/hooks/useReviews.ts

export function useReviewStats(gameId: string) {
  return useQuery(['reviewStats', gameId], () => reviewApi.getStats(gameId), {
    staleTime: 5 * 60 * 1000,  // 与后端缓存时间一致
  });
}

export function useReviews(gameId: string) {
  return useInfiniteQuery(
    ['reviews', gameId],
    ({ pageParam = 1 }) => reviewApi.getReviews(gameId, pageParam, 20),
    { getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined }
  );
}

export function useMyReview(gameId: string) {
  const { user } = useAuth();
  return useQuery(['myReview', gameId], () => reviewApi.getMyReview(gameId), {
    enabled: !!user,
  });
}

export function useSubmitReview(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation(
    (data: { isPositive: boolean; content?: string }) => reviewApi.submitReview(gameId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviewStats', gameId]);
        queryClient.invalidateQueries(['reviews', gameId]);
        queryClient.invalidateQueries(['myReview', gameId]);
      },
    }
  );
}
```

## 国际化

新增 key 到 `public/locales/{lang}/common.json`:

```json
{
  "review": {
    "title": "游戏评价",
    "positive": "好评",
    "negative": "差评",
    "submit": "提交评价",
    "delete": "删除",
    "placeholder": "分享你的游戏体验（可选）",
    "loginToReview": "登录后可发表评价",
    "fewReviews": "评价较少，暂无好评率",
    "approvalRate": "{{rate}}% 好评",
    "reviewCount": "({{count}} 条评价)",
    "loadMore": "加载更多",
    "contentTooLong": "评论内容不能超过 500 字",
    "selectRating": "请选择好评或差评",
    "submitSuccess": "评价提交成功",
    "deleteConfirm": "确定删除这条评价吗？",
    "contentViolation": "内容包含违规词汇"
  }
}
```

## 样式指南

- 遵循项目 UI/UX 规范（深度感、动效反馈）
- 好评按钮：绿色系，hover 时加亮
- 差评按钮：红色系，hover 时加亮
- 选中状态：边框高亮 + 背景色变化
- 进度条：使用 `transition` 实现平滑变化
- 卡片：使用项目通用的毛玻璃效果

## 响应式

- PC：完整显示所有元素
- 平板/手机：
  - 游戏 Tab 改为横向滚动
  - 评论列表单列布局
  - 评论内容输入框全宽
