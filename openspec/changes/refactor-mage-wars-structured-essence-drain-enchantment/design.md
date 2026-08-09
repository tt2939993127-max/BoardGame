# 设计：精华汲取结构化维持费用

## Owner 边界

- `mage-wars.config.json` 保存 `1815` 的可见对象附属和维持法力费用事实。
- `configPackage.ts` 严格读取维持费用语义和正整数金额。
- `spellRules.ts` 从附属来源解析目标对象当前有效的维持费用；不读取中文展示文本。
- `flowHooks.ts` 在维持阶段为仍存在的附属来源发出待处理事件。
- `systems.ts` 将待处理事件转换为现有 `InteractionSystem` 的二选一交互，并在响应后发出支付或销毁事件。
- `reducer.ts` 继续由现有 `MANA_SPENT` 和 `ARENA_OBJECT_DEFEATED` owner 负责状态落地，不新增第二套法力或对象删除模型。

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
        "kind": "mana-cost",
        "amount": 2
      }
    ]
  }
}
```

`mana-cost` 表示目标生物控制者在维持阶段为该特性支付的费用，不与攻击造成的 `MANA_DRAINED` 混用。

## 结算规则

1. 合法施放生成已展示的 `1815` 附属结界对象。
2. 进入维持阶段时，仍存在且锚定目标对象的来源生成一次维持费用待处理事件。
3. 目标生物的控制者有足够法力时，可以选择支付 2 点法力，或摧毁该 `1815` 来源。
4. 法力不足时只提供摧毁选项；不产生负法力，也不自动扣除部分法力。
5. 支付发出 `MANA_SPENT`；摧毁发出 `ARENA_OBJECT_DEFEATED`，复用结界离场和附属来源清理。
6. 来源在维持阶段前被移除时，待处理事件不会再次支付或摧毁不存在的来源。

## 非目标

- 不从 `rulesText` 解析“维持+2”。
- 不实现玩家自定义的完整维持效果排序；本切片复用现有维持 hook 顺序。
- 不实现 `1804` 的生物施法事件、法师绑定、隐藏结界、展示 / 反制或完整结界 UI。
