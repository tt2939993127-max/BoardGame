# Change: 将在线 AI 的正式执行权收敛到服务端

## Why

当前在线 AI 有两个能代表同一 AI 座位提交正式命令的入口：浏览器内的 `OnlineAiSeatBridge` 与服务端 recovery watchdog。生产对局日志已证明这两个入口会竞争同一状态版本：服务端先推进权威状态后，浏览器仍提交基于旧版本的 AI 命令，服务端只能以过期状态拒绝它并要求同步。

现有座位级熔断用于限制失败循环，仍应保留；但它是在两个执行者已经竞争之后止血，不能替代唯一执行权。本变更把在线 AI 的决策和正式命令执行收敛为服务端唯一职责，浏览器只展示同步状态和动画，从结构上消除这类并发竞争。

这项已确认的业务缺陷不能被表述为 CPU 告警的根本原因。CPU 是否因此降低，必须在部署后的 profile、AI 执行记录与指标中独立验证。

## What Changes

- **BREAKING**：普通在线对局不再在浏览器创建 AI 座位传输连接，也不再向浏览器下发或使用 AI 座位凭据提交正式命令。
- 服务端新增在线 AI 的常规执行循环，复用已有合法动作、`playerView` 和权威 pipeline；正常回合、私有交互、响应窗口及公开准备选择均由该循环驱动。
- 现有 watchdog 改为同一服务端执行器的停滞审计与受控恢复入口，不再成为浏览器 AI 的竞争对手。
- 浏览器保留人类玩家命令的乐观显示、权威状态同步与动画；移除普通在线 AI 的浏览器自动派发、自动恢复和 AI 座位 socket 生命周期。
- 为每一次服务端 AI 决策/执行记录结构化诊断，以便把高 CPU profile 与具体对局、座位、状态版本和执行耗时关联。
- 保留已有过期状态拒绝和在线 AI 座位级熔断，作为旧客户端指令和真实外部竞态的拒绝/止血机制，而不是正常控制流程。

## Impact

- Affected specs: `game-ai-system`, `online-ai-decision-view`, `online-ai-recovery`
- Affected code: `src/engine/transport/server.ts`、在线 AI 决策/恢复 helper、`src/pages/onlineAiSeatBridge.tsx` 及其 transport/dispatch/recovery hooks、传输层与 Smash Up 回归测试
- Compatibility: 人类在线命令、其乐观更新、合包和服务端确认保持现有行为；旧浏览器客户端携带的 AI 命令继续由状态版本与权限边界拒绝
- Related change: `refactor-online-ai-circuit-breaker` 保留为失败预算和现场诊断 owner，本变更不复制或新建第二套失败状态
- Deployment: 本 change 不自动发布或重启生产。通过回归后，必须按正式部署路径采集迁移前后服务端 AI 单步耗时、CPU 与 profile 关联证据
