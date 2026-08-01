# 法师战争 Step 1 PC Open Design v16 图面审计

> 结论：`REVISE / visual-overlap-risk / implementation-blocked`。v16 消除了 v15 最明显的底部挤压，但仍有贴边、重复焦点和左下槽位不清的问题，不能送人工验收。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v16.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v16.png` |
| 截图尺寸 | `1920x1080` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 失败点

| 问题 | 影响 | v17 修正 |
| --- | --- | --- |
| 火球术独立贴在底边 | 虽未裁切，但底部安全距离不足，像被塞进画面边缘 | 移除独立贴底大卡，火球术回到已计划真实卡槽 |
| 当前施法卡与“已计划 2/2”重复焦点 | 玩家会疑惑当前动作到底看底部槽还是独立大卡 | 保留一个主出处：已计划槽内火球术 + 右侧确认链 |
| 左下法师牌仍擦竞技场边 | 法师牌和棋盘主体边界不够清楚 | 法师牌右移并与 HUD / 竞技场分离 |
| 聚魔 token 在 HUD 上形成压叠感 | 动态读数不应像盖住正式主体或状态条 | 移除盖压 token，HUD 数值承载聚魔 |

## 裁定

- v16 不得打开给用户验收。
- v16 不得作为实现依据。
- v17 需重新导出和复跑完整检查。
