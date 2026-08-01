# Mage Wars Open Design v58 AI 图面核验

> 结论：`AI_PASS_REVOKED / REVISE / human-review-blocked / implementation-blocked / mobile-blocked`。本稿是 Open Design artifact 渲染截图，不是图片模型生图；未调用 `od media generate`。v58 针对用户指出的法术书容量、已计划牌落位、左右特大牌与选中态布局稳定性问题重构；用户复核后确认竞技场底图仍支配底部法术书 / 当前可支配牌区布局，旧通过结论撤销。

## 验收对象

| 项 | 内容 |
| --- | --- |
| Artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v58.html` |
| 原始截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v58.png` |
| 几何证据 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v58-geometry.json` |
| 前置回执 | `docs/games/mage-wars/design/reference/step1-annotated-saturated-v58-page-density-preflight.md` |

## 本轮修正点

- 撤销 v57 旧 `AI_PASS`：法术书一页 4 张与 30/33 张真实容量不匹配，已计划牌远离回合结束，选中态通过左右特大牌改变常驻布局。
- 法术书浏览改为一页 10 张，页码 `1 / 3`，并显示 `法术书 30 / 10 / 页`；不再按 4 张候选卡思维设计。
- 已计划法术移动到 `回合结束` 按钮上方，形成当前行动 / 结束回合操作带；两张已计划牌同尺寸，来源态只用描边和短标签。
- 法术书焦点卡保持与其它候选同尺寸；选中只通过描边、阴影和轻微抬升表达，不再生成左右特大牌或第二主舞台。
- 侧边法师牌降为身份锚点尺寸，保留角色卡在昵称上方，但不再像主卡一样抢法术书与棋盘焦点。
- 保留骰子、效果骰、伤害 token、燃烧 token、守卫 token、行动 / 快速施法 token、对手已计划卡背、法术书、已计划法术和弃牌堆。

## 几何证据

| 检查项 | 结果 |
| --- | --- |
| 图片加载 | `31 / 31` 成功，`0` 张失败 |
| 法术书当前页卡数 | `10` 张 |
| 法术书页码 / 容量 | `1 / 3`、`法术书 30`、`10 / 页` |
| 法术书卡尺寸 | 全部 `92x133`，选中不改变常驻占位 |
| 已计划牌尺寸 | 两张均为 `78x113`，来源态不放大 |
| 法师身份牌尺寸 | 两侧均为 `110x155` |
| 已计划区与回合结束 | 已计划区在回合结束上方，且不重叠 |
| 法术书与已计划区 / 回合结束 / B2 目标 | 均不重叠 |
| 骰盘与法术书 | 不重叠，仍锚在 B2 目标附近 |
| 可见禁词 | `手牌 / 确认 / 执行 / 取消` 均未出现 |

## 玩家视角核验

| 维度 | 评分 | 结论 |
| --- | ---: | --- |
| 任务清晰度 | 18 / 20 | 当前目标、骰子 / token、法术书浏览和已计划来源各自归属清楚 |
| 视觉层级 | 14 / 15 | 棋盘仍为第一视觉；法术书是底部开放浏览层；已计划牌归到右下操作带 |
| 对象可识别性 | 15 / 15 | 卡牌、卡背、骰子、token、法师牌和竞技场均使用真实素材 |
| 状态与动作载体 | 14 / 15 | 选中 / 来源态不再改变布局；完整读卡由后续 hover / inspect 临时层承担 |
| 布局完整性 | 14 / 15 | 关键对象无重叠、无出屏；弃牌堆和分页未抢主舞台 |
| 素材完整性 | 10 / 10 | 未见破图、空占位、普通蓝圆效果骰或低质 token 替代 |
| 操作人体工学 | 9 / 10 | 已计划牌贴近回合结束，法术书翻页控件贴近牌轨；后续实现仍需补 hover / inspect 状态 |

总分：旧 `94 / 100` 撤销。硬失败项：`background-dominates-actionable-objects`：整张竞技场底图仍被当作不可覆盖排斥体，法术书 / 当前可支配牌区被挤到底边；几何无重叠不能证明玩家可读、可点、可比较。

## 阻塞边界

- 旧 `AI_PASS` 已撤销；v58 不再允许人工验收，仍禁止 Board/UI 实现、真实运行页 E2E 和移动端适配。
- 本稿只覆盖 PC 桌面饱和主态；hover / focus / inspect 临时读卡层是设计策略，未在本张常驻主态展开。
- 移动端必须等 PC 人工批准后再做，不得用移动端补救 PC 设计问题。
