# Change: 实现元素魔杖法术绑定

## Why

`3716 元素魔杖` 的卡面规则要求把一张来自法术书的非史诗攻击法术绑定到装备上，并允许在快速施法时支付 3 点法力更换绑定法术。当前领域状态只能记录已计划法术和已施放法术，无法表达装备当前绑定的法术，也没有替换绑定的事件链。

## What Changes

- 将 `3716` 从 `needsCode` 迁移为配置驱动的已实现装备。
- 在装备对象上记录当前绑定的法术书卡牌定义 ID；首次装备时可绑定，之后通过快速施法能力支付 3 点法力更换。
- 复用 `USE_ARENA_OBJECT_ABILITY` 作为装备能力入口，新增稳定的元素魔杖绑定能力 ID，不新增重复命令通道。
- 增加绑定合法性校验：必须属于当前法师法术书、必须是非史诗攻击法术；替换时必须确实更换绑定牌，并且只能在快速施法阶段支付固定 3 点法力。
- 通过领域事件和 reducer 更新绑定状态，保持法术书、计划区、弃牌堆和装备状态职责分离；绑定法术不会被错误移入弃牌堆。
- 补配置、命令校验、事件执行、状态归约和回归测试；同步卡牌能力统计与领域建模文档。

## Scope

本 change 只覆盖 `3716 元素魔杖` 的首次绑定和快速施法替换绑定。

明确不覆盖：

- `1804 法师祸咒`、`1825 厄运`、`1901 法力失效`、`1904 攻击逆转` 的展示 / 反制响应窗口；这些卡仍保持 `needsCode`。
- 完整法术书卡牌实例、自由构筑、装备栏数量限制和完整装备 UI。
- 修改 `preparedSpellCardIds` 的计划语义；绑定牌不作为计划牌或弃牌堆牌处理。

## Impact

- Affected specs: `mage-wars-card-effect-runtime`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/domain/ids.ts`
  - `src/games/mage-wars/domain/commands.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/__tests__/`
