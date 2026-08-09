# Change: 将原力之握迁入结构化附属结界

## Why

`1908` 原力之握已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留。现有领域已经有可见附属结界对象、束缚来源关系、移动 / 推斥 / 传送的不可移动校验和附属对象销毁清理，因此不应继续让“被束缚 / 稳固”展示文本承担规则 owner。

## What Changes

- 为 `1908` 增加可见附属结界语义，结构化声明授予束缚。
- 将 `1908` 标记为已实现，并在施法时复用现有 `ARENA_OBJECT_RESTRAINED` 事件建立目标到结界对象的来源关系。
- 目标限制保留规则：只能指定生物，具有不羁特性的生物无效。
- 复用现有束缚关系对普通移动、推斥和传送的阻止，以及结界销毁时的关系清理。

## Scope

本 change 只覆盖 `1908` 原力之握及其现有显性附属结界链。不实现 `1904` 攻击逆转、`1912` 心灵安抚、庇护、区域结界、隐藏结界、展示 / 反制窗口或其它结界触发能力。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿、通用配置 schema 或玩家可见文案。
