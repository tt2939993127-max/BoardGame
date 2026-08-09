## 1. Proposal And Scope

- [x] 1.1 建立独立 change，只覆盖 `1809` 与 `1818`。
- [x] 1.2 明确不包含装备防御、庇护、区域结界和展示/反制。

## 2. Config Package Source And Loader

- [x] 2.1 扩展防御 profile 的可选 `ignoresStatus` 严格布尔校验。
- [x] 2.2 为 `1809` / `1818` 录入 `7+ / 1x`、`8+ / 1x`，并将 `1818` 标为不因状态失效。

## 3. Runtime Migration

- [x] 3.1 可见附属结界对象在存在配置 profile 时保留配置来源标记。
- [x] 3.2 防御机会和直接防御命令消费附属结界 profile。
- [x] 3.3 仅让 `ignoresStatus` 绕过防御失效判断，不绕过眩晕 / 束缚骰值修正。
- [x] 3.4 保留未配置对象的旧文本 profile 解析路径。

## 4. Verification

- [x] 4.1 增加配置 profile、隐藏展示文本和 1809 普通防御测试。
- [x] 4.2 增加 1818 在眩晕状态下仍可防御、但仍保留骰值修正的测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中迁移 `3715` 偏移护腕或其它装备防御。
- [x] 5.2 不在本 change 中修改 UI、素材、Open Design 设计稿或玩家可见文案。
