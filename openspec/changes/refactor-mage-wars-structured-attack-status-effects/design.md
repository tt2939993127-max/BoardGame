# 设计：结构化攻击状态效果

## 数据 owner

- `mage-wars.config.json` 保存攻击 profile 的效果骰状态事实。
- `configPackage.ts` 负责校验和物化，不负责状态结算。
- `spellRules.ts` 把配置规则解析为领域可消费的效果列表。
- `execute.ts` 只消费领域效果列表并复用既有状态 token 事件、免疫过滤和 reducer。
- `attackOrTraitLine` 只保留展示 / 核对用途；未迁移能力可以暂时读取它，但本 change 覆盖的状态效果不得回读文本。

## 配置形状

效果骰状态规则挂在单个攻击 profile 上：

```json
{
  "statusEffects": [
    {
      "statusTokenId": "burn",
      "minEffectDie": 8,
      "amount": 1
    },
    {
      "statusTokenId": "burn",
      "minEffectDie": 11,
      "amount": 2
    }
  ]
}
```

没有上限时表示 `minEffectDie+`；有上限时表示闭区间。相同状态的不同区间可以共存，以表达 `5-10=眩晕、11+=昏迷` 或 `4-9=虚弱、10+=虚弱x2`。

## 迁移策略

1. 扩展 `combatProfiles` 类型和 loader 校验。
2. 先为一张有单一阈值的卡录入配置并补运行时测试。
3. 再录入多区间 / 多状态攻击，增加逐卡与旧文本解析等价性测试。
4. 正式配置对象消费结构化效果；没有配置来源标记的夹具保留旧解析路径。
5. 更新复查文档，列清本 change 覆盖和仍 deferred 的效果族。

