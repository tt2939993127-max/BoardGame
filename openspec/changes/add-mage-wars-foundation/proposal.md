# Change: Add Mage Wars Foundation

## Why

用户提供了法师战争本地规则与素材目录，并要求按新游戏 skill 流程推进。该游戏规则复杂，包含法术书、隐藏结界、快速施法、区域移动、攻击八步、状态/特性和 FAQ 勘误边界；在正式实现前必须先把规则对象、素材来源、布局真相源、首轮范围和技术边界落进 OpenSpec。

## What Changes

- 新增 `mage-wars` 游戏主 spec，记录法师战争首轮 foundation 的规则、素材、布局、架构和特效要求。
- 建立阶段 0 intake 文档：来源索引、规则摘要、规则对象素材矩阵、素材候选审计、布局真相源和需求对齐表。
- 首轮技术路线采用自研规则引擎 + React 主 UI + `engine/fx` / Canvas / ShaderCanvas / framer-motion；Phaser 暂不接管主 Board/UI。
- 明确“释放法术必须有特效”为首轮硬需求：施法来源、目标、路径和命中/结算结果必须由规则事件驱动呈现。
- 明确首轮基础范围优先 2 人、学徒/基础法术书、标准竞技场、回合/行动/攻击/施法主链；全 322 张法术、完整构筑、四人模式、豪华竞技场和扩展法师拆后续 change。

## Impact

- Affected specs: `mage-wars`
- Affected docs: `docs/games/mage-wars/**`
- Affected code: approval 后预计新增 `src/games/mage-wars/**`、`public/locales/*/game-mage-wars.json`、`public/assets/i18n/zh-CN/mage-wars/**`
- No runtime code is changed by this proposal draft.

## Additional Ability Matrix

| 能力 | 本轮状态 | 原因 / 后续 |
| --- | --- | --- |
| `action-log` | 仅保留底层接口，UI 暂不交付 | 首轮先保证规则事件可记录；完整行动日志格式在 gameplay change 中补 |
| `undo-system` | 仅保留底层接口，UI 暂不交付 | 法术计划、隐藏结界和响应窗口会让撤回语义复杂；首轮 foundation 只记录边界 |
| `game-ai-system` | 本轮明确跳过完整 AI；保留可重复测试路径需求 | 先做人类 2 人规则闭环；后续 AI 需要独立策略和隐藏信息策略 |
| `tutorial-engine` | 本轮明确跳过 | 学徒模式本身可作为教学入口，但教程脚本等游戏本体稳定后再做 |
| `debug-config` | 实施本轮设计，不直接开放产品 UI | 需要后续 dev-only 状态注入、骰子固定和规则检查点，不能进正式牌桌常驻 UI |

## Approval

用户已于 2026-07-26 明确批准 `add-mage-wars-foundation` 的 foundation 范围。

批准边界：

- 可以进入首轮基础版/学徒闭环 runtime 实现。
- UI 设计不走 imagegen / 位图生图；采用 Open Design HTML artifact + 现有素材路线。
- 不包含全 322 张法术、自由构筑、四人模式、豪华竞技场、完整 AI、教程、行动日志 UI 或撤回 UI。
