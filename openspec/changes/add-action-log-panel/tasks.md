# 实现任务清单

## 1. 引擎：ActionLogSystem 与类型
- [ ] 1.1 在 `src/engine/types.ts` 新增 `ActionLogEntry/ActionLogState/ActionLogSegment` 类型
- [ ] 1.2 新增 `src/engine/systems/ActionLogSystem.ts`（allowlist 过滤、默认 maxEntries=50）
- [ ] 1.3 `createDefaultSystems` 注册 ActionLogSystem

## 2. 撤回单步与共享白名单
- [ ] 2.1 `UndoSystem` 默认 `maxSnapshots=1`（保持可配置）
- [ ] 2.2 各游戏定义共享 allowlist 常量，并同时传给 UndoSystem + ActionLogSystem
- [ ] 2.3 确保日志仅记录 allowlist 内命令

## 3. UI：GameHUD 日志面板
- [ ] 3.1 新增 ActionLogContext/Hook（类似 UndoContext）
- [ ] 3.2 GameHUD FabMenu 增加“操作日志”入口
- [ ] 3.3 渲染日志条目（text + card 片段）与 hover 预览
- [ ] 3.4 补充 i18n 文案（HUD 标签）

## 4. 卡牌资源对齐
- [ ] 4.1 补齐参与日志预览的卡牌 `assets.image/atlasIndex`

## 5. 测试与验证
- [ ] 5.1 引擎测试：ActionLogSystem 记录 allowlist 命令并遵守 maxEntries
- [ ] 5.2 引擎测试：UndoSystem 默认单步撤回
- [ ] 5.3 手动验证：日志面板、卡牌 hover 预览、撤回回滚日志
