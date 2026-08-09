# Change: 将附属结界授予防御迁入结构化配置

## Why

`1809` 灵蛇反射和 `1818` 原力法剑都把防御授予被附属的生物，但当前对象防御入口只从对象自己的 `attackOrTraitLine` 或 `combatProfiles` 读取。可见附属结界没有自己的攻击条，导致这两张已录入卡牌仍无法进入现有防御响应窗口；继续从中文规则文本解析会让展示文案成为规则 owner。

## What Changes

- 为 `1809` 录入防御 `7+ / 1x`，为 `1818` 录入防御 `8+ / 1x`。
- 扩展结构化防御 profile 的“防御不因状态失效”属性，仅由 `1818` 使用。
- 可见附属结界生成的运行时对象消费自身配置中的防御 profile。
- 让防御机会和直接防御命令按 profile 判断状态失效；普通防御仍保持现有昏迷禁用和眩晕 / 束缚骰值修正。
- 将 `1809`、`1818` 标记为已实现，并补配置、隐藏展示文本和领域流程测试。

## Scope

本 change 只覆盖 `1809` 灵蛇反射与 `1818` 原力法剑。庇护、区域结界、其它结界触发/反制、装备防御和完整结界系统不在本 change 内。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、Open Design 设计稿或玩家可见文案。
