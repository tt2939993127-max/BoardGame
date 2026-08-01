# Mage Wars 行动来源与法术书守恒重构 v45 图面审计

> 结论：`AI_PASS_REVOKED / closed-workbench-and-confirm-control / human-review-blocked / open-design-artifact-only / mediaGenerate=false / implementation-blocked / mobile-blocked`。本图是 Open Design artifact 的历史失败候选，不是图片模型生图，也不是运行时实现。

## 审计对象

| 项 | 内容 |
| --- | --- |
| artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-action-redesign-v45.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-action-redesign-opendesign-artifact-v45.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-action-redesign-opendesign-artifact-v45-geometry.json` |
| 阶段 | 行动目标确认态；结算层未出现 |

## 玩家任务链

| 检查 | 图面证据 | 裁定 |
| --- | --- | --- |
| 当前来源 | 来源卡 238x334 | `PASS` |
| 已计划法术 | 2 张，最小 118x166 | `PASS` |
| 法术书浏览 | 4 张，带分类和分页 | `PASS` |
| 目标与执行 | 执行到目标区距离 29px | `PASS` |
| 区域锚点 | 4 张场上卡，全部声明区域 | `PASS` |
| 阶段边界 | 骰子数量 0 | `PASS` |
| 禁用概念 / 复写 / 说明正文 | `{"defaultHoldingAreaTerm":0,"cardFieldRewrite":0,"instructionCopy":0}` | `PASS` |

## 负向影响清单

| 变动 | 守恒结果 | 裁定 |
| --- | --- | --- |
| v44 小来源缩略删除 | 当前来源改为大卡；已计划法术保持两张可读卡 | `PASS` |
| 法术书单卡背入口删除 | 法术书改为分类 / 分页 / 4 张候选卡浏览器 | `PASS` |
| 工作台压低到贴底 | A3 / B3 场上卡不被遮挡 | `PASS` |
| 不提前显示骰子 | 目标确认态和结算态分离 | `PASS` |

## 硬失败项

- 用户复核指出 v45 仍把底部做成封闭大工作台，并保留规则 / 当前状态未授权的确认式按钮；这违背开放式牌桌主视图和目标本体直选执行口径。机器几何通过只能证明不重叠，不能继续作为人工验收资格。

## AI 原图肉眼复核

| 检查 | 结论 |
| --- | --- |
| 当前可支配对象 | 通过：当前来源大卡、两张已计划法术、法术书浏览器、弃牌堆入口同屏可见；不再像 v44 一样只剩小缩略或单卡背入口。 |
| 玩家第一眼任务链 | 通过：玩家先看底部左侧当前来源，再看棋盘目标高亮，最后在右侧同一工作台执行或取消。 |
| 法术书 / 已计划关系 | 通过：已计划法术和法术书候选分层，法术书有数量、分类、分页和候选卡面，已计划法术不再和当前来源抢同一槽。 |
| 卡面字段 | 通过：费用、目标、骰数和效果仍由卡面承担，UI 未另写字段标签墙。 |
| 阶段边界 | 通过：这是目标确认态，没有提前显示骰子、伤害或燃烧结算层。 |
| 少边框与素材 | 通过：场上对象、当前来源、已计划法术、法术书候选、卡背、token 与竞技场均使用正式素材；底部工作台没有厚描边或多层框。 |

## 阶段边界

- 本稿只证明 PC 设计稿候选的行动来源、目标、已计划法术、法术书和归档入口共存。
- 用户明确批准前，真实 Board/UI、运行页 E2E 和移动端适配仍冻结。
