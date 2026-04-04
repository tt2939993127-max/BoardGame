# Smash Up 拜亚基审计 2026-04-04

## 审计范围

- 卡牌：`elder_thing_byakhee`
- 实现入口：`src/games/smashup/abilities/elder_things.ts`
- 回归测试：`src/games/smashup/__tests__/elderThingAbilities.test.ts`
- 文案同步：`public/locales/zh-CN/game-smashup.json`、`public/locales/en/game-smashup.json`

## 权威来源

- Smash Up Fandom: `https://smashup.fandom.com/wiki/Elder_Things`
- 项目内 Smash Up Wiki 爬虫：`node scripts/scrape-wiki-with-descriptions.mjs elder_things cthulhu`

## 审计结论

### elder_thing_byakhee

- 权威描述：`Each other player with a minion on this base draws a Madness card.`
- 修复前实现：只要该基地存在任一对手随从，就让拜亚基的控制者自己抽 1 张疯狂牌。
- 修复后实现：遍历 `turnOrder` 中除施放者外的每位玩家，只要该玩家在拜亚基所在基地有随从，就为该玩家各发 1 个 `MADNESS_DRAWN` 事件。
- 判定：原实现为真实 bug，不是误报。

## 命中审计维度

- D1 语义保真：规则要求“每位其他玩家”抽牌，原实现错成“施放者”抽牌。
- D3 数据流闭环：`drawMadnessCards` 的调用目标玩家传错，导致后续 reducer/UI/日志都围绕错误玩家生效。
- D33 跨实体同类能力实现路径一致性：POD 版 `elder_thing_byakhee_pod` 已正确按“每位其他玩家”实现，原版与 POD 版语义分叉。

## 修复内容

- `src/games/smashup/abilities/elder_things.ts`
  - 将 `elderThingByakhee` 从“单次检测 + 施法者抽牌”改为“逐个其他玩家检测 + 各自抽牌”。
- `src/games/smashup/__tests__/elderThingAbilities.test.ts`
  - 把旧断言从“玩家 0 抽牌”改为“玩家 1 抽牌”。
  - 新增多人回归：多个其他玩家都在该基地有随从时，`1`、`2` 各抽 1 张，拜亚基控制者 `0` 不抽。
- `public/locales/zh-CN/game-smashup.json`
  - 文案改为“每位在这个基地有随从的其他玩家各抽一张疯狂卡。”
- `public/locales/en/game-smashup.json`
  - 文案改为 `Each other player with a minion on this base draws a Madness card.`

## 验证证据

- 运行：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/elderThingAbilities.test.ts --configLoader native --maxWorkers 1`
- 结果：
  - `21 passed`
- 关键验证点：
  - 单对手在该基地有随从时，`MADNESS_DRAWN.payload.playerId === '1'`
  - 多对手在该基地有随从时，事件目标依次为 `['1', '2']`
  - 基地无其他玩家随从或疯狂牌库为空时，不产生错误抽牌事件

## 额外发现 / 未覆盖风险

- 项目内 Wiki 爬虫本轮对 `elder_things` / `cthulhu` 返回 `0` 张卡，说明当前 HTML 解析规则已落后于 Fandom 页面结构；本次卡牌结论已通过手动核对 Fandom 页面补足，但爬虫本身仍需后续修。
- 本轮只修了原版 `elder_thing_byakhee`；POD 版本来就是正确实现，未改逻辑。
