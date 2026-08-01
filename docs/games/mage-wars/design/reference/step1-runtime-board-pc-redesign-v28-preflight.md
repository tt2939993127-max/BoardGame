# Mage Wars Step 1 PC Open Design v28 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-only / media-generate-forbidden / human-review-not-allowed`。本文件响应 v27 自审失败：不能只把确认条挪近已计划法术，也不能保留后台筛选器式分类按钮；v28 必须把这些控件改成计划槽和法术书页签的一部分。

## 本轮前提锁定

| 项 | 锁定结果 |
| --- | --- |
| 问题对象 | Mage Wars 学徒模式 PC Open Design Step 1 运行时主界面设计稿，基于 v27 中间失败稿重构为 v28 |
| 真相来源 | 本轮重读 UI 设计 / 审计 / 游戏交互 skill、项目 UI 门禁、学徒法术书合同、学徒 2x3 区域合同和素材输入包 |
| 目标入口 / 环境 | Open Design artifact 代码设计稿：`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v28.html` |
| 验收口径 | 先 AI 图面核验；AI PASS 后才允许打开给用户人工验收。用户批准前实现、真实页面 E2E 和移动端继续冻结 |

## v28 设计规则

| 目标 | 设计处理 |
| --- | --- |
| 去容器化 | 底部语义容器继续透明；不画大 rail、边框、圆角、玻璃板和内阴影 |
| 法术书分类 | 分类按钮降为低权重书签 / 文字页签，活动态只用细小下划提示，不做成后台筛选胶囊 |
| 计划槽动作 | `已计划 2/2 · 火球术 → 西锁骑士` 与费用、确认、取消在同一操作行，贴近已计划火球术 |
| 保留规则主体 | 不改 2x3 区域、骰子 / 伤害 / 燃烧贴目标、对手隐藏信息和禁止手牌语义 |

## 前置硬失败禁止清单

- 出现规则不存在的手牌 / hand / opponent-hand。
- 底部出现封闭大容器、可见边框、玻璃板或厚底板。
- 分类仍像后台筛选器或一排厚按钮。
- 费用 / 确认 / 取消仍是远离已计划火球术的独立动作面板。
- 当前火球术同时作为候选和已计划来源重复出现。
- 用户批准前启动真实 Board/UI、真实页面 E2E 或移动端。
