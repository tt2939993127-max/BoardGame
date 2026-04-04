---
name: feedback-closeout
description: 用于 BoardGame 项目中批量处理后台反馈、开放反馈接口收口、重复反馈排重、真假 bug 分诊、并行修复与状态回写。用户提到“处理反馈”“收口反馈”“拉未关闭反馈”“批量 triage 反馈”“根据反馈修 bug”“关闭误报/重复反馈”“多 agent 并行处理反馈”时使用。
---

# 反馈收口

## 概览

这个 skill 负责把“看反馈”收敛成一条固定流水线：先从开放接口抓取未收口反馈，再排重、分类、挑出可并行的非冲突候选，最后由多个子 agent 分别判断真假 bug、修复代码并回写状态。

优先使用本 skill 自带脚本，不要手工拼 URL、手工拷贝 JSON、手工维护重复组。

## 先读

- 仓库根 `AGENTS.md`
- `docs/ai-rules/testing-audit.md`
- `docs/testing-best-practices.md`
- 本 skill 的 [feedback-open-api.md](references/feedback-open-api.md)

## 工作流

### 1. 拉取并排重

先运行：

```bash
node .windsurf/skills/feedback-closeout/scripts/triage-open-feedback.mjs --base-url http://127.0.0.1:3000 --slots 4
```

脚本会：

- 默认抓取 `open,in_progress`
- 按内容与错误签名做重复组归并
- 产出 `temp/feedback-closeout/<timestamp>/summary.json`
- 为每个代表项生成一份 Markdown 诊断包
- 选出一组 `parallelCandidates`，用于后续并行分派

### 2. 先分类，再决定真假 bug

按 `summary.json` 中的代表项处理，不要把重复项当独立问题并行开工。

分类规则：

- `bug_candidate`
  - 进入真实排查流程。
- `non_bug`
  - 优先检查是否只是建议、体验意见、已知行为、或重复上报。
- `needs_review`
  - 证据不足，先人工阅读诊断包再决定。

判断真假 bug 时，必须先检查：

1. 用户描述和现有实现是否真的冲突。
2. 反馈是否只是重复、误用、环境噪音、历史已修复问题。
3. 若是 bug，最小可复现链路和可疑模块是什么。

### 3. 只并行不冲突的代表项

并行前必须满足：

- 每个子 agent 只接一个代表项。
- 只挑 `parallelCandidates`，或你自己确认 `conflictKey` 不冲突。
- 多个子 agent 不能同时写同一批关键文件。
- 同一重复组只允许一个 agent 处理代表项。

使用子 agent 时必须显式固定模型配置：

- `model: gpt-5.4`
- `reasoning_effort: high`

给 worker 的任务必须包含：

- 反馈 ID
- 诊断包路径
- 该 worker 负责的文件或模块边界
- 明确要求先判断“是不是真 bug”
- 如果不是 bug，禁止改代码，直接回传结论
- 如果是 bug，修复后必须跑匹配验证，再回写状态

### 4. 状态回写规则

只在拿到明确结论后改状态：

- 误报、建议、重复、已失效
  - 改 `closed`
- 确认为 bug，且代码与验证已完成
  - 改 `resolved`
- 预计要持续处理较久，且已经明确接手
  - 可先改 `in_progress`

使用：

```bash
node .windsurf/skills/feedback-closeout/scripts/update-feedback-status.mjs <feedbackId> <status> --base-url http://127.0.0.1:3000
```

### 5. 交付口径

最终汇报必须明确：

- 总共抓到了多少条未收口反馈
- 归并成多少个代表项
- 哪些被判定为重复并关闭
- 哪些不是 bug 并关闭
- 哪些是真 bug，改了什么，验证了什么，状态已改为 `resolved`
- 哪些还未处理，以及为什么不能并行

## 资源

### scripts/

- `triage-open-feedback.mjs`
  - 拉取开放反馈、排重、分类、生成诊断包与并行候选。
- `update-feedback-status.mjs`
  - 用开放接口回写状态。

### references/

- `feedback-open-api.md`
  - 开放接口与状态语义。
