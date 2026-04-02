# Change: AI PR 自动审查与自动合并

## Why
- 当前 PR 审查与合并流程依赖人工调度，容易出现“审查在中间分支完成、原始 PR 未自动关闭”的闭环缺失。
- 仓库已经具备基础质量门，但缺少将 `AGENTS.md` 规则、AI 审查、自动修复、自动 merge 串成一条链的能力。

## What Changes
- 新增一套面向原始 PR 的 AI 审查与自动合并工作流。
- 将仓库内 `AGENTS.md` 与专项规则文档纳入自动审查上下文。
- 定义 AI 审查的固定输出结构、blocking 规则、自动修复边界和自动 merge 门禁。
- 允许在满足权限与安全约束时，将低风险修复直接推回原 PR 的 head 分支。
- 在质量门与 AI 审查均通过后，直接 merge 原始 PR，而不是通过中间 `merge/pr-*` 分支二次开 PR。

## Impact
- Affected specs: 新增 `pr-automation`
- Affected code: `.github/workflows/`、可能新增 AI 调度脚本、PR 审查产物模板、仓库级文档

## 当前进度
- 已创建 proposal / design / tasks / spec delta
- 尚未开始 workflow 实现，等待提案确认后进入实现阶段
