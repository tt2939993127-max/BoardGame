# Dice Throne 手牌卡图验收证据（旧结论失效）

## 失效说明

- 本文是上一轮排查时留下的历史证据，其中把 `hand-cards-atlas` 当成正式运行时方案的结论已失效。
- 当前正确结论见 `evidence/dicethrone-hand-atlas-regression-e2e-test.md`。
- 保留本文只为了说明当时的截图与排查背景，不再作为“当前已收口方案”的依据。

## 当前有效口径

- `samurai` / `gunslinger` 不应再生成或接入 `hand-cards-atlas.webp`。
- 当前正式运行时规则是：
  - 正常整格牌走原 `ability-cards` atlas
  - atlas 结构表达不了的特殊牌，走已入 manifest 的单卡图
- 如果未来再看到 `hand-cards-atlas` 进入运行时链路，应直接视为回归 bug。
