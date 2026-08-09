# 设计：结构化战斗 profile

## Owner 边界

- `mage-wars.config.json` 是已录入静态战斗事实的作者源。
- `configPackage.ts` 负责 JSON 结构校验、物化和按 CardID 查询，不负责规则执行。
- `spellRules.ts` 负责把配置 profile 转成领域可消费的只读 profile，不读取玩家可见文本来决定已配置卡牌的基础攻击 / 防御事实。
- `execute.ts` 只消费领域 profile，负责目标合法性、响应窗口和事件生成。
- `attackOrTraitLine` 仍属于展示字段和人工核对证据；特殊效果迁移前可以继续由对应能力切片读取，但不得借它回填基础 profile 字段。

## 配置形状

每张有战斗条的卡在 `data.combatProfiles` 中声明：

```json
{
  "attacks": [
    {
      "id": "attack-0",
      "name": "利爪",
      "action": "quick",
      "rangeKind": "melee",
      "diceCount": 5,
      "pierce": 1,
      "strikeCount": 1,
      "damageTypes": ["霜冻"]
    }
  ],
  "defenses": [
    {
      "id": "defense-0",
      "minRoll": 8,
      "usesPerRound": 1
    }
  ]
}
```

远程攻击额外声明 `range: { "min": 1, "max": 2 }`；近战攻击不重复声明距离。没有伤害类型的攻击使用空数组，而不是从卡面文字推断。`line` 只作为可选展示 / 对照字段，不进入机器裁定字段。

## 迁移策略

1. 先给配置包类型和校验器增加 profile 结构。
2. 用现有文本解析器生成对照结果，逐张把已实现对象的 profile 写入 JSON，并测试两边字段等价。
3. 修改 runtime 查询入口，使已配置来源 CardID 从配置包读取；对没有配置来源的测试夹具保留旧解析器路径，避免把合成测试对象误当成正式卡牌。
4. 给已配置对象增加缺 profile 失败测试，防止以后 `requiresCodeSupport=false` 的卡牌悄悄回到文本解析。
5. 最后更新复查文档，明确基础 profile 已迁移、特殊攻击效果仍 deferred。

## 不采用的方案

- 不把 profile 解析结果复制进每个场上对象状态：这些是卡牌静态事实，场上状态只保存来源 CardID，避免第二个静态 owner。
- 不删除旧文本解析器：它在迁移期承担对照和未配置测试夹具职责；删除前必须证明所有正式来源已迁移且没有其它 owner 使用它。
- 不把所有卡面特殊效果一次性塞进一个通用 JSON DSL：这会模糊能力职责，并把尚未核定的规则假装成已实现。

