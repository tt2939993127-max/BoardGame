## Context
- 现有联机“创建房间”弹窗已经支持 `playerOptions` 与 `setupOptions`，并且大杀四方的 `manifest.setupOptions.expansions` 已声明 Titans 多选字段。
- 现有“对战 AI”入口直接跳转 `/play/:gameId/local`，本地对局只解析人数和 seat controller，没有解析 `setupOptions`。
- 联机 `GameProvider` 本身不消费 `seatControllers`，因此如果要在房间里支持 AI，必须补一层房主托管的 AI runner。
- 用户要求这是一个通用能力，首个试点是大杀四方，并且登录用户需要保存到数据库。

## Goals / Non-Goals
- Goals:
  - 让“创建房间”成为唯一的 AI 开局配置入口
  - 为每个游戏记住最近一次 AI 开局偏好
  - 让房间内 AI 座位可由房主客户端托管执行
- Non-Goals:
  - 不新增服务端常驻 AI 进程
  - 不把所有房间参数都纳入本次持久化，只覆盖人数、`setupOptions` 与 AI 座位

## Decisions
- Decision: 删除“本地 AI 独立配置弹窗”这条主入口，直接把 AI 座位配置并入 `CreateRoomModal`。
  - Why: 用户目标是“多人和 AI 对战”走创建房间主链路，同时避免两套 setup 表单并存。
- Decision: 偏好只在用户确认开始对局时保存，而不是在弹窗每次切换时即时写库。
  - Why: 减少无意义写入，也符合“开局参数”而不是“实时设置”的语义。
- Decision: 登录用户偏好按 `gameId` 存在 `user-settings` 的 UI 设置文档中，游客继续走 localStorage。
  - Why: 与现有光标 / UI hints 的账号级 UI 设置放在同一文档里，避免新增并行设置集合。
- Decision: 房间 AI 由房主客户端托管，每个 AI 座位单独 `claim-seat` 获取凭证，再通过后台 `GameTransportClient` 发命令。
  - Why: 复用现有 AI 决策与 socket 鉴权体系，避免为本轮再造一套服务端 AI runner。

## Risks / Trade-offs
- 合并 AI 座位区后，创建房间弹窗高度会显著增加。
  - Mitigation: 弹窗必须改为固定头尾 + 中部滚动，确保确认按钮始终在视口内。
- 房主关闭页面时，房间 AI 会暂停。
  - Mitigation: 明确本轮采用“房主托管”模型；房主重连后可凭本地保存的 AI seat credentials 自动恢复。
- 房主玩家视图不足以直接驱动所有 AI 座位。
  - Mitigation: 为每个 AI 座位建立后台 `GameTransportClient`，使用该座位自己的同步视图做决策。

## Migration Plan
1. 新增 spec 与用户设置字段
2. 先打通本地缓存与登录读写
3. 把 `CreateRoomModal` 扩成统一 AI 配置入口
4. 在 `MatchRoom` 接入房主托管 AI runner
5. 最后用大杀四方验证人数与 Titans 的实际生效

## Open Questions
- 暂无；当前采用房主托管 AI，后续若要支持“房主离线后 AI 继续运行”，再单独演进为服务端托管方案
