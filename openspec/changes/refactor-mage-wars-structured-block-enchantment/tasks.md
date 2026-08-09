## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1806` 格挡的一次性自动回避。
- [x] 1.2 明确不扩展到攻击逆转、心灵安抚、装备防御或法师防御。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化防御 profile，严格读取自动回避和来源销毁字段。
- [x] 2.2 为 `1806` 录入自动回避 profile 并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 将附属防御 profile 的来源对象身份透传到目标对象。
- [x] 3.2 对可回避攻击强制使用格挡，自动产生回避并销毁来源。
- [x] 3.3 对不可回避攻击销毁格挡但继续攻击，保持其它防御流程不变。

## 4. Verification

- [x] 4.1 增加 `1806` 配置语义和 ability catalog 计数回归测试。
- [x] 4.2 增加可回避攻击自动回避、来源销毁和无防御骰测试。
- [x] 4.3 增加不可回避攻击销毁来源并继续攻击的边界测试。
- [x] 4.4 增加移除展示文案后仍生效和其它防御回归测试。
- [x] 4.5 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现 `1904`、`1912`、`3715`、法师防御、隐藏结界、通用反制优先级或完整结界 UI。
