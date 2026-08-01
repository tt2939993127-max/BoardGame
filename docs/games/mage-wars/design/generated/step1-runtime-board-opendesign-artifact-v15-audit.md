# 法师战争 Step 1 PC Open Design v15 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / visual-overlap-failure / implementation-blocked`。v15 旧审计曾误判为可送人工验收；2026-07-29 用户指出仍有奇怪 UI 重叠后，本轮复看原图确认该 PASS 不成立。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v15.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v15.png` |
| 截图尺寸 | `1920x1080` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 撤销原因

| 问题 | 玩家影响 | 后续处理 |
| --- | --- | --- |
| 底部牌区与当前施法大卡互相挤压 | 玩家第一眼会同时看到“已计划法术槽”和独立火球术大卡，形成重复焦点 | v17 将火球术回收到已计划真实卡槽，不再额外贴底放一张大卡 |
| 左右玩家附件 / 小牌和 HUD 贴得过近 | 公开附件、法师牌、状态条之间缺少明确槽位边界，观感像压叠 | v17 保留附件但不让其压住法师牌或状态读数 |
| 聚魔 token 盖在邪术师法师牌角上 | 动态资源读数不应遮住正式法师牌主体 | v17 移除该盖牌 token，聚魔继续由 HUD 数值承担 |

## 裁定

- v15 不得继续作为人工验收候选。
- v15 不得作为 Board/UI 实现依据。
- 后续候选必须重新导出截图、复跑禁词 / 坏图 / 几何检查，并经肉眼审图后才允许送人工验收。
