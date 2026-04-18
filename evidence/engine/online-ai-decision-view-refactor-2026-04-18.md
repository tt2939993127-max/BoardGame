# 在线 AI 决策视图重构（2026-04-18）

## 本轮目标
- 修复“seat stale 时公开 setup / 公开决策也被一起拦死”的框架级问题
- 保留旧的 stale-seat 防护，避免私有决策继续基于过期 seat 视角抢跑
- 统一客户端 `MatchRoom`、`resolveNextAiAction`、服务端 watchdog / legal-action recovery 的决策口径

## 设计结论
- 在线 AI 统一使用 `authoritative shared + private overlay` 视图
- 默认自动推断本次决策是 `shared` 还是 `private-required`
- 仅当框架无法从结构稳定推断时，才允许游戏 runtime 用 `resolveOnlineDecisionVisibility()` 少量覆盖

## 实际改动
- 新增 [src/engine/ai/onlineDecisionView.ts](/D:/gongzuo/webgame/BoardGame/src/engine/ai/onlineDecisionView.ts)
  - 统一输出 `visibility / canDecide / blockedReason / visibleState / diagnostics`
  - 默认规则：
    - response window、hidden interaction、seat 专属候选 → `private-required`
    - 其余 → `shared`
- 更新 [src/engine/ai/localRunner.ts](/D:/gongzuo/webgame/BoardGame/src/engine/ai/localRunner.ts)
  - `visibleStateResolver` 现可返回统一决策视图
  - `canDecide=false` 时直接跳过该 AI，不再错误回退到共享视角
- 更新 [src/pages/MatchRoom.tsx](/D:/gongzuo/webgame/BoardGame/src/pages/MatchRoom.tsx)
  - 删除页面内散落的 seat freshness 一刀切判断
  - 改为统一走 `resolveOnlineAiDecisionView()`
- 更新 [src/engine/transport/server.ts](/D:/gongzuo/webgame/BoardGame/src/engine/transport/server.ts)
  - legal-action recovery 也走同一 helper，客户端与服务端共享一套语义

## 回归验证
- `npx vitest run src/pages/__tests__/matchSeatValidation.test.ts`
  - 62/62 通过
  - 新增覆盖：
    - 公开 setup 在 stale overlay 下仍能基于 shared 继续
    - private-required 决策在 stale overlay 下继续被阻止
- `npx vitest run src/engine/transport/__tests__/server.test.ts`
  - 43/43 通过
  - 同步修正历史断言：legal-action recovery 既然已定义为要写 `legal-action-recovered` 反馈，相关测试不再宣称“不会上报”
- `npm run typecheck`
  - 通过

## 文档与规范
- 已更新 [docs/ai-rules/engine-systems.md](/D:/gongzuo/webgame/BoardGame/docs/ai-rules/engine-systems.md)
  - 新增“在线 AI 决策视图（强制）”章节
- 已更新 OpenSpec 变更任务

## 当前边界
- 当前 runtime 仍然消费单份 `visibleState`，还没有把“公共字段 + 私有 overlay 字段”下沉到每个游戏的 `buildLegalActions()` 参数层
- 本轮先统一决策口径与阻断条件，后续若出现结构上无法稳定推断的少数场景，再通过 runtime override 补充

## 结论
- 这轮不是 SummonerWars 单点修补，而是全游戏在线 AI 决策入口的框架级收敛
- 公开决策不再被 stale seat 误伤
- 私有决策仍保留 stale-seat 防护
