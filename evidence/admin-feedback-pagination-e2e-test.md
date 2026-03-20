# 后台反馈分页 E2E 证据

## 测试目标

验证后台反馈管理页不再固定拉取前 100 条，而是：

- 按 `page` + `limit=20` 请求反馈列表
- 支持点击分页按钮切换到下一页
- 页面底部正确展示区间、总数和页码

## 测试命令

```bash
npm run test:e2e:ci -- admin-feedback.e2e.ts
```

```bash
npm run test:e2e:ci:file -- admin-feedback.e2e.ts "反馈列表按页请求并可切换分页"
```

## 截图

截图路径：

`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\admin-feedback-pagination.png`

![后台反馈分页截图](../test-results/evidence-screenshots/admin-feedback-pagination.png)

## 截图分析

- 页面标题右侧显示 `21条`，说明前端已使用接口返回的 `total`，不再只显示当前页条数。
- 列表中当前只渲染“第二页反馈”这一条，符合测试桩中第 2 页只有 1 条数据的设定。
- 底部分页信息显示 `第 21-21 条，共 21 条`，说明区间计算正确。
- 分页指示器显示 `2 / 2`，且“下一页”按钮禁用，说明页码边界处理正确。
- E2E 断言同时验证了请求参数包含 `limit=20`，并且翻页后确实发出了 `page=2` 请求，不是前端本地假翻页。

## 结论

后台反馈页现在已经接入真实分页，打开页面时只会请求并渲染单页数据，能够明显降低反馈量大时的首屏卡顿风险。

## 2026-03-18 进展补充

- 管理页已从通用表格改成面向分诊的卡片流，直接展示 `clientContext`、`errorContext`、联系方式、状态快照与操作日志，减少转发前的二次整理。
- 列表接口新增 `severity` 查询参数，前端默认先看 `open` 反馈，并支持按类型、状态、严重程度组合筛选。
- “复制分诊包”现在会带上提交者邮箱、上下文、错误信息、日志和状态快照；展开卡片时也会直接预览这份真实 payload。

## 本次验证

- `npx eslint src/pages/admin/Feedback.tsx src/pages/admin/feedback-shared.tsx e2e/admin-feedback.e2e.ts apps/api/src/modules/feedback/dto.ts apps/api/src/modules/feedback/feedback.service.ts apps/api/test/feedback.e2e-spec.ts` ✅
- `npm run typecheck` ✅
- `npm run test:api -- feedback.e2e-spec.ts` ❌
  - 阻塞原因：当前环境无法启动 Vitest forks worker，报错为 `spawn EPERM`，并非反馈测试断言失败。
- `npm run test:e2e:ci:file -- admin-feedback.e2e.ts` ❌
  - 阻塞原因：E2E 单 worker 启动时，bundle runner 因 `native esbuild unavailable (spawn EPERM)` 回退到 `esbuild-wasm`，随后报 `The "wasmURL" option only works in the browser`，导致游戏/API 测试服务未能启动。
