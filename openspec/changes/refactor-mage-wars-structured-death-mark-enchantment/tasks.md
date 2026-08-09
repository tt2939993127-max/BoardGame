## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1826` 死亡印记的对象生物首攻加骰。
- [x] 1.2 明确不扩展到法师攻击、攻击法术、法师绑定或响应窗口。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化授予特性枚举，严格读取 `death-mark`。
- [x] 2.2 为 `1826` 录入可见附属结界语义并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 从目标对象附属来源读取死亡印记首攻加骰。
- [x] 3.2 在对象攻击事件中记录来源和当前回合，并由 reducer 消费来源。
- [x] 3.3 保持每个攻击者每回合首攻、同一攻击多段共享修正和来源离场清理。

## 4. Verification

- [x] 4.1 增加 `1826` 配置语义和 ability catalog 计数回归测试。
- [x] 4.2 增加移除展示文案后仍生效的领域流程测试。
- [x] 4.3 增加同一生物首攻 / 后续攻击、不同生物首攻和多段攻击边界测试。
- [x] 4.4 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现法师绑定、法师攻击、攻击法术、`1904`、`1912`、隐藏结界、展示 / 反制或完整结界 UI。
