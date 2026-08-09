# 在线 AI watchdog 自动反馈缺口复核（2026-07-29）

## 原始问题

- 用户指出：召唤师战争 AI 卡住时应自动上报，方便后续修复；如果没有对应自动反馈，就是自动反馈链路有问题。
- 本轮结论：这条判断成立。生产日志里能看到召唤师战争 watchdog 恢复了 AI 座位，但生产反馈库里没有对应的召唤师战争 `online-ai-watchdog` 系统反馈。

## 前提锁定

- 问题对象：召唤师战争在线 AI watchdog 恢复事件没有生成系统自动反馈。
- 真相来源：
  - 生产游戏服务日志：`boardgame-game-server` 最近 96 小时日志。
  - 生产反馈库：`boardgame.feedbacks` 集合。
  - 本地当前代码：`src/engine/transport/server.ts` 与 `src/engine/transport/__tests__/server.test.ts`。
- 目标入口/环境：
  - 代码修复入口是本机工作区 `D:\gongzuo\webgame\BoardGame`。
  - 线上事实核对入口是生产机 `8.148.71.102` 的 Docker 日志与 Mongo。
- 验收口径：
  - 生产事实：确认召唤师战争有 watchdog 恢复日志，且反馈库中召唤师战争自动反馈为 0。
  - 代码事实：当前树具备 `observed-recovery` 自动反馈分支，且测试覆盖该分支。
  - 发布事实：生产镜像是否已经包含该代码，需要单独核对，不能把本地修复说成已上线。

## 生产事实

### 恢复日志存在

生产 `boardgame-game-server` 最近 96 小时内命中两条召唤师战争恢复日志：

- `2026-07-28 01:59:03`：对局 `XRMwAErowGp`，游戏 `summonerwars`，AI 座位 `1`，原因 `seat-legal-only`，恢复前阵营未选，恢复后座位 1 选择 `yongheng`。
- `2026-07-28 14:09:21`：对局 `bx3Zz5aj-XK`，游戏 `summonerwars`，AI 座位 `1`，原因 `seat-legal-only`，恢复前阵营未选，恢复后座位 1 选择 `trickster`。

命令：

```powershell
ssh admin@8.148.71.102 "docker logs --since 96h boardgame-game-server 2>&1 | grep 'gameId.:.summonerwars' | tail -n 80"
```

### 对应系统反馈不存在

生产反馈库查询时间：`2026-07-29 08:54:23 +08:00`。

结果：

- 召唤师战争 `online-ai-watchdog` 系统反馈总数：`0`
- 召唤师战争 `online-ai-watchdog` 未收口系统反馈数：`0`

命令：

```powershell
@'
const active = ["open", "in_progress"];
const q = {
  $or: [
    { source: "online-ai-watchdog" },
    { contactInfo: "system:online-ai-watchdog" },
    { "errorContext.source": "online-ai-watchdog" },
    { content: /^\[system\]\[online-ai-watchdog\]/ }
  ],
  gameId: "summonerwars"
};
printjson({
  now: new Date(),
  summonerwarsWatchdog: db.feedbacks.countDocuments(q),
  summonerwarsWatchdogActive: db.feedbacks.countDocuments({ ...q, status: { $in: active } })
});
'@ | ssh admin@8.148.71.102 "docker exec -i boardgame-mongodb mongosh boardgame --quiet"
```

## 根因层级

- 这不是“召唤师战争 AI 卡住根因已经被证明修完”。
- 这次修的是自动反馈采集缺口：watchdog 已经观察到 AI 座位恢复并写了恢复日志，但当恢复路径没有走“已上报合法动作”或“强制推进成功”分支时，旧生产代码不会写入系统反馈。
- 生产镜像版本 `c4a720228e85dff880114b3d287028673a5fae3b` 中没有 `observed-recovery` 分支。
- 本地当前代码 `947c7811716b7b7149aee22048b864a203feadd6` 已包含提交 `0d2f44eba 扩展山屋惊魂剧本、The Gang规则重启与AI反馈`，其中补了召唤师战争 `observed-recovery` 自动反馈分支。

## 当前代码行为

`src/engine/transport/server.ts` 当前树逻辑：

