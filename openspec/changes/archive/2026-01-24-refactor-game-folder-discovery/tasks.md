## 1. 约定式扫描与清单生成
- [x] 更新 `scripts/generate_game_manifests.js`：以目录为单位解析 `manifest.ts`/`game.ts`/`Board.tsx`/`tutorial.ts`/`thumbnail`。
- [x] 生成新的 `manifest.generated.ts`、`manifest.client.generated.tsx`、`manifest.server.generated.ts`。

## 2. 入口与清理
- [x] 更新 `src/games/manifest*.ts*` 入口仅转发生成文件。
- [x] 清理 per-game `manifest.client.tsx`/`manifest.server.ts` 及旧引用。
- [x] 迁移工具类目录到 `src/games/<toolId>/`。

## 3. 校验与验证
- [x] 确认 `game-registry` 校验逻辑对缺失实现给出清晰错误。
- [x] 验证：`npm run generate:manifests` 后大厅列表与服务端注册正常。

## Notes
- i18n 翻译文件直接维护在 `public/locales/*/*.json`，不再扫描 `src/games/**/i18n.json` 生成。
