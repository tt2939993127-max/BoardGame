# Mage Wars 法术书计划态 v40 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-only / media-generate-forbidden / human-review-not-allowed-until-ai-pass / implementation-blocked`。本稿只生成 Open Design artifact 和导出审计图，不进入真实 Board/UI 实现。

## 前提锁定

| 项 | 锁定结果 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 设计稿，计划 / 浏览阶段 |
| 真相来源 | 本轮重读规则、学徒法术书、91 张字段合同、区域锚点合同、素材矩阵、外部 UI 方法论基线和 UI 设计门禁 |
| 目标入口 / 环境 | Open Design artifact：`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-spellbook-planning-v40.html`；`mediaGenerate=false` |
| 验收口径 | AI 图面复核 PASS 后才允许人工验收；用户批准前真实实现、运行页 E2E 和移动端冻结 |

## 本稿裁决

| 裁决 | 内容 |
| --- | --- |
| 阶段职责 | 法术书是当前主工作区，棋盘只保留上下文；玩家准备最多 2 张已计划法术。 |
| 卡面字段 | 卡牌正面承担印刷信息；UI 不复写卡牌本身已经印刷的费用、范围、目标栏、骰数或效果正文 |
| 牌区语义 | 只使用规则名称：法术书、已计划法术、弃牌堆、隐性信息卡背 |
| 素材链 | artifact 直接引用 Open Design 项目内 `refs/mage-wars-step1/**` 的正式竞技场、法师牌、法术牌、卡背和 token |
| 确认授权 | 计划阶段有最多 2 张选择，完成计划按钮用于提交本阶段选择。 |

## 空间预算

| 对象 | 最小要求 |
| --- | --- |
| 法术书 / 来源工作区 | 候选卡至少 12 张同页、分类、分页、焦点大卡和 2 个已计划槽同屏。 |
| 竞技场 | 六个区域可见，场上卡不骑线；在计划态降权，在目标确认态保持主舞台 |
| 玩家 HUD | 生命 / 法力 / 聚魔使用贴近法师牌的自制读数；不复现状态板 |
| 低频归档 | 弃牌堆只能是所属玩家边缘入口，不能占中央主链 |
