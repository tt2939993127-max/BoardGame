# BoardGame 入口

本项目有两个彼此独立的入口：

- **AI 规范**：所有项目内工作先完整阅读 [`.spec/AGENTS.md`](.spec/AGENTS.md)。它规定 AI 如何加载项目知识、执行 workflow 和遵守硬边界。
- **产品任务编排**：当任务涉及产品需求、提案、能力变更或任务清单时，另行阅读 [`openspec/AGENTS.md`](openspec/AGENTS.md)。它只管理产品规格与任务，不是 AI 规范来源。

两个入口互不复制正文。根文件只负责让宿主找到它们。
