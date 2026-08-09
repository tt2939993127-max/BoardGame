# 设计：附属结界结构化防御

## Owner 边界

- `mage-wars.config.json` 保存卡牌的防御 profile 和 `ignoresStatus` 静态事实。
- `configPackage.ts` 负责严格读取 profile，旧卡牌没有该字段时保持既有对象 profile 形状。
- `spellAbilityExecutors.ts` 负责把配置 profile 来源标记带到可见附属结界对象。
- `spellRules.ts` 负责按对象来源读取 profile，并保留旧文本夹具解析。
- `execute.ts` / `validate.ts` 负责按 profile 判断防御是否因状态失效；防御骰修正继续由现有状态规则 owner 计算。

## 配置形状

两张卡使用已有 `combatProfiles` 结构，不新增第二套防御容器：

```json
{
  "combatProfiles": {
    "attacks": [],
    "defenses": [
      {
        "id": "defense-0",
        "minRoll": 8,
        "usesPerRound": 1,
        "ignoresStatus": true
      }
    ]
  }
}
```

`ignoresStatus` 只影响“是否可以使用防御”的失效判断，不抵消眩晕或束缚对防御骰结果的数值修正。`1809` 不设置该字段，`1818` 设置为 `true`。

## 迁移策略

1. 先用配置查询和无展示文本测试证明两个 profile 缺失。
2. 扩展 loader 与对象 profile 的可选字段，保证已有 profile 的输出不增加无意义的 `undefined` 字段。
3. 可见附属结界在有 `combatProfiles` 时标记 `combatProfilesSource=config`。
4. 将防御窗口从“对象有防御文本且未被状态禁用”改为“对象有可用 profile，且该 profile 未被状态禁用”；直接防御命令使用同一裁决。
5. 以 `1809` 普通防御、`1818` 眩晕状态下仍可防御、隐藏展示文本和旧文本夹具回归测试收口。

## 非目标

- 不实现强制防御结界、展示/反制窗口、庇护或区域光环。
- 不改变眩晕 / 束缚的防御骰修正。
- 不迁移 `3715` 偏移护腕；装备防御另建切片。
