# Change: 将抑制斗篷迁入结构化来袭攻击费用

## Why

`3705` 抑制斗篷已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留。它的规则不是装备自身攻击或被动护甲，而是在附着法师受到生物近战攻击的宣告阶段，要求来袭生物的控制方额外支付法力；继续依赖卡面中文文本无法表达目标方向、每个生物每回合一次和反击排除。

## What Changes

- 为卡牌级 `combatTraits` 增加结构化的近战来袭法力费用特性，并为 `3705` 录入每次 `2` 点、每个攻击生物每回合一次、排除反击。
- 让装备实例保留其配置战斗特性来源；攻击结算从附着在目标法师身上的装备读取该特性。
- 在既有对象攻击宣告入口检查：只有生物、只有近战、只有目标为法师且不是反击时触发。
- 记录每个装备来源本回合已经对哪些攻击生物触发；足够法力时在既有防御窗口前支付，法力不足时取消整次攻击并消耗该生物的行动。
- 与 `1912` 心灵安抚同时存在时，先按两类来源合计判断是否能整体支付，避免只扣掉其中一部分费用。
- 将 `3705` 标记为已实现，并补配置、能力目录、来源移除、每回合一次和反击排除测试。

## Scope

本 change 只覆盖 `3705` 抑制斗篷及其所需的配置战斗特性和对象攻击宣告时序。不扩展到法师基础攻击、攻击类法术、装备攻击、隐藏结界、响应窗口 UI 或其它尚未录入的装备能力。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/domain/abilityCatalog.ts`（通过配置状态自动反映）
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、Open Design 设计稿或玩家可见文案。

## Explicitly Deferred

- `3700` 恶魔胸甲的反伤屏障。
- `3710` 群兽法杖的动物强化 / 治疗能力。
- `3716` 元素魔杖的法术绑定。
- `1804`、`1825`、`1901`、`1904` 等仍未结构化的卡牌能力。
