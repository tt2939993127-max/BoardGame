# 法师战争 Step 1 PC Open Design v37 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / geometry-pass-player-workflow-failed / human-review-blocked / implementation-blocked / mobile-blocked-until-pc-approval`。v37 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。机器几何和字符串门禁通过只能证明“没有手牌词、没有字段复写、没有明显重叠”；AI 原图复核后确认它仍不能证明玩家第一眼能按规则完成“来源对象 -> 目标 -> 同一工作台确认”的任务链。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v37.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v37.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v37.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v37-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## v36 失败点逐项裁定

| 反馈点 | v37 处理 | 机器裁定 |
| --- | --- | --- |
| 卡面字段被 UI 复写 | 火球术大卡保留可读，DOM 文案不出现费用 / 射程 / 结算结果等字段标签 | `PASS` |
| 规则不存在的手牌 / 牌区太小 | 不出现手牌；当前来源卡为 `279x390` 大卡，法术书 / 弃牌堆为入口 | `PASS` |
| 施法 / 攻击链路拆成两个地方 | 来源卡、已选目标摘要、确认施放、取消均在动作工作台内 | `PASS` |
| 确认态和结算态混用 | 确认态无骰子、无伤害 / 燃烧结果；确认后才进入结算层 | `PASS` |
| 右下空白 / 死区 | 右侧下半区用于动作工作台和牌区入口，不再留无职责空白 | `PASS` |

## 几何和语义门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 学徒半场尺寸 | `640x960` | `PASS` |
| 场上卡牌区域归属 | `烈焰狱鬼:a2:true`、`西锁骑士，当前目标:b2:true`、`火烙魔婴:a3:true`、`缠绕藤蔓:b3:true` | `PASS` |
| 当前火球术渲染次数 | `1` | `PASS` |
| 当前来源卡尺寸 | `279x390` | `PASS` |
| 确认 / 取消同组 | `true` | `PASS` |
| 确认态骰子数量 | `0` | `PASS` |
| 禁止词 / 卡面字段复写 | `{"hand":0,"opponentHand":0,"chineseHand":0,"duplicatedCardFields":0,"explanatoryCopy":0}` | `PASS` |

## 硬失败项

- 机器几何无硬失败，但玩家视角硬失败：法术书 / 另一张已计划 / 弃牌堆仍像挂件，阶段容量没有说明计划浏览态和目标确认态如何分开。
- 右侧动作工作台与棋盘目标的视觉关系偏弱，玩家需要先理解右侧大卡、目标摘要、棋盘 B2 标记三者的关系，不能算一眼可执行。
- v37 不能送人工验收；下一版必须把当前来源、目标、确认 / 取消做成更明确的单一动作工作台，并把完整法术书浏览降为计划 / 浏览态。

## 玩家视角待复核

- v38 必须能用玩家语言直接描述：当前来源是已计划火球术，目标是 B2 西锁骑士，确认 / 取消与两者在同一个工作台；法术书和弃牌堆只是入口。
- v38 必须另行在前置包说明计划 / 浏览态如何给法术书足够候选容量，不能用目标确认态小入口冒充完整浏览。
- 用户批准前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
