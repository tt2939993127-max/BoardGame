# Mage Wars UI 低保真草稿图审计

> 状态：`FAILED / same-page-same-template / user-rejected / final-design-not-approved`。本文件记录 A/B/C/D 草稿图的生成输入和失败复盘。它不得再作为用户选择方向、最终设计稿批准、真实 Board/UI 实现或移动端工作的依据。

## 2026-07-30 用户复盘裁定

用户指出：“每次都长一个样子”，“现在的效果比之前更差”。该反馈成立。

| 问题 | 失败结论 |
| --- | --- |
| 多设计稿形态 | 四套方案被塞进同一个 HTML 页面和同一总览结构，违背“多个设计稿应是多个独立稿”的预期 |
| 结构差异 | A/B/C/D 共享同一竞技场中心、底部条、右侧按钮和棕色暗桌面，只是权重变化，不是多套设计 |
| 基线处理 | 多方案不应覆盖“开始多设计稿之前的那一版”；`v21` 必须保留为基线候选 |
| 视觉结果 | 低保真草稿比旧基线更脏，不能帮助用户判断哪套更好 |

后续动作：保留 `mage-wars-step1-runtime-board-v21.html` 与 `step1-runtime-board-opendesign-artifact-v21.png` 作为基线；新方案必须拆成独立 Open Design artifact 文件和独立 PNG，不能再用同一页面同母版承载。

## 生成对象

| 项 | 结果 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 主对局 UI 四套结构方向 |
| 真相来源 | 学徒 `2x3` 竞技场、法术书 / 已计划法术 / 弃牌堆命名、正式素材输入包、skill 驱动 UI 方案 |
| 目标入口 / 环境 | Open Design artifact HTML + Playwright 渲染 PNG |
| 验收口径 | 先让用户比较 A/B/C/D 方向；未选定前不进入最终设计稿和实现 |

## 生成产物

| 产物 | 路径 | 状态 |
| --- | --- | --- |
| Open Design artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-ui-skill-drafts-v1.html` | `mediaGenerate=false` |
| 工作树 HTML 副本 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-skill-drafts-v1.html` | 可复查 |
| 总览对比图 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-overview.png` | 用户选择入口 |
| A 单稿 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-a.png` | 用户选择入口 |
| B 单稿 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-b.png` | 用户选择入口 |
| C 单稿 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-c.png` | 用户选择入口 |
| D 单稿 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-d.png` | 用户选择入口 |

## AI 自检

| 检查项 | 结论 |
| --- | --- |
| 图片存在且非空 | PASS；五张 PNG 均为 `1920x1080`，大小约 1.9-2.4MB |
| 是否使用图片模型生图 | PASS；产物来自 HTML artifact 渲染，未调用 `od media generate` |
| 是否出现规则不存在的“手牌 / hand / opponent-hand” | PASS；HTML 文本未命中这些词 |
| 是否使用正式素材主体 | PASS；竞技场、法师牌、法术牌、卡背、骰面均来自 `refs/mage-wars-step1` |
| A/B/C/D 结构是否明显不同 | FAIL；用户复盘确认四稿仍像同一母版换权重 |
| 骰子是否进入侧栏作为主结果 | PASS；四稿骰子均贴竞技场目标 / 主舞台；D 的右侧 dock 只做动作摘要 |
| 是否可作为最终设计稿 PASS | FAIL；当前是低保真比较草稿，C 的结算舞台遮罩仍偏重，整体视觉仍需用户先选方向后重构 |

## 使用限制

- 可以：只作为失败复盘证据，说明“同页同母版多方案”不可再用。
- 不可以：把本组草稿当成最终设计稿、人工验收 PASS、实现依据或移动端起点。
- 下一步：用多个独立 HTML / PNG 重新出稿，并把 `v21` 列为基线对照。
