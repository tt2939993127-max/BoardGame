# 法师战争 Step 1 PC Open Design v30 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / user-review-failed / card-zone-unreadable / center-stage-overcrowded / dead-space-failed / implementation-blocked / mobile-blocked-until-pc-approval`。v30 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现；它已经被用户人工验收否决，不能再作为当前候选或进入实现。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v30.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v30.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v30.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v30-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## v28 / v29 失败点逐项裁定

| 反馈点 | v30 处理 | 裁定 |
| --- | --- | --- |
| UI 只分布局不分层 | 前置包新增层级表；法术书 / 已计划法术以 overlay 轻压棋盘下沿 | `PASS` |
| 为避免底图重叠牺牲主交互 | 法术书候选和当前已计划火球术不再完全避开竞技场；它们压低权重棋盘下沿但不遮挡场上卡 | `PASS` |
| 右下空着没有职责 | 右下不再放确认按钮，改为当前来源 / 费用 / 目标短状态，并和已计划火球术同组 | `PASS` |
| 规则没有施法确认 | 删除常驻确认 / 取消按钮，只保留费用与目标状态 | `PASS` |
| v29 当前火球术过近 B3 场上卡 | 当前火球术下移为边缘来源卡，只轻压棋盘下沿，不贴近缠绕藤蔓 | `PASS` |

## 几何和规则门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `西锁骑士，当前火球术目标:B2:true`、`烈焰魔物:A2:true`、`火印魔婴:A3:true`、`缠绕藤蔓:B3:true` | `PASS` |
| 法术书候选与竞技场重叠 | `14,744px²`，压棋盘下沿 | `PASS` |
| 当前已计划火球术与竞技场重叠 | `1,921px²`，只轻压棋盘下沿 | `PASS` |
| overlay 遮挡场上卡牌 | `none` | `PASS` |
| 骰盘到目标中心距离 | `136.82px` | `PASS` |
| 费用 / 目标状态到已计划火球术距离 | `80.81px` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 确认 / 取消常驻控件 | `{"confirmText":0,"cancelText":0,"textButtons":[]}` | `PASS` |
| 图片素材数量 | `40` | `PASS` |

## AI 视觉复核

| 维度 | 复核结论 |
| --- | --- |
| 层级 / 重叠 | `PASS`：法术书候选和当前来源是边缘 overlay，不再为了避开底图而完全退到空白区 |
| 场上对象保护 | `PASS`：A3 / B3 场上卡和目标卡仍清楚属于各自区域，当前火球术不再像 B3 场上卡 |
| 主动作入口 | `PASS`：当前来源是已计划火球术；费用和目标是短状态，不再伪造确认流程 |
| 规则语义 | `PASS`：没有手牌概念，没有规则未授权的确认 / 取消 |
| 当前结算 | `PASS`：攻击骰、效果骰、伤害和燃烧仍锚在目标附近，不进右侧栏 |

## 收口结论

- v30 的旧机器检查只覆盖了“层级 / 可重叠 / 规则授权控件”，没有覆盖玩家视角的主交互可读性、中央主舞台空间预算和右下空间职责。
- 用户最新指出：“手牌这是给人看的吗”“右下角为什么空着”“中间这么拥挤是看不出来吗”。这三项直接推翻 v30 的人工验收资格。
- v30 现在降级为失败候选；不得打开人工验收，不得作为实现依据。
- 后续必须先补外部游戏 UI 范式、卡牌可读尺寸、焦点预览 / 抽屉策略、主舞台拥挤度和空白职责门禁，再生成 v31。
- 用户明确批准前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
