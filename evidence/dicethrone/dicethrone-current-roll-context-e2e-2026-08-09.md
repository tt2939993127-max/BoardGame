# DiceThrone 当前骰区 E2E 验证

目标状态：historical
当前目标：本轮已完成闪避骰可干预、奖励骰可改与终极技能锁定骰拒绝改骰的 E2E 验证。
非当前历史背景：完整 current roll context 重构的其它清单项仍以 OpenSpec task 1-4 为准，不能因为本文件的三条链路通过而视为全部完成。
禁止自动接管：除非用户重新点名，不得将本文件中的未覆盖骰种当作已验证。
更新时间：2026-08-09

## 验证环境

- 工作目录：`D:\gongzuo\webgame\BoardGame`
- 真实入口：`/play/dicethrone?playerID=1&seat1=human`
- 执行方式：项目 `npm run test:e2e:file` 单文件入口，使用项目 TestHarness 构造游戏内代表态。
- 类型检查：`npm run typecheck` 通过。

## 覆盖结果

| 链路 | 实际玩家结果 | E2E 用例 |
| --- | --- | --- |
| 可改奖励骰 | 主要阶段的待结算奖励骰可从手牌打出“玩得六啊”，选择当前骰子后变为 6。 | `主要阶段待结算奖励骰应允许红牌打出并修改奖励骰` |
| 闪避骰可干预 | 武僧的闪避先掷出 1 并完全免伤；战术家仍可从右侧使用战术优势，直接选择骰子重掷为 6，伤害恢复为 5。 | `闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤` |
| 终极技能锁定骰 | 终极技能的锁定骰拒绝改骰牌，改骰牌仍留在手牌，玩家看到拒绝提示。锁定结果不是可操作当前骰区，因此其展示可正常退场。 | `终极结算骰锁定时改骰牌应保留在手牌并显示拒绝提示` |

## 闪避骰图面审计

截图均来自本次通过的闪避用例：

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-modification.e2e\闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤\闪避骰-成功后可干预.jpg`
   - 可见“闪避投掷：1 - 成功”和“已闪避”。
   - 右侧当前骰子与“重掷”入口保持清晰可见，不再被响应窗的背景模糊遮蔽。
2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-modification.e2e\闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤\闪避骰-战术优势重掷后.jpg`
   - 可见“闪避投掷：6 - 失败”和当前伤害恢复为 5。
   - 骰子、响应窗、手牌、角色面板和右侧行动区同时在屏，没有遮挡或悬浮层漂移。

AI 图面裁决：`PASS`，92/100。

- 任务清晰度：闪避结果与下一步操作均可定位。
- 布局完整性：响应窗保留内容交互，背景仅降亮而不模糊；当前骰子和重掷入口未被遮蔽。
- 没有硬失败项：可干预骰子、资源、手牌、角色面板和阶段栏均可见。

## 本轮 UI 修复

闪避骰仍可干预时，令牌响应窗会允许指针穿透到棋盘与右侧被动能力；模态内容保持可点击。该模式同时移除背景模糊，避免把仍可操作的骰子和战术优势藏在视觉背景中。

## 闪避者骰图归属修复

- 原始问题：闪避骰的规则归属是闪避者，但画面请求了不存在的 `evasion` 骰图，导致右侧骰盘退回占位样式。
- 修复结果：闪避上下文现在携带闪避者的角色骰子定义。本次场景中由僧侣闪避，因此骰盘加载僧侣骰图；不会再新建一套“闪避骰”资源。
- 领域回归：`node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/roll-context.test.ts --configLoader native` 通过，15 条测试全部通过。
- 真实入口回归：`node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-die-modification.e2e.ts "闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤"` 通过。
  - 断言右侧骰子实际加载 `monk/dice`，而非不存在的 `evasion/dice`。
  - 闪避掷出 1 后仍完全免伤；战术优势重掷为 6 后，伤害恢复为 5。

本次新图面审计：`PASS`，94/100。

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-modification.e2e\闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤\闪避骰-成功后可干预.jpg`
   - 右侧骰面可见僧侣的脚印图案，未出现空白或数字占位。
   - 中央响应窗显示“闪避投掷：1 - 成功”和“已闪避”，骰盘与重掷入口仍可见。
2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-modification.e2e\闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤\闪避骰-战术优势重掷后.jpg`
   - 重掷后的僧侣骰面仍正常渲染，中央响应窗显示“闪避投掷：6 - 失败”，伤害为 5。
   - 未见破图、占位骰、遮挡或悬浮层漂移。
