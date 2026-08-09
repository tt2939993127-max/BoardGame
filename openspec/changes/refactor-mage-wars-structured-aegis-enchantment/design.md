# 设计：附属结界结构化庇护

## Owner 边界

- `mage-wars.config.json` 保存 `1813` / `1911` 的 `aegis=1` 静态事实。
- `configPackage.ts` 严格读取授予特性 ID 和数值。
- `spellRules.ts` 从目标对象的可见附属来源汇总最高庇护值。
- `execute.ts`、`spellAbilityExecutors.ts` 在当前已有的场上对象攻击和攻击法术入口消费同一减骰结果；`DECLARE_ATTACK` 当前只攻击法师，不伪造法师攻击生物入口。
- 现有 `resolveMageWarsModifiedAttackDiceCount` 继续负责最低 1 颗和伤害类型免疫的特殊处理；不新增第二套骰数下限。

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
    "grants": [
      { "trait": "aegis", "value": 1 }
    ]
  }
}
```

## 结算规则

1. 合法施放生成已展示的 `1813` / `1911` 附属结界并锚定目标生物。
2. 所有针对目标生物的对象攻击和攻击法术，在掷攻击骰前减少最高庇护值。
3. 庇护不能把攻击骰减少到 1 颗以下；目标伤害类型免疫时仍沿用免疫分支，不投攻击骰。
4. 多个庇护来源不叠加，只取最高值。
5. 玩家可见规则文本只负责展示；移除或改写展示文案不影响结构化庇护。

## 非目标

- 不实现区域版 `1913` 的友方生物光环。
- 不实现法师绑定费用、隐藏结界、展示 / 反制和完整结界 UI。
- 不扩展当前仅支持法师目标的 `DECLARE_ATTACK` 命令来新增法师攻击生物入口。
