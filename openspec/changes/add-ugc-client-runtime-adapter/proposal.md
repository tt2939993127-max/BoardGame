# Change: add-ugc-client-runtime-adapter

## Why
当前客户端仅能拉取 UGC 包列表与 manifest，但无法加载 view/rules 入口并注入到 MatchRoom，导致 UGC 联机无法进入真实运行态，预览与联机状态语义不一致。

## What Changes
- **UGC 客户端加载器**：解析 manifest.entryPoints，拼接 rules/view 入口 URL，并提供运行态配置。
- **UGC Client Game/Board 适配**：引入 Remote Host Board（仅透传命令，不执行 rulesCode）与异步 Game 构建，复用 MatchRoom。
- **命令类型枚举**：支持 manifest.commandTypes，生成可枚举 moves，减少 Proxy 兜底依赖。
- **资源基址配置**：新增 UGC_ASSET_BASE_URL（默认 /assets），统一拼接 entryPoints 资源路径。
- **视图入口策略**：优先加载包内 view，缺失时回退内置 runtime view。
- **联机范围**：UGC 联机仅支持已发布包，草稿仍用于 Builder 预览。
- **测试**：补充 UGC loader/MatchRoom 动态注入/运行态一致性验证。

## Impact
- Affected specs: `ugc-runtime`
- Affected code: UGC 客户端加载器、运行态 Board、MatchRoom 入口逻辑、前端配置与测试
