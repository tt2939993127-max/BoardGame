# Change: 游戏单目录注册与资源自动接入

## Why
当前新增游戏需要在多个位置维护 manifest、缩略图与 i18n 文件，导致新增成本高且容易遗漏。目标是让新增游戏只需新增一个目录即可被系统发现与注册。

## What Changes
- **新增约定式发现**：扫描 `src/games/<gameId>/` 目录自动生成游戏清单与实现映射。
- **i18n 源文件内置**：每个游戏目录可提供 `i18n.json`，构建时生成 `public/locales/<lang>/game-<gameId>.json`。
- **缩略图默认生成**：若无自定义缩略图，使用 `manifest.icon/title` 生成；允许集中覆盖配置。
- **工具类目录统一**：工具类也使用 `src/games/<toolId>/` 目录结构。
- **BREAKING**：移除 per-game `manifest.client.tsx`/`manifest.server.ts` 的人工维护入口，改为脚本生成。

## Impact
- Affected specs: `game-registry`
- Affected code:
  - `scripts/generate_game_manifests.js`
  - `src/games/manifest*.generated.*`
  - `src/games/registry.ts`
  - `src/config/games.config.tsx`
  - `src/lib/i18n/*`（加载逻辑保持不变，仅补充生成输入）
  - 目录结构：`src/games/<gameId>/`

## Non-Goals
- 不改变现有 i18n 运行时加载机制（仍从 `public/locales` 拉取）。
- 不引入新的远程下载或 mod 运行时加载。
