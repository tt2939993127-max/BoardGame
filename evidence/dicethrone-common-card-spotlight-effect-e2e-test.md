# DiceThrone 新角色通用卡图 / 效果一致性 E2E 证据

## 范围

- 目标问题：`dicethrone` 新角色 `samurai` / `gunslinger` 的通用卡索引曾串到旧角色顺序，导致卡图与实际效果不一致。
- 本轮只验证真实问题链路，不再停留在单张单测：
  - `samurai` 的 `card-boss-generous`
  - `gunslinger` 的 `card-next-time`
- 验证目标分两层：
  - 打出的卡图要和该卡本身一致。
  - 打出后的实际效果要和这张卡的规则一致。

## 执行命令

```bash
npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "opponent common-card spotlight should match actual effect for samurai and gunslinger"
```

- 结果：通过

## 自动断言结果

### 1. 武士 `card-boss-generous`

- 真实链路：
  - 联机双页场景，`guest` 作为出牌方，`host` 作为观察方。
  - 真实点击手牌中的 `card-boss-generous`。
- 自动断言：
  - `guest` 端事件流出现 `CARD_PLAYED`
  - 手牌不再包含 `card-boss-generous`
  - 弃牌堆包含 `card-boss-generous`
  - `cp` 从 `1` 变为 `3`
  - 护盾总值保持 `0`

### 2. 枪手 `card-next-time`

- 真实链路：
  - 联机双页场景，`guest` 作为出牌方，`host` 作为观察方。
  - 真实点击手牌中的 `card-next-time`。
- 自动断言：
  - `guest` 端事件流出现 `CARD_PLAYED`
  - 手牌不再包含 `card-next-time`
  - 弃牌堆包含 `card-next-time`
  - `cp` 从 `2` 变为 `1`
  - 护盾总值变为 `6`

## 截图证据

### 1. 武士 `Boss Generous` 打出后状态

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\opponent-common-card-spotlight-should-match-actual-effect-for-samurai-and-gunslinger\21-samurai-boss-generous-state.png`
- 肉眼观察：
  - 中央角色已经是武士，不是旧角色或错误派系页面。
  - 左下资源面板里 `CP` 显示为 `3`，和 `Boss Generous` 的“获得 2 CP”一致。
  - 右下弃牌堆顶牌能看到金色手势的 `Boss Generous` 卡图，说明打出的卡图和进入弃牌堆的牌是同一张，不是串成别的通用卡。

![samurai-boss-generous-state](../test-results/evidence-screenshots/dicethrone-watch-out-spotlight.e2e/opponent-common-card-spotlight-should-match-actual-effect-for-samurai-and-gunslinger/21-samurai-boss-generous-state.png)

### 2. 枪手 `Next Time` 打出后状态

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\opponent-common-card-spotlight-should-match-actual-effect-for-samurai-and-gunslinger\31-gunslinger-next-time-state.png`
- 肉眼观察：
  - 中央角色已经是枪手，对应的是新角色通用卡图集，不是旧角色手牌。
  - 左下资源面板里 `CP` 显示为 `1`，同时生命值右侧出现蓝色护盾 `6`，和 `Next Time` 的“花 1 CP，获得 6 护盾”一致。
  - 右上弃牌堆顶牌预览显示的是黄色盾牌图的 `Next Time`，和这次新增回归里验证的效果卡完全对应，不再是别的通用卡图片。

![gunslinger-next-time-state](../test-results/evidence-screenshots/dicethrone-watch-out-spotlight.e2e/opponent-common-card-spotlight-should-match-actual-effect-for-samurai-and-gunslinger/31-gunslinger-next-time-state.png)

## 结论

- 这轮端到端验证已经覆盖了两个新角色、两张不同通用卡、两种不同效果类型：
  - `Boss Generous`：资源增长类效果
  - `Next Time`：护盾类效果
- 从真实点击、事件流、手牌/弃牌变化，到最终 UI 截图中的卡图与资源结果，这两条链路都已经对上。
- 结论：新角色通用卡不再只是“能打出”，而是“打出的卡图”和“实际生效的卡”一致。
