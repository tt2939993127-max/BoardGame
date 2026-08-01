# 法师战争 Step 1 PC Open Design v32 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / user-review-failed / player-readability-and-space-budget-failed / implementation-blocked / mobile-blocked-until-pc-approval`。v32 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。用户复核指出底部牌区不可读、右下职责仍不成立、中央仍拥挤后，本文件原 `AI_PASS` 结论撤销；v32 不得继续打开人工验收。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v32.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v32.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v32.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v32-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## v31 用户失败点逐项裁定

| 反馈点 | v32 处理 | 机器裁定 |
| --- | --- | --- |
| 底部卡牌区不可读 | 不再展示不可读小候选墙；当前火球术作为 `172x237` 大卡，右下另有大预览 | `PASS` |
| 右下空间未有效分流 | 右下承载 `220x303` 焦点卡和短状态 | `PASS` |
| 中央 B2 过度拥挤 | 删除路径线和重复标签；骰组不压目标卡；结果 token 贴目标下沿 | `PASS` |
| 规则不存在的手牌概念 | 继续使用法术书、已计划法术、弃牌堆术语 | `PASS` |
| 规则未授权确认 | 无常驻确认 / 取消 / 提交 / 下一步 | `PASS` |

## 空间与可读性门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `烈焰狱鬼:a2:true`、`西锁骑士，当前火球术目标:b2:true`、`火烙魔婴:a3:true`、`缠绕藤蔓:b3:true` | `PASS` |
| 当前已计划火球术尺寸 | `172x237` | `PASS` |
| 右下焦点卡尺寸 | `220x303` | `PASS` |
| 右下空间职责 | `focus-preview` | `PASS` |
| 场上对象被 workbench / focus / dice 遮挡 | `none` | `PASS` |
| 可见结算骰数量 | `4` | `PASS` |
| 骰盘到目标中心距离 | `122.37px` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 确认 / 取消常驻控件 | `{"confirmText":0,"cancelText":0,"textButtons":[]}` | `PASS` |

## 用户复核失败项

- 底部牌区仍不能被玩家当作主要可读操作区；“当前已计划法术 + 法术书入口 + 分类 / 分页 + 弃牌堆”仍被压在底部，玩家第一眼无法稳定区分当前能施放什么、哪些只是浏览入口。
- 右下焦点预览只是重复当前火球术，没有变成真实工作台；它没有减少底部认知负担，也没有承接当前操作路径。
- 中央 B2 仍显得拥挤：目标、骰子、伤害 / 燃烧 token、场上卡和右侧牌区在同一视觉带上抢焦点。几何不相交不能证明玩家视角合格。

## 硬失败项

- `player-readability-failed`：当前可执行对象没有以唯一、稳定、可读的主工作台承接。
- `dead-space-reallocation-failed`：右下大区域没有承担足够高权重的交互职责。
- `center-stage-overcrowded`：主舞台仍把目标、结算和牌区压力堆在同一侧。

## AI 视觉复核

| 图面区域 | 肉眼复核 | 裁定 |
| --- | --- | --- |
| 整屏原图 | 主视线先落到右半场 2x3 竞技场和 B2 目标附近结算；底部不再是多张不可读候选墙 | `PASS` |
| 底部牌区 | 当前已计划火球术成为大卡，法术书仅保留入口 / 分类 / 页码；弃牌堆保持归档入口 | `PASS` |
| 右下焦点 | 火球术大图和费用 / 目标短状态承担读卡职责，确实分流底部可读性压力 | `PASS` |
| 中央结算 | B2 附近删除路径线和候选卡挤压，骰子与结果 token 保持在目标附近但未遮挡目标卡 | `PASS` |

## 玩家视角初判

- 第一眼应先看到右半场 2x3 竞技场和 B2 目标附近结算，而不是一排不可读底部小卡。
- 当前可用对象是已计划火球术：底部有大来源卡，右下有大焦点预览；法术书只是浏览入口和分页，不再抢当前施法位置。
- 弃牌堆继续是归档入口，贴近所属玩家边缘，不进入中央舞台。
- 右下空间承担读卡分流；主结算仍贴 B2 目标，不被挪到右下。

## 收口结论

- v32 已被用户复核否决，当前状态改为失败候选。
- 下一稿必须先消费外部桌游 / 卡牌游戏 UI 范式，把 active half 裁成当前主棋盘，移除底部小牌墙，把当前已计划法术做成右下真实工作台，并重新审计中心拥挤度。
- 用户明确批准下一稿前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
