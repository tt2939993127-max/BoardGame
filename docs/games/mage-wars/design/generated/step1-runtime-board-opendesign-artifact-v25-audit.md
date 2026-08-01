# 法师战争 Step 1 PC Open Design v25 图面审计

> 结论：`REVISE / human-review-blocked / implementation-blocked-until-user-approval / mobile-blocked-until-pc-approval`。v25 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v25.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v25.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v25.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v25-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 用户反馈逐项裁定

| 反馈点 | v25 处理 | 裁定 |
| --- | --- | --- |
| 法师角色卡应放昵称上面 | 双方法师牌均置于昵称 / 状态读数上方，玩家身份区形成竖向组 | `PASS` |
| 中间应留给更重要的牌区 | 规则校正为法术书浏览和已计划法术；底部中央继续给己方可支配法术区 | `PASS` |
| 计划牌不要和“手牌”抢位置 | 已计划槽收进书轨右侧来源槽，当前火球术只在已计划区出现；法术书候选不再重复火球术 | `PASS` |
| 牌区不沉浸 | 法术书浏览改成贴桌面的书轨 / 牌托，并增加不切边审计 | `REVISE` |
| UI 突兀没设计感 | 降低按钮和底板对比，对手牌堆移出竞技场主舞台 | `PASS` |

## 几何和规则门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `西锁骑士，当前火球术目标:B2:true`、`烈焰魔物:A2:true`、`火印魔婴:A3:true`、`缠绕藤蔓:B3:true` | `PASS` |
| 骰盘到目标中心距离 | `136.82px` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 底部书轨不切边 | `rail=true, candidates=false, prepared=true` | `REVISE` |
| 对手牌堆不侵入竞技场 | `true` | `PASS` |
| 按钮尺寸 | `全部:48x44`、`攻击:48x44`、`结界:48x44`、`生物:48x44`、`装备:48x44`、`咒语:48x44`、`‹:44x44`、`›:44x44`、`确认:86x44`、`取消:86x44` | `PASS` |
| 图片素材数量 | `40` | `PASS` |

## 硬失败项

- 底部法术书书轨或候选牌被视口切边

## 收口结论

- v25 回应了本轮人工反馈：玩家身份区、已计划来源、法术书浏览和按钮材质都做了结构性调整。
- 术语仍保持规则真实：没有引入手牌概念，当前可支配法术区只写法术书和已计划法术。
- v25 不允许进入人工验收，需继续重构。
