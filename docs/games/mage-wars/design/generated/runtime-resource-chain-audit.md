# Mage Wars foundation 资源链审计

目标状态：active
当前目标：记录 `mage-wars` foundation 运行时媒体、图集配置和 Android 游戏素材包的服务器发布与回查结果。
非当前历史背景：本文件不覆盖旧 Open Design 失败稿，也不代表全 322 张法术、自由构筑、四人模式或完整 AI 完成。
禁止自动接管：不得用本文件证明 foundation 外范围完成；不得用本地截图替代服务器或 Android file-index 回查。
更新时间：2026-07-29 01:59 +08:00

## 本地候选

- `src/games/mage-wars/manifest.ts` 已声明 `mobileDelivery.mode = 'package-managed'`，因此资源链必须同时闭合服务器主源和 Android 游戏素材包。
- `public/assets/i18n/zh-CN/mage-wars/assets-manifest.json` 的 `basePrefix` 为 `official/i18n/zh-CN/mage-wars/`。
- Android 游戏包候选本地复核结果：`included=37`，`bad=0`，包含 `34` 个压缩 WebP、`2` 个 atlas JSON 和 `1` 个本地 assets manifest；没有源 PNG/JPG、音频源文件或临时文件进入候选。
- 本地关键文件 SHA-256 已与远端回查逐项比对：标准竞技场、法师 atlas、学徒攻击法术 atlas、通用法术卡背、攻击骰、就绪 token、两个 atlas JSON 和游戏级 assets manifest 均一致。

## 发布动作

| 时间 | 命令 / 动作 | 结果 |
| --- | --- | --- |
| 2026-07-29 01:55 +08 | `node scripts/assets/upload-to-server.js --asset-prefix i18n/zh-CN/mage-wars` | 发布 34 个 `official/i18n/zh-CN/mage-wars/**/compressed/*.webp`；自动差异索引刷新因首次缺少远端 `games/mage-wars.json` 中断 |
| 2026-07-29 01:57 +08 | 通过 `publishPrimaryAssetBatch` 补发 3 个运行时 JSON | 发布 `official/atlas-configs/mage-wars/apprentice-spell-atlases.json`、`official/atlas-configs/mage-wars/mages-core-atlas.json`、`official/i18n/zh-CN/mage-wars/assets-manifest.json` |
| 2026-07-29 01:57 +08 | `node scripts/mobile/publish-android-game-packages.mjs --game mage-wars --reuse-shared-audio` | 首次完整游戏包发布成功；`fileCount=37`，`zipBytes=78901170` |

## 远端回查

| 对象 | 远端状态 | 大小 / 哈希结论 |
| --- | --- | --- |
| `official/i18n/zh-CN/mage-wars/board/compressed/standard-arena.webp` | `200`, `X-Asset-Source: server` | `3226870` bytes，SHA-256 匹配 `06d2f15d14de3490...` |
| `official/i18n/zh-CN/mage-wars/cards/mages/compressed/mages-core-atlas.webp` | `200`, `X-Asset-Source: server` | `7107814` bytes，SHA-256 匹配 `f59b17c4f035f112...` |
| `official/i18n/zh-CN/mage-wars/cards/spells/compressed/spell-attack-core-atlas.webp` | `200`, `X-Asset-Source: server` | `6087612` bytes，SHA-256 匹配 `8314360501476c20...` |
| `official/i18n/zh-CN/mage-wars/cards/backs/compressed/spell-card-back.webp` | `200`, `X-Asset-Source: server` | `743198` bytes，SHA-256 匹配 `d1ecf11b8a213bad...` |
| `official/i18n/zh-CN/mage-wars/dice/compressed/attack-die-texture.webp` | `200`, `X-Asset-Source: server` | `31720` bytes，SHA-256 匹配 `92427f153cd617d8...` |
| `official/i18n/zh-CN/mage-wars/tokens/action/compressed/ready-token-front.webp` | `200`, `X-Asset-Source: server` | `63228` bytes，SHA-256 匹配 `16b74e234e2aae10...` |
| `official/atlas-configs/mage-wars/apprentice-spell-atlases.json` | `200`, `X-Asset-Source: server` | `32202` bytes，SHA-256 匹配 `a2b697ec039e127e...` |
| `official/atlas-configs/mage-wars/mages-core-atlas.json` | `200`, `X-Asset-Source: server` | `2825` bytes，SHA-256 匹配 `6aeaf2de9d1cf47f...` |
| `official/i18n/zh-CN/mage-wars/assets-manifest.json` | `200`, `X-Asset-Source: server` | `17625` bytes，SHA-256 匹配 `2b997d2d7c5398e1...` |

## Android 游戏包

- 远端 manifest：`official/mobile-packages/android/stable/games/mage-wars.json` 返回 `200`，`X-Asset-Source: server`。
- 游戏包版本：`0.6.19-mage-wars-pkg-2026-07-28T17-57-02-525Z`。
- 完整 ZIP：`Content-Length=78901170`，与 manifest `assetPack.bytes=78901170` 一致。
- file-index：返回 `200`，`files=37`，`totalSize=78880472`，`sourceOrTemp=0`。
- file-index 关键条目已与本地 `size/hash` 对齐：标准竞技场、法师 atlas、学徒攻击法术 atlas、通用法术卡背、两个 atlas JSON、游戏级 assets manifest。

## 结论

- 服务器主源已闭合：本阶段运行时媒体和直接运行时 JSON 均能从公开资源域名读取到本次对象。
- Android 游戏素材包已闭合：首次完整 mage-wars 包已发布，manifest、file-index、ZIP 大小和关键文件 hash 均通过回查。
- 本审计只证明 foundation 当前资源链完成；完整法术全集、自由构筑、四人模式、豪华竞技场、完整 AI、教程和行动日志 UI 仍在 foundation 外。
