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

## 边界

- 项目标准正文只在 [`standards/`](standards/README.md)；路由不复制正文。
- 可执行步骤只在 [`skills/`](../skills/README.md)；产品需求和任务编排只在 `openspec/`。
- 不确定属于哪个域时，先进入最接近的路由；路由会指出需要再转到的入口。
- AI 规范结构本身的迁移裁决看 [`document-consolidation.md`](../decisions/document-consolidation.md)，不要把它当成产品 OpenSpec。
- UI/截图交付链的职责总览和迁移矩阵见 [`document-merge-ledger.md`](../decisions/document-merge-ledger.md) 的 P1.3；本 README 只保留导航，不复制职责正文。
