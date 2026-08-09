# Change: 将尸鬼腐化迁入结构化维持伤害结界

## Why

`1820` 尸鬼腐化已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。现有运行时已经有可见附属结界对象、维持阶段 hook、直接伤害管线和伤害类型免疫查询，因此应把“每个维持阶段造成 2 点直接毒素伤害”从展示文本迁移到配置语义。

## What Changes

- 为配置包增加可扩展的维持阶段直接伤害语义，声明伤害数量和伤害类型。
- 为 `1820` 录入可见对象结界语义和维持阶段 2 点毒素直接伤害，并标记为已实现。
- 维持阶段从附属来源读取该语义，复用现有直接伤害、伤害类型免疫和击败事件 owner。
- 保留法师绑定 `+2` 作为独立 deferred 规则，不把它误报为本 change 已实现。

## Scope

本 change 只覆盖 `1820` 尸鬼腐化的附属维持伤害。不实现法师绑定支付 / 维持、`1804` 法师祸咒的施法触发、`1904` 攻击逆转、`1912` 心灵安抚、隐藏结界或完整结界 UI。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/flowHooks.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。
