# 设计：恶魔胸甲结构化反伤屏障

## Owner 边界

- `mage-wars.config.json` 保存 `3700` 的屏障骰数、伤害类型、无法回避、致命伤害和回合限制。
- `configPackage.ts` 严格读取并校验 `combatTraits.damageBarrier`，不从中文卡面文本推导领域行为。
- `spellAbilityExecutors.ts` 已有装备实例创建逻辑继续负责保留 `combatTraitsSource`，本 change 不新增第二份装备规则副本。
- `spellRules.ts` 负责从目标法师附着装备中查询当前攻击者尚未触发的屏障来源。
- `execute.ts` 负责在法师基础近战和场上对象近战的伤害结算后、其它响应事件前生成屏障攻击事件。
- `reducer.ts` 负责记录每个屏障来源本回合已处理的攻击者；回合号变化自然使来源再次可用。

## 配置形状

```json
{
  "combatTraits": {
    "damageBarrier": {
      "diceCount": 1,
      "damageTypes": ["aether"],
      "unavoidable": true,
      "lethal": true,
      "oncePerAttackerPerRound": true
    }
  },
  "requiresCodeSupport": false
}
```

`aether` 是内部稳定标识；`attackOrTraitLine` 与 `text` 只承担玩家可见卡面文案。

## 触发与结算时序

1. 只有近战攻击进入屏障检查；远程攻击、攻击类法术和直接伤害不调用该检查。
2. 法师基础近战或场上对象近战完成所有打击后，如果至少投掷过一颗攻击骰，且防御方没有因该次攻击被击败，则查找目标法师的附着 `3700`。
3. 若来源本回合尚未对该攻击者发动，立即发出 `DAMAGE_BARRIER_TRIGGERED`，然后投掷 1 颗攻击骰并生成独立 `DAMAGE_DEALT`。
4. 屏障攻击使用现有伤害事件管线；`lethal=true` 时不加入目标护甲修正，因此致命伤害忽略护甲。对象目标的已有庇护减骰仍按目标对象特性应用。
5. 屏障攻击不创建防御窗口、不创建反击机会，也不递归检查屏障；它造成的伤害可以击败原攻击者。
6. `DAMAGE_BARRIER_TRIGGERED` 在 `DAMAGE_DEALT` 前记录来源使用事实；来源装备被移除后查询不到，下一回合回合号变化后再次可用。

## 状态与事件

- 装备实例使用 `damageBarrierRoundNumber` 和 `damageBarrierAttackerIdsThisRound` 保存每回合攻击者键。
- 事件同时支持 `attackerId`（法师）和 `attackerObjectId`（场上对象），但两类攻击共用同一来源查询和记录 owner。
- `DAMAGE_DEALT` 的目标 ID 继续复用现有 `DamageCalculation` 约定：玩家 ID 表示法师，对象 ID 表示场上对象。

## 非目标

- 不把反伤屏障改造成可选择的玩家交互。
- 不把屏障攻击当作普通攻击行动，不消耗原攻击者之外的额外行动。
- 不从中文 `attackOrTraitLine` 解析 `3700` 的骰数、致命或无法回避规则。
