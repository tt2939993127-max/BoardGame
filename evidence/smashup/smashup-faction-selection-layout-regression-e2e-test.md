# SmashUp 派系选择页布局回归 E2E 复核（2026-04-12）

## 范围
- `e2e/smashup/smashup-faction-selection-spacing.e2e.ts`
- `src/games/smashup/ui/FactionSelection.tsx`
- `src/pages/LocalMatchRoom.tsx`
- `src/engine/transport/react.tsx`

## 根因结论
1. **移动端布局偏移**：`FactionSelection.tsx` 已为 `isCompactLandscape` 增加 2 列紧凑布局，避免手机横屏继续套桌面式多列排布。
2. **“等待提示”测试失败不是 SmashUp 业务实现 bug**：
   - 本地路由 `LocalMatchRoom.tsx` 使用 `<LocalGameProvider followCurrentTurnPlayer />`。
   - `LocalGameProvider` 会在 `localBoardPlayerId` 中默认跟随当前回合玩家，因此本地单机页不会稳定停留在“固定 P0 视角”。
   - 旧测试把 `currentPlayerIndex` 当成“只切回合、不切视角”，这个前提与当前本地模式设计不一致，所以会看到“现在轮到你了”而不是“正在等待 Px”。
3. **最小风险修复**：只改 E2E 口径，不改本地视角机制；测试改为验证“顶部回合状态贴纸本身不可点穿到派系详情”。

## 关键证据
- `src/pages/LocalMatchRoom.tsx`：本地页显式传入 `followCurrentTurnPlayer`
- `src/engine/transport/react.tsx`：`localBoardPlayerId` 在 `followCurrentTurnPlayer` 开启时会跟随当前回合玩家
- `src/games/smashup/ui/FactionSelection.tsx`：顶部状态提示由 `isMyTurn = playerID === getCurrentPlayerId(core)` 决定

## E2E 结果
命令：
- `node scripts/infra/run-e2e-command.mjs ci e2e/smashup/smashup-faction-selection-spacing.e2e.ts`

结果：
- 2 passed

## 截图观察

### 1. 手机横屏紧凑布局
截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\mobile-landscape.png`
- 我实际看到：顶部标题与状态贴纸居中，卡牌按 **2 列** 分布，第三张卡已经换到下一行，没有再挤成一排三张。
- 我实际看到：左右两列之间仍保留明显空隙，卡面没有被压到互相遮挡，也没有横向溢出到屏幕外。
- 验收结论：**达到本轮“手机横屏不要继续偏移/过挤”的验收标准。**

### 2. 桌面参考图
截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\desktop-reference.png`
- 我实际看到：桌面宽度下仍保持多列排布，顶部标题、状态贴纸与首行卡牌居中，没有被手机紧凑分支拖歪。
- 我实际看到：首行 4 张卡的左右留白仍然均衡，未出现整组整体右偏。
- 验收结论：**达到“修手机布局时不把桌面布局带偏”的验收标准。**

### 3. 回合状态贴纸不可点穿
截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-waiting\turn-status-badge-click.png`
- 我实际看到：点击顶部“现在轮到你了”贴纸后，页面仍停留在派系选择网格，没有弹出右侧派系详情面板。
- 我实际看到：截图里没有出现错误 toast、未知命令提示或误开的详情抽屉。
- 验收结论：**达到“状态提示只是提示，不应触发派系详情”的验收标准。**

## 备注
- 这轮收口的是：**SmashUp 选择页布局回归 + 旧 E2E 错误前提**。
- 本地单机页“视角跟随当前回合玩家”是当前既有设计，不建议为了这条测试去改共享本地模式逻辑。
