# Change: 将法师战争攻击法力流失迁入配置包

## Why

对象攻击的基础 profile 和状态效果已经结构化，但法力流失仍由 `attackProfile.line` 的中文文本解析。这样 `2807` 汲法水蛭和 `3704` 奥秘法杖的扣法力数值仍由展示文案决定，配置包尚不能独立表达这条规则。

## What Changes

- 为攻击 profile 增加可选的结构化 `manaDrain` 数值。
- 为 `2807` 和 `3704` 的攻击 profile 录入卡面法力流失值。
- 正式配置对象的攻击结算从 profile 读取法力流失；未配置夹具继续保留旧文本解析对照路径。
- 保留既有“只有首段攻击、且造成实际伤害后才扣除、按目标当前法力封顶”的时机和结算规则。

## Scope

本 change 只迁移攻击 profile 的法力流失静态数值，不迁移法力传输、攻击方获得法力、其它装备特殊能力或 UI / 日志展示。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改通用配置 schema、UI、素材或玩家可见文案。

