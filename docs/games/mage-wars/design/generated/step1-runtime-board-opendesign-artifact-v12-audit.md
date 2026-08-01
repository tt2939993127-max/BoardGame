# 法师战争 Step 1 PC Open Design v12 图面审计

> 结论：`REVISE / overlap-hard-failure / human-review-blocked`。v12 修复了 v11 的部分压叠，但对手法术书 / 已计划法术仍压在竞技场上沿，属于 `ui-audit-loop` 的重叠硬失败项，不得送人工验收。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v12.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v12.png` |
| 路线 | Open Design artifact；`mediaGenerate=false` |

## 硬失败

| 问题 | 玩家影响 | v13 修法 |
| --- | --- | --- |
| 对手法术书、弃牌堆和已计划法术仍落在竞技场上沿，和棋盘格视觉压叠 | 玩家会把对手牌区误读成棋盘上的对象或上方浮层；竞技场边缘不干净 | 将对手牌区整体移到右侧对手玩家边缘，位于法师附件下方，不再压竞技场 |

## 保留项

- v12 继承的规则权重仍正确：弃牌堆保持低权重归档入口，未进入中央施法链。
- 费用、效果骰、攻击骰素材方向保留。
- v13 只处理重叠与保护槽位，不重开规则布局。
