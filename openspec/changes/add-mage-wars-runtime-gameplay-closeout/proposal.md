# Change: 收口法师战争学徒模式真实运行链

## Why
当前 Mage Wars 已有 foundation 领域骨架、配置包和 Board 视觉运行页，但现有两条 E2E 主要通过测试 harness 注入饱和状态，不能证明玩家从正式入口完成计划、施法、攻击、骰子结算、状态变化和回合推进。继续扩展卡牌能力前，必须先把可玩的核心链路和真实端到端证据补齐。

## What Changes
- 建立唯一的 Mage Wars 主 spec，明确 foundation、真实玩法链和未交付边界。
- 为正式入口补齐学徒模式的真实交互入口：法术书分页/分类、计划法术、场地直选来源与目标、施法、移动、守卫、攻击和回合推进。
- 让页面交互通过现有 DomainCore 命令、事件和响应窗口推进，不使用测试 harness 替代产品交互。
- 补覆盖核心玩法的桌面和移动端 E2E，验证实际状态变化、隐藏信息、正式素材、骰子、token 和法术 FX。
- 将未支持的卡牌效果继续保留为配置能力缺口，不在本 change 中伪造全卡表或完整 Mage Wars。

## Impact
- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/Board.tsx`
  - `src/games/mage-wars/domain/`
  - `src/games/mage-wars/data/`
  - `e2e/mage-wars/`
  - `docs/games/mage-wars/`

## Scope Boundary

本 change 的完成口径是“可由玩家真实操作完成的两人学徒模式核心链”，不是整套 Mage Wars 的全部内容。全 322 张法术、自由构筑、四人模式、豪华竞技场、扩展法师、完整 AI、教程、行动日志 UI 和撤回 UI 继续由后续 change 管理。
