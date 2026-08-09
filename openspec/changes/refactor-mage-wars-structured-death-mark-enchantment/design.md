# 设计：死亡印记结构化首攻加骰

## Owner 边界

- `mage-wars.config.json` 保存 `1826` 的可见附属结界和 `death-mark` 授予特性。
- `configPackage.ts` 严格读取授予特性 ID。
- `spellRules.ts` 负责从目标对象的附属来源汇总当前攻击者可获得的首攻加骰和来源 ID。
- `execute.ts` 负责在对象攻击掷骰前消费该结构化查询，并把来源 ID / 当前回合写进攻击声明事件。
- `reducer.ts` 负责把本次攻击使用的死亡印记来源记录为当前回合已对该攻击者生效。
- `core-types.ts` 仅增加影响后续攻击判定的来源消费状态，不把纯 UI 结果放入 core。

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
      { "trait": "death-mark", "value": 1 }
    ]
  }
}
```

## 结算规则

1. 合法施放生成已展示的 `1826` 附属结界对象。
2. 只有 `kind=creature` 的攻击者攻击被附属目标时，才查询死亡印记来源。
3. 每个死亡印记来源对每个攻击者在当前 `turnNumber` 的第一次对象攻击提供 `+1` 攻击骰；同一攻击的多段攻击共享这次首攻修正。
4. 攻击声明事件记录来源 ID 和回合号，reducer 在来源对象上记录该攻击者已消费；后续同回合攻击不再获得该来源修正。
5. 来源被驱散、窃取或目标离场后，查询自然不再包含旧来源；展示文案不参与规则计算。

## 非目标

- 不把死亡印记扩展到法师基础攻击或攻击法术。
- 不新增全局回合缓存；消费状态随来源对象保存并按 `turnNumber` 判断过期。
- 不实现法师绑定、响应窗口、`1904`、`1912` 或完整结界 UI。
