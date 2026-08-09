# Change: 将狱火长鞭远触攻击迁入结构化配置

## Why

`3701` 狱火长鞭已经录入完整攻击条，但现有结构化攻击 profile 没有表达“远触”。当前实现既无法让这张近战武器攻击同一区域的飞行生物，也没有一个由规则字段驱动的入口阻止普通近战攻击飞行生物。

## What Changes

- 为攻击 profile 增加可选 `reach` 能力，表示规则中的“远触”。
- 将 `3701` 狱火长鞭录入为快速近战、火焰 4 骰、远触，并迁移效果骰 7-10 燃烧、11+ 燃烧 x2。
- 近战攻击只有攻击方本身具有飞行，或攻击 profile 具有 `reach` 时，才能攻击飞行生物；远程攻击规则不变。
- 保留远触攻击的近战属性，因此不改变攻击范围、守卫、反伤屏障、反击和攻击行动类型。
- 已配置对象不依赖 `attackOrTraitLine` 执行远触和燃烧效果；未配置夹具继续保留文本解析路径。

## Scope

本 change 只覆盖 `3701` 狱火长鞭及通用攻击 profile 的远触字段。不覆盖除霜规则、法力传输、装备栏、职业限制、反伤屏障、`3710` 群兽法杖或其它装备能力。

## Sources

- 规则书：`D:\gongzuo\webgame\gameasset\法师战争\output\pdf\ai_readable_pdf_exports\101721 法师战争 Mage Wars 规则\101721 法师战争 Mage Wars 规则.md`，术语“远触”定义为近战攻击可攻击同一区域的飞行生物。
- 卡牌字段合同：`docs/games/mage-wars/rule/apprentice-card-field-contract.md`，`3701` 狱火长鞭攻击条与正式 atlas/frame。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、Open Design 设计稿或玩家可见文案。
