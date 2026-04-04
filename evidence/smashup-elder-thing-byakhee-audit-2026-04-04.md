# Smash Up 拜亚基审计 2026-04-04

## 审计范围

- 卡牌：`elder_thing_byakhee`
- 实现入口：`src/games/smashup/abilities/elder_things.ts`
- 回归测试：`src/games/smashup/__tests__/elderThingAbilities.test.ts`
- 文案同步：`public/locales/zh-CN/game-smashup.json`、`public/locales/en/game-smashup.json`

## 权威来源

- 本地图片：`public/assets/i18n/zh-CN/smashup/cards/compressed/cards2.webp` 中 `CARDS2` 索引 `36`
- 本轮临时裁图：`temp/byakhee-card-crop.png`

## 审计结论

### elder_thing_byakhee

- 卡面文字：`如果其他玩家有随从在这个基地抽一张疯狂卡。`
- 按本轮已更新的“本地图片优先”规范，应以卡面图片作为主真相源。
- 结论：当前实现“有任一其他玩家在该基地有随从时，由拜亚基控制者抽 1 张疯狂卡”与本地图面一致，本轮不再判定为 bug。

## 修订记录

- 失效结论：上一版文档曾按 Wiki 口径认定“原实现为真实 bug”，该结论在“本地图片优先”规则下失效。
- 失效原因：上一版错误地把 Wiki 作为第一真相源，未先看本地卡图。
- 处理：已恢复实现、恢复 locale、恢复测试预期，并保留本次规范修订。

## 当前实现核对

- `src/games/smashup/abilities/elder_things.ts`
  - 当前逻辑：检测该基地是否存在任一其他玩家随从；若存在，则 `ctx.playerId` 抽 1 张疯狂卡。
- `src/games/smashup/__tests__/elderThingAbilities.test.ts`
  - 当前断言：效果触发时 `MADNESS_DRAWN.payload.playerId === '0'`
- `public/locales/zh-CN/game-smashup.json`
  - 已与卡面恢复一致。
- `public/locales/en/game-smashup.json`
  - 已恢复为与当前卡面中文相匹配的旧文案。

## 验证证据

- 运行：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/elderThingAbilities.test.ts --configLoader native --maxWorkers 1`
- 结果：
  - `21 passed`
- 关键验证点：
  - 有对手随从时，`MADNESS_DRAWN.payload.playerId === '0'`
  - 基地无其他玩家随从或疯狂牌库为空时，不产生疯狂抽牌事件

## 额外发现 / 未覆盖风险

- 原版 `elder_thing_byakhee` 与 `elder_thing_byakhee_pod` 当前语义不一致：原版是“自己抽”，POD 版是“每位其他玩家抽”。在未见到 POD 对应本地图前，本轮不继续判 bug。
- 项目内 Wiki 爬虫对 `elder_things` / `cthulhu` 返回 `0` 张卡，说明爬虫已落后；但在“本地图片优先”规则下，这不再影响本次结论。
