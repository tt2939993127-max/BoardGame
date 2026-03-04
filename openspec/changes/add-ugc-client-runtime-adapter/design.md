# Design: add-ugc-client-runtime-adapter

## 设计目标
1. **真实联机一致性**：UGC 联机入口与服务端运行态语义一致，复用 MatchRoom。
2. **通用化**：不引入游戏特定硬编码，适配任意 UGC 包。
3. **可配置资源入口**：客户端可通过统一基址加载 UGC 资源。

## 关键设计

### 1) 客户端资源基址
- 新增 `UGC_ASSET_BASE_URL`（默认 `/assets`）。
- rules/view 的 `entryPoints` 为相对路径时统一使用 `${UGC_ASSET_BASE_URL}/${path}` 解析。

### 2) UGC 客户端加载器
- 输入：`packageId`。
- 行为：
  - 请求 `/ugc/packages/:packageId/manifest`。
  - 解析 `entryPoints.rules/view` 与玩家人数元数据。
  - 读取 `commandTypes`（若提供）以生成可枚举 moves。
  - 生成 `rulesUrl`/`viewUrl` 与运行态配置。
  - 输出：`UgcRuntimeConfig`（包含 rulesUrl/viewUrl/playersRange）。

### 3) UGC Client Game 工厂
- 新增 `createUgcClientGame(packageId)` 统一封装：
  - 拉取 manifest → 解析 rules 入口 → 获取 rulesCode。
  - 使用 RuntimeDomainExecutor 生成 DomainCore。
  - 使用 `createGameAdapter` 创建 Game（优先 commandTypes，缺失时 Proxy 兜底）。
  - 从 `metadata.playerOptions` 计算 min/max 玩家数（与服务端一致）。
- MatchRoom 渲染前等待 Game 构建完成，未完成显示 loading。

### 4) UGC Board (Remote Host)
- 复用 iframe + `UGCHostBridge` 通信协议，但**不执行 rulesCode**：
  - `getState` 直接返回 `G.core`（UGCGameState），必要字段缺失时从 `ctx` 补齐。
  - `onCommand` 调用 `moves[commandType](payload)` 向服务端派发。
- 视图入口优先加载包内 view；缺失时回退内置 runtime view。

### 5) MatchRoom 复用策略
- 若 `GAME_IMPLEMENTATIONS[gameId]` 不存在且 `GAMES_REGISTRY[gameId].isUgc` 为 true：
  - 调用 `createUgcClientGame(gameId)` 生成 Game。
  - Board 使用 UGC Remote Host，进入联机流程。
  - 加载中与错误态明确展示。

## 风险与对策
- **风险**：入口资源缺失导致运行态无法启动。
  - **对策**：加载器提供清晰错误提示，MatchRoom 显示不可用状态。
- **风险**：客户端未加载 rulesCode 导致 moves 不可枚举。
  - **对策**：Game 构建前置等待，确保 moves 可用后再渲染。
