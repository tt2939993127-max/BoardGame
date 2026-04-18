# Summoner Wars Phase B 回归复跑（2026-04-18）

## 本轮目的
- 在继续推进 `refactor-summonerwars-local-ui-interactions` 后，重新跑一轮与本次重构最相关的 Summoner Wars E2E。
- 重点覆盖：
  - 事件卡 presenter 系统态优先是否仍可正常打出
  - `before_attack_*`
  - `on_phase_start_*`
  - `after_move_*`

## 成功用例

### 1. 编织颂歌：召唤阶段可正常打出且不会被交互忙碌提示误拦截
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-barbaric-abilities.e2e.ts "编织颂歌：召唤阶段可正常打出且不会被交互忙碌提示误拦截"`
- 结果：通过
- 关键截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\编织颂歌：召唤阶段可正常打出且不会被交互忙碌提示误拦截\chant-weaving-before-play.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\编织颂歌：召唤阶段可正常打出且不会被交互忙碌提示误拦截\chant-weaving-after-play.png`
- 肉眼观察：
  - `before` 图里手牌中的“编织颂歌”本体可见，当前仍处于可操作的召唤阶段，没有被未知 interactionBusy 门闩挡住。
  - `after` 图里左侧已经出现“编织颂歌 / 持续效果”标记，说明事件卡已成功打出并进入持续效果区。
  - 两张图之间没有出现“交互忙碌”“无法操作”之类的错误覆盖层，符合本轮“系统态优先 presenter 不误拦”验收口径。

### 2. 结构变换：移动后推拉友方建筑（owner 可见 / guest 隐藏）
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-structure-shift.e2e.ts "建筑转移：移动后推拉友方建筑"`
- 结果：通过
- 关键截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-owner-visible.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-guest-hidden.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-after-move.png`
- 肉眼观察：
  - owner 图顶部出现“结构变换：选择3格内友方建筑”及“跳过”按钮，证明交互对 owner 可见。
  - guest 图未出现对应交互按钮，仍为“等待对手行动”，符合 hidden interaction 预期。
  - after 图中友方建筑从 `(6,4)` 变为 `(5,4)`，证明“选建筑 -> 选落点”流程真实完成。

## 失败/未收口用例

### 3. 圣光箭：可以跳过弃牌直接攻击
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-paladin-discard.e2e.ts "圣光箭：可以跳过弃牌直接攻击"`
- 结果：失败（运行时不稳定，出现游戏服务进程 OOM / 连接拒绝）
- 当前观察：
  - 失败不再稳定落在业务断言，最近一轮在 `setupSWOnlineMatch` 期间因隔离 runtime 的 game 进程 OOM 崩溃；
  - 现阶段不能据此判定 `before_attack_holy_arrow` 业务是否回归，需先稳定运行时后再复测链路。

### 4. 鲜血符文：选择自伤获得充能
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts "鲜血符文：选择自伤获得充能"`
- 结果：失败（阶段推进后未出现 blood_rune 选项按钮）
- 当前观察：
  - 先前的“结束阶段按钮被 phase tracker 遮挡”已通过 `click({ force: true })` 绕过；
  - 但从 build 进 attack 后仍未出现“自伤1点 / 花1魔力充能”按钮，说明现在卡在 `on_phase_start_blood_rune` 触发/展示链。

### 5. 冰霜战斧：选择充能自身
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-choice-selection.e2e.ts "冰霜战斧：选择充能自身"`
- 结果：失败（测试前置状态构造失败）
- 当前观察：
  - 用例报错为“未找到寒冰锻造师或无法放置友方士兵”；
  - 这是测试数据准备阶段失败，不足以证明本轮 `after_move_frost_axe` 逻辑正确或错误。

## 当前结论
- 本轮 **已重新证明 2 条真实业务链**：`编织颂歌` 与 `结构变换` 均可完成关键交互，且 `structure_shift` 已拿到 owner/guest 可见性证据。
- 但 `before_attack_*`、`on_phase_start_*` 相关旧 E2E 仍未形成新的稳定通过证据，所以不能据此宣称整个 Phase B 已完全动态收口。
- 下一步应优先：
  1. 定位并修复 `summonerwars-paladin-discard.e2e.ts` 的超时原因；
  2. 稳定 `blood_rune` / `frost_axe` 的测试前置状态或改造为更可靠的状态注入链；
  3. 补 owner/guest 可见性与 cancel/skip 的专属回归证据。
