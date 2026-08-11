# 资源与数据录入

本路由处理“外部资料如何进入项目并成为可运行数据”，包括图片、音频、图集、配置、规则书和新增角色。规则实现完成后，仍需回本路由核对录入合同。

## 资源、图片与音频

- 图片、音频、图集、清单和发布资源：读 [`asset-pipeline`](../standards/asset-pipeline.md)、[`critical-image-preload`](../standards/critical-image-preload.md)、[`audio-assets`](../standards/audio-assets.md)；具体命令再读 `docs/tools.md`。
- 参考图生成 Three.js/img2threejs 程序化模型：先读系统 `img2threejs-readiness`，再读项目 [`img2threejs-reconstruction`](../../skills/img2threejs-reconstruction/SKILL.md) 和 [`asset-pipeline`](../standards/asset-pipeline.md)。
- 图片文字读取、OCR、卡图/房间图规则录入、图集裁图和安全读图：读项目 [`safe-image-reading`](../../skills/safe-image-reading/SKILL.md)、[`data-entry-workflow`](../../skills/data-entry-workflow/SKILL.md) 和 [`data-entry`](../standards/data-entry.md)。
- 首屏关键素材、图片预加载、atlas/牌背/桌面图预热：读 [`critical-image-preload`](../standards/critical-image-preload.md) 与 [`asset-pipeline`](../standards/asset-pipeline.md)。
- 挑选、查找、试听、对接或补预加载音效：读系统 `audio-integration`、[`audio-assets`](../standards/audio-assets.md) 和 `docs/audio/audio-usage.md`。
- 从外部导入音频素材：读系统 `audio-integration`、[`audio-assets`](../standards/audio-assets.md) 和 `docs/audio/add-audio.md`。

## 数据、配置与新增对象

- 图片/规则书/Wiki/截图录入名称、描述、数值、类型、索引和文案：读项目 [`data-entry-workflow`](../../skills/data-entry-workflow/SKILL.md) 与 [`data-entry`](../standards/data-entry.md)。
- 配置表审查、字段核对、旧游戏 adapter 或修正提案：读系统 `config-review-workflow`、[`game-config-package`](../standards/game-config-package.md) 和项目 [`data-entry-workflow`](../../skills/data-entry-workflow/SKILL.md)。
- 新游戏静态配置包、schema、能力绑定和运行时物化：读项目 [`create-new-game`](../../skills/create-new-game/SKILL.md) 与 [`game-config-package`](../standards/game-config-package.md)。
- 新增派系、英雄、角色，从素材到可玩：读项目 [`add-new-faction`](../../skills/add-new-faction/SKILL.md) 与 [`data-entry-workflow`](../../skills/data-entry-workflow/SKILL.md)。
- DiceThrone 角色 intake、裁图、卡牌/Token/骰面录入：读项目 [`add-new-faction`](../../skills/add-new-faction/SKILL.md)、[`data-entry-workflow`](../../skills/data-entry-workflow/SKILL.md) 和 [`DiceThrone 英雄 intake`](../../../docs/games/dicethrone/workflows/dicethrone-hero-intake.md)。
- DiceThrone 国际化资源路径、locale 和符号链接：读 [`国际化资源架构`](../../../docs/i18n-asset-architecture.md)；只改角色文案/资源时读 [`DiceThrone 国际化`](../../../docs/games/dicethrone/dicethrone-i18n.md)。
- 移动端素材包下载、校验失败或清理重下：读项目 [`android-app-release`](../../skills/android-app-release/SKILL.md)、`docs/mobile-release.md` 和 [`asset-pipeline`](../standards/asset-pipeline.md)。
