# Design: 单目录游戏发现与资源自动接入

## 目标
实现“新增游戏只增加一个文件夹”的开发体验，同时保持现有运行时架构不变（i18n 仍从 `public/locales` 加载）。

## 约定
目录结构：
```
src/games/<gameId>/
  manifest.ts
  game.ts            # type=game 必须
  Board.tsx          # type=game 必须
  tutorial.ts        # 可选
  i18n.json          # 可选（多语言）
  thumbnail.tsx      # 可选（覆盖默认缩略图）
```

## 发现与生成流程
1. 脚本扫描 `src/games` 子目录，读取 `manifest.ts` 并解析 `id/type/enabled`。
2. 对 `type=game`：若存在 `game.ts`/`Board.tsx` 则生成客户端/服务端入口。
3. 对 `i18n.json`：生成 `public/locales/<lang>/game-<gameId>.json`，保持运行时加载逻辑不变。
4. 缩略图：若存在 `thumbnail.tsx` 则使用；否则使用默认缩略图组件（基于 `manifest.icon/title`）。

## 缩略图覆盖策略
- 默认：`DefaultGameThumbnail({ title, icon })`。
- 覆盖：可在集中覆盖表中映射 `gameId -> ReactNode`（避免每个游戏新增文件）。

## 风险与缓解
- **缺失文件**：脚本在生成时校验并抛错，阻止启动。
- **i18n 维护**：保持 JSON 格式，便于非开发编辑。
- **工具类**：统一为一级目录，避免多级目录破坏约定。
