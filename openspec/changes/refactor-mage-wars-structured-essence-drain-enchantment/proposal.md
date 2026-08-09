# Change: 将精华汲取迁入结构化维持费用

## Why

`1815` 精华汲取已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留。卡面效果是目标生物获得维持 `+2`，规则页 9 明确要求在维持阶段由控制者选择支付费用或摧毁该法术。它不能继续只依赖展示文本，也不能在没有选择的情况下自动扣费。

## What Changes

- 为配置包增加维持费用语义，声明 `1815` 的维持费用为 2 点法力。
- 在维持阶段从结构化附属来源发出维持费用待处理事件。
- 通过现有交互系统提供“支付 / 摧毁”选择；法力不足时只提供摧毁。
- 支付时发出 `MANA_SPENT`；摧毁时复用现有 `ARENA_OBJECT_DEFEATED` 移除结界来源。
- 将 `1815` 标记为 implemented；保留法师绑定、隐藏结界和完整维持顺序为后续边界。

## Scope

本 change 只覆盖 `1815` 精华汲取的可见对象附属、维持 `+2` 选择和来源生命周期。不实现 `1804` 生物施法触发、`1825` 快速法术取消、`1901` 法术反制、`1904` 攻击逆转、法师绑定支付或完整维持阶段排序。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/flowHooks.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/__tests__/`
  - `public/locales/zh-CN/game-mage-wars.json`
  - `public/locales/en/game-mage-wars.json`
- 不修改 UI、素材、设计稿或玩家可见主界面布局。
