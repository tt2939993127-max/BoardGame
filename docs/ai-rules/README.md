# AI 规范重构入口

> 本文件只管“AI 助手该读什么、规则放哪、怎样避免多份规范漂移”。它不是产品功能规格，也不是 OpenSpec 提案入口。

## 本轮裁定

这次整理目标是重构 AI 规范层，不是重构业务实现规格。

- `AGENTS.md`：项目级硬红线与强制入口，只保留“什么时候触发、先读哪里、不能做什么”。
- `docs/ai-rules/`：AI 规范正文与专项标准，承载“为什么这样做、如何判断、验收口径”。
- `.codex/skill/`：可执行 workflow，承载具体步骤、命令、检查清单和项目路径。
- `openspec/`：产品/架构能力规格，不作为 AI 规范重构主线。
- `evidence/`：历史证据和审计记录，不是规范来源；只能引用规范并记录结果。
- `task_plan.md` / `progress.md` / `findings.md`：当前或历史任务状态，不得自动接管后续目标。

## LumioAgent 方法的本仓映射

参考 LumioAgent 的做法时，只借鉴“规范知识治理”方法，不照搬目录。

| LumioAgent 概念 | BoardGame 对应落点 | 说明 |
| --- | --- | --- |
| rules | `AGENTS.md` | 禁止行为、强制入口、不可越过的红线。 |
| standards | `docs/ai-rules/` | 专项规范、判断方法、验收标准、分层原则。 |
| skills | `.codex/skill/` | 可执行流程；如果步骤超过几条或依赖项目脚本，默认放 skill。 |
| decisions | `docs/ai-rules/document-consolidation.md`、必要时专项 ADR/用户故事 | 记录为什么这么裁决、迁移来源、语义是否变化。 |
| features/specs | `openspec/specs/` | 只代表产品/架构能力真相，不代表 AI 规范入口。 |
| tasks | `task_plan.md` / `progress.md` / `findings.md` / `temp/` | 任务状态和临时线索，不是长期规范。 |

## AI 规范文档分层

| 类型 | 应放哪里 | 典型例子 | 不该放什么 |
| --- | --- | --- | --- |
| 硬红线 | `AGENTS.md` | 不得擅自删边、不得跳既定流程、UI 改动需真实截图验收 | 长篇 SOP、命令模板、单游戏细节 |
| 专项标准 | `docs/ai-rules/*.md` | E2E 验收、UI 门禁、资源链、数据录入、规则审计 | 一次性任务进度、具体 bug 过程流水 |
| 可执行 workflow | `.codex/skill/*/SKILL.md` | 新游戏、录入、审计、发布、截图交付、反馈收口 | 抽象原则全文、系统级通用 skill 正文 |
| 游戏专项规则 | `docs/games/<gameId>/` 或 `src/games/<gameId>/rule/` | 单游戏规则补充、用户裁定、专项工作流 | 跨游戏通用规则 |
| 产品/架构规格 | `openspec/specs/` / `openspec/changes/` | 已建成能力、待批准变更 | AI 助手行为规范 |
| 证据记录 | `evidence/` | 审计证据、截图证据、修复记录 | 独立规范正文 |
| 临时状态 | `task_plan.md`、`progress.md`、`findings.md`、`temp/` | 当前批次状态、临时扫描结果 | 长期规则、默认入口 |

## 重构顺序

1. 先给文档定角色：`canonical-source`、`adapter`、`index`、`workflow`、`evidence`、`task-state`、`temp`。
2. 同一规则只允许一个 `canonical-source`；其它位置只能引用、索引或记录执行结果。
3. 优先删除已证明等价的重复副本；无法证明时先降级为候选，不做删除。
4. 大文档先拆入口和分卷，不急着删内容；拆完必须补迁移台账。
5. 最后补机械检查：链接、重复哈希、未索引规范、顶层单游戏文档、已完成未归档提案。

## 当前优先批次

| 批次 | 目标 | 处理方式 |
| --- | --- | --- |
| P0 | 建立 AI 规范入口 | 本文件作为 `docs/ai-rules/` 的导航与分层真相源。 |
| P1 | 压缩 `AGENTS.md` | 根文件只保留红线和路由；把长 SOP 下沉到 `docs/ai-rules/` 或 `.codex/skill/`。 |
| P2 | 拆大文档 | 优先处理 `e2e-verification.md`、`ui-change-gates.md`、`ui-ux.md`、`testing-audit-*`、`asset-pipeline.md`。 |
| P3 | 整理项目 skill | 主 `SKILL.md` 只保留入口和阶段骨架，长检查表进 `references/`。 |
| P4 | 加文档检查脚本 | 做只读 `docs-lint`，先报重复、悬空链接、索引缺口，不直接改文件。 |

## 逐批合并台账

本轮开始使用 `docs/ai-rules/document-merge-ledger.md` 记录每批候选、职责裁决、保留侧和待精读项。后续合并/删除前必须先更新该台账，避免凭感觉删文档。

## 判断“有没有用”的口径

不能按“当前看起来没人读”判断有无价值。AI 规范整理默认按职责判断：

- 能直接阻止错误行为：保留为硬红线或专项标准。
- 只是具体执行步骤：下沉到项目 skill。
- 只是历史证据：留在 `evidence/`，但不当规范入口。
- 只是任务状态：标为当前/历史/已完成，不自动接管目标。
- 与另一处完全重复：先证明保留侧等价、旧路径无引用，再删副本。
- 单游戏局部结论：下沉到游戏目录，不留在项目通用层。
