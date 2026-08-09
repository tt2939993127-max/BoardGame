# 设计：尸鬼腐化结构化维持伤害

## Owner 边界

- `mage-wars.config.json` 保存 `1820` 的可见附属结界和维持阶段直接伤害事实。
- `configPackage.ts` 严格读取维持效果、正整数伤害量和伤害类型。
- `spellRules.ts` 负责从附属结界来源汇总机器可读维持直接伤害。
- `flowHooks.ts` 负责在进入维持阶段消费该来源，复用直接伤害、毒素免疫和击败事件路径。
- 现有结界对象生命周期负责来源离场后的自然停止；不复制清理模型。

## 配置形状

```json
{
  "requiresCodeSupport": false,
  "semantics": {
    "abilityKind": "visible-object-enchantment",
    "attachment": {
      "kind": "enchantment",
      "visibility": "revealed",
      "anchor": "object"
    },
    "upkeepEffects": [
      {
        "kind": "direct-damage",
        "amount": 2,
        "damageType": "毒素"
      }
    ]
  }
}
```

## 结算规则

1. 合法施放生成已展示的 `1820` 附属结界对象。
2. 进入维持阶段时，附属来源对其锚定的活体生物造成配置数量的直接毒素伤害。
3. 目标具有毒素免疫时不产生伤害事件；否则复用直接伤害管线并按有效生命判断击败。
4. 驱散、窃取、目标离场或结界销毁后，旧来源不再产生维持伤害。
5. 玩家可见规则文本只负责展示；法师绑定 `+2` 不在本 change 中消费。

## 非目标

- 不新增通用法师绑定支付系统。
- 不把 `1820` 的直接毒素伤害混入腐化状态 token 的维持伤害。
- 不实现 `1804`、`1904`、`1912`、隐藏结界、展示 / 反制或结界 UI。
