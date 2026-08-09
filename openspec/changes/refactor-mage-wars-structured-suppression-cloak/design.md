# 设计：抑制斗篷结构化来袭攻击费用

## Owner 边界

- `mage-wars.config.json` 保存 `3705` 的静态费用、触发范围和每回合限制。
- `configPackage.ts` 严格读取 `combatTraits.meleeAttackManaTax`，负责正整数和布尔值校验。
- `spellAbilityExecutors.ts` 只负责把配置来源标记写入装备实例；不把特性复制成另一份规则文本。
- `spellRules.ts` 负责从附着在目标法师身上的装备解析当前来袭生物尚未触发的费用来源。
- `execute.ts` 负责对象攻击宣告时把心灵安抚与抑制斗篷费用作为一次原子支付条件，并在已有防御窗口前发出领域事件。
- `reducer.ts` 负责记录每个抑制斗篷来源本回合已经触发的攻击生物；`systems.ts` 继续拥有既有防御 / 反击交互，不新增第二套交互。

## 配置形状

```json
{
  "combatTraits": {
    "meleeAttackManaTax": {
      "amount": 2,
      "oncePerAttackerPerRound": true,
      "excludeCounterstrike": true
    }
  },
  "requiresCodeSupport": false
}
```

`attackOrTraitLine` 和 `text` 仍然只承担玩家展示；正式配置对象的领域结算不得从中文文本解析费用。

## 触发与支付时序

1. 只检查对象攻击入口；攻击者必须是 `creature`，攻击 profile 必须是 `melee`，目标必须是法师。
2. 反击入口显式传入 `isCounterstrike=true` 时跳过抑制斗篷；防御响应恢复原攻击时不重复触发，因为来源已在第一次宣告前记录。
3. 收集目标法师所有附着装备中本回合仍可用的费用来源。多个来源分别触发并相加。
4. 将抑制斗篷费用与心灵安抚费用合计后检查攻击者控制方的法力；只有总费用足够时才发出 `MANA_SPENT`，不允许部分支付。
5. 先记录触发来源，再进入已有 `DEFENSE_AVAILABLE` 或骰子结算；法力不足时发出空骰攻击宣告和 `ATTACK_MISSED`，沿用现有行动已宣告 / 已消耗语义。
6. 新回合依靠已有回合号变化使来源重新可用；删除或移除装备后来源查询自然为空。

## 状态与事件

- 装备实例用 `meleeAttackManaTaxRoundNumber` 和 `meleeAttackManaTaxAttackerObjectIdsThisRound` 保存本回合使用事实。
- `MELEE_ATTACK_MANA_TAX_TRIGGERED` 只记录来源、攻击者、回合和总费用，不承担支付；支付仍使用现有 `MANA_SPENT`。
- 不新增玩家确认支付交互；当前领域入口根据法力是否足够直接执行规则。

## 非目标

- 不把抑制斗篷应用到法师、装备或攻击类法术的攻击。
- 不把 `1912` 重命名成通用费用事件，也不把两个效果合并成一个展示文案 owner。
- 不修改 UI、素材、行动日志 UI 或设计稿。
