# 法师战争 v4 多设计稿差异与门禁矩阵

> 状态：`generated / ai-review-required-before-human-review`。本文件记录 v4 三套独立 Open Design artifact 的生产结果和机器门禁。图面是否真正玩家友好仍需逐张 AI 肉眼审查；未审查通过前不得打开人工验收。

## 独立设计轴

| 候选 | 主焦点 | 主点击路径 | 空间比例 | 视觉语法 |
| --- | --- | --- | --- | --- |
| 棋盘优先 / 区域对象直选 | 学徒 2x3 竞技场 | 场上对象直选 -> 费用确认 -> 目标附近骰子 | 棋盘最大，法术书压缩 | 石质竞技场 + 贴对象轻 HUD |
| 法术书工作台 / 计划法术驱动 | 法术书与已计划法术 | 已计划火球术 -> 目标高亮 -> 主舞台结算 | 底部工作台更重 | 卡牌工作台 + 区域目标链 |
| 开放桌面 / 施法结算链 | 来源、法术、目标、骰子空间链 | 来源法师 -> 火球术 -> 西锁骑士 -> 伤害 token | HUD 最少，中心开放 | 少框桌面叠层 + 物理对象主语 |

## 机器门禁

| 候选 | HTML | PNG | 禁止词 | 场上卡中心入所属区域 | 骰子贴近目标 |
| --- | --- | --- | --- | --- | --- |
| 棋盘优先 / 区域对象直选 | `mage-wars-v4-board-first-command.html` | `mage-wars-v4-board-first-command.png` | PASS | PASS | PASS |
| 法术书工作台 / 计划法术驱动 | `mage-wars-v4-spellbook-dock.html` | `mage-wars-v4-spellbook-dock.png` | PASS | PASS | PASS |
| 开放桌面 / 施法结算链 | `mage-wars-v4-tabletop-overlay.html` | `mage-wars-v4-tabletop-overlay.png` | PASS | PASS | PASS |

## 仍需人工前 AI 肉眼审计

- 三套是否真的不是同一母版换权重。
- 图面是否像玩家真实界面，而不是说明图 / 方向图。
- 是否仍有边框壳抢主体。
- 玩家第一眼是否知道当前要点目标、确认施放或取消。
- 法术书、已计划法术、弃牌堆、隐性结界是否符合规则语义。
