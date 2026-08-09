# Change: 将圣佑领地迁入区域庇护特性

## Why

`1913` 圣佑领地已经完成逐卡字段录入，但当前仍把“区域内友方活体生物获得庇护 1”留在玩家可见文本中。现有 `1813` / `1911` 已建立对象附属庇护 owner，`1913` 应复用同一最高值与最低骰数规则，只增加区域锚定来源。

## What Changes

- 为 `1913` 录入严格的可见区域结界语义和 `aegis=1` 授予特性。
- 让区域结界施放生成公开、区域锚定的结界对象。
- 让位于该区域的友方活体生物在对象攻击和攻击法术中消费区域庇护。
- 与对象附属庇护统一取最高值，不叠加来源。

## Scope

本 change 只覆盖 `1913` 区域庇护 1。区域版只影响同区域的友方活体场上生物，不影响法师、敌方生物或其它区域；墙体 / 标准 12 区、隐藏结界、展示 / 反制、法师绑定和完整区域结界 UI 保持 deferred。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。

