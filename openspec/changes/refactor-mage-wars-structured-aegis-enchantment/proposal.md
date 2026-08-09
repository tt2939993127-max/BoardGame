# Change: 将神力加护迁入结构化庇护特性

## Why

`1813` 神力加护已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。规则书明确庇护 X 会在所有针对对象的攻击掷骰前减少 X 颗攻击骰，多个庇护只取最高值且最低保留 1 颗；该事实应由附属结界配置提供，而不是继续从显示文案猜测。

`1911` 与 `1813` 为同图同效替代卡，使用同一个规则 owner。

## What Changes

- 为 `1813` / `1911` 录入可见对象结界语义和 `aegis=1` 授予特性。
- 从附着来源读取最高庇护值，不叠加多个来源。
- 将庇护减骰统一接入当前已有的场上对象攻击和攻击法术入口。
- 保留攻击最低 1 颗骰子的现有规则，以及伤害类型免疫的零骰例外。

## Scope

本 change 只覆盖附着到单个生物的 `1813` / `1911` 庇护 1。区域版 `1913`、法师绑定 `+2`、隐藏结界、展示 / 反制窗口和完整结界 UI 保持 deferred。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。
- 当前 `DECLARE_ATTACK` 只支持法师攻击法师；基础版没有法师攻击生物的命令入口，因此法师基础攻击生物的庇护接线保持 deferred，不在本 change 中新增命令或扩展攻击模型。
