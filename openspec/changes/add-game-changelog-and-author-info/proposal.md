# Change: add-game-changelog-and-author-info

## Why
游戏详情弹窗现在只有房间、评论和排行榜，缺少“这个游戏最近改了什么”和“这个电子化版本是谁做的”两类关键信息。后台也只有全站系统通知，没有按游戏维护更新日志的能力；同时现有 `user/admin` 二角色模型过粗，既无法表达“只负责若干游戏更新日志的人”，也无法把后台入口收敛到最小范围。

## What Changes
- 新增按游戏发布的更新日志能力，前台在游戏详情弹窗内展示已发布内容。
- 新增后台“单个游戏更新日志”管理页，支持草稿、发布、撤回发布、删除。
- 将后台角色模型扩展为 `user / developer / admin`：
  - `admin` 拥有完整后台权限，并且可以继续授权其他用户为同级 `admin` 或 `developer`
  - `developer` 只能进入更新日志后台，并且只能管理被分配到的多个游戏
- 在用户管理列表收敛角色设置入口，通过统一弹窗完成角色切换和 `developer` 的游戏分配。
- 在游戏详情弹窗左侧、教程按钮上方新增“电子化作者”入口，默认展示“佚名”，点击 `i` 打开作者详情弹窗。
- 扩展游戏注册/生成脚本，支持从 `src/games/<gameId>/` 下的可选作者内容文件注入作者详情内容。
- 为承载排行榜 + 更新日志双栏内容，放大游戏详情弹窗桌面端宽度，并保证移动端改为纵向堆叠。

## Impact
- Affected specs:
  - 新增 `game-details-content`
  - 新增 `game-changelog-management`
  - 修改 `game-registry`
- Affected code:
  - `src/components/lobby/GameDetailsModal.tsx`
  - `src/components/lobby/LeaderboardTab.tsx` 及新增更新日志面板组件
  - `src/config/games.config.tsx`
  - `src/games/manifest.types.ts`
  - `src/games/manifest.client.types.ts`
  - `scripts/game/generate_game_manifests.js`
  - `src/App.tsx`
  - `src/components/auth/AdminGuard.tsx`
  - `src/pages/admin/components/AdminLayout.tsx`
  - `src/pages/admin/components/UserRoleModal.tsx`
  - `src/pages/admin/Users.tsx`
  - `src/pages/admin/UserDetail.tsx`
  - `src/pages/admin/GameChangelogs.tsx`
  - `apps/api/src/modules/auth/schemas/user-role.ts`
  - `apps/api/src/modules/auth/schemas/user.schema.ts`
  - `apps/api/src/modules/admin/` 现有用户角色、用户详情与导航
  - `apps/api/src/modules/` 下新增/扩展游戏更新日志模块
  - `public/locales/*` 与相关开发文档
