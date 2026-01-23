## 1. 约定式扫描与清单生成
- [x] 更新 `scripts/generate_game_manifests.js`：以目录为单位解析 `manifest.ts`/`game.ts`/`Board.tsx`/`tutorial.ts`/`thumbnail`。
- [x] 生成新的 `manifest.generated.ts`、`manifest.client.generated.tsx`、`manifest.server.generated.ts`。

## 2. i18n 内置源文件生成
- [x] 新增脚本逻辑：扫描 `src/games/<gameId>/i18n.json` 并生成 `public/locales/<lang>/game-<gameId>.json`。
- [x] 更新脚本命令：在 `predev`/`prebuild` 中确保 i18n 生成。

## 3. 入口与清理
- [x] 更新 `src/games/manifest*.ts*` 入口仅转发生成文件。
- [x] 清理 per-game `manifest.client.tsx`/`manifest.server.ts` 及旧引用。
- [x] 迁移工具类目录到 `src/games/<toolId>/`。

## 4. 校验与验证
- [x] 确认 `game-registry` 校验逻辑对缺失实现给出清晰错误。
- [x] 验证：`npm run generate:manifests` 后大厅列表与服务端注册正常。
