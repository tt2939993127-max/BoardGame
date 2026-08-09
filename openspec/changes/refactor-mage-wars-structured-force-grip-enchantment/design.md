# 设计：原力之握结构化附属结界

## Owner 边界

- `mage-wars.config.json` 保存 `1908` 的可见附属和授予束缚静态事实。
- `configPackage.ts` 负责严格读取 `restrained` 授予特性。
- `spellRules.ts` 负责 `1908` 的不羁目标限制，以及读取配置授予特性的通用 helper。
- `validate.ts` 负责把“不羁目标无效”接入显性附属结界施法校验。
- `spellAbilityExecutors.ts` 负责复用现有 `ARENA_OBJECT_RESTRAINED` 事件建立附属来源。
- `utils.ts` / `reducer.ts` 的现有生命周期负责销毁结界时移除目标的束缚来源；本 change 不复制这套清理逻辑。

## 配置形状

`1908` 复用已有可见对象结界容器：

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
      { "trait": "restrained" }
    ]
  }
}
```

## 结算规则

1. 目标必须是生物；具有不羁特性的生物不能成为目标。
2. 合法施放先生成已展示的 `1908` 附属结界对象，再发出 `ARENA_OBJECT_RESTRAINED`，让目标记录该结界对象为束缚来源。
3. 目标的普通移动、推斥和传送继续由现有 `restrainedByObjectId` / 不可移动校验处理，不新增执行路径。
4. `1908` 被驱散、目标离场或结界关系被清理时，现有 `removeArenaObject` 负责移除束缚来源。
5. 运行时规则不读取 `rulesText` 中的“束缚”或“稳固”文字；展示字段只保留给玩家查看。

## 非目标

- 不把“稳固”扩展成新的全局状态系统；当前关系字段已经覆盖本阶段的不可移动边界。
- 不改变 `2224` 缠绕藤蔓的魔物实现和既有文本夹具。
- 不实现 `1904`、`1912`、庇护、区域结界、隐藏结界或反制窗口。
