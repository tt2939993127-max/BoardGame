# 设计：偏移护腕结构化法师防御

## Owner 边界

- `mage-wars.config.json` 保存 `3715` 的结构化防御 profile 和 `requiresCodeSupport` 状态。
- `configPackage.ts` 继续负责 profile 的严格读取和合法性校验。
- `spellRules.ts` 负责从附着在法师身上的装备读取防御 profile、按 profile ID 查询和按回合判断可用次数。
- `execute.ts` / `spellAbilityExecutors.ts` 负责在已有三类攻击入口进入防御窗口，以及在防御响应后恢复原攻击。
- `systems.ts` 继续是防御交互 owner；不新增一套“法师防御”按钮系统。
- `reducer.ts` 负责玩家防御使用次数、攻击行动消耗和防御掷骰事件的状态归约。

## 配置形状

```json
{
  "combatProfiles": {
    "attacks": [],
    "defenses": [
      {
        "id": "defense-0",
        "minRoll": 7,
        "usesPerRound": 1
      }
    ]
  },
  "requiresCodeSupport": false
}
```

`attackOrTraitLine` 只保留卡面展示；领域不得依赖其中的中文“防御图标”文本。

## 防御目标与攻击恢复

防御机会事件保留现有事件类型和交互来源，但把攻击者 / 防御者改为明确的对象或玩家二选一。具体规则如下：

1. 防御 profile 来源可以是竞技场对象自身、附属结界或附着在法师身上的装备。
2. 同一 profile 只在本回合达到 `usesPerRound` 后失效；行动准备事件清除玩家和对象的使用记录。
3. 目标是法师时，防御掷骰使用法师的状态修正；目标是对象时，继续使用对象现有状态修正。
4. 普通防御由玩家选择“防御 / 放弃”，自动回避仍强制执行。
5. 防御成功只产生攻击未命中结果；防御失败通过事件中保存的攻击来源和目标恢复原攻击，不重复支付法术费用或行动费用。
6. 攻击类法术在防御恢复时只重新执行攻击效果，不重复发出施法支付 / 施法完成事件。

## 非目标

- 不把所有卡牌特殊效果都抽象成通用 DSL。
- 不让 `3715` 获得攻击能力；它只有防御 profile。
- 不实现法师完整基础防御卡组、反制窗口、隐藏信息 UI 或新增确认按钮。
