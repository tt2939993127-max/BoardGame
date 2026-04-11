# 召唤师战争移动端适配 E2E 证据

## 本轮范围与结论（2026-04-11）

- 仅验收**手机横屏（13:6）**；平板按 PC 风格处理，本轮不作为验收目标。
- 手机横屏与 PC 主态等比缩放关系达标，关键控件未遮挡或重叠。
- 手机端长按放大与阶段说明面板可达，且不会压住结束阶段按钮/手牌区。

## 一、移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌

### 执行命令

```bash
npm run test:e2e:ci:file -- summonerwars/summonerwars.e2e.ts "移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌"
```

结果：通过。

### 关键截图与观察

#### 1) PC 主态参考图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\00-pc-reference-board.png`

我实际看到：

- 棋盘居中占据主画面，左右留黑边与棋盘边框完整保留。
- 右侧阶段条与“结束阶段”按钮、底部手牌与牌堆位置稳定且无遮挡。
- 玩家/对手魔力条分布在左下、右上，与棋盘保持固定相对关系。

判定：作为本轮移动端对照基线有效。

#### 2) 手机横屏主态（基础流程起始）

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png`

我实际看到：

- 棋盘等比缩放居中，左右留黑边，棋盘边框与 PC 对照一致。
- 右侧阶段条、结束阶段按钮与底部手牌区未相互遮挡。
- 玩家/对手魔力条与牌堆位置相对关系与 PC 保持一致。

判定：手机横屏主态与 PC 等比缩放关系达标。

#### 3) 手机横屏主态（消耗魔力后）

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png`

我实际看到：

- 魔力条数值变化后位置与尺寸未漂移。
- 棋盘、阶段条、结束阶段按钮与手牌区继续保持等比关系，无重叠/遮挡。

判定：交互后布局仍达标。

### 对照结论

- 手机横屏与 PC 主态是同构缩放关系，关键 UI 区域未被挤压或叠在一起。

## 二、移动横屏：长按放大与阶段说明在手机可达

### 执行命令

```bash
npm run test:e2e:ci:file -- summonerwars/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机可达"
```

结果：通过。

### 关键截图与观察

#### 1) PC 主态参考图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\00-pc-reference-board.png`

我实际看到：

- 棋盘主体居中，右侧阶段区与底部手牌区围绕棋盘布局，结构清晰。
- 结束阶段按钮保持在右侧栏下方，不与手牌区重叠。

判定：作为本轮 PC 对照基线有效。

#### 2) 手机横屏主态

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\10-phone-landscape-board.png`

我实际看到：

- 棋盘等比缩放居中，左右留黑边，阶段条与结束阶段按钮仍在右侧。
- 手牌区完整可见，未与右侧控制区重叠。

判定：手机横屏主态与 PC 同构缩放达标。

#### 3) 手机长按手牌放大

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\11-phone-hand-magnify-open.png`

我实际看到：

- 长按后卡牌放大覆盖在棋盘上方，右上角出现“关闭”按钮。
- 放大层未把右侧阶段区完全挤出视口，说明 overlay 可正常关闭/返回。

判定：长按放大入口可达且正常展示。

#### 4) 手机阶段说明面板

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\12-phone-phase-detail-open.png`

我实际看到：

- “建造”阶段说明面板在右侧阶段条左边弹出，不遮挡结束阶段按钮与手牌区。
- 面板文本仍显示为 `phaseDesc.build.*` key（文案问题），但布局可达性达标。

判定：阶段说明面板可达且不遮挡关键控件（文案问题另行跟进）。

#### 5) 手机 action log 面板

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\13-phone-action-log-open.png`

我实际看到：

- action log 面板展开后仍在视口内，未覆盖右侧阶段区或底部手牌区。

判定：面板展开可达且不遮挡主控件。

### 对照结论

- 手机横屏主态保持与 PC 相同的布局关系，未出现遮挡或重叠。
- 长按放大与阶段说明面板在手机端可达，且不会压住关键按钮/手牌区。

## 本轮与移动端适配相关的改动

- `e2e/summonerwars/summonerwars.e2e.ts`
  - 补充 `mapWidthRatio/handHeightRatio/trackerWidthRatio/endPhaseHeightRatio` 计算，保证手机/PC 对照断言稳定。
  - 仅保留 **PC + 手机横屏** 的验收逻辑，平板不作为本轮验收目标。
- `evidence/summonerwars/summonerwars-mobile-adaptation-e2e-test.md`
  - 移除平板相关表述，按“手机横屏对照 PC”标准更新证据说明。
