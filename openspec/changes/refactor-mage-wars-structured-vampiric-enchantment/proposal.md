# Change: 将鲜血贪噬迁入结构化附属结界

## Why

`1910` 鲜血贪噬已经完成逐卡字段录入，但仍以 `requiresCodeSupport: true` 保留。现有对象攻击链已经能根据实际伤害生成治疗事件，且可见附属结界语义已有统一承载入口，因此不应继续让 `attackOrTraitLine` 或结界展示文本承担“吸血”规则 owner。

## What Changes

- 为 `1910` 增加可见附属结界语义，结构化声明授予近战吸血。
- 将 `1910` 标记为已实现，并让附属来源在对象所有近战攻击 profile 上生效。
- 复用现有实际伤害治疗事件；不改变 `3404` 汲血之击的一次性吸血 / 穿刺临时效果。
- 保留未配置测试夹具的旧文本路径，不让正式配置对象依赖展示文案。

## Scope

本 change 只覆盖 `1910` 鲜血贪噬的可见附属授予近战吸血。不实现 `1912` 心灵安抚、`1904` 攻击逆转、隐藏结界、展示/反制窗口或其它卡牌级特性。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿、通用配置 schema 或玩家可见文案。
