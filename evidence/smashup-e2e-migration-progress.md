# SmashUp E2E 迁移进度

最后更新：2026-03-19

## 当前收口范围

- `e2e/framework/GameTestContext.ts`
- `e2e/smashup-we-are-the-champions.e2e.ts`
- `scripts/infra/e2e-port-config.js`
- `evidence/smashup-e2e-migration-progress.md`

## 本轮确认内容

- `GameTestContext` 补齐了当前新框架用例实际依赖的等待与响应窗口辅助方法：
  - `waitForNoInteraction`
  - `waitForResponseWindow`
  - `getCurrentPlayerId`
  - `getPlayerState`
  - `waitForCurrentPlayer`
  - `waitForPhase`
  - `selectInteractionOptionBy`
  - `passResponseWindow`
- 关键 `waitForFunction` 轮询统一显式指定 `polling: 200`
- `smashup-we-are-the-champions.e2e.ts` 已切到 `afterScoring` 快照来源链路，并收回到 `playCard()` helper，避免手点卡牌后立即点基地的时序抖动
- 单 worker E2E 端口支持通过环境变量覆盖默认值，降低固定端口冲突风险

## 本次最小验证

已执行：

```powershell
npm run test:e2e:ci -- e2e/smashup-we-are-the-champions.e2e.ts
```

结果：

- 未进入测试断言
- 在 E2E 基建启动前被当前环境阻塞：`fork -> spawn EPERM`

## 当前 blocker

- 当前沙箱不允许 Node `child_process` / `fork`
- 这会直接阻塞：
  - Playwright worker
  - E2E 三服务启动
  - esbuild service

## 最小下一步

在允许 `child_process` / `fork` 的本地终端或 CI 环境重新执行：

```powershell
npm run test:e2e:ci -- e2e/smashup-we-are-the-champions.e2e.ts
```

若该条通过，再补截图核对并提交这 4 个文件。
