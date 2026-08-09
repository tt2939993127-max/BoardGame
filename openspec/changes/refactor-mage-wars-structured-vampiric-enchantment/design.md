# 设计：鲜血贪噬结构化附属结界

## Owner 边界

- `mage-wars.config.json` 保存 `1910` 的可见附属和授予吸血静态事实。
- `configPackage.ts` 负责严格读取 `vampiric` 授予特性。
- `spellRules.ts` 负责查询对象上的可见附属吸血来源，并与现有一次性 `3404` 临时标记区分。
- `execute.ts` 负责按近战 profile 和实际伤害生成一次治疗事件；持续附属不在攻击后清除。

## 配置形状

`1910` 复用已有可见对象结界容器：

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
      { "trait": "vampiric" }
    ]
  }
}
```

## 结算规则

1. 只有近战攻击 profile 获得附属吸血；远程攻击不产生吸血治疗。
2. 治疗量等于本次攻击实际造成的伤害，不是攻击骰总和；护甲、穿刺和其它伤害修正先完成。
3. 三连击等多段攻击在同一次攻击结算中累计实际伤害，结算一个治疗事件；目标被击败时仍按已造成的实际伤害治疗。
4. `3404` 的 `vampiricNextMelee` 仍按一次性临时标记和行动结束清理；`1910` 来源不写入临时字段，也不在攻击后销毁。
5. 若同一对象同时有多个吸血来源，仍只治疗一次，避免来源叠加造成重复治疗。

## 非目标

- 不把吸血改成全局文本关键词解析。
- 不让 `1910` 提供穿刺、远程吸血或额外攻击骰。
- 不改变法师基础近战、攻击法术或 `3404` 临时效果的既有边界。
