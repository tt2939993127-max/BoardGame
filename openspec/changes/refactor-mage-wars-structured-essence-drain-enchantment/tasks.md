## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1815` 精华汲取。
- [x] 1.2 锁定维持阶段支付 / 摧毁选择、法力不足和来源移除边界。

## 2. Config Package Source And Loader

- [x] 2.1 增加 `mana-cost` 维持语义和严格读取。
- [x] 2.2 为 `1815` 录入可见对象附属、2 点维持费用并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 从附属结界来源读取维持费用。
- [x] 3.2 在维持阶段发出待处理事件并创建玩家选择。
- [x] 3.3 支付 / 摧毁沿用现有法力和对象生命周期 owner。
- [x] 3.4 法力不足、来源移除和多来源队列不产生重复支付。

## 4. Verification

- [x] 4.1 增加 `1815` 配置语义和 ability catalog 回归测试。
- [x] 4.2 增加支付、摧毁、法力不足、来源移除和展示文本移除后的领域流程测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、TypeScript、ESLint 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现 `1804`、`1825`、`1901`、`1904`、法师绑定、隐藏结界、完整维持排序、展示 / 反制或完整结界 UI。
