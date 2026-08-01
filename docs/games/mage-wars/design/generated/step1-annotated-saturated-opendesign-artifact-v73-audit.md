# Mage Wars Open Design v73 AI 图面核验

> 结论：`AI_PASS_REVOKED / superseded-by-v74 / discard-too-small / implementation-blocked / mobile-blocked`。本稿是 Open Design artifact 渲染截图，不是图片模型生图；未调用 `od media generate`。v73 正确回应了用户标注位置，但弃牌堆可见卡背约 `28x40`，只有计划牌高度的约 `18%`，用户指出“小过头”后旧 `AI_PASS` 撤销；当前候选改为 v74。

## 用户原话自审

| 用户原话 / 意图 | v73 自审 |
| --- | --- |
| `弃牌堆放这里就差不多了` | PASS。弃牌堆入口移到右侧空白竖区，位于对手公开状态区下方、己方已计划法术区上方。 |
| `弃牌堆是给人看的吗` | PASS。仍是低权重公开归档入口，只显示卡背堆叠和 `弃牌 3`，不展开正面顶牌或清单。 |
| `骰子、token 都被你省略掉了` | PASS。攻击骰、效果骰、伤害 token、燃烧 token 均保留在当前目标附近。 |
| `手牌改6张，要放大一点` | PASS。按规则术语落为法术书牌列；仍是 6 张，单张 `158x224`。 |
| `计划牌大小和手牌一致` | PASS。两张已计划法术仍为 `158x224`，与法术书卡面同尺寸。 |
| `分页按钮就保持原样啊` | PASS。分页 rail、按钮样式和 `1 / 5` 读数未改。 |
| `地图是最下层，不要被底图支配` | PASS。继续保留开放 overlay：法术书覆盖低权重石砖区，不回到底栏。 |
| `别显示确认了` | PASS。没有常驻确认 / 执行 / 取消控件。 |

## 本轮修正点

| 对象 | v72 | v73 |
| --- | --- | --- |
| 弃牌堆入口 | 右下角，回合结束左侧 | 右侧竖向空位，坐标约 `x=1753,y=572` |
| 法术书当前页 | 6 张，`158x224` | 保持 |
| 已计划法术 | 2 张，`158x224` | 保持 |
| 分页 | 侧边页角式按钮，`1 / 5` | 保持 |
| 骰子 / token | 当前目标附近 | 保持 |

## 验收对象

| 项 | 内容 |
| --- | --- |
| Artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v73.html` |
| Artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v73.html.artifact.json` |
| 原始截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v73.png` |
| 几何证据 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v73-geometry.json` |
| 用户标注图 | `C:/Users/ZHUAGE~1/AppData/Local/Temp/codex-clipboard-e265f623-6068-44a7-bb3d-6fc98d3fa37b.png` |

## 几何证据

| 检查项 | 结果 |
| --- | --- |
| 图片加载 | 成功，`0` 张失败 |
| 可见禁词 | `手牌 / 确认 / 执行 / 取消 / 法术书 30 / 8 / 页 / 10 / 页 / 1 / 3` 均未出现 |
| 法术书当前页卡数 | `6` 张 |
| 已计划法术卡数 | `2` 张 |
| 法术书卡面尺寸 | `158x224` |
| 已计划法术卡面尺寸 | 两张均为 `158x224` |
| 弃牌堆坐标 | `x=1753,y=572,width=79,height=50` |
| 弃牌堆位置 | 右侧标注空位内；对手状态区下方、己方已计划法术区上方 |
| 弃牌堆压叠 | `0`：不压对手状态、计划牌、回合结束、目标卡、骰子、伤害 token、燃烧 token、法术书 |
| 弃牌堆与回合结束 | 不相交，且不再贴右下原位置 |
| 弃牌堆与计划牌 | 不相交 |

## 玩家视角核验

| 维度 | 评分 | 结论 |
| --- | ---: | --- |
| 任务清晰度 | 18 / 20 | 当前目标、骰子 / token、法术书、已计划法术和回合结束仍清楚；弃牌堆作为归档入口可见但不抢主焦点 |
| 视觉层级 | 14 / 15 | 弃牌堆从底部操作区移出后，右下计划 / 回合结束槽位更干净 |
| 对象可识别性 | 15 / 15 | 卡牌、卡背、骰子、token、法师牌和竞技场均使用真实素材 |
| 状态与动作载体 | 14 / 15 | 归档入口只承载数量和卡背堆叠，没有伪装成当前可执行卡 |
| 布局完整性 | 14 / 15 | 主要槽位无压叠；弃牌堆落在用户标注的右侧空位 |
| 素材完整性 | 10 / 10 | 未见破图、空占位、普通蓝圆效果骰或低质 token 替代 |
| 操作人体工学 | 9 / 10 | 法术书、分页、计划牌、弃牌堆和回合结束各自贴近职责区，没有双主焦点 |

总分：`94 / 100`。硬失败项：无。

## 阻塞边界

- v73 只允许进入对话内人工看图验收；用户未明确批准前，不得进入真实 Board/UI 实现。
- 本稿只覆盖 PC 桌面饱和主态；移动端适配必须等 PC 人工批准后再做。
