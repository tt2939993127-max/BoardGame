# Change: 建立法师战争非玩家生物施法者来源

## Why

`1804 法师祸咒` 的规则触发条件是“本生物施放并结算一个法术后受到 1 点直接伤害”。当前 Mage Wars 施法事件只记录控制玩家 `playerId`，没有记录实际施法者；因此运行时无法区分法师施法和非玩家生物施法，也不能安全地把伤害落到正确对象上。

## What Changes

- 为施法命令、施法开始 / 结算事件和响应上下文增加明确的施法者引用：法师或具备配置施法能力的场上生物。
- 为场上对象增加结构化施法能力来源校验；没有该来源的生物不得通过通用施法命令施法。
- `1804` 只在附属目标生物作为实际施法者、法术成功结算后造成 1 点直接伤害。
- 被反制、提前取消、校验失败或由法师施放的法术不得触发 `1804`。
- 保留 `1804` 的配置 `needsCodeSupport`，直到本 change 的真实生物施法来源、伤害时序和来源边界全部通过测试。

## Scope

本 change 只建立施法者来源模型和 `1804` 的结算触发，不实现具体生物的法术能力、完整生物法术书、部署点法术或多人响应优先级。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/domain/commands.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/data/configPackage.ts`
- 不修改 UI、素材、法术书展示或通用引擎响应窗口协议。

## Follow-up

规则书第 18 页定义的魔宠 / 再生点独立计划、对象法力优先支付和真实施法入口不属于当前学徒基础配置；规则第 5 页的四套学徒法术书也没有这些来源卡。对应能力已拆到 `add-mage-wars-familiar-spellcasting`，本 change 在该入口完成前不宣称 `1804` 已实现。