- 当 watchdog 确认进度标记已经推进；
- 且本次没有执行强制恢复命令；
- 且没有已经上报的合法动作恢复；
- 且游戏是 `summonerwars`；
- 则写入一条 `observed-recovery` 系统反馈，状态为 `resolved`，原因形如 `seat-legal-only:observed-progress`，并附带状态快照和操作日志。

玩家影响：

- 该分支只记录已经观察到的恢复现场，不额外替玩家或 AI 执行动作。
- 触发点仍在在线 AI watchdog 恢复序列内，属于 AI 座位恢复采集，不会影响真人正常响应。

## 测试位点

- `src/engine/transport/__tests__/server.test.ts`
  - 用例：`online AI watchdog 在 summonerwars 观察到 AI 已恢复时也应写入系统反馈`
  - 覆盖：AI 座位从未选择阵营推进到已选择阵营，且 `reportedAction: null`、未用强制恢复命令时，反馈上报 payload 必须包含：
    - `incidentKind: "observed-recovery"`
    - `status: "resolved"`
    - `reason: "seat-legal-only:observed-progress"`
    - `stateSnapshot` / `actionLog` 中的 blocker 线索与 trackerKey

## 发布状态

- 本轮未执行生产部署。
- 当前生产 `boardgame-game-server` 镜像 revision 仍为 `c4a720228e85dff880114b3d287028673a5fae3b`。
- 因此：历史两条召唤师战争恢复事件不会自动补反馈；部署包含 `observed-recovery` 分支的版本后，新发生的同类恢复事件才会生成系统自动反馈。

## 2026-08-08 Dice Throne 进攻/防守阶段 stale_state 诊断优化

### 前提锁定

- 问题对象：Dice Throne 在线 AI 在进攻/防守阶段使用旧客户端状态连续提交命令，命令被服务端拒绝后看起来像卡死。
- 真相来源：此前已核对的线上故障样本、当前传输层实现，以及本轮新增的传输层和 AI 派发回归测试。
- 目标入口/环境：本机工作区 `D:\gongzuo\webgame\BoardGame` 的在线 AI 派发、状态同步和服务端反馈链路。
- 验收口径：旧状态命令不能被误认成成功；重同步期间当前 AI 尝试必须结束并重试；后续反馈必须能区分状态号断档、补丁应用失败和单纯服务端状态已前进。

### 已确认与未确认

- 已确认的直接机制：客户端带着较旧的 `expectedStateID` 提交命令时，服务端在进入领域逻辑前返回 `stale_state`；如果同一 AI 尝试继续使用旧现场重试，就会连续拒绝，最后只剩 watchdog 的阶段推进动作可执行。
- 这解释了“进攻/防守阶段卡住”的放大形状，但还不能证明旧状态为什么落后。状态落后可能来自补丁断档、补丁应用失败、同步请求尚未完成，或其他需要线上现场区分的时序问题。
- 因此本节记录的是“同步诊断增强 + stale_state 尝试收口”，不是“线上所有卡死根因已修复”。

### 本轮实现

- 在线 AI 单条命令和批量命令携带同一个尝试编号，服务端将它与失败命令、状态快照和操作记录关联。
- 客户端记录最近一次全量同步、普通状态更新、补丁应用、同步请求原因，以及最近一次补丁断档/应用失败；服务端接收后做长度和形状限制，只写入诊断，不参与命令裁决。
- 单条 AI 命令收到 `stale_state` 后立即结束当前尝试，等待重同步并安排重试，避免把重同步回包误判为原命令已经成功。
- 没有新增锁表、影子状态或第二套状态真相，也没有改变 Dice Throne 命令合法性和阶段推进规则。

### 本地验证

- `npm run typecheck`：通过。
- `npm run test:ai:decision-view -- --silent --reporter=dot`：440 项通过。
- `npx vitest run src/engine/transport/__tests__/patch.test.ts src/engine/transport/__tests__/server.test.ts src/pages/__tests__/matchSeatValidation.test.ts --silent --reporter=dot`：448 项通过。
- 目标文件 ESLint：通过；未发现临时 `DEBUG-*` 标记。

### 发布边界

- 本轮未执行提交、部署或线上反馈状态回写。
- 部署后下一次 Dice Throne stale 反馈，才能用新增的尝试编号和客户端同步现场判断是补丁断档、补丁应用失败、同步未完成，还是服务端正常前进导致的旧命令；在此之前不能把本地验证表述为线上原始卡死已彻底解决。
