# 需求文档：增量状态同步 (Incremental State Sync)

## 简介

当前桌游平台每次命令执行后，服务端通过 `broadcastState()` 向所有客户端推送完整的 `viewState`。随着游戏状态复杂度增长（卡牌、单位、buff、事件流等），全量状态的序列化与传输开销显著增加。本功能引入基于 JSON Patch (RFC 6902) 的增量状态同步机制，仅推送状态变更部分（diff），大幅降低带宽消耗和序列化开销，同时保留全量同步作为可靠回退手段。

## 术语表

- **Transport_Server**: 服务端传输层（`GameTransportServer`），负责命令执行、状态管理和广播
- **Transport_Client**: 客户端传输层（`GameTransportClient`），负责连接管理、命令发送和状态接收
- **ActiveMatch**: 服务端内存中的活跃对局上下文，包含状态、连接、版本号等
- **ViewState**: 经 `playerView` 过滤 + `stripStateForTransport` 裁剪后的玩家可见状态
- **JSON_Patch**: 符合 RFC 6902 规范的 JSON 操作序列，描述从一个 JSON 文档到另一个的变更
- **Patch_Operation**: JSON Patch 中的单个操作（add / remove / replace / move / copy / test）
- **StateID**: 状态版本号，每次命令执行后单调递增，用于客户端校验状态连续性
- **Optimistic_Engine**: 客户端乐观更新引擎，负责本地预测、服务端确认和回滚调和
- **Full_Sync**: 全量状态同步，推送完整 ViewState（现有 `state:update` 行为）
- **Incremental_Sync**: 增量状态同步，仅推送 JSON Patch 差异
- **Resync**: 客户端主动请求全量状态重新同步（通过现有 `sync` 事件）
- **Last_Broadcasted_View**: 服务端为每个玩家缓存的上一次广播的 ViewState，用于计算 diff 基准

## 需求

### 需求 1：服务端 Diff 计算与缓存

**用户故事：** 作为平台开发者，我希望服务端能计算每个玩家的状态变更差异，以便只推送变化的部分而非完整状态。

#### 验收标准

1. THE Transport_Server SHALL 在 ActiveMatch 中维护 `lastBroadcastedViews: Map<string, object>` 缓存，为每个已连接玩家存储上一次广播的 ViewState
2. WHEN `broadcastState()` 执行时，THE Transport_Server SHALL 对每个玩家使用 `fast-json-patch` 库的 `compare()` 函数，基于 `lastBroadcastedViews` 中的缓存与当前 ViewState 计算 JSON Patch 差异
3. WHEN diff 计算完成后，THE Transport_Server SHALL 将当前 ViewState 写入 `lastBroadcastedViews` 缓存，替换旧值
4. WHEN 玩家首次连接（`lastBroadcastedViews` 中无该玩家缓存）时，THE Transport_Server SHALL 通过现有 `state:sync` 事件发送全量状态，并将该 ViewState 写入缓存
5. WHEN 玩家断开连接时，THE Transport_Server SHALL 从 `lastBroadcastedViews` 中移除该玩家的缓存条目
6. WHEN 对局被卸载（`unloadMatch`）时，THE Transport_Server SHALL 清空该对局的 `lastBroadcastedViews` 缓存


### 需求 2：增量 Patch 推送协议

**用户故事：** 作为平台开发者，我希望定义清晰的增量推送协议事件，以便客户端能正确接收和应用状态差异。

#### 验收标准

1. THE Transport_Server SHALL 新增 `state:patch` 服务端事件，payload 包含：matchID（对局 ID）、patches（JSON Patch 操作数组）、matchPlayers（玩家信息数组）、meta（元数据对象，包含 stateID、lastCommandPlayerId、randomCursor）
2. THE `ServerToClientEvents` 协议接口 SHALL 包含 `state:patch` 事件的类型定义
3. WHEN diff 计算结果为非空 patch 数组时，THE Transport_Server SHALL 通过 `state:patch` 事件推送增量更新
4. WHEN diff 计算结果为空 patch 数组（状态未变化）时，THE Transport_Server SHALL 跳过该玩家的推送
5. THE Transport_Server SHALL 在 `state:patch` 事件的 meta 中携带与 `state:update` 相同的 stateID、lastCommandPlayerId 和 randomCursor 字段

