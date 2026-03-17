# Design: AI PR 自动审查与自动合并

## Context

目标是在不破坏现有质量门的前提下，为 GitHub PR 提供可审计、可阻断、可自动修复、可自动 merge 的闭环流程。现有仓库只有 `quality-gate.yml`，没有 AI 审查调度层，也没有将原始 PR 作为唯一合并单元的自动化约束。

## Goals

- 让原始 PR 成为唯一审查与合并对象
- 将 `AGENTS.md` 规则注入自动审查过程
- 提供稳定的 findings 输出格式
- 支持低风险自动修复
- 在门禁通过后自动 merge 原始 PR

## Non-Goals

- 不在本次变更中实现任意代码生成平台的完整接入
- 不覆盖所有第三方 Git 托管平台
- 不在本次变更中解决所有 fork PR 权限问题

## Decisions

### Decision: workflow 作为触发器，skill 作为执行规范

原因：
- skill 不能天然监听 GitHub 事件
- workflow 更适合承接权限、密钥、事件过滤和结果回写
- skill 更适合沉淀“怎么审、什么能修、何时能 merge”

### Decision: 审查与合并均围绕原始 PR

原因：
- 避免 `merge/pr-*` 中间 PR 导致原始 PR 无法自动关闭
- 审查记录、修复提交、检查状态能全部挂在同一个 PR 上

### Decision: 将自动修复限制在低风险范围

原因：
- 降低 bot 对主干稳定性的破坏风险
- 便于建立可预测的自动 merge 门槛

## Architecture

建议拆成三段：

1. `pull_request` 触发基础质量门
2. `pull_request` 或 `issue_comment` 触发 AI 审查/自动修复
3. `workflow_run` 在所有前置门禁通过后执行自动 merge

## Risks / Trade-offs

- `pull_request_target` 权限更高，但不能直接执行不可信 PR 代码
- fork PR 是否允许自动修复，取决于仓库权限策略
- AI 审查如果没有稳定的阻断规则，容易把建议误当 blocker 或放过真实缺陷

## Migration Plan

1. 定义 `pr-automation` spec
2. 新增 workflow 骨架
3. 接入 AI 调用层与审查产物模板
4. 先以“只审查不自动 merge”灰度启用
5. 稳定后开启自动 merge

## Open Questions

- 自动 merge 是否必须要求人工 approval
- fork PR 是否启用自动修复
- 采用 GitHub App 还是 PAT 作为长期执行身份
