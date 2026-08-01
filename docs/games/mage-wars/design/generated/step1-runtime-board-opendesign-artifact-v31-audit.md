# 法师战争 Step 1 PC Open Design v31 图面审计

> 结论：`AI_PASS_REVOKED / user-review-failed / bottom-card-zone-unreadable / center-stage-still-overcrowded / implementation-blocked / mobile-blocked-until-pc-approval`。v31 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现；但用户复核后明确指出底部卡牌区不可读、右下职责没有真正缓解拥挤、中央仍挤，因此旧 AI PASS 撤销。

## 用户复核失败点

| 用户反馈 | 失败裁定 |
| --- | --- |
| “手牌这是给人看的吗” | 虽未使用规则错误的“手牌”术语，但底部法术书 / 已计划法术仍呈现为不可读小卡墙，玩家无法把它当当前决策工作台。 |
| “右下角为什么空着” | v31 右下虽然放了焦点卡，但只是补空白，没有真正把底部和中央的信息压力分流。 |
| “中间这么拥挤是看不出来吗” | B2 附近目标、骰子、伤害 / 燃烧、短标签仍形成认知拥挤；几何不重叠不能证明玩家友好。 |
| “要不要搜其他游戏 UI 设计范式” | v31 的外部范式消费不足；后续必须引入可回查外部范式并把玩家任务、当前可读对象、死空间、中心拥挤作为硬门禁。 |

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v31.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v31.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v31.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v31-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## v30 用户失败点逐项裁定

| 反馈点 | v31 处理 | 机器裁定 |
| --- | --- | --- |
| 底部牌区不可读 | 当前火球术放大，法术书候选降到 3 张，右下提供大焦点预览 | `PASS` |
| 右下角空着 | 右下改为当前已计划火球术焦点预览和费用 / 目标状态 | `PASS` |
| 中央过度拥挤 | 隐藏路径线，结算骰从 6 颗降噪为 3 颗代表 + 效果骰，牌区不再压入中央 | `PASS` |
| 规则不存在的手牌概念 | 继续使用法术书、已计划法术、弃牌堆术语 | `PASS` |
| 规则未授权确认 | 无常驻确认 / 取消 / 提交 / 下一步 | `PASS` |

## 空间与可读性门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `西锁骑士，当前火球术目标:B2:true`、`烈焰魔物:A2:true`、`火印魔婴:A3:true`、`缠绕藤蔓:B3:true` | `PASS` |
| 当前已计划火球术尺寸 | `127x172` | `PASS` |
| 右下焦点卡尺寸 | `172x237` | `PASS` |
| 法术书候选数量 | `3` | `PASS` |
| 右下空间职责 | `focus-preview` | `PASS` |
| 中央场上对象被 overlay 遮挡 | `none` | `PASS` |
| 可见结算骰数量 | `4` | `PASS` |
| 骰盘到目标中心距离 | `142.86px` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 确认 / 取消常驻控件 | `{"confirmText":0,"cancelText":0,"textButtons":[]}` | `PASS` |

## AI 视觉复核

| 图面区域 | 肉眼复核 | 裁定 |
| --- | --- | --- |
| 整屏原图 | 主视线先落到右半场 2x3 竞技场、B2 目标和目标旁结算；右下不再空置 | `PASS` |
| 底部牌区局部 | 法术书候选从不可读小牌墙降为 3 张较大候选；已计划火球术作为当前来源明显放大 | `PASS` |
| 中央结算局部 | 路径线删除，骰子数量降噪，伤害 / 燃烧 token 贴目标附近；仍有结算压力，但不再把牌区一起挤入中央 | `PASS` |
| 右下焦点局部 | 火球术大卡、费用、目标和结算状态组成清晰焦点预览，承担原先空白区职责 | `PASS` |

## 硬失败项

- 机器几何曾无硬失败，但用户复核证明该门禁不足。v31 现在以用户视角判定为失败候选，不得继续送人工验收。

## 玩家视角初判

- 第一眼应先看到右半场 2x3 竞技场、B2 目标和目标旁结算骰，而不是底部小牌墙。
- 当前可用对象是已计划火球术：底部有来源卡，右下有可读焦点预览和费用 / 目标短状态。
- 法术书候选只是浏览对象：只显示 3 张和分页，不再和已计划法术、弃牌堆混成同权列表。
- 右下不再空置；它承担当前焦点 / 详情预览，避免把所有卡牌信息塞进底部。

## 收口结论

- v31 旧 AI PASS 已撤销；不得作为当前人工验收候选。
- 后续稿必须先消费外部游戏 UI 范式，并把底部可读性、右下空间职责和中央拥挤度作为用户语言门禁，而不是只看几何数值。
- 用户明确批准前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