### 需求 3：全量回退机制

**用户故事：** 作为平台开发者，我希望在增量同步不可用时自动回退到全量同步，以保证状态同步的可靠性。

#### 验收标准

1. WHEN diff 计算过程中发生异常时，THE Transport_Server SHALL 捕获异常并回退到通过 `state:update` 事件发送全量状态
2. WHEN diff 计算产生的 patch 数组序列化后体积超过全量状态序列化体积的 80% 时，THE Transport_Server SHALL 回退到通过 `state:update` 事件发送全量状态
3. IF diff 计算回退到全量同步，THEN THE Transport_Server SHALL 记录一条 warn 级别日志，包含 matchID 和回退原因
4. THE Transport_Server SHALL 在回退到全量同步后，仍然更新 `lastBroadcastedViews` 缓存

### 需求 4：客户端 Patch 接收与应用

**用户故事：** 作为平台开发者，我希望客户端能正确接收增量 patch 并还原出完整状态，以便传递给现有的状态处理链路。

#### 验收标准

1. THE Transport_Client SHALL 监听 `state:patch` 事件
2. WHEN 收到 `state:patch` 事件时，THE Transport_Client SHALL 使用 `fast-json-patch` 库的 `applyPatch()` 函数，将 patch 应用到本地缓存的最新状态（`_latestState`）上，得到完整的新状态
3. WHEN patch 应用成功后，THE Transport_Client SHALL 将还原后的完整状态传递给 `onStateUpdate` 回调，行为与收到 `state:update` 事件一致
4. THE Transport_Client SHALL 同时保留对 `state:update` 事件的监听，确保全量同步通道始终可用
5. WHEN 收到 `state:update`（全量）事件时，THE Transport_Client SHALL 用全量状态替换本地缓存，覆盖任何增量累积的状态

### 需求 5：客户端 Patch 应用失败处理

**用户故事：** 作为平台开发者，我希望客户端在 patch 应用失败时能自动恢复，避免状态不一致导致游戏异常。

#### 验收标准

1. IF `applyPatch()` 抛出异常或返回包含错误的结果，THEN THE Transport_Client SHALL 丢弃该 patch，不更新本地状态
2. IF patch 应用失败，THEN THE Transport_Client SHALL 记录一条 warn 级别的控制台日志，包含 matchID 和错误信息
3. IF patch 应用失败，THEN THE Transport_Client SHALL 通过现有 `sync` 事件向服务端请求全量 Resync
4. WHEN Resync 完成后（收到 `state:sync` 响应），THE Transport_Client SHALL 用全量状态替换本地缓存，恢复正常的增量同步流程

### 需求 6：StateID 连续性校验

**用户故事：** 作为平台开发者，我希望客户端能检测状态版本号的连续性，在丢失更新时主动请求重新同步。

#### 验收标准

1. THE Transport_Client SHALL 维护本地 `lastReceivedStateID` 字段，记录最近一次成功处理的 stateID
2. WHEN 收到 `state:patch` 事件时，THE Transport_Client SHALL 校验 meta.stateID 是否等于 `lastReceivedStateID + 1`
3. IF meta.stateID 不等于 `lastReceivedStateID + 1`（版本号不连续），THEN THE Transport_Client SHALL 丢弃该 patch 并通过 `sync` 事件请求全量 Resync
4. WHEN 收到 `state:sync` 或 `state:update`（全量）事件时，THE Transport_Client SHALL 将 `lastReceivedStateID` 更新为该状态携带的 stateID
5. WHEN 收到 `state:patch` 且校验通过后，THE Transport_Client SHALL 将 `lastReceivedStateID` 更新为 meta.stateID

### 需求 7：与乐观更新引擎的集成

**用户故事：** 作为平台开发者，我希望增量同步与现有的乐观更新引擎无缝协作，不破坏本地预测和回滚调和机制。

#### 验收标准

