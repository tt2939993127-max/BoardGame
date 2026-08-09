# Change: 将反戈一击迁入结构化附属结界

## Why

`1903` 反戈一击已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留，并依赖目标生物展示文本中的“反击”识别。现有可见附属结界语义和对象反击响应窗口已经具备，继续让中文展示文本承担规则 owner 会使这张牌无法进入同一结构化配置链。

## What Changes

- 为 `1903` 增加可见附属结界语义，并结构化声明授予反击特性。
- 将 `1903` 标记为已实现，运行时从附属结界来源识别反击机会，不依赖结界或生物展示文案。
- 在首次选择并执行该来源授予的反击时销毁对应附属结界；放弃反击不销毁。
- 保留守卫反击、卡牌自身反击文本和未配置测试夹具的既有路径。

## Scope

本 change 只覆盖 `1903` 反戈一击及其在现有对象反击交互链中的一次性来源消费。不实现 `1904` 攻击逆转、强制防御结界、隐藏结界、反制窗口或其它结界触发能力。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿、通用配置 schema 或玩家可见文案。
