---
name: knowledge
description: "BoardGame 项目知识导航。先按任务域进入浅路由，再读取该路由点名的标准、workflow 和业务真相源。"
metadata:
  type: index
---

# BoardGame Knowledge

这里是 AI 规范的导航入口，不是规范正文，也不是产品任务编排。

## 使用顺序

1. 会改变项目结果时，先读 [`before-you-code`](../skills/before-you-code/SKILL.md)，确定读取深度。
2. 按任务域进入下面一个路由；不要扫描全部标准目录，也不要凭文件名猜规范。
3. 路由只负责告诉你“什么情况下读什么”；进入后再读取它点名的标准、workflow 和业务真相源。

## 任务路由

| 当前要做的事 | 进入 |
| --- | --- |
| 规则、技能、Token、阶段、伤害、卡牌时机、DiceThrone、Smash Up 机制 | [`规则与游戏逻辑`](routes/rule-bug.md) |
| UI、布局、交互壳层、设计稿、截图、视觉验收、移动端 | [`UI 与截图交付`](routes/ui.md) |
| 测试、E2E、审计、回归、不可复现问题、共享改动验证 | [`测试与审计`](routes/testing.md) |
| 图片、音频、图集、规则录入、配置包、新派系、素材发布 | [`资源与数据录入`](routes/data-assets.md) |
| 引擎、共享层、传输、AI、后端、接口、状态同步、系统能力 | [`引擎与共享架构`](routes/architecture.md) |
| 部署、反馈、worktree、合并、交接、规划、AI 规范结构整理 | [`协作与运行事务`](routes/operations.md) |

## UI 与截图职责总览

这张表只说明职责归属和下一跳；可执行正文仍在对应的系统 skill、项目标准或项目 skill 中。

| 要回答的问题 | 唯一执行正文 | 本项目其它入口只做什么 |
| --- | --- | --- |
| UI 布局、空间、主交互槽位和 BoardGame 改动门禁 | [`ui-change-gates`](standards/ui-change-gates.md) | `ui-ux` 承载审美与组件范式，`ui-responsive-layout` 承载双端专项。 |
| E2E 从哪里起跑、状态如何触发、截图能证明哪些业务状态 | [`e2e-verification`](standards/e2e-verification.md) | [`automated-testing`](../../docs/automated-testing.md) 只承载运行命令、API、启动链和产物目录。 |
| AI 如何看真实图并作出 `PASS/REVISE`，不通过如何返工 | 系统 [`ui-audit-loop`](D:/codex-home/skills/ui-audit-loop/SKILL.md) | 项目标准只补 BoardGame 的布局和证据增量。 |
| 如何把最终图展示给用户 | 系统 [`show-image-to-user`](D:/codex-home/skills/show-image-to-user/SKILL.md) | 项目 `screenshot-delivery` 只补路径、脚本和授权边界。 |
| BoardGame 截图证据目录、项目脚本和相册授权 | 项目 [`screenshot-delivery`](../skills/screenshot-delivery/SKILL.md) | 不定义截图是否通过，也不定义用户是否已经看到图。 |

## 边界

- 项目标准正文只在 [`standards/`](standards/README.md)；路由不复制正文。
- 可执行步骤只在 [`skills/`](../skills/README.md)；产品需求和任务编排只在 `openspec/`。
- 不确定属于哪个域时，先进入最接近的路由；路由会指出需要再转到的入口。
- AI 规范结构本身的迁移裁决看 [`document-consolidation.md`](../decisions/document-consolidation.md)，不要把它当成产品 OpenSpec。
