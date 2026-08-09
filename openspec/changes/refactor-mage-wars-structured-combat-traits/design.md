# 设计：卡牌级战斗特性

## Owner 边界

- `mage-wars.config.json` 保存卡牌级静态战斗特性。
- `configPackage.ts` 负责校验和物化。
- `spellRules.ts` 负责根据来源 CardID 查询特性，并保留旧夹具对照路径。
- 领域攻击结算继续负责目标合法性、攻击段和同区状态判断。

## 配置形状

```json
{
  "combatTraits": {
    "bloodthirst": {
      "amount": 1,
      "sameZoneMageAmount": 1
    }
  }
}
```

特性放在卡牌级而不是攻击 profile 内，因为它对同一对象的多条近战攻击生效；攻击 profile 只保存该次攻击本身的静态字段。

## 迁移策略

1. 增加 `combatTraits` 类型、读取和正整数校验。
2. 为 `2804` 录入嗜血特性。
3. 修改嗜血查询：配置来源对象读取结构化特性，非配置夹具读取旧文本。
4. 用无展示文本、同区 / 异区、活体 / 非活体、未受伤和多段攻击测试验证行为。

