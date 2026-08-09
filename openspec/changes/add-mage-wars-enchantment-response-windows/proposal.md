# Change: 接入法师战争结界反制与攻击逆转响应窗口

## Why

`1825 厄运`、`1901 法力失效` 和 `1904 攻击逆转` 的卡面效果都依赖法术反制或回避攻击时机。当前法师战争领域已经能结算普通施法、攻击和防御，但还不能把一笔未完成的施法 / 攻击上下文跨响应窗口保存并恢复，因此这三张牌只能保持 `needsCode`。

## What Changes

- 为法师战争接入三类结构化响应时机：快速法术反制、目标法术反制、攻击回避时机。
- 复用引擎现有 `ResponseWindowSystem`、`InteractionSystem` 和 resolution frame；不在 Mage Wars core 或交互描述符中建立第二套攻击 / 施法续链。
- 为强制展示响应提供不可跳过的响应语义：合法隐藏结界满足触发条件时必须展示，不能用 `RESPONSE_PASS` 绕过规则。
- 实现 `1825 厄运`：反制目标快速法术、将该法术返回拥有者法术书、返还本次施法全部法力并摧毁厄运。
- 实现 `1901 法力失效`：反制对手控制的咒语或结界类目标法术并摧毁法力失效。
- 实现 `1904 攻击逆转`：可回避攻击被逆转并交换来源 / 目标；无法回避时只摧毁攻击逆转而不产生逆转效果。
- 为每张卡补配置语义、响应上下文、非法触发、重复结算和跨窗口恢复测试，并同步 `needsCode` 统计。

## Scope

本 change 只覆盖 `1825`、`1901`、`1904` 的响应窗口和结算恢复。

明确不覆盖：

- `1804 法师祸咒`。它不是响应窗口卡，而是“生物作为施法者并成功结算法术”后的触发效果；当前学徒基础领域没有生物施法者身份，需要独立的来源建模 change。
- 完整隐藏结界构筑、完整卡牌实例化、自由构筑、四人模式和完整响应窗口 UI。
- 任何通过解析中文展示文案决定是否触发的实现。

## Impact

- Affected specs: `mage-wars-card-effect-runtime`、`interaction-system`、`resolution-stack`
- Affected code:
  - `src/engine/systems/ResponseWindowSystem.ts`
  - `src/engine/systems/index.ts`
  - `src/engine/types.ts`
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/commands.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/game.ts`
  - `src/games/mage-wars/__tests__/`

