# Change: 将法师战争卡牌级战斗特性迁入配置包

## Why

基础攻击 profile、状态效果和法力流失已经逐步结构化，但 `2804` 狼人宠物戈伦的嗜血仍由 `attackOrTraitLine` 与 `rulesText` 中文文本解析。嗜血是跨多条近战攻击生效的卡牌级特性，不应继续依附某一段展示文本。

## What Changes

- 在法术牌配置 `data` 中增加卡牌级 `combatTraits`，首批承载嗜血基础值和同区控制方法师额外值。
- 为 `2804` 录入嗜血 `+1` 与同区法师额外 `+1`。
- 正式配置对象的嗜血骰数修正从结构化卡牌特性读取；未配置夹具继续保留旧文本解析对照路径。
- 保持现有规则时机：只对近战、只在第一段攻击、目标必须是已受伤活体，并按控制方法师是否同区添加额外值。

## Scope

本 change 只迁移 `2804` 的嗜血卡牌级特性，不迁移冲锋、迅捷、重生、遁逸、传奇、法力传输或其它卡牌级能力。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改通用配置 schema、UI、素材或玩家可见文案。

