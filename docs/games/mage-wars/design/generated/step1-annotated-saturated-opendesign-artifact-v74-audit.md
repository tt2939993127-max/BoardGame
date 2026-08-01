# Mage Wars Open Design v74 AI 图面核验

> 结论：`AI_PASS / human-review-allowed-in-chat / discard-readable-size / discard-anchor-moved-to-user-marked-right-side / implementation-blocked-until-user-approval / mobile-blocked-until-pc-approval`。本稿是 Open Design artifact 渲染截图，不是图片模型生图；未调用 `od media generate`。v74 专门修正 v73 的弃牌堆过小问题。

## 用户原话自审

| 用户原话 / 意图 | v74 自审 |
| --- | --- |
| `你是不理解现在的弃牌堆是小过头了吗` | PASS。v73 的可见卡背约 `28x40`，只有计划牌高度 `224` 的约 `18%`，已判定过小；v74 改为约 `71x98`，达到计划牌高度的 `43.8%`。 |
| `无法看图理解就把布局转为数据理解` | PASS。本轮新增数据口径：弃牌堆作为公开归档入口，不应小到只像图标；可见卡背高度至少应接近计划牌高度三分之一，v74 超过该线。 |
| `弃牌堆放这里就差不多了` | PASS。位置仍在用户标注的右侧竖向空位，对手状态区下方、己方已计划法术区上方。 |
| `弃牌堆是给人看的吗` | PASS。仍只显示卡背堆叠和 `弃牌 3`，不展开正面顶牌或清单。 |
| `骰子、token 都被你省略掉了` | PASS。攻击骰、效果骰、伤害 token、燃烧 token 均保留在当前目标附近。 |
| `手牌改6张，要放大一点` | PASS。按规则术语落为法术书牌列；仍是 6 张，单张 `158x224`。 |
| `计划牌大小和手牌一致` | PASS。两张已计划法术仍为 `158x224`，与法术书卡面同尺寸。 |
| `分页按钮就保持原样啊` | PASS。分页 rail、按钮样式和 `1 / 5` 读数未改。 |

## 数据裁定

| 对象 | v73 | v74 | 裁定 |
| --- | ---: | ---: | --- |
| 弃牌堆入口整体 | `79x50` | `138x100` | v73 过小；v74 可辨识为牌堆 |
| 可见卡背 | 约 `28x40` | `71x98` | v74 达到归档入口可读下限 |
| 相对计划牌高度 | 约 `18%` | `43.8%` | v74 仍低于计划牌主权重，但不再像微型图标 |
| 位置 | 右侧标注空位 | 右侧标注空位 | 保持用户标注位置 |

## 验收对象

| 项 | 内容 |
| --- | --- |
| Artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v74.html` |
| Artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v74.html.artifact.json` |
| 原始截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v74.png` |
| 几何证据 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v74-geometry.json` |

## 几何证据

| 检查项 | 结果 |
| --- | --- |
| 图片加载 | 成功，`0` 张失败 |
| 可见禁词 | `手牌 / 确认 / 执行 / 取消 / 法术书 30 / 8 / 页 / 10 / 页 / 1 / 3` 均未出现 |
| 法术书当前页卡数 | `6` 张 |
| 已计划法术卡数 | `2` 张 |
| 法术书卡面尺寸 | `158x224` |
| 已计划法术卡面尺寸 | 两张均为 `158x224` |
| 弃牌堆坐标 | `x=1724,y=546,width=138,height=100` |
| 弃牌堆卡背 | `71x98`，相当于计划牌高度 `43.8%` |
| 弃牌堆压叠 | `0`：不压对手状态、计划牌、回合结束、目标卡、骰子、伤害 token、燃烧 token、法术书 |

## 玩家视角核验

| 维度 | 评分 | 结论 |
| --- | ---: | --- |
| 任务清晰度 | 18 / 20 | 弃牌堆已经可辨识为卡背牌堆，同时仍低于计划牌和法术书主权重 |
| 视觉层级 | 14 / 15 | 右侧归档入口从“微型图标”恢复成可读对象，没有抢走计划牌和回合结束 |
| 对象可识别性 | 15 / 15 | 卡牌、卡背、骰子、token、法师牌和竞技场均使用真实素材 |
| 状态与动作载体 | 14 / 15 | 归档入口只承载数量和卡背堆叠，没有伪装成当前可执行卡 |
| 布局完整性 | 14 / 15 | 主要槽位无压叠；弃牌堆仍落在用户标注的右侧空位 |
| 素材完整性 | 10 / 10 | 未见破图、空占位、普通蓝圆效果骰或低质 token 替代 |
| 操作人体工学 | 9 / 10 | 法术书、分页、计划牌、弃牌堆和回合结束各自贴近职责区，没有双主焦点 |

总分：`94 / 100`。硬失败项：无。

## 阻塞边界

- v74 只允许进入对话内人工看图验收；用户未明确批准前，不得进入真实 Board/UI 实现。
- 本稿只覆盖 PC 桌面饱和主态；移动端适配必须等 PC 人工批准后再做。
