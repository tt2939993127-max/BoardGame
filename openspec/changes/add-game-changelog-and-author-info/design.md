# Design: add-game-changelog-and-author-info

## Context
- `src/components/lobby/GameDetailsModal.tsx` 现在采用“左侧游戏信息 + 右侧 tab”的结构，排行榜与评论已经接入，但没有官方更新日志与作者信息入口。
- 现有后台已经具备 `admin` 角色、用户详情页、系统通知 CRUD，但 `add-admin-dashboard` 设计里明确把“内容管理”排除在外；这次变更应在现有后台骨架上追加“按游戏内容管理”能力，而不是复用全站通知。
- 游戏发现与客户端注册依赖 `src/games/<gameId>/manifest.ts` 和 `scripts/game/generate_game_manifests.js` 自动生成，这是“从对应游戏文件夹注入内容”的正确扩展点。

## Goals / Non-Goals

### Goals
- 在游戏详情弹窗中展示该游戏的已发布更新日志，并满足“排行榜右边”的布局要求。
- 为每个游戏提供显式的电子化作者入口，缺省显示“佚名”。
- 让后台可按游戏维护更新日志，并把写权限收敛到具体游戏。
- 保持扩展点显式，新增游戏时不需要手写集中式 import/switch。

### Non-Goals
- 不做通用 CMS，不承载规则书、攻略、富文本页面搭建等泛内容能力。
- 不新增新的全局角色类型（如 super-admin / editor）。
- 不改动教程系统流程，只在教程按钮附近补充作者入口。
- 不把全站系统通知改造成游戏更新日志。

## Decisions

### 1. 更新日志保留在排行榜 tab 内，桌面端做双栏
- 保留现有 `Lobby / Reviews / Leaderboard` 三个 tab。
- 当用户进入 `Leaderboard` tab 时，桌面端渲染“左排行榜 + 右更新日志”的双栏布局；移动端改为先排行榜、后更新日志的纵向堆叠。
- 游戏详情弹窗桌面端宽度从当前的标准详情尺寸扩大，以避免排行榜、更新日志、关闭按钮和顶部 tab 产生裁切。

选择原因：
- 直接满足“在排行榜右边”的需求，不新增额外导航成本。
- 对现有 `RoomList` 和 `GameReviews` 影响最小。

备选方案：
- 新增“更新日志”独立 tab：被拒绝，因为不符合用户指定的空间关系。

### 2. 作者名称放在 manifest，作者详情内容放在游戏目录的可选模块
- `src/games/<gameId>/manifest.ts` 新增轻量字段 `authorName?: string`，用于详情卡左侧直接显示作者名称。
- `src/games/<gameId>/author.tsx` 作为可选模块，提供作者详情弹窗内容。
- 缺省行为：
  - `manifest.authorName` 缺失时，前台显示“佚名”。
  - `author.tsx` 缺失时，点击 `i` 仍可打开弹窗，但展示通用占位内容（如“暂无作者说明”）。

选择原因：
- 详情卡作者名称必须轻量可得，不能为了展示一个名字就懒加载整个作者内容模块。
- 作者详情内容仍然放在对应游戏目录下，满足“通过游戏文件夹放东西注入”的要求。

备选方案：
- 只用 `author.tsx` 同时承载作者名和内容：会让详情卡作者名依赖额外加载，代价不必要。
- 把作者内容写进中央配置文件：违背显式扩展点和游戏目录自治。

### 3. 生成脚本自动发现 `author.tsx`，前台通过懒加载读取
- `scripts/game/generate_game_manifests.js` 增加对 `src/games/<gameId>/author.tsx` 的可选检测。
- `GameClientManifestEntry` 增加可选 `loadAuthorInfo?: () => Promise<GameAuthorInfoModule>`。
- 不把作者内容塞进 `GameClientRuntimeModule`，避免为了打开详情弹窗去加载 `Board` / `engineConfig`。

建议的类型契约：

```ts
export interface GameAuthorInfoModule {
  title?: string;
  render: React.ComponentType<Record<string, never>>;
}
```

说明：
- `title` 未提供时，前台用 `manifest.authorName ?? '佚名'`。
- `render` 负责详情弹窗正文，可自行使用 i18n、图片或链接。

### 4. 更新日志使用独立模块，不复用系统通知
- 新增独立的 `GameChangelog` 数据模型与模块。
- 数据字段最小集合：

