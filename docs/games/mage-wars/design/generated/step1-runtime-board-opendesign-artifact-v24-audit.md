# 法师战争 Step 1 PC Open Design v24 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / human-review-blocked / implementation-blocked / mobile-blocked-until-pc-approval`。v24 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。机器几何检查曾通过，但 AI 图面复看发现底部法术书书轨被视口切边、已计划槽压到竞技场下沿、对手牌堆侵入主舞台，因此撤销人工验收资格。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v24.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v24.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v24.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v24-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 用户反馈逐项裁定

| 反馈点 | v24 处理 | 裁定 |
| --- | --- | --- |
| 法师角色卡应放昵称上面 | 双方法师牌均置于昵称 / 状态读数上方，玩家身份区形成竖向组 | `PASS` |
| 中间应留给更重要的牌区 | 规则校正为法术书浏览和已计划法术；底部中央继续给己方可支配法术区 | `PASS` |
| 计划牌不要和“手牌”抢位置 | 已计划槽抬升，当前火球术只在已计划区出现；法术书候选不再重复火球术 | `PASS` |
| 牌区不沉浸 | 法术书浏览尝试改成贴桌面的书轨 / 牌托，但实际底部内容过低且被切边 | `REVISE` |
| UI 突兀没设计感 | 降低按钮和底板对比，但对手牌堆和已计划槽仍像独立浮层，且侵入主舞台 | `REVISE` |

## 几何和规则门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `西锁骑士，当前火球术目标:B2:true`、`烈焰魔物:A2:true`、`火印魔婴:A3:true`、`缠绕藤蔓:B3:true` | `PASS` |
| 骰盘到目标中心距离 | `136.82px` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 按钮尺寸 | `全部:48x44`、`攻击:48x44`、`结界:48x44`、`生物:48x44`、`装备:48x44`、`咒语:48x44`、`‹:44x44`、`›:44x44`、`确认:86x44`、`取消:86x44` | `PASS` |
| 图片素材数量 | `40` | `PASS` |

## 硬失败项

- 底部法术书书轨的候选牌和牌堆贴近视口底边，局部切边，不能送人工验收。
- 已计划槽抬升过高，压到竞技场下沿，和主舞台边界抢空间。
- 对手法术堆靠近竞技场右边界，侵入主舞台阅读区。

## 收口结论

- v24 回应了本轮人工反馈中的规则语义方向：玩家身份区、已计划来源、法术书浏览和按钮材质都做了结构性调整。
- 术语仍保持规则真实：没有引入手牌概念，当前可支配法术区只写法术书和已计划法术。
- v24 不可进入人工验收；下一版必须重做底部书轨高度、已计划槽层级和对手牌堆落位。用户明确批准前仍禁止真实 Board/UI 实现、真实页面 E2E 和移动端适配。
