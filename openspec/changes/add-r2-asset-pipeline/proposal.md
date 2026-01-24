# Change: Add R2 Asset Pipeline (Official First, UGC Optional)

## Why
美术/音效资源规模大、迭代频繁，直接进入 Git 远程仓库会导致体积膨胀、超出平台限制、PR/CI 拉取缓慢，且阻碍陌生人协作与长期扩展。

当前代码已具备“资源路径收口”的基础（例如 `src/core/AssetLoader.ts` 对 `/assets` 的统一前缀、图片变体派生、语言化路径、以及音频管理器通过 `assetsPath()` 归一化路径）。因此可以在不大改业务的前提下，将官方资源迁移到 Cloudflare R2，并以同域 `/assets/*` 的方式对外提供。

## What Changes
- 官方资源从 Git 仓库迁出，作为部署产物发布到 Cloudflare R2；应用继续以同域 `/assets/...` 访问资源（通过反代/CDN 映射到 R2）。
- 引入“资源 Manifest”（自动生成）作为官方资源的权威索引，用于：
  - 预加载/校验（防止缺资源导致运行时错误）
  - 版本化与缓存策略（为未来 immutable 缓存与回滚留出空间）
  - 与现有游戏清单生成脚本形成一致的“自动发现 → 生成权威清单”工作流
- 资源路径规范化：继续使用无扩展名“资源 base path”（如 `dicethrone/images/.../compressed/dice-sprite`），由运行时派生 `.avif/.webp`，并对 `.atlas.json`/`.json` 等显式扩展保持兼容。
- UGC 相关作为可选能力：规定资源 key 前缀、manifest 格式一致性与未来扩展点，但不强制在本次变更实现上传/审核/上架流程。

## Non-Goals
- 本次不要求完成 R2/Cloudflare 的具体部署配置（由运维/部署文档或后续任务完成）。
- 本次不要求实现 UGC 上传、自动审核、以及 Worker 网关的鉴权/白名单逻辑（仅定义可演进的规范与接口预留）。

## Impact
- Affected specs:
  - New: `asset-routing`（资源访问路由约束）
  - New: `asset-manifest`（官方资源清单与生成/发布要求）
  - New (optional): `ugc-asset-manifest`（UGC 资源清单约束，未要求实现上传审核）
- Affected code (implementation stage):
  - `src/core/AssetLoader.ts`（资产 base 路由配置化、保持 `/assets` 默认）
  - `src/lib/audio/AudioManager.ts`（保持与 `assetsPath()` 的一致）
  - `scripts/`（新增资产 manifest 生成脚本；与现有 `scripts/generate_game_manifests.js` 并列）
  - `.gitignore`（明确忽略策略，避免大文件进入 Git）

## Rollout / Migration
- 允许双轨期：开发环境可继续使用本地 `public/assets`，生产环境通过 `/assets` 反代到 R2。
- 当 R2 中资源与本地目录结构一致时，业务代码无需改动大量字符串引用。
