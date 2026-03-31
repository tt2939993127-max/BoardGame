# Smash Up Oops 四派系 Gameplay E2E 证据

## 测试目标

验证本轮新增的三类浏览器交互已经真正可操作，而不只是领域状态存在：

- `Ancient Egyptians` 的埋葬条带与翻开交互
- `Cowboys` 的官方决斗链路 UI：`Pinkerton -> 决斗牌 -> Deputy -> 结算`
- `Samurai` 的“消灭己方随从后获得额外出牌额度”交互

## 执行命令

```bash
node scripts/infra/run-e2e-single.mjs ci e2e/smashup-phase-transition-simple.e2e.ts "Oops Ancient Egyptians 埋葬条带与翻开交互应在浏览器中可完成"
node scripts/infra/run-e2e-single.mjs ci e2e/smashup-phase-transition-simple.e2e.ts "Oops Cowboys 决斗交互应按官方链路完成 Pinkerton/决斗牌/Deputy/结算"
node scripts/infra/run-e2e-single.mjs ci e2e/smashup-phase-transition-simple.e2e.ts "Oops Samurai 额外出牌效果应在浏览器中兑现额外随从与行动额度"
```

## 结果

- 状态：通过
- 日期：`2026-03-30`

## 本轮环境修复

- 首次运行时，Vite 页面停在 PostCSS overlay，原因是当前工作区缺少 `@alloc/quick-lru`，导致 `__BG_TEST_HARNESS__` 无法注入。
- 已用最小风险方式恢复当前工作区 E2E 环境：

```bash
npm install @alloc/quick-lru@5.2.0 --no-save
```

- 该步骤未修改业务代码，只恢复了当前 `node_modules` 的缺包状态。

## 证据截图

### 1. Ancient Egyptians：埋葬条带与翻开

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-before-uncover.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-after-uncover.png`

嵌入预览：

![Ancient Egyptians 翻开前](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-before-uncover.png)

![Ancient Egyptians 翻开后](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-after-uncover.png)

观察结论：

- 翻开前，`Pyramids` 基地左侧清楚显示一张埋葬条带，手牌区只有 `Seal the Tomb`，弃牌区为 `0`。
- 翻开后，埋葬条带消失，说明被埋的 `You Can Take It With You` 已经离开基地。
- 翻开后手牌区变成 `4` 张，弃牌区出现 `You Can Take It With You`，符合“翻开结算后进弃牌堆”的链路。

### 2. Cowboys：官方决斗链路

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-pinkerton-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-card-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-card-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-target-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-after-resolve.png`

嵌入预览：

![Cowboys Pinkerton](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-pinkerton-prompt.png)

![Cowboys 决斗牌](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-card-prompt.png)

![Cowboys Deputy 选牌](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-card-prompt.png)

![Cowboys Deputy 选目标](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-target-prompt.png)

![Cowboys 决斗结算后](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-after-resolve.png)

观察结论：

- 决斗横幅全程可见，文案明确写出顺序为 `Pinkerton / 决斗牌 / Deputy / 再结算胜负`。
- `Pinkerton` 阶段屏幕中央确实出现两个按钮，玩家可直接决定是否先放 `+1` 指示物。
- `决斗牌` 阶段显示专用提示和“跳过（不放决斗牌）”按钮，`Deputy` 阶段又切换成弃牌与选目标两步提示。
- 结算后敌方 `robot_microbot_alpha` 已离场，`Deputy` 进入右下弃牌区，场上只剩己方 `Pinkerton + Gunfighter`，说明整条决斗链已经走完。

### 3. Samurai：额外随从/行动额度兑现

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-before-select.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-phase-transition-simple.e2e\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-after-resolve.png`

嵌入预览：

![Samurai 额外出牌前](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-before-select.png)

![Samurai 额外出牌后](../test-results/evidence-screenshots/smashup-phase-transition-simple.e2e/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-after-resolve.png)

观察结论：

- 选择前，页面顶部明确提示 `妖怪来袭：选择你要消灭的一个随从`，场上只有 `Samurai-Chan` 作为可点目标。
- 点击后，这条链会先进入“同时触发排序”，说明当前浏览器真实反映了 `Samurai-Chan` 与 `Yokai Attack!` 的同批触发关系。
- 结算后，场上己方随从已清空，`Yokai Attack!` 和 `Samurai-Chan` 都进入弃牌区。
- 结算后页面顶部同时出现 `获得1次额外行动机会` 和 `获得1次额外随从机会` 两条提示，说明额外额度在浏览器里已经兑现。

## 覆盖口径与限制

- 这三条 E2E 的目标是证明“新增交互类型在浏览器里可走通”，不是声明四派系所有正式出牌链都已用浏览器完整覆盖。
- `Cowboys` 这条是完整浏览器交互：真实打出 `Gunfighter`，并在浏览器里走完 `Pinkerton -> 决斗牌 -> Deputy -> 结算`。
- `Ancient Egyptians` 与 `Samurai` 这两条是“注入当前交互后完成浏览器点击”的证据：
  - `Ancient Egyptians` 直接注入 `ancient_egyptians_seal_the_tomb_uncover`
  - `Samurai` 直接注入 `samurai_yokai_attack`
- 因此这两条证明的是“埋葬翻开 UI / 目标点击 UI / 额度兑现 UI 已可工作”，不是“从手牌正常打出整张牌直到最终结算的 full-chain E2E”。

## 当前残留风险

- `Ancient Egyptians / Samurai` 若要证明完整正式出牌链，后续仍可补 full-chain E2E，而不是只注入当前交互。
- 本轮已经确认新增交互类型在浏览器层可操作，因此这项风险不再阻塞当前四派系审计收口。
