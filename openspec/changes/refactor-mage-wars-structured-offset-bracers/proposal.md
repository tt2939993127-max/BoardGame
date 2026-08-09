# Change: 将偏移护腕迁入结构化法师防御

## Why

`3715` 偏移护腕已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留。现有防御链只支持竞技场对象；偏移护腕附着在法师身上，导致配置中的防御事实没有运行时承载点。

继续从 `attackOrTraitLine` 解析“7+ / 1x”会让玩家可见卡面文本承担规则 owner，也无法覆盖法师被生物、法师基础攻击和攻击类法术攻击时的同一回避步骤。

## What Changes

- 为 `3715` 增加结构化防御 profile：7+、每回合 1 次、普通掷骰防御。
- 扩展现有防御机会与防御交互，使防御目标可以是法师或竞技场对象，但仍由同一个防御交互 owner 负责。
- 让附着在法师身上的装备提供配置防御 profile；玩家状态按 profile 记录本回合使用次数，并在行动准备重置时清除。
- 让法师被竞技场对象、法师基础近战和攻击类法术攻击时，都能在伤害前进入同一防御窗口。
- 防御成功时原攻击被回避；防御失败时恢复原攻击结算；不改变已有对象防御、自动回避和来源销毁行为。
- 将 `3715` 标记为已实现，并补配置、领域流程和回合重置测试。

## Scope

本 change 只覆盖 `3715` 偏移护腕及法师防御所需的通用事件 / 状态扩展。攻击来源仅覆盖当前 foundation 已存在的法师基础攻击、竞技场对象攻击和攻击类法术攻击入口。

不实现 `3716` 元素魔杖的法术绑定、`3705` 抑制斗篷的攻击附加费用、`3700` 恶魔胸甲的反伤屏障、隐藏结界或完整防御 UI。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、Open Design 设计稿或玩家可见文案。
