# 法师战争 Step 1 PC Open Design v29 图面审计

> 结论：`REVISE / AI_VISUAL_REVIEW_FAILED / prepared-card-too-close-to-field-card / human-review-blocked / implementation-blocked / mobile-blocked-until-pc-approval`。v29 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v29.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v29.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v29.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v29-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 已解决项

| 反馈点 | v29 处理 | 裁定 |
| --- | --- | --- |
| UI 只分布局不分层 | 前置包新增层级表；法术书 / 已计划法术以 overlay 轻压棋盘下沿 | `direction-correct` |
| 为避免底图重叠牺牲主交互 | 法术书候选和已计划法术不再完全避开竞技场 | `direction-correct` |
| 规则没有施法确认 | 删除常驻确认 / 取消按钮，只保留费用与目标状态 | `PASS` |
| 禁止手牌语义 | 未出现规则外手牌词 | `PASS` |

## 失败原因

- AI 细节复看发现：当前火球术卡虽然没有几何遮挡场上卡，但离 B3 的缠绕藤蔓太近，容易被玩家误读成场内对象。
- 透明 rail 的几何交集不能证明可用；必须按真实子卡范围和玩家视觉归属判断。
- v29 只能作为“层级方向正确但边缘来源卡距离不足”的失败输入，不得送人工验收。

## 下一版要求

- 当前火球术必须降到棋盘下沿边缘来源层，只轻压棋盘底边，不贴近 B3 场上卡。
- 仍保留删除常驻确认 / 取消的裁定。
- 几何审计必须按真实候选卡、已计划卡和状态 chip 的子元素范围检查，不得只看透明容器。
