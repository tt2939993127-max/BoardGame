# 设计：心灵安抚结构化攻击触发

## Owner 边界

- `mage-wars.config.json` 保存 `1912` 的附属结界和 `mental-calm=2` 静态事实。
- `configPackage.ts` 严格读取 `mental-calm` 及其正整数值。
- `spellRules.ts` 从可见附属结界来源解析当前对象尚未触发的心灵安抚来源；不回读中文展示文本。
- `execute.ts` 在对象攻击宣告阶段决定本次是否触发、是否有足够法力，并按事件顺序发出支付、触发、取消或防御窗口事件。
- `reducer.ts` 保存每个来源本回合已经触发的攻击者 ID，并在攻击宣告前完成跨命令状态落地。
- `systems.ts` 只在反击调用入口显式传入 `isCounterstrike=true`，不让反击触发心灵安抚。

## 配置形状

复用现有可见对象结界容器，不新增第二套结界对象模型：

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
      { "trait": "mental-calm", "value": 2 }
    ]
  }
}
```

`value` 表示每个尚未触发来源要求支付的法力，不从 `rulesText` 推导。

## 攻击时序

1. 仅对非反击的对象攻击检查；攻击者必须是被对象附属结界锚定的对象，装备攻击不会凭空继承该结界。
2. 收集本回合尚未触发的 `mental-calm` 来源。每个来源独立计费，本次总费用为来源值之和。
3. 无论支付成功与否，先发 `MENTAL_CALM_TRIGGERED`，把来源和攻击者写入本回合事实；这样防御选择后的二次命令不会再次触发同一来源。
4. 法力足够时先发 `MANA_SPENT`，再进入既有防御窗口或攻击骰结算。
5. 法力不足时不发防御窗口，不投攻击骰；发出空骰 `ARENA_OBJECT_ATTACK_DECLARED` 和 `ATTACK_MISSED`，沿用现有攻击行动已宣告、行动已消耗的语义。
6. 同一回合再次攻击时来源查询为空；新回合由现有 `TURN_ADVANCED` / `ACTION_READINESS_RESET` 的回合号变化自然重新可用，不新增清理系统。

## 事件边界

- `MANA_SPENT` 表示控制者实际支付法力，和“攻击造成法力流失”的 `MANA_DRAINED` 不混用。
- `MENTAL_CALM_TRIGGERED` 表示来源本回合已对该攻击者触发，发生在 `DEFENSE_AVAILABLE` 之前。
- `ARENA_OBJECT_ATTACK_DECLARED` 继续负责攻击行动消耗；防御窗口仍由现有 `DEFENSE_AVAILABLE` 负责，反击仍由现有交互系统负责。
- 反击调用必须显式排除心灵安抚，但反击自身的防御窗口、伤害和其它既有规则不变。

## 多来源裁决

多个 `1912` 来源同时附着在同一对象时，各来源均在本回合首次攻击时触发并分别收费；不把多个来源合并成一个最高值，因为这张牌的规则是每个附属来源各自施加的触发限制。法力不足时本次攻击取消，所有本次已触发来源保持本回合已触发。

## 非目标

- 不把 `1912` 扩展到法师攻击、法术攻击、装备攻击的法师控制者或反击。
- 不新增支付确认交互；当前运行时按已有“直接执行”攻击命令自动扣除足够法力。
- 不修改 UI、素材、行动日志或完整响应 / 反制系统。
