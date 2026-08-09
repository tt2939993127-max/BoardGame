## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1912` 心灵安抚。
- [x] 1.2 锁定支付时机、法力不足、跨防御窗口状态和反击排除边界。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化授予特性枚举，严格读取 `mental-calm`。
- [x] 2.2 为 `1912` 录入 `value=2` 的可见对象附属结界语义并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 增加每个来源按回合记录已触发攻击者的状态字段和 reducer。
- [x] 3.2 增加明确的 `MANA_SPENT`、`MENTAL_CALM_TRIGGERED` 领域事件。
- [x] 3.3 在防御窗口前触发并支付；法力不足时取消攻击并消耗行动。
- [x] 3.4 反击显式排除心灵安抚，保留普通攻击和装备攻击的既有路径。

## 4. Verification

- [x] 4.1 增加 `1912` 配置语义、能力目录和 `requiresCodeSupport` 回归测试。
- [x] 4.2 增加法力足够、法力不足、每回合一次、新回合重置、近战 / 远程和多来源测试。
- [x] 4.3 增加防御窗口前支付、反击不触发和移除展示文案仍生效测试。
- [x] 4.4 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现 `1804`、`1904`、`3700`、`3705`、`3710`、`3715`、`3716`、隐藏结界、展示 / 反制、法师攻击或完整结界 UI。
