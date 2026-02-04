## Context
- 当前 UGC 仅有 Builder 与 runtime SDK/桥接模块，缺少面向玩家的最终运行时入口。
- 资产管线已有 add-r2-asset-pipeline 规格与前缀约定，但 UGC 上传/压缩/存储尚未落地。
- 目标是实现“上传 → 浏览 → 游玩”的完整闭环，并明确不保留原始文件的存储策略。

## Goals / Non-Goals
### Goals
- 提供 UGC 最终运行时入口（按 packageId 加载）并接入宿主桥接/iframe。
- 包来源统一从服务器拉取已发布 Package；本地预览仅限 Builder。
- 资产上传接入 R2 管线，压缩后仅保留变体，不保留原始文件。
- 主页“自制”与“全部分类”可浏览 UGC 包并跳转运行时。

### Non-Goals
- 实现完整审核/上架工作流（仅保留发布状态与列表能力）。
- 实现匹配/房间系统的 UGC 专属玩法（先提供单人或宿主模式入口）。

## Decisions
- 运行时入口采用 `/ugc/play/:packageId`（或等价路由），由宿主加载 iframe 并绑定 UGCHostBridge/UGCViewSdk。
- 运行时仅加载服务器已发布包；Builder 预览允许使用本地数据。
- 资产上传在服务端执行压缩流程，若需要压缩且失败则拒绝上传（避免保留原始文件）。
- 资源对象存储前缀严格使用 `ugc/<userId>/<packageId>/...`，与 add-r2-asset-pipeline 保持一致。
- 运行时资源 URL 采用 `/assets/*` 归一化规则（由部署层反代到对象存储）。

## Risks / Trade-offs
- 音频压缩依赖 ffmpeg：需在环境中提供或在缺失时明确拒绝上传。
- 运行时入口引入 iframe 与桥接后，需要额外的通信与安全验证测试。

## Migration Plan
- 首次发布引入 UGC 包 API 与运行时入口；旧数据（若有）仅在 Builder 预览可见。

## Open Questions
- 运行时入口是否需要与现有大厅/对局系统统一路由结构？
- UGC 包发布状态是否需要区分草稿/已发布/下架等更多状态？
