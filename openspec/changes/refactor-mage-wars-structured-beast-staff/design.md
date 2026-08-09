# 设计：群兽法杖结构化特殊能力

## Owner 边界

- `mage-wars.config.json` 保存能力的内部标识、兽王限制、费用、射程、每回合限制、近战骰修正和治疗骰数。
- `configPackage.ts` 严格读取并校验这些字段；玩家可见的中文卡面仍只负责展示。
- `commands.ts` 继续复用 `USE_ARENA_OBJECT_ABILITY`，通过稳定能力 ID 和 `mode` 区分装备能力分支。
- `spellRules.ts` 负责装备来源、目标合法性、每回合使用状态和距离查询；不从中文文本推导能力是否可用。
- `validate.ts` 负责阶段、玩家、兽王、附着装备、行动轨道、法力和目标边界。
- `execute.ts` 负责发出能力结算、法力 / 行动消耗和效果事件；`reducer.ts` 只消费事件并记录状态。
- `flowHooks.ts` 负责清理本行动临时状态和回合结束临时状态，不能让一个清理路径同时决定两种生命周期。

## 配置形状

```json
{
  "combatTraits": {
    "beastStaff": {
      "abilityId": "mw.equipment.3710.beast-staff",
      "requiredMageId": "beastmaster_apprentice",
      "manaCost": 2,
      "oncePerRound": true,
      "actionSpeed": "quick",
      "range": { "min": 0, "max": 1 },
      "meleeDiceModifier": 2,
      "healingDiceCount": 2
    }
  },
  "requiresCodeSupport": false
}
```

`abilityId`、`requiredMageId` 和 `mode` 是内部稳定标识；中文名称、卡面正文和 `spellCardId` 不作为能力分支条件。

## 结算规则

1. 只有附着在当前玩家法师身上的 `3710` 实例才能发起能力。
2. 能力必须在快速施法窗口或生物行动阶段使用；快速施法窗口消耗法师快速施法标记，生物行动阶段消耗法师行动标记。
3. 同一装备实例在同一 `turnNumber` 只能成功使用一次；拒绝重复使用不产生事件。
4. 目标必须是当前玩家控制的、活体、动物、生物，且与法师距离不超过 1 格；强化和治疗共用这一目标边界。
5. `melee-bonus` 发出 `ARENA_OBJECT_ABILITY_RESOLVED` 和 `ARENA_OBJECT_TEMPORARY_TRAITS_GAINED`，修正为 +2 且有效至当前回合结束。
6. `heal` 发出 `ARENA_OBJECT_ABILITY_RESOLVED` 和 `SPELL_HEALING_ROLLED`，投掷 2 颗攻击骰，实际治疗量不超过目标当前伤害。
7. 每回合有效的近战修正必须跨过生物行动阶段和最终快速施法阶段，在下一回合统一清理；本行动临时移动 / 冲锋等修正仍按原阶段清理。

## 明确不做

- 不新增 UI 按钮、装备栏或新手提示。
- 不把能力拆成两条重复的命令通道。
- 不为未覆盖的 `3716` 法术绑定或其它装备特殊能力建立泛化 DSL。

