# 0001: AI 规范与 OpenSpec 分离

## 结论

BoardGame 的 AI 规范采用 `.spec/` 作为唯一根；`openspec/` 保持产品能力的需求、提案和任务编排，不承载、生成或校验 AI 规范。

## 职责映射

| 职责 | 唯一正文 | 其它位置的角色 |
| --- | --- | --- |
| AI 硬边界 | `.spec/rules/` | 根 `AGENTS.md`、`CLAUDE.md` 只作宿主入口 |
| 项目标准与知识 | `.spec/knowledge/standards/` | 旧规范目录只作兼容跳转 |
| 项目 workflow | `.spec/skills/` | 宿主 skill 目录为可再生副本 |
| 结构性裁决 | `.spec/decisions/` | 台账和历史证据只能记录迁移事实 |
| 产品规格与任务 | `openspec/` | 与 `.spec/` 并列，不建立交叉规范正文 |

## 不采用的参考结构

- 不把 LumioAgent 的 `tasks/` 目录复制为第二套项目任务编排；本项目已有 OpenSpec 和专项计划。
- 不引入 LumioAgent 的 agent/reviewer 调度模型；没有明确职责与验收收益的目录不建立占位入口。
- 不把任何 AI 规范迁入 `openspec/changes` 或 `openspec/specs`。

## 迁移原则

1. 先迁移正文，再把旧路径降为单行兼容适配，不能先删除。旧正文的可追溯性由 Git 历史承担，不在 `.spec` 复制全文备份。
2. 所有新 workflow 只引用 `.spec` 下的标准；旧任务、历史 evidence 和 OpenSpec 文档可继续通过兼容路径访问，不为此扩大产品任务 diff。
3. 迁移裁决只记录“旧职责 -> 新唯一正文 -> 兼容入口”，不能用历史全文或摘要代替这张映射。
4. 结构 lint 只检查目录、唯一源、链接和宿主适配，不建立“目标 -> 已读来源 -> 回归入口”之类的阅读回执流程。

## 旧根规则去向

以下映射只记录职责去向；旧正文继续由 Git 历史追溯，不在当前规范中复制。

| 旧根主题 | 当前唯一入口 |
| --- | --- |
| 产品提案与任务清单 | 根 `AGENTS.md` 指向独立的产品任务入口 |
| 用户目标、范围、交接与证据边界 | `rules/system.md` + `knowledge/standards/conversation-handoff-target-lock.md` |
| 归并、worktree、提交与推送 | `rules/system.md` + `knowledge/standards/worktree-branch-target-lock.md` + `skills/git-operations/` 与 `skills/merge-*/` |
| Bug、回归、规则合同与审计 | `knowledge/standards/rule-contract-audit.md`、`regression-closeout.md`、`testing-audit*.md` + 对应 workflow |
| 测试、E2E、截图与用户看图 | `knowledge/standards/e2e-verification.md`、`testing-audit*.md`、`docs/automated-testing.md` + `skills/screenshot-delivery/` |
| UI、设计稿、移动端与视觉验收 | `knowledge/standards/ui-*.md`、`generated-design-implementation.md` + UI workflow |
| 资源、音频、录入与配置 | `knowledge/standards/asset-pipeline.md`、`audio-assets.md`、`data-entry.md`、`game-config-package.md` + 对应 workflow |
| React、类型、编码与架构基线 | `knowledge/standards/golden-rules.md`、`engine-*.md`、`docs/framework/`、`docs/architecture.md` |
| 游戏领域、系统、模式、国际化与共享能力 | `knowledge/standards/engine-*.md`、`global-systems.md`、游戏专项文档 |

这张表是迁移验收入口：出现无法落到其中任一唯一源的旧规则时，先补正确职责位置，不能恢复旧根正文。