1. WHEN Transport_Client 收到 `state:patch` 并成功还原出完整状态后，THE Transport_Client SHALL 将完整状态和 meta 传递给 `onStateUpdate` 回调，与全量 `state:update` 的调用签名一致
2. THE Optimistic_Engine 的 `reconcile()` 方法 SHALL 无需修改即可处理来自增量同步还原的完整状态
3. WHEN 乐观引擎发生回滚（`didRollback=true`）时，THE Transport_Client SHALL 使用回滚后的权威状态更新本地缓存（`_latestState`），确保后续 patch 应用基准正确

### 需求 8：现有全量同步场景保持不变

**用户故事：** 作为平台开发者，我希望重连同步、批次确认等场景继续使用全量状态，确保这些关键路径的可靠性。

#### 验收标准

1. WHEN 客户端发送 `sync` 请求（连接/重连）时，THE Transport_Server SHALL 继续通过 `state:sync` 事件返回全量状态
2. WHEN 批次命令执行成功后，THE Transport_Server SHALL 继续通过 `batch:confirmed` 事件返回全量权威状态
3. WHEN 批次命令执行失败回滚后，THE Transport_Server SHALL 继续通过 `state:update` 事件广播全量回滚状态
4. THE Transport_Server SHALL 在发送 `state:sync` 全量状态后，将该状态写入 `lastBroadcastedViews` 缓存，确保后续增量 diff 基准正确

### 需求 9：旁观者增量同步

**用户故事：** 作为平台开发者，我希望旁观者也能享受增量同步的带宽优化。

#### 验收标准

1. THE Transport_Server SHALL 为旁观者维护独立的 `lastBroadcastedViews` 缓存条目（使用 `spectator` 作为 key）
2. WHEN 向旁观者广播状态时，THE Transport_Server SHALL 对旁观者视图执行与玩家相同的 diff 计算和增量推送逻辑
3. WHEN 旁观者断开连接且无其他旁观者时，THE Transport_Server SHALL 从 `lastBroadcastedViews` 中移除旁观者缓存条目

### 需求 10：Patch 序列化与传输

**用户故事：** 作为平台开发者，我希望 JSON Patch 能与现有的 msgpack 序列化和帧压缩机制兼容。

#### 验收标准

1. THE `state:patch` 事件的 payload SHALL 通过现有的 msgpack 序列化器进行编码，与 `state:update` 使用相同的序列化通道
2. THE `state:patch` 事件 SHALL 受益于现有的 `perMessageDeflate` WebSocket 帧压缩，无需额外配置
3. THE JSON_Patch 操作数组 SHALL 使用标准 RFC 6902 格式（`{ op, path, value?, from? }`），确保与 `fast-json-patch` 库的 `applyPatch()` 兼容

### 需求 11：状态注入后的缓存一致性

**用户故事：** 作为平台开发者，我希望测试环境下的状态注入（`injectState`）不会导致增量同步产生错误的 diff。

#### 验收标准

1. WHEN `injectState()` 被调用后，THE Transport_Server SHALL 清空该对局的 `lastBroadcastedViews` 缓存中所有玩家的条目
2. WHEN `injectState()` 触发的 `broadcastState()` 检测到缓存为空时，THE Transport_Server SHALL 回退到全量 `state:update` 推送，并将新状态写入缓存

### 需求 12：JSON Patch 的 Round-Trip 正确性

**用户故事：** 作为平台开发者，我希望确保 diff → patch → apply 的往返过程不会丢失或篡改任何状态数据。

#### 验收标准

1. FOR ALL 合法的 ViewState 对象对 (oldState, newState)，使用 `compare(oldState, newState)` 生成 patch 后再 `applyPatch(deepClone(oldState), patches)` SHALL 产生与 newState 深度相等的结果（round-trip 属性）
2. THE Transport_Server SHALL 使用 `fast-json-patch` 库的 `compare()` 函数生成 patch，该函数保证生成的 patch 符合 RFC 6902 规范
3. THE Transport_Client SHALL 使用 `fast-json-patch` 库的 `applyPatch()` 函数应用 patch，并启用 `validate` 选项以检测无效操作