# Change: 将死亡印记迁入结构化首攻加骰结界

## Why

`1826` 死亡印记已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。现有对象攻击声明事件和每回合状态 owner 足以承载“每个生物每回合首次攻击本生物获得攻击骰+1”，不应继续依赖结界展示文本。

## What Changes

- 为配置包增加死亡印记授予特性。
- 为 `1826` 录入可见对象结界语义并标记为已实现。
- 对象生物攻击带有死亡印记目标时，按每个来源结界、每个攻击者和当前回合判断首攻加骰。
- 在攻击声明事件中记录已消费的死亡印记来源，复用现有事件 / reducer 生命周期。

## Scope

本 change 只覆盖 `1826` 死亡印记的对象生物首攻 +1 攻击骰。不实现法师绑定+2、法师攻击、攻击法术、`1904` 攻击逆转、`1912` 心灵安抚、隐藏结界、展示 / 反制窗口或完整结界 UI。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。
