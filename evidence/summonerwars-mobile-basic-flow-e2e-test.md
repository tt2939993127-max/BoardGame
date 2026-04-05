# 召唤师战争移动端基础流程 E2E 证据

## 范围

- 游戏：`summonerwars`
- 场景：`/play/summonerwars?skipInitialization=true&numPlayers=2`
- 目标：验证手机横屏下，基础流程能完成 `召唤 -> 移动 -> 建造 -> 攻击 -> 魔力弃牌`
- 状态来源：`TestHarness`
- 视口：`936x432`（手机横屏）

## 本轮执行

执行命令：

```bash
node scripts/infra/run-e2e-command.mjs dev e2e/summonerwars.e2e.ts --grep "移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌"
```

执行结果：

- 该用例本轮已实际运行并通过。
- 由于隔离 runtime 在当前机器上启动前端时触发 Node 堆 OOM，本轮改用 `dev` 模式复用已存在的 `4173` 前端做 E2E 验证。
- 本轮已实际查看两张关键截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png`

注意：

- 本轮截图里卡牌资源没有稳定渲染出来，肉眼看到的是深色占位块/半透明卡位，而不是完整卡面。
- 按项目规则，这不允许跳过验收；因此下面结论会明确区分：
  - 我实际看到了什么
  - 这是否足以判定达到验收标准

## 关键截图

### 1. 基础流程起始态

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png`

我实际看到：

- 棋盘主体、右侧阶段条、`结束阶段` 按钮都在视口内，没有再出现之前那种“手牌整组从中线往右长出去”的右偏形态。
- 底部能看到一整条居中的手牌带，横向占据屏幕底部中段，而不是只挤在右下角。
- 这张图里手牌资源没有正常出卡面，看到的是 5 个左右的深色/半透明卡位占位块，因此只能确认“手牌带还在、位置已回中、没有整体偏到一侧”，不能确认卡面可读性细节。

是否达到验收标准：

- **针对“手牌偏一边”这个问题：已达到本轮局部验收标准。**
  - 我实际看到手牌带已经回到屏幕底部中间，不再只贴右侧。
- **针对“整张截图可作为最终视觉通过证据”：未达到验收标准。**
  - 原因是卡牌资源未稳定渲染，只剩占位块，无法据此宣称视觉细节完全通过。

### 2. 攻击结算后进入魔力阶段

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png`

我实际看到：

- 右侧阶段条和 `结束阶段` 按钮仍在视口内。
- 底部手牌区这次没有整条消失；屏幕底部仍能看到剩余手牌占位块和半透明卡位区域，说明魔力阶段之后手牌区还存在。
- 这张图同样没有正常卡面，仍以深色占位块为主，因此我能确认的是“手牌区没消失、还留在底部”，不能确认卡面之间的最终视觉密度是否最佳。

是否达到验收标准：

- **针对“魔力阶段直接没有手牌”这个问题：已达到本轮局部验收标准。**
  - 我实际看到底部手牌区仍在，不再是整条 DOM 和视觉一起消失。
- **针对“整张截图可作为最终视觉通过证据”：未达到验收标准。**
  - 原因仍是资源未稳定渲染，无法据此宣布完整视觉验收通过。

## 根因结论

### 1. 之前“手牌偏一边”的真实根因

- 这是实际布局问题，不是单纯截图时机。
- 根因在 [Board.tsx](/D:/gongzuo/webgame/BoardGame/src/games/summonerwars/Board.tsx)：手牌外层原来用 `absolute bottom-0 left-1/2 -translate-x-1/2`，在移动端实际宽度基准下，手牌组会从屏幕中线往右扩。
- 本轮保持了已修复版本：改成 `absolute inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none`，并把 [HandArea.tsx](/D:/gongzuo/webgame/BoardGame/src/games/summonerwars/ui/HandArea.tsx) 本体设为 `pointer-events-auto`。

### 2. 之前“魔力阶段直接没有手牌”的真实根因

- 这次确认不是截图时机问题，也不是新的布局 bug。
- 根因有两层：
  - 测试场景本身原先把起始手牌收敛到 3 张，流程里 `召唤` 用掉 1 张、`建造` 用掉 1 张、到 `魔力` 再弃 1 张，手牌自然归零，`HandArea` 在 `cards.length === 0` 时会直接返回 `null`。
  - 同时本地 `TestHarness` 存在状态注入后立即读取旧快照的时序问题，导致 E2E 有时会在旧手牌状态下开拍，进一步把现象看乱。
- 本轮已修复：
  - [src/engine/transport/react.tsx](/D:/gongzuo/webgame/BoardGame/src/engine/transport/react.tsx)：`TestHarness` 读状态改为读 `stateRef.current`，写状态时先同步 `stateRef.current` 再 `setState(...)`，避免 `state.set()` 后立即读到旧 render 闭包。
  - [e2e/summonerwars.e2e.ts](/D:/gongzuo/webgame/BoardGame/e2e/summonerwars.e2e.ts)：`prepareDeterministicCore` 现在保留额外手牌，且基础流程显式等待目标手牌数量，魔力阶段截图前要求剩余手牌仍存在。

## 本轮结论

- 基础流程逻辑层面：**通过**。
- “手牌偏一边”这个问题：**当前截图已看不到旧的右偏形态，局部达标**。
- “魔力阶段直接没有手牌”这个问题：**当前截图里手牌区仍在，局部达标**。
- 整体视觉验收：**未达到最终收口标准**。
  - 原因不是手牌又没了，而是本轮截图里卡牌资源未稳定渲染，仍有明显占位块，只能证明布局关系，不能证明完整视觉品质。

## 仍需继续的点

- 若要把这条基础流程作为最终视觉通过证据，下一步仍需补一轮资源稳定渲染的截图。
- 本轮 E2E 使用的是开发前端复用路径，不是隔离 runtime；隔离 runtime 当前被机器内存抖动与前端进程 OOM 阻断，不能作为本轮失败归因到功能实现的证据。
