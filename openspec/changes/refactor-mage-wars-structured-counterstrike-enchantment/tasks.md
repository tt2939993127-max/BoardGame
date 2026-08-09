## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1903` 反戈一击。
- [x] 1.2 明确保留守卫反击、卡牌文本夹具和现有防御窗口，不扩大到其它结界能力。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化授予特性枚举，严格读取 `counterstrike`。
- [x] 2.2 为 `1903` 录入可见附属结界语义并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 从附属结界语义解析反击来源，保留守卫和未配置文本路径。
- [x] 3.2 将一次性来源 ID 透传过反击选择与后续防御窗口。
- [x] 3.3 反击执行或其防御结算完成后销毁来源结界；放弃不销毁。

## 4. Verification

- [x] 4.1 增加 `1903` 配置语义和 `requiresCodeSupport` 回归测试。
- [x] 4.2 增加移除展示文案后仍提供反击的领域流程测试。
- [x] 4.3 增加首次反击消费来源、放弃不消费和防御窗口消费测试。
- [x] 4.4 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现 `1904`、隐藏结界、强制防御、反制窗口或其它结界触发能力。
