# Change: 将法师战争对象攻击状态效果迁入配置包

## Why

基础攻击 profile 已经从卡面文本迁入配置包，但攻击效果骰仍由 `attackOrTraitLine` 的中文正文解析燃烧、腐化、眩晕、昏迷、虚弱和残废。这样同一张卡仍有一半规则由展示文案驱动，翻译或标点变化仍可能改变运行结果。

## What Changes

- 在已实现生物与武器装备的攻击 profile 中增加结构化效果骰状态规则：状态 token、效果骰最小值 / 最大值和放置层数。
- 配置包严格校验状态 token、效果骰区间、层数和 profile 归属。
- 对正式配置对象，攻击结算从配置 profile 读取状态效果；未配置合成夹具继续使用旧文本解析作为迁移期对照。
- 保留卡面文本用于展示和人工核对，但不再作为已迁移状态效果的运行时 owner。

## Scope

本 change 覆盖当前已有执行链的对象攻击状态效果：燃烧、腐化、眩晕、昏迷、虚弱和残废。首批录入 `2801`、`2803`、`2808`、`2809`、`2810`、`2825`、`3706` 的实际攻击 profile。

本 change 不迁移攻击推斥、法力流失、嗜血、冲锋、重生、飞行、治疗行动、以太 / 非活体加伤、装备栏和职业限制；这些保持独立能力切片。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改通用配置 schema、UI、素材或玩家可见文案。

