# 协作与运行事务

本路由处理环境、部署、反馈、worktree、规划、交接和 AI 规范结构本身。产品需求/变更提案仍属于 `openspec/`，不在这里建立第二套任务编排。

## 环境、发布与反馈

- 环境配置、端口和同域代理：读 [`部署入口`](../../../docs/deploy.md)。
- Android 打包、上传、原生更新、OTA 或网站下载入口：读项目 [`android-app-release`](../../skills/android-app-release/SKILL.md)、`docs/mobile-release.md` 和 `docs/android-app-build.md`。
- Open Design、设计 MCP 或本地设计工具接入：读 [`Open Design`](../../../docs/infra/open-design.md)；设计稿内容转 [`UI 与截图交付`](ui.md)。
- 处理线上反馈、回写 open/in_progress/resolved/closed 状态：读项目 [`feedback-closeout`](../../skills/feedback-closeout/SKILL.md)。
- 修改反馈提交入口、登录态、匿名提交、`POST /feedback` 或失效 token：读 [`feedback-system`](../standards/feedback-system.md)。
- 只处理用户反馈中的规则/截图问题：转 [`规则与游戏逻辑`](rule-bug.md) 或 [`测试与审计`](testing.md)，不要在反馈 workflow 里复制业务规则。

## Git、交接与任务编排

- 分支、worktree 清理、改动归属、入口找错：读 [`worktree-branch-target-lock`](../standards/worktree-branch-target-lock.md) 与项目 `git-operations` skill。
- 需要合并、保留/删除/真相源裁决：读项目 [`merge-decision-package`](../../skills/merge-decision-package/SKILL.md)；真正执行 PR 合并再读 `merge-pr-workflow`。
- 复杂多文件或长流程任务：读项目 [`planning-with-files`](../../skills/planning-with-files/SKILL.md)；仓内目标锁定仍回 [`before-you-code`](../../skills/before-you-code/SKILL.md)。
- 对话接续、交接摘要、上下文压缩后继续：读 [`conversation-handoff-target-lock`](../standards/conversation-handoff-target-lock.md)。
- 创建临时文件、Bug 分析脚本、测试脚本或清理根目录：读 [`临时文件管理`](../../../docs/temp-files-management.md)。

## AI 规范结构

- 压缩根 AGENTS、拆分大文档、去重但不丢内容：读 [`document-consolidation`](../../decisions/document-consolidation.md) 和项目 [`skills README`](../../skills/README.md)。
- 判断根 AGENTS 应保留什么粒度、是否需要渐进式披露：先读 [`document-consolidation`](../../decisions/document-consolidation.md)，再回 [`知识导航入口`](../README.md) 检查是否应增加任务路由，而不是把更多正文塞进根文件。
- 设计流程失守、skill 落点或规范层级裁决：读项目 [`skill-governance`](../../skills/skill-governance/SKILL.md)；本仓库的 AI 规范入口是 [`spec AGENTS`](../../AGENTS.md)，产品任务编排入口是 `openspec/AGENTS.md`。
