## MODIFIED Requirements

### Requirement: 在线 AI 卡死必须有服务端权威兜底

系统 SHALL 在 `GameTransportServer` 内为在线房间的 AI 座位维护唯一的权威执行器。该执行器负责正常 AI 推进和停滞恢复；它不得依赖房主页面、浏览器 AI seat socket 或浏览器 AI 凭据。watchdog 只能审计停滞并请求该执行器从最新权威状态重新决策，不得成为第二个正式命令来源。

#### Scenario: 浏览器不存在时服务端仍正常推进 AI

- **GIVEN** 某个在线房间存在可行动的 AI seat
- **AND** 没有浏览器页面存活，或所有浏览器均处于后台/断线
- **WHEN** 服务端读取当前权威状态
- **THEN** 服务端 MUST 自行生成并执行该 AI 的合法动作
- **AND** 不得要求浏览器持有或使用 AI seat 凭据

#### Scenario: watchdog 发现停滞时不与常规执行竞争

- **GIVEN** 在线 AI 执行器尚未推进一个本应由 AI 处理的权威状态
- **WHEN** watchdog 到达停滞阈值
- **THEN** watchdog MUST 请求同一服务端执行器基于当前状态重新决策
- **AND** 不得重放旧 action、旧 payload 或另行作为 AI seat 提交并行命令

#### Scenario: 当前轮到真人时服务端不得误判为 AI 卡死

- **GIVEN** 当前活动回合属于 human seat，或当前 response window responder 属于 human seat
- **WHEN** 在线 AI 执行器或 watchdog 扫描房间状态
- **THEN** 系统 MUST 不生成任何 AI 正式动作或强制恢复动作
