---
name: github-pr-review-merge
description: "BoardGame 项目的 PR 审查、修复、合并补充规则。用于把原始 PR 作为唯一工作对象，默认要求处理完成后原始 PR 已 merge 并关闭，不把手动收尾留给用户。"
---

# BoardGame PR Review Merge

## 适用范围

当本项目中的任务涉及以下内容时使用本补充 skill：

- 审查 GitHub PR
- 修复 PR 中的问题
- 把修复推回 PR 分支
- 合并 PR
- 清理中间 PR / 临时 PR

如果只是普通代码解释、单纯本地调试或不涉及 PR 生命周期，则不使用本补充 skill。

## 项目默认终态

除非用户明确要求停在某一步，否则本项目里处理 PR 的默认终态必须是：

1. 原始 PR 已 merge
2. 原始 PR 已关闭
3. 不存在仍然打开、等待用户手动点按钮的中间 PR

不合格的收尾方式包括：

- “我已经推了，你去点 merge”
- “我已经修好了，等你手动关 PR”
- “我新开了一个 merge PR，你自己收尾”

## 默认流程

1. 读取原始 PR、review threads、机器人评论、CI 状态
2. 读取仓库根 `AGENTS.md` 和相关规范
3. 先做审查，输出 findings
4. 若允许自动修复，则直接改原 PR head 分支并补验证
5. 验证通过后，继续执行 merge
6. 检查最终状态，确认原始 PR 已关闭

## 中间分支 / worktree 规则

- `worktree`、`merge-main/*`、临时验证分支都只是执行手段，不是最终交付物
- 默认不创建中间 PR
- 如果因为历史流程、平台限制或已有工作区而使用了中间分支，结束时也不能把用户留在“还要手动 merge / close”的状态

## 允许停止的情况

只有以下情况可以不 merge：

- 用户明确说只审查或只推送
- 权限不足，无法对原始 PR 执行 merge
- 分支保护、必需审批、CI 门禁尚未满足
- 仍存在未解决的 blocking findings

此时必须明确汇报：

- 为什么不能 merge
- 卡在哪个门禁
- 还差哪一步

## 输出要求

仍然使用统一结构：

- `Findings`
- `Open Questions / Assumptions`
- `Summary`

但 `Summary` 里必须额外写清：

- 原始 PR 是否已 merge
- 原始 PR 是否已关闭
- 是否还存在任何中间 PR 或人工收尾步骤
