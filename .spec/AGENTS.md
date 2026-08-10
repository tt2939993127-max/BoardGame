# BoardGame AI 规范入口

本目录只定义 AI 在 BoardGame 仓库内如何获取约束、知识和执行流程；它不承载产品需求、变更提案或任务清单。

开始任何会改变项目结果的工作前，按顺序读取：

1. [系统规则](rules/system.md)
2. [知识导航](knowledge/README.md)
3. [`before-you-code`](skills/before-you-code/SKILL.md)，按任务规模加载最少的专项标准、workflow 与源码。

目录职责固定如下：

- `rules/`：跨任务硬边界。
- `knowledge/`：项目标准、事实与渐进式导航。
- `skills/`：可执行的项目 workflow；这里是唯一受版本控制的项目 skill 来源。
- `decisions/`：AI 规范结构的一次性裁决与迁移记录。
- `tools/`：检查规范结构和生成宿主适配副本的脚本。

需要让宿主自动发现项目 skill 时运行 `npm run spec:hosts`。宿主生成的 skill 副本只是适配层，不是规则真相源。
