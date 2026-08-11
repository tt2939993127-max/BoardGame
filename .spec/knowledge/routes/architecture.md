# 引擎与共享架构

本路由处理跨游戏或跨页面的运行时职责、状态真相、传输和服务集成。单游戏规则问题先走 [`规则与游戏逻辑`](rule-bug.md)，不要把架构入口当成规则真相源。

## 引擎与状态

- 新增/修改 ActionLog 伤害来源标注：读 [`engine-action-log`](../standards/engine-action-log.md) 的伤害来源章节。
- 判断活跃交互、阻止手牌操作或复用 `interactionBusy`：读 [`engine-systems`](../standards/engine-systems.md) 的 `useIsInteractionBusy` 入口。
- 游戏结束检测：读 [`engine-gameover`](../standards/engine-gameover.md)。
- 传输层、Board props、socket、dispatch、Provider：读 [`engine-transport`](../standards/engine-transport.md)。
- 乐观更新、延迟优化和预测：读 [`engine-transport`](../standards/engine-transport.md) 与 [`engine-visual-events`](../standards/engine-visual-events.md)。
- 状态同步、存储和 MongoDB 16MB 限制：读 [`MongoDB 16MB 处理`](../../../docs/mongodb-16mb-fix.md)。
- Undo/Fab、撤回后自动推进或阶段恢复：读 [`Undo/Fab 组件`](../../../docs/components/UndoFab.md) 与 [`undo-auto-advance`](../standards/undo-auto-advance.md)。
- 修改全局 Context、Toast、Modal、音频、教学、认证或实时服务：读 [`global-systems`](../standards/global-systems.md)。
- React 渲染错误、白屏、函数未定义或高频交互抖动：读 [`golden-rules`](../standards/golden-rules.md)。

## 共享层、AI 与接口

- 重构 shared helper、watchdog、transport、response-window、跨游戏 override 或状态真相源：先读 [`shared-refactor-guard`](../standards/shared-refactor-guard.md)，再回 [`测试与审计`](testing.md) 做消费者和回归验证。
- 处理系统反馈、watchdog 自动反馈或在线 AI 决策视图：读 [`engine-systems`](../standards/engine-systems.md) 的对应章节。
- AI 接入、AI 适配、自动回合、自动响应或自动跳过：读项目 [`game-ai-adaptation`](../../skills/game-ai-adaptation/SKILL.md)，并核对 [`ui-ux`](../standards/ui-ux.md) 的玩家可见交互边界。
- 前端/新增游戏引擎组件：读 [`frontend`](../../../docs/framework/frontend.md)；后端/数据库/NestJS/Mongo：读 [`backend`](../../../docs/framework/backend.md)；REST/WS 联调：读 [`API 入口`](../../../docs/api/README.md)。
- 新游戏领域建模和引擎能力缺口：转 [`规则与游戏逻辑`](rule-bug.md) 的新游戏入口，再回本路由审查共享边界。

## 工具与表现基础设施

- 新增作弊/调试指令：读 [`debug tool 重构`](../../../docs/debug-tool-refactor.md)。
- AudioContext 或音频浏览器兼容：读 [`golden-rules`](../standards/golden-rules.md) 的 AudioContext 章节；资源录入转 [`资源与数据录入`](data-assets.md)。
