## 1. Proposal And Scope

- [x] 1.1 建立独立 change，只覆盖 `3701` 和通用远触字段。
- [x] 1.2 明确远触不扩大区域距离，不改变近战守卫、反伤屏障和反击边界。

## 2. Structured Config

- [x] 2.1 为攻击 profile 增加可选 `reach` 严格布尔字段。
- [x] 2.2 为 `3701` 录入快速近战火焰 4 骰、远触和燃烧效果骰区间。

## 3. Runtime Migration

- [x] 3.1 配置对象消费 `reach`，不依赖展示攻击文本。
- [x] 3.2 禁止没有飞行或远触的近战攻击攻击飞行生物。
- [x] 3.3 保留未配置对象的文本解析路径，并保持远触仍是近战攻击。

## 4. Verification

- [x] 4.1 增加配置、隐藏展示文本和攻击 profile 远触字段测试。
- [x] 4.2 增加 `3701` 同区飞行目标可攻击、非远触近战不可攻击的领域流程测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现除霜、法力传输、装备栏、职业限制、反伤屏障、`3710` 特殊能力或其它装备。
