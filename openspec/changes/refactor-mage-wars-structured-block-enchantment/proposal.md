# Change: 将格挡迁入结构化一次性防御结界

## Why

`1806` 格挡已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。现有对象防御响应窗口已经能承接附属来源；缺口是格挡不掷防御骰、必须展示、回避攻击后销毁，以及不可回避攻击时仍销毁且不产生回避效果。

## What Changes

- 为 `1806` 录入结构化自动回避防御 profile。
- 附属防御 profile 保留来源对象身份，支持一次性来源消费。
- 攻击目标带有格挡时，在可回避攻击的防御窗口中只允许使用格挡，不允许跳过；使用后直接产生攻击回避事件并销毁格挡。
- 不可回避攻击命中带有格挡的目标时，自动销毁格挡，但攻击继续结算。

## Scope

本 change 只覆盖 `1806` 格挡的对象防御响应。不实现 `1904` 攻击逆转、`1912` 心灵安抚、`3715` 装备防御、法师防御、隐藏结界、通用反制优先级或完整结界 UI。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。
