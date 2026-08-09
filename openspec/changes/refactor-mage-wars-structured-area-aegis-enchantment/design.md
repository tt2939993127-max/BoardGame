# 设计：区域庇护结构化迁移

## Owner 边界

- `mage-wars.config.json` 保存 `1913` 的区域锚定和 `aegis=1` 静态事实。
- `configPackage.ts` 严格读取可见结界的 object / zone 锚点，不让区域语义退回文本解析。
- `spellAbilityExecutors.ts` 负责生成区域锚定的公开结界对象。
- `spellRules.ts` 从目标生物所在区域收集区域庇护，并与对象附属庇护取最高值。
- `execute.ts` 已消费统一的目标对象庇护查询，本 change 不新增第二套攻击骰修正路径。

## 配置形状

```json
{
  "requiresCodeSupport": false,
  "semantics": {
    "abilityKind": "visible-area-enchantment",
    "attachment": {
      "kind": "enchantment",
      "visibility": "revealed",
      "anchor": "zone"
    },
    "grants": [
      { "trait": "aegis", "value": 1 }
    ]
  }
}
```

## 结算规则

1. 合法施放 `1913` 生成已展示且锚定目标区域的结界对象。
2. 该区域中由施法者控制的活体生物获得庇护 1；离开区域后不再获得该区域来源。
3. 目标生物的区域庇护与对象附属庇护不叠加，只取全部有效来源的最高值。
4. 攻击骰最低保留 1；伤害类型免疫仍在庇护计算前走不投骰分支。
5. 玩家可见规则文本只负责展示；移除或改写 `1913` 展示文案不影响结构化区域庇护。

## 非目标

- 不实现法师获得庇护、敌方生物获得庇护或法师基础攻击生物入口。
- 不实现墙体 / 标准 12 区、隐藏结界、展示 / 反制、法师绑定和完整区域结界 UI。

