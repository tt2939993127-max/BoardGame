# 法师战争 Step 1 PC Open Design v17 图面审计

> 结论：`AI_PASS_REVOKED / dice-settlement-misplaced / human-review-blocked / implementation-blocked`。v17 曾通过几何重叠检查，但用户复核指出攻击掷骰被放进右侧辅助区；该问题直接破坏当前结算主链，因此旧 `PASS` 作废。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v17.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v17.png` |
| 截图尺寸 | `1920x1080` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 撤销原因

| 问题 | 现实影响 | 裁定 |
| --- | --- | --- |
| 攻击骰与 12 面效果骰放在右侧边栏 / 右下辅助区 | 火球术正在攻击西锁骑士，掷骰是当前结算主体；玩家第一眼却会把骰盘读成旁路仪表盘，而不是目标上层的结算结果 | `hard-failure` |
| 右侧同时承载对手牌区、骰盘、确认区 | 右侧变成杂项工具栏，主舞台只剩目标高亮，缺少“施法 -> 目标 -> 掷骰 -> 结果”的连续关系 | `REVISE` |
| 旧审计只检查重叠，没有检查结算主体层级 | 几何不相交不等于玩家友好；当前结算对象被降权同样不能送人工验收 | `audit-rule-gap` |

## 保留证据

- 图片请求失败 `0`、坏图 `0`，说明资源加载不是本轮失败原因。
- v17 没有调用 `od media generate`，Open Design artifact 路线正确，但路线正确不等于设计通过。
- v17 对底部贴边、重复火球术大卡和若干重叠做过收敛，这些只能作为 v18 输入，不能维持可验收结论。

## 下一版要求

- 攻击骰和效果骰必须回到竞技场主舞台上层，贴近西锁骑士、火球术路径或目标区域。
- 骰盘不得遮挡西锁骑士卡面、伤害 / 守卫 token、场上其它卡牌、确认 / 取消按钮。
- 右侧只能保留确认、费用、所属玩家牌区和结算后摘要；不得把当前掷骰作为右侧主视觉。
- v18 重新截图、重新审计通过前，不得打开人工验收，也不得进入实现。
