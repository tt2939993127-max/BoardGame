# Change: 将恶魔胸甲反伤屏障迁入结构化战斗特性

## Why

`3700` 恶魔胸甲已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。它提供的不是普通反弹伤害，而是规则书第 27 页定义的特殊保护机制：防御方受到成功的敌方近战攻击后，在反伤屏障步骤自动发动一次无法回避、忽略护甲的以太致命攻击。

继续依赖卡面中文文本无法表达攻击成功时机、法师与场上对象两类攻击入口、每回合每个攻击者一次、屏障攻击不触发其它响应以及来源装备回合状态。

## What Changes

- 为 `combatTraits` 增加结构化 `damageBarrier`，记录 1 颗攻击骰、以太、无法回避、致命伤害和每回合每攻击者一次。
- 让 `3700` 的装备实例保留配置战斗特性来源，并从目标法师的附着装备查询可用屏障来源。
- 在法师基础近战和场上对象近战完成伤害 / 多段攻击后，按规则书反伤屏障步骤自动生成独立攻击。
- 反伤屏障攻击复用既有 `DamageCalculation` 与伤害事件；致命伤害不添加护甲修正，目标对象的庇护等目标侧攻击骰修正继续由已有领域入口处理。
- 记录屏障来源本回合已对哪些攻击者发动；屏障攻击本身不进入普通防御、反击或其它反伤屏障链。
- 将 `3700` 标记为已实现，补配置、来源查询、事件顺序、护甲忽略、回合限制、法师 / 对象攻击和击败边界测试。

## Scope

本 change 只覆盖 `3700` 恶魔胸甲及其反伤屏障领域执行。不扩展到其它反伤屏障卡、远程攻击、攻击类法术、墙体、隐藏结界或 UI。

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
  - `src/games/mage-wars/__tests__/`

## Explicitly Deferred

- 其它卡牌或扩展提供的反伤屏障来源。
- 反伤屏障对攻击类法术、远程攻击和非攻击伤害的处理；规则上这些攻击不触发屏障，本 change 不新增旁路。
- 完整以太伤害类型的全卡结构化迁移；本 change 只为 `3700` 保存其内部伤害类型标识并用于事件语义。
