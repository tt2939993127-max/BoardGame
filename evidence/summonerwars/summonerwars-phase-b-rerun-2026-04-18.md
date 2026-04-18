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

## 失败/未收口用例

### 2. 圣光箭：可以跳过弃牌直接攻击
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-paladin-discard.e2e.ts "圣光箭：可以跳过弃牌直接攻击"`
- 结果：失败（120s 超时）
- 当前观察：
  - 失败点停在读取 `sw-player-magic-0` 文本前后，整条旧用例未在时限内完成；
  - 失败截图显示页面仍在对局中，但 host/guest 画面并未收敛到预期步骤，暂时不能拿这条用例为 `before_attack_*` 收口。

### 3. 鲜血符文：选择自伤获得充能
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts "鲜血符文：选择自伤获得充能"`
- 结果：失败（120s 超时）
- 当前观察：
  - 用例在 finally 收尾前已经超时，说明前面某一步未按预期收口；
  - 目前只能判定这条旧 E2E 仍不稳定，不能作为 `on_phase_start_blood_rune` 的收口证据。

### 4. 冰霜战斧：选择充能自身
- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-choice-selection.e2e.ts "冰霜战斧：选择充能自身"`
- 结果：失败（测试前置状态构造失败）
- 当前观察：
  - 用例报错为“未找到寒冰锻造师或无法放置友方士兵”；
  - 这是测试数据准备阶段失败，不足以证明本轮 `after_move_frost_axe` 逻辑正确或错误。

## 当前结论
- 本轮 **至少已重新证明 1 条真实业务链**：`编织颂歌` 仍可正常打出，说明已改造的系统态优先 presenter 没把事件卡主链路打坏。
- 但 `before_attack_*`、`on_phase_start_*`、`after_move_*` 相关旧 E2E 目前**还没形成新的通过证据**，所以不能据此宣称整个 Phase B 已完全动态收口。
- 下一步应优先：
  1. 定位并修复 `summonerwars-paladin-discard.e2e.ts` 的超时原因；
  2. 稳定 `blood_rune` / `frost_axe` 的测试前置状态或改造为更可靠的状态注入链；
  3. 补 owner/guest 可见性与 cancel/skip 的专属回归证据。
