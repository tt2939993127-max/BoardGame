# review-backend 规格

## 概述

NestJS Review 模块，提供游戏评论的 CRUD 操作、好评率统计和基础内容防护。

## 模块结构

```
apps/api/src/modules/review/
├── review.module.ts
├── review.controller.ts
├── review.service.ts
├── schemas/
│   └── review.schema.ts
├── dto/
│   ├── create-review.dto.ts
│   └── review-response.dto.ts
└── filters/
    └── content-filter.service.ts
```

## 数据模型

### Review Schema

```typescript
@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  isPositive: boolean;

  @Prop({ maxlength: 500 })
  content?: string;

  // 扩展预留字段
  @Prop({ min: 1, max: 10 })
  rating?: number;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ default: 0 })
  helpfulCount?: number;

  @Prop()
  playTime?: number;
}
```

### 索引

```typescript
// 唯一复合索引：限制单用户单游戏
ReviewSchema.index({ user: 1, gameId: 1 }, { unique: true });

// 列表查询索引
ReviewSchema.index({ gameId: 1, createdAt: -1 });

// 统计查询索引
ReviewSchema.index({ gameId: 1, isPositive: 1 });
```

## API 端点

### GET /auth/reviews/:gameId

获取游戏评论列表（分页）

**Query 参数**:
- `page`: number (默认 1)
- `limit`: number (默认 20, 最大 50)

**响应**:
```typescript
{
  items: ReviewResponseDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
```

### GET /auth/reviews/:gameId/stats

获取游戏好评率统计

**响应**:
```typescript
{
  gameId: string;
  positive: number;
  negative: number;
  total: number;
  rate: number;  // 百分比整数，如 82 表示 82%
}
```

**缓存策略**:
- Redis Key: `review:stats:{gameId}`
- TTL: 300 秒

### GET /auth/reviews/:gameId/mine

获取当前用户对该游戏的评论

**需要认证**: 是

**响应**: `ReviewResponseDto | null`

### POST /auth/reviews/:gameId

创建或更新评论

**需要认证**: 是

**请求体**:
```typescript
{
  isPositive: boolean;
  content?: string;  // 可选，限 500 字
}
```

**逻辑**:
- 如果用户已有该游戏评论，则更新
- 如果没有，则创建新评论
- 提交后清除该游戏的统计缓存

**内容过滤**:
- 检查 content 是否包含黑名单关键词
- 命中返回 400: `{ message: '内容包含违规词汇' }`

### DELETE /auth/reviews/:gameId

删除自己的评论

**需要认证**: 是

**逻辑**:
- 只能删除自己的评论
- 删除后清除该游戏的统计缓存

## 内容过滤服务

```typescript
@Injectable()
export class ContentFilterService {
  private readonly blacklist: string[] = [
    // 从环境变量或配置文件加载
  ];

  validate(content: string): boolean {
    if (!content) return true;
    const lower = content.toLowerCase();
    return !this.blacklist.some(word => lower.includes(word));
  }
}
```

## 依赖注入

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    CacheModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService, ContentFilterService],
  exports: [ReviewService],
})
export class ReviewModule {}
```

## 错误码

| 状态码 | 场景 |
|--------|------|
| 400 | 内容包含违规词汇 |
| 400 | 内容超过 500 字 |
| 401 | 未登录 |
| 404 | 评论不存在（删除时） |
