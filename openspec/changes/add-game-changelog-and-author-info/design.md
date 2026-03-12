# Design: add-game-changelog-and-author-info

## Context
- `src/components/lobby/GameDetailsModal.tsx` 现在采用“左侧游戏信息 + 右侧 tab”的结构，排行榜与评论已经接入，但没有官方更新日志与作者信息入口。
- 现有后台已经具备 `admin` 角色、用户详情页、系统通知 CRUD，但 `add-admin-dashboard` 设计里明确把“内容管理”排除在外；这次变更应在现有后台骨架上追加“按游戏内容管理”能力，而不是复用全站通知。
- 当前后台只有 `user / admin` 二角色，无法表达“只负责若干游戏更新日志的人”；同时把普通用户提权为后台内容维护者的入口需要同时解决角色切换和可管理游戏分配。
- 游戏发现与客户端注册依赖 `src/games/<gameId>/manifest.ts` 和 `scripts/game/generate_game_manifests.js` 自动生成，这是“从对应游戏文件夹注入内容”的正确扩展点。

## Goals / Non-Goals

### Goals
- 在游戏详情弹窗中展示该游戏的已发布更新日志，并满足“排行榜右边”的布局要求。
- 为每个游戏提供显式的电子化作者入口，缺省显示“佚名”。
- 让后台可按游戏维护更新日志，并把写权限收敛到具体游戏。
- 通过 `user / developer / admin` 角色模型明确区分普通用户、内容开发者和全权限管理员。
- 让 `admin` 可以继续授权其他人为同级 `admin` 或 `developer`，不引入固定单账号超级管理员。
- 让 `developer` 只能进入更新日志后台，且只能管理被分配到的多个游戏。
- 保持扩展点显式，新增游戏时不需要手写集中式 import/switch。

### Non-Goals
- 不做通用 CMS，不承载规则书、攻略、富文本页面搭建等泛内容能力。
- 不做通用权限矩阵（RBAC/permission matrix），也不引入 `super-admin` 之类额外层级。
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

### 5. 角色模型扩展为 `user / developer / admin`
- 在用户模型中显式使用：

```ts
type UserRole = 'user' | 'developer' | 'admin';

type User = {
  role: UserRole;
  developerGameIds: string[];
}
```

- 角色语义：
  - `user`：普通平台用户，无后台入口。
  - `developer`：只能进入 `/admin/changelogs`，并且只能管理 `developerGameIds` 中的游戏更新日志。
  - `admin`：拥有完整后台权限，并且可以继续把其他用户设置为 `admin`、`developer` 或 `user`。
- 数据约束：
  - `role='developer'` 时，`developerGameIds` 至少包含一个游戏。
  - `role!=='developer'` 时，`developerGameIds` 统一清空，避免残留脏数据。
- 后台访问边界：
  - 前端 `/admin` 顶层允许 `admin/developer`。
  - `/admin/changelogs` 允许 `admin/developer`。
  - 其余 `/admin/*` 页面保持 `admin` 独占，`developer` 访问时回退到 `/admin/changelogs`。
- 写接口边界：
  - `PATCH /admin/users/:id/role` 仅 `admin` 可调用。
  - `GET/POST/PUT/DELETE /admin/game-changelogs` 允许 `admin/developer`。
  - `developer` 对不在 `developerGameIds` 内的游戏执行写操作时直接拒绝。
- 配置入口：
  - `src/pages/admin/Users.tsx` 的统一“角色设置”弹窗负责完成角色切换和 `developerGameIds` 多选分配。
  - `src/pages/admin/UserDetail.tsx` 只读展示角色摘要与已分配游戏，不再承载角色编辑。

选择原因：
- 用户的后台能力天然是互斥角色，而不是需要自由组合的权限矩阵；用角色模型更直接，也更符合当前业务规模。
- `developerGameIds` 作为单一约束字段即可表达“可管理多个游戏但不能越权”的核心需求。
- 允许 `admin` 授权同级 `admin`，能满足真实商业后台的协作需要，不必引入固定主账号概念。

备选方案：
- 单独的权限对象模型：在当前只有一类内容职责时属于过度设计。
- 固定单账号超级管理员：与“admin 可以继续授权同级 admin”这一业务裁决冲突。

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
- `D3 数据流闭环`：`manifest.authorName -> registry -> GameDetailsModal`、`author.tsx -> loadAuthorInfo -> 作者弹窗`、`role/developerGameIds -> 后台角色设置 -> 写接口鉴权 -> 公开日志接口 -> 更新日志面板` 必须闭环。
- `D5 交互完整`：作者 `i` 入口、角色设置弹窗、developer 受限导航、空态文案、桌面/移动端双栏行为必须都有明确 UI。
- `D15 UI 状态同步`：更新日志发布状态变化后，后台列表与前台公开列表不能读取不同字段语义。
- `D23 架构假设一致性`：禁止硬编码 `gameId -> 作者内容` 的 switch / 手写注册表，必须由生成脚本接线。
- `D47 测试覆盖`：至少覆盖公开日志过滤、developer 游戏范围限制、角色切换、作者缺省回退、详情弹窗双栏显示。

## Risks / Trade-offs
- `authorName` 与 `author.tsx` 是两个显式来源：
  - 取舍：换来详情卡轻量展示与内容注入解耦。
  - 缓解：文档明确“名字进 manifest，正文进 author.tsx”。
- `developerGameIds` 只约束更新日志，不约束其他未来内容模块：
  - 取舍：保持这次变更最小且与当前需求对齐。
  - 缓解：若未来出现第二类内容权限，再评估是否升级为更通用模型。
- 详情弹窗变宽可能影响小屏：
  - 缓解：仅桌面端增宽，移动端继续纵向排布。

## Migration Plan
1. 扩展 `GameManifestEntry` 与生成脚本，接入 `authorName` + `author.tsx` 可选发现。
2. 扩展用户角色枚举与用户模型，加入 `developer` 和 `developerGameIds`。
3. 新增 `GameChangelog` 后端模块及公开/后台接口。
4. 扩展后台路由、导航、用户列表角色设置弹窗、用户详情只读摘要和更新日志管理页。
5. 扩展 `GameDetailsModal` 布局、作者入口与更新日志面板。
6. 补文档，说明作者内容文件契约和后台发布流程。

## Open Questions
- 当前方案只覆盖“更新日志”这一类内容管理；如果未来还要引入包审核、活动运营等多类内容职责，需要在后续 change 中重新评估是否拆出更多角色。
