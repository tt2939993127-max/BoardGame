# 设计：格挡结构化一次性防御

## Owner 边界

- `mage-wars.config.json` 保存 `1806` 的防御 profile、自动回避和来源销毁事实。
- `configPackage.ts` 严格读取防御 profile 的可选结算类型和来源生命周期。
- `spellRules.ts` 负责把附属结界 profile 透传到目标对象，并保留来源对象身份。
- `execute.ts` / `systems.ts` 负责强制防御选择、自动回避、不可回避时的来源销毁和已有攻击续链。
- 现有 reducer 的 `ARENA_OBJECT_DEFEATED` 继续负责移除格挡来源，不新增结界清理容器。

## 配置形状

```json
{
  "requiresCodeSupport": false,
  "combatProfiles": {
    "attacks": [],
    "defenses": [
      {
        "id": "defense-0",
        "minRoll": 1,
        "usesPerRound": 1,
        "resolution": "automatic-evade",
        "consumesSource": true
      }
    ]
  }
}
```

`minRoll` 仅保持现有 profile 结构完整；`automatic-evade` 不掷防御骰。`consumesSource` 只对附属来源生效，使用后通过现有对象击败事件销毁来源。

## 结算规则

1. 合法施放生成已展示的 `1806` 附属结界对象并锚定目标生物。
2. 可回避攻击声明到该目标时，防御窗口只暴露格挡，不能跳过；格挡直接回避本次攻击并销毁自身。
3. 攻击被标记为不可回避时不创建防御窗口，但仍销毁附着的格挡，攻击正常继续。
4. 格挡不产生防御骰事件，也不改变其它防御 profile 的骰值修正和冷却规则。
5. 玩家可见规则文本只负责展示；格挡的强制回避和来源生命周期由结构化 profile 驱动。

## 非目标

- 不新增法师防御或装备防御系统。
- 不把格挡行为泛化为攻击逆转或通用反制窗口。
- 不修改 UI、素材、设计稿或玩家可见文案。
