# Mage Wars runtime Board implementation audit

目标状态：`AI_OBJECT_SPLIT_PASS / full-ui-approval-not-implied`
当前目标：记录 `Board.tsx` 运行时实现对法师三对象职责的修正，并撤回旧错误的 `AI_RECHECK_PASS`。
非当前历史背景：旧 Open Design v2 截图已拒绝，不作为实现目标稿。
禁止自动接管：本审计不覆盖全 322 张法术、自由构筑、四人模式、完整 AI、教程系统或行动日志 UI。
更新时间：2026-08-01

## 对照约束

- 规则先行：2 人学徒模式、2x3 学徒竞技场、生命 24、隐藏计划、行动 / 快速施法、攻击骰 / 效果骰。
- 素材优先：竞技场、法师、学徒法术、卡背、token、攻击骰和效果骰必须使用正式资源链。
- 法师对象拆分：`法师战场实体`、`玩家 / 法师提示卡`、`法师规则卡` 必须分开命名、分开锚点、分开素材职责。
- 可程序化对象：生命 / 法力 / 聚魔 / 伤害读数、当前阶段状态和来源锁定短状态。
- 视觉禁令：不得再使用厚边框分栏、dashboard 主壳、框中框、文字壳替代真实素材。

## 当前问题分层

| 层级 | 结论 |
| --- | --- |
| 现实故障现象 | 用户指出“法师的提示卡”和“代表法师本人的卡”不是同一对象；旧实现把 HUD 昵称上方提示卡和竞技场法师实体都渲染成完整法师规则卡。 |
| 直接触发条件 | `MageHud` 使用 `getMageWarsMagePreviewRef(player.mageId, 'card')`，E2E 用 `mage-wars-mage-hud-identity-card` 这种含混锚点只验证“有一张卡”，没有验证它是提示卡还是战场实体。 |
| 根本机制 | 规则对象覆盖矩阵没有把 `法师战场实体`、`玩家 / 法师提示卡`、`法师规则卡` 拆成三行，导致素材 `card` 与 `portrait` 被按变量名而不是对象职责使用。 |
| 最小修正 | 更新 `.codex/skill/mage-wars-ui-design-memory/SKILL.md` 作为唯一规范真相源；HUD 改用肖像 / 提示视觉并命名为 `mage-wars-mage-hud-hint-card`；竞技场实体命名为 `mage-wars-zone-mage-entity`；E2E 断言两者 `data-mage-preview-kind` 和 `data-mage-ui-role` 不同。 |

## 实现状态

- `Board.tsx` 使用 `OptimizedImage` 渲染标准竞技场、token、攻击骰、效果骰和法术卡背；攻击骰从正式展开贴图裁出可见骰面。
- `Board.tsx` 使用 `CardPreview` + `cardAtlas.ts` 渲染法师 atlas 和学徒法术 atlas。
- 已保留正确修复：竞技场格有场上卡时仍渲染 `occupantIds` 中的法师战场实体，避免法师本人从场地消失。
- 已撤回错误实现口径：HUD 昵称上方不再称为“法师牌 / identity-card”，改为玩家 / 法师提示卡，使用肖像 frame，并通过 `data-mage-ui-role="player-hint-card"` 约束。
- 主舞台仍为全屏竞技场，玩家状态、动作区、骰盘和法术书作为贴边轻量 HUD 叠在牌桌上。
- 对手计划区只露法术卡背；己方区域显示准备槽和学徒法术书预览。

## 截图裁决

- 旧桌面原图：`D:\gongzuo\webgame\BoardGame\.worktrees\mage-wars\test-results\evidence-screenshots\mage-wars\foundation-board-runtime\e2e-desktop-board.png`
- 旧桌面截图时间：2026-08-01 12:23:35 +08:00；旧 `AI_RECHECK_PASS 90/100` 已撤回。
- 最新桌面截图时间：2026-08-01 12:44:10 +08:00。
- 当前裁决：`AI_OBJECT_SPLIT_PASS 92/100`。新图中 HUD 昵称上方为肖像 / 提示卡，竞技场 A2 / B2 中为代表法师本人的战场实体，完整规则卡不再冒充 HUD 提示卡。
- 范围限制：该裁决只覆盖“法师提示卡 vs 法师战场实体 vs 法师规则卡”职责修复，不代表完整 UI 人工批准。

## 用户原话自审

| 用户纠正 / 意图 | 当前裁决 |
| --- | --- |
| 法师的提示卡，和代表法师本人的卡不是一个东西 | PASS。HUD 提示卡使用肖像 / 提示视觉，战场实体保留竞技场区域锚点，完整规则卡默认不再冒充 HUD 提示。 |
| 法师必须在战场 | PASS。`ArenaStage` 不再把场上卡和法师实体当互斥对象；新图中 A2 / B2 法师实体和场上卡共存。 |
| 玩家提示挂角色头像，不挂场地 | PASS。HUD 提示卡锚点和 `data-mage-ui-role="player-hint-card"` 已拆出；提示挂在角色 HUD，不挂竞技场。 |
| 骰子、token 不能省略 | PASS。当前实现仍保留攻击骰、12 面效果骰、伤害 token、燃烧 token、守卫 / 行动 token。 |
| 视觉肯定先 AI 验收，再人工验收 | PASS（本问题范围）。已完成 AI 图面自审；若要进入人工验收，必须明确这是三对象修复图，不是完整游戏 UI 最终批准图。 |

## 资源链

- 资源链证据仍见 `docs/games/mage-wars/design/generated/runtime-resource-chain-audit.md`。
- 资源链通过只能证明素材可加载，不能证明 UI 对象职责正确。

## 风险

- 当前仍是 foundation 运行时 UI，不等于完整游戏交互完成。
- 旧 Open Design 失败稿仍不得作为人工验收设计稿。
- 不得把本次三对象修复通过扩展成完整游戏 UI 通过。
