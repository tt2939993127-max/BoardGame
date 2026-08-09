# Change: 将法师战争攻击与防御 profile 迁入配置包

## Why

当前法师战争运行时把生物和武器装备的 `attackOrTraitLine` 当作规则输入，再从中文卡面文本解析行动速度、攻击距离、骰数、穿刺、连击和防御次数。卡面文本本来是给玩家看的展示字段；让它承担领域裁定会把翻译、标点和文案修订直接变成玩法行为，也会让配置包无法独立表达一张卡的可执行战斗事实。

## What Changes

- 在 Mage Wars 配置包的卡牌 `data` 中增加结构化 `combatProfiles`，承载已实现生物与武器装备的攻击 profile、防御 profile，以及攻击所需的基础伤害类型。
- 配置包 loader 对 profile 的 ID、行动速度、攻击距离、范围、骰数、穿刺、连击次数、防御阈值和每轮次数做严格校验。
- 领域层优先从配置包按来源 CardID 读取 profile；已配置卡牌的攻击和防御裁定不得再解析玩家可见中文文本。
- 保留 `attackOrTraitLine` 作为卡面展示、核对合同和未迁移特殊效果的来源字段，但明确它不再是本 change 覆盖的基础 profile 规则源。
- 为配置 profile 与现有文本解析结果增加等价性测试，迁移期间保留旧解析器作为对照工具，不作为已配置卡牌的运行时 owner。

## Scope

本 change 首批覆盖当前配置包中已标记 `requiresCodeSupport=false` 且具有攻击或防御条的生物与武器装备。覆盖字段为攻击 / 防御 profile 的基础结构：行动速度、近战/远程、范围、骰数、穿刺、连击、伤害类型、防御阈值和每轮使用次数。

本 change 不实现攻击条中的特殊效果语义迁移，例如法力流失、燃烧/腐化/眩晕/虚弱/残废阈值、嗜血、冲锋、重生、飞行、遁逸、治疗行动、装备栏和职业限制；这些效果必须继续由各自独立的结构化能力切片处理，不得因为 profile 已结构化就标记为全部完成。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/core-types.ts`（仅在确有必要时扩展来源查询接口）
  - `src/games/mage-wars/__tests__/`
- 不修改通用配置 schema；游戏专属事实继续放在配置对象的 `data` 中。
- 不修改 UI、卡图、Open Design 设计稿或玩家可见文案。

