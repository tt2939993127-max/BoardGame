## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1820` 尸鬼腐化的结构化维持伤害。
- [x] 1.2 明确法师绑定 `+2` 与其它结界响应规则保持 deferred。

## 2. Config Package Source And Loader

- [x] 2.1 增加维持阶段直接伤害语义和严格读取。
- [x] 2.2 为 `1820` 录入可见附属结界、2 点毒素直接伤害并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 从附属结界来源读取维持阶段直接伤害。
- [x] 3.2 复用毒素免疫、直接伤害和对象击败 owner。
- [x] 3.3 保持结界离场后不再产生维持伤害。

## 4. Verification

- [x] 4.1 增加 `1820` 配置语义和 ability catalog 计数回归测试。
- [x] 4.2 增加移除展示文案后仍产生维持伤害的领域流程测试。
- [x] 4.3 增加毒素免疫、来源销毁后停止和击败边界测试。
- [x] 4.4 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现法师绑定支付、`1804`、`1904`、`1912`、隐藏结界、展示 / 反制或完整结界 UI。
