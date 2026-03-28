# Change: Smash Up Oops 四派系图片录入与可复刻接入流程

## Why
- 需要把 Smash Up `Oops, You Did It Again` 扩展中的 `Ancient Egyptians / Cowboys / Samurai / Vikings` 四个派系接入现有图片、图集、数据录入与验证链路。
- 当前仓库缺少这四个派系的正式实现与 atlas 注册，无法完成资源预加载、预览与派系数据录入。
- 现场核对发现：用户指定路径中的 `base/aiji_base.png` 与目标四派系基地一致，但 `cards/aiji.png` 实际是 `Fairies / Kitty Cats / Mythic Horses / Princesses` 的卡图；如果没有显式阻断规则，错误图集会被压缩并写入运行时。
- 这类“给一批图片就录入”的工作未来会重复发生，必须沉淀成可复刻、可审计、可测试的工作流，而不是一次性手工操作。

## What Changes
- 新增 `smashup-faction-intake` 能力，定义 Smash Up 新派系从“来源锁定 → 图集验证 → 资源接入 → 数据录入 → 审计与测试留证”的完整标准流程。
- 要求 intake 先执行来源契约校验：图片内容、派系列表、Wiki 抓取结果、TTS/源数据元信息必须一致；若不一致，流程必须中止并登记 blocker。
- 在来源校验通过后，为 Oops 四派系分配新的 Smash Up card/base atlas 槽位，并接入预览、预加载与派系/基地数据映射，禁止覆盖现有 `cards1-5` / `base1-4`。
- 将本次流程沉淀为项目文档/工作流，确保后续只给图片也能按相同步骤复用。

## Impact
- Affected specs: 新增 `smashup-faction-intake`。
- Affected code:
  - `src/games/smashup/domain/ids.ts`
  - `src/games/smashup/domain/atlasCatalog.ts`
  - `src/games/smashup/criticalImageResolver.ts`
  - `src/games/smashup/data/**`
  - `public/assets/i18n/zh-CN/smashup/**`
  - `public/assets/atlas-configs/smashup/**`
  - Smash Up 相关 Vitest / E2E / evidence / 工作流文档
- Current blocker:
  - `D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\aiji.png` 与目标四派系不匹配。apply 阶段若没有正确的 cards 原图或用户确认改用其他卡图来源，必须停在“来源校验失败”状态，不能伪造正式录入。

## 当前进度
- 已完成提案文档（proposal/design/spec/tasks）起草。
- 已完成前置发现：原图核对、TTS kit 定位、OpenSpec 上下文与规范阅读。
- 具体实现尚未开始，等待用户确认 proposal 与 cards 原图来源后进入 apply 阶段。