```ts
type GameChangelog = {
  gameId: string;
  title: string;
  versionLabel?: string;
  content: string;
  published: boolean;
  pinned: boolean;
  publishedAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- 提供两个 API 面：
  - 公开读接口：仅返回某个 `gameId` 的已发布日志。
  - 后台写接口：按游戏筛选、创建、编辑、发布、撤回发布、删除。

选择原因：
- 全站通知是全局公告，不带 `gameId`、版本标签和权限收敛语义。
- 更新日志列表量小，不需要先上 Redis；首版用索引排序即可。

建议索引：
- `{ gameId: 1, published: 1, pinned: -1, publishedAt: -1, createdAt: -1 }`

### 5. 权限收敛挂到现有 admin 用户资料上，不新建角色体系
- 继续使用 `user.role === 'admin'` 作为进入后台和调用后台接口的第一层门槛。
- 在用户模型中新增：

```ts
adminPermissions?: {
  gameChangelog?: {
    mode: 'all' | 'selected';
    gameIds: string[];
  };
}
```

- 权限语义：
  - `mode='all'`：该管理员可管理所有游戏更新日志。
  - `mode='selected'`：只能管理 `gameIds` 中的游戏。
- 兼容策略：
  - 老管理员即使还没有这个字段，也按 `mode='all'` 处理，避免升级后突然失权。
- 配置入口：
  - 复用现有 `src/pages/admin/UserDetail.tsx`，增加“更新日志权限”设置区。

选择原因：
- 只有一类新权限，先挂在用户模型上最直接，读取与更新都能复用现有用户详情接口。
- 现有管理员本就能操作后台用户管理，不值得再引入 super-admin 层。

备选方案：
- 单独权限集合：在未来权限类别变多前属于过度设计。

### 6. 前台数据流与失败回退

#### 作者信息
1. `GameDetailsModal` 从 `getGameById(gameId)` 直接拿 `authorName`。
2. 点击 `i` 后通过 `loadAuthorInfo` 懒加载 `author.tsx`。
3. 加载失败或模块缺失时，打开兜底弹窗内容，不让入口失效。

#### 更新日志
1. `Leaderboard` tab 打开时，同时请求排行榜与该游戏的已发布更新日志。
2. 更新日志为空时保留右栏空态，不影响排行榜展示。
3. 管理后台写入后，前台公开接口以 `published` 状态作为唯一可见门槛。

## Audit Focus
- `D3 数据流闭环`：`manifest.authorName -> registry -> GameDetailsModal`、`author.tsx -> loadAuthorInfo -> 作者弹窗`、`adminPermissions -> 写接口鉴权 -> 公开日志接口 -> 更新日志面板` 必须闭环。
- `D5 交互完整`：作者 `i` 入口、空态文案、权限受限态、桌面/移动端双栏行为必须都有明确 UI。
- `D15 UI 状态同步`：更新日志发布状态变化后，后台列表与前台公开列表不能读取不同字段语义。
- `D23 架构假设一致性`：禁止硬编码 `gameId -> 作者内容` 的 switch / 手写注册表，必须由生成脚本接线。
- `D47 测试覆盖`：至少覆盖公开日志过滤、管理员权限限制、作者缺省回退、详情弹窗双栏显示。

## Risks / Trade-offs
- `authorName` 与 `author.tsx` 是两个显式来源：
  - 取舍：换来详情卡轻量展示与内容注入解耦。
  - 缓解：文档明确“名字进 manifest，正文进 author.tsx”。
- 默认给历史管理员 `mode='all'` 不是最小权限：
  - 取舍：避免现网后台升级后被锁死。
  - 缓解：新增权限设置 UI 后可逐步收紧。
- 详情弹窗变宽可能影响小屏：
  - 缓解：仅桌面端增宽，移动端继续纵向排布。

## Migration Plan
1. 扩展 `GameManifestEntry` 与生成脚本，接入 `authorName` + `author.tsx` 可选发现。
2. 扩展用户模型，增加 `adminPermissions.gameChangelog` 并对缺失字段做 `all` 回退。
3. 新增 `GameChangelog` 后端模块及公开/后台接口。
4. 扩展后台导航、用户详情权限设置区和更新日志管理页。
5. 扩展 `GameDetailsModal` 布局、作者入口与更新日志面板。
6. 补文档，说明作者内容文件契约和后台发布流程。

## Open Questions
- 本提案按“权限设置 = 管理员按游戏分配更新日志管理权限”处理；如果你想要的是新的全局角色层级，需要在审批前改这个设计。
