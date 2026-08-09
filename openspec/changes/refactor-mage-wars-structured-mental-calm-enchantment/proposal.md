# Change: 将心灵安抚迁入结构化攻击触发

## Why

`1912` 心灵安抚已经完成逐卡字段录入，但当前仍以 `requiresCodeSupport: true` 保留。它的规则时机位于对象攻击宣告阶段，不能由附属结界的中文展示文本临时解析；尤其在攻击进入防御窗口后，支付和“本回合首次攻击”事实必须跨命令保持一致。

## What Changes

- 为 `1912` 增加可见对象附属结界语义，结构化声明 `mental-calm=2`，并标记为已实现。
- 在对象攻击宣告阶段，从附属结界来源读取尚未在本回合触发的心灵安抚来源。
- 由明确的法力支付事件扣除控制者法力，并在防御窗口前记录来源已经触发，避免防御选择后重复收费。
- 法力不足时取消本次攻击，同时保留已有攻击宣告 / 行动消耗事件语义。
- 排除反击；近战和远程对象攻击均适用；每个来源每回合最多触发一次。

## Scope

本 change 只覆盖 `1912` 心灵安抚及其在现有对象攻击链中的一次回合触发。不实现法师绑定、隐藏结界、展示 / 反制、其它未实现结界、法师攻击入口或完整结界 UI。

## Impact

- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/systems.ts`
  - `src/games/mage-wars/__tests__/`
- 不修改 UI、素材、设计稿或玩家可见文案。
