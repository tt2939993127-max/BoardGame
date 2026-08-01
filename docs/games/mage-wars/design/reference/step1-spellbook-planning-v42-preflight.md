# Mage Wars 法术书计划态 v42 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-only / media-generate-forbidden / human-review-not-allowed / implementation-blocked / mobile-blocked`。本稿只更新 Open Design artifact 设计稿和导出审计图，不进入真实 Board/UI 实现。

## 前提锁定

| 项 | 锁定结果 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 设计稿，法术书计划 / 浏览阶段 |
| 真相来源 | 本轮重读 `domain-modeling.md`、`apprentice-spellbooks.md`、`apprentice-card-field-contract.md`、`apprentice-zone-layout-contract.md`、`board-ui-preflight-matrix.md`、`step1-runtime-board-saturated-ui-design.md` 和外部 UI 方法论基线 |
| 目标入口 / 环境 | Open Design artifact：`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-spellbook-planning-v42.html`；`mediaGenerate=false` |
| 验收口径 | AI 图面复核 PASS 后才允许人工验收；用户批准前真实实现、运行页 E2E 和移动端冻结 |

## 规则到画面裁定

| 规则结论 | 画面主体 | 设计决策 / 禁止项 |
| --- | --- | --- |
| Mage Wars 没有“手牌”主概念 | 法术书、已计划法术、弃牌堆 | artifact 可见文案、aria、审计文本只允许使用规则真实名称；不得写手牌或对手手牌 |
| 卡面已印刷费用、类型、目标、射程、骰数和效果 | 法术牌 / 生物牌本体 | UI 不复写这些字段；看不清时放大卡面或焦点预览，不在旁边写标签墙 |
| 计划阶段从法术书准备最多 2 张 | 法术书工作台 / 已计划槽 | 法术书成为主工作区，提供分类、分页、12 张候选、焦点大卡和两个已计划槽。 |
| 攻击 / 施法 / 装备攻击都是来源对象驱动 | 统一动作工作台 | 本稿不表达攻击或施法确认，避免阶段混叠。 |
| 学徒竞技场是 2x3 区域 | 竞技场与场上卡 | 每张场上卡声明唯一 `data-zone-id`；对象不能骑在两个区域之间 |

## 空间预算

| 对象 | 最小可读 / 可用要求 |
| --- | --- |
| 主工作区 | 法术书候选卡不低于 126x177，焦点卡不低于 320x450，两个已计划槽同屏。 |
| 竞技场 | 六区域可见；作为上下文降权，不和法术书争主焦点。 |
| 归档 / 大集合 | 弃牌堆和完整法术书默认是边缘入口；除非当前阶段要求从中选择，否则不得中央展开 |
| 自制运行态 UI | 生命、法力、聚魔可以自制条；它们不替代卡牌、棋盘、token 或骰子素材 |

## 当前人工验收状态

- `human-review-not-allowed`：只有随图 AI 审计和原图肉眼复核通过后，才能打开给用户验收。
- `implementation-blocked`：用户批准设计稿前，不得写真实 Board/UI 或跑实现 E2E。
