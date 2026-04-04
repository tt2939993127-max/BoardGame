# 反馈开放接口与状态约定

## 接口

- 列表：`GET /feedback/open?status=<status>&page=<n>&limit=<n>`
- 详情：`GET /feedback/open/:id`
- 改状态：`PATCH /feedback/open/:id/status`

## 状态含义

- `open`
  - 新进入待处理队列，还没有明确有人接手。
- `in_progress`
  - 已经确认由当前轮分析或某个子 agent 接手。
- `resolved`
  - 已确认是真 bug，且代码与验证已经完成。
- `closed`
  - 不是真 bug、重复反馈、已失效、或无需代码修复。

## 本 skill 默认策略

1. 默认只拉 `open,in_progress`，不把已 `resolved` 的历史项重新塞回待处理队列。
2. 先按重复组收敛到代表项，再决定是否并行。
3. 只有在确认代表项是真 bug 且修复完成后，才把代表项改成 `resolved`。
4. 如果代表项不是 bug，或确认只是重复项，则改成 `closed`。
5. 重复项不要和代表项并行开工，先等代表项结论，再统一收口。
