# Summoner Wars 手牌/阶段区对齐 - E2E 证据

- 用例 1：移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌
- 用例 2：移动横屏：长按放大与阶段说明在手机可达
- 用例 3：在线对局流程：召唤、移动、建造、攻击与弃牌（PC 视口 + 布局断言）
- 最近复跑时间：2026-04-14（移动横屏截图 23:24-00:03；PC 在线对局截图 23:36）

## 执行命令

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机可达"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线对局流程：召唤、移动、建造、攻击与弃牌"
```

结果：三条用例均通过。

其中 **用例 2（移动横屏长按/阶段说明）** 包含几何断言，已确认：

- `handAreaRect.right + 4 <= phaseControlsRect.left`
- `trackerRect.bottom + 4 <= phaseControlsRect.top`

## 关键截图与肉眼结论

### 0）PC 基线主态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\00-pc-reference-board.png`
- 我实际看到：PC 视口下棋盘仍居中，右侧阶段列表和底部手牌沿用桌面基线，没有被本轮移动端 HUD rail 改窄，也没有缩在左上角。
- 判定：达到“PC 不被手机横屏修复牵连”的验收标准。

### 0.1）PC 在线对局 - 起始布局（更贴近用户真实路径）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\50-pc-online-layout-start.png`
- 我实际看到：棋盘主区在画面中心；底部手牌居中且未侵入右侧 controls；右侧阶段条位于 controls 上方，不与“结束阶段/弃牌堆”重叠。
- 判定：PC 在线对局下布局稳定，可作为“PC 也修住了”的证据。

### 1）基础流程起始主态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png`
- 我实际看到：底部手牌已经回到棋盘下沿中央，不再像上一版那样整体偏左；最右侧卡牌停在右侧 HUD rail 左边，没有再压进“结束阶段/弃牌堆”区域；右侧阶段列表与结束阶段按钮分成上下两块，彼此没有重叠；棋盘仍在画面中心，不是缩在左上角。
- 判定：达到本轮“恢复移动端居中基线 + 手牌不再压 controls + 阶段区与按钮分离”的验收标准。

### 2）攻击后主态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-after-attack.png`
- 我实际看到：进入攻击阶段后，底部手牌虽然左移了一些，但右边界仍停在右侧 HUD 左边，没有再盖住结束阶段按钮；阶段列表仍在上方独立显示。
- 判定：交互过程中手牌与右侧 HUD 的间距保持稳定，没有回归到“卡牌顶住按钮/弃牌堆”的旧问题。

### 3）魔力阶段后主态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png`
- 我实际看到：弃牌堆在右下，结束阶段按钮在其上方，底部手牌缩到更短的宽度后仍贴底居中；棋盘与 HUD 仍属于同一套坐标关系，没有明显偏向一侧。
- 判定：基础流程收口阶段仍满足移动横屏布局要求。

### 4）手机横屏主态（长按/阶段说明用例）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\10-phone-landscape-board.png`
- 我实际看到：阶段列表完整落在右上黑边区，结束阶段按钮在其下方；底部手牌重新对齐到整屏中心锚，视觉上与棋盘中线一致，不再像上一版那样往左偏一截，也没有再顶到右侧 controls。
- 判定：主态有效，可作为本轮“移动端中心已拉回”的直接证据。

### 5）长按手牌放大
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\11-phone-hand-magnify-open.png`
- 我实际看到：长按后大卡覆盖棋盘中央，关闭按钮仍在视口内；右侧阶段列表和结束阶段按钮没有被挤出屏幕。
- 判定：移动端长按看大图可正常进入和收口。

### 6）阶段说明面板
- 路径（全图）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\12-phone-phase-detail-open.png`
- 路径（面板特写，确保肉眼可见本体）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\12-phone-phase-detail-open-clip.png`
- 我实际看到：阶段说明面板在右侧 HUD rail 内可见，且没有被“结束阶段/弃牌堆”遮住；特写截图里能清晰看到标题“建造”，但正文仍显示为 `phaseDesc.build.*` key（文案缺失问题，不是布局问题）。
- 判定：本轮“阶段说明可见且不被遮挡”的布局目标达成；文案缺 key 需另行处理。

## 本轮结论

- 已修住的点：
  - 移动端手牌中心已拉回到旧版的整屏中心锚，不再出现“整体往左偏一点”。
  - 手牌右边界不再压进右侧 controls。
  - 阶段列表与结束阶段按钮重新分层，不再彼此打架。
  - 阶段说明面板可见，且位置回到右侧 HUD 内。
  - 攻击后不再触发 `ReferenceError: unitAbilities is not defined`（此前会导致页面渲染失败）。
- 尚未在本轮处理的点：
  - 阶段说明文案缺失，截图里仍出现 `phaseDesc.*` key。
