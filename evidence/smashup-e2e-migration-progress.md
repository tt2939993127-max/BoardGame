# SmashUp E2E 迁移进度

最后更新：2026-03-20 07:42:55 +08:00

## 当前收口范围

- `e2e/smashup-we-are-the-champions.e2e.ts`
- `temp/smashup-e2e-slot-progress.md`
- `evidence/smashup-e2e-migration-progress.md`

## 本轮确认

- 本轮只执行了 1 次指定命令：`npm run test:e2e:ci -- e2e/smashup-we-are-the-champions.e2e.ts`
- 没有进行任何重试、循环或替代命令
- 失败发生在测试基建预检阶段，阻塞点是 `fork -> spawn EPERM`

## 单次验证记录

工作目录：`D:/gongzuo/webgame/BoardGame-wt-smashup`

执行时间：`2026-03-20 07:42:55 +08:00`

执行命令：

```powershell
npm run test:e2e:ci -- e2e/smashup-we-are-the-champions.e2e.ts
```

结果：失败，环境阻塞于 `fork -> spawn EPERM`

原始输出：

```text
> boardgame-platform@0.5.0 test:e2e:ci
> node scripts/infra/run-e2e-command.mjs ci e2e/smashup-we-are-the-champions.e2e.ts

❌ 当前运行环境不允许测试基建所需的 Node 子进程能力。
   场景: E2E
   失败阶段: fork
   错误: EPERM (spawn)
   详情: spawn EPERM

   这会直接阻塞以下链路:
   - Playwright worker (fork)
   - Vitest / E2E bundle-runner (esbuild service)
   - E2E 三服务启动与端口清理

   处理方式:
   - 改在本地终端、CI Runner 或允许 child_process 的环境执行
   - 如果只是当前沙箱受限，不要继续重试同一条测试命令
```

## 截图证据状态

- 本次没有进入 Playwright 执行阶段，因此没有生成新的截图证据。
- `D:/gongzuo/webgame/BoardGame-wt-smashup/test-results/evidence-screenshots/` 下未发现 `we-are-the-champions` 或 `champions` 相关截图。
- `D:/gongzuo/webgame/BoardGame-wt-smashup/test-results/playwright-artifacts/` 下未发现 `we-are-the-champions` 或 `champions` 相关产物。

## 当前 blocker

- 当前环境不允许 Node `child_process` / `fork`
- 该限制直接阻断 Playwright worker、bundle-runner 与三服务启动
- 按任务要求，遇到该 blocker 后仅记录证据并停止

## 后续动作

- 需要在允许 `child_process` / `fork` 的本地终端或 CI 环境重新执行同一条命令
- 只有命令通过后，才更新截图证据路径，并准备仅包含证据/进度文档的提交：`docs(e2e): record smashup champions validation evidence`
