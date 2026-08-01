# Mage Wars Open Design v59 AI 图面核验

> 结论：`AI_PASS_REVOKED / REVISE / visual-pad-without-semantics / spellbook-card-readability-standard-missing / implementation-blocked / mobile-blocked`。本稿是 Open Design artifact 渲染截图，不是图片模型生图；未调用 `od media generate`。用户复核指出底部阴影无明确语义、法术书候选卡仍偏小且缺少尺寸标准，因此撤销人工验收资格。

## 验收对象

| 项 | 内容 |
| --- | --- |
| Artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v59.html` |
| 原始截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v59.png` |
| 几何证据 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v59-geometry.json` |
| 前置回执 | `docs/games/mage-wars/design/reference/step1-annotated-saturated-v59-background-overlay-preflight.md` |

## 已确认有效点

- 撤销 v58 旧 `AI_PASS`：v58 虽修正容量和选中态，但仍让竞技场底图支配法术书 / 当前可支配牌区布局。
- 法术书从屏幕底边上移到竞技场下沿低权重石砖区，明确允许覆盖背景纹理，不再把地图当作布局排斥体。
- A3 / B3 场上卡上移到格内上半部，法术书不覆盖任何场上实体、B2 目标、骰子、token、已计划区、回合结束或弃牌堆。
- 已计划法术仍贴近右下 `回合结束` 上方；选中 / 来源态仍只用描边、阴影、轻微抬升和短标签，不生成左右特大牌。

## 撤销原因

- `visual-pad-without-semantics`：底部黑色阴影只是为了托住法术书可读性，并不是规则对象、法术书材质、交互热区或状态反馈；这类无语义垫层不得作为设计稿通过证据。
- `spellbook-card-readability-standard-missing`：法术书候选卡从 `92x130` 放到 `104x147` 只是相对放大，未基于 PC 视口、卡牌比例、每页容量和 inspect 策略建立可读标准。
- `candidate-count-over-readability`：v59 为保留 `10 / 页` 继续压缩候选卡；下一稿必须优先满足候选卡可读性，必要时改为 `8 / 页` 与更多分页。

## 几何证据

| 检查项 | 结果 |
| --- | --- |
| 图片加载 | `31 / 31` 成功，`0` 张失败 |
| 法术书当前页卡数 | `10` 张；用户复核后判为容量优先于可读性 |
| 法术书页码 / 容量 | `1 / 3`、`法术书 30`、`10 / 页`；下一稿应按可读标准重排 |
| 法术书卡尺寸 | 全部 `104x147`；缺少可读性标准，撤销通过 |
| 法术书与竞技场 | 有意覆盖低权重纹理区，重叠面积 `162656` |
| 法术书与 B2 目标 / A3 场上卡 / B3 场上卡 | 均不重叠 |
| 法术书与骰盘 / 已计划区 / 回合结束 / 弃牌堆 | 均不重叠 |
| 可见禁词 | `手牌 / 确认 / 执行 / 取消` 均未出现 |

## 玩家视角核验

| 维度 | 评分 | 结论 |
| --- | ---: | --- |
| 任务清晰度 | 18 / 20 | 当前目标、骰子 / token、法术书浏览、已计划来源和回合结束归属清楚 |
| 视觉层级 | 14 / 15 | 地图变为底层承载，法术书作为开放 overlay 进入低权重纹理区 |
| 对象可识别性 | 15 / 15 | 卡牌、卡背、骰子、token、法师牌和竞技场均使用真实素材 |
| 状态与动作载体 | 14 / 15 | 选中 / 来源态不改变布局；完整读卡留给 hover / inspect 临时层 |
| 布局完整性 | 14 / 15 | 关键对象无重叠、无出屏；法术书不再被地图挤到底边 |
| 素材完整性 | 10 / 10 | 未见破图、空占位、普通蓝圆效果骰或低质 token 替代 |
| 操作人体工学 | 9 / 10 | 法术书、分页、已计划区和回合结束形成可读操作带；后续实现仍需补真实 hover / inspect |

旧评分 `94 / 100` 作废。硬失败项：`visual-pad-without-semantics`、`spellbook-card-readability-standard-missing`。

## 阻塞边界

- v59 不再允许进入人工验收；用户未明确批准新稿前，仍禁止 Board/UI 实现、真实运行页 E2E 和移动端适配。
- 本稿只覆盖 PC 桌面饱和主态；hover / focus / inspect 临时读卡层是设计策略，未在本张常驻主态展开。
- 移动端必须等 PC 人工批准后再做，不得用移动端补救 PC 设计问题。
