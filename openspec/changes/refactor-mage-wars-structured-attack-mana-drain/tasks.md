## 1. Proposal And Scope

- [x] 1.1 建立独立 change，不回写已完成的攻击 profile / 状态效果 change。
- [x] 1.2 明确只迁移法力流失静态数值，保留法力传输和其它装备能力为 deferred。

## 2. Config Package Source And Loader

- [x] 2.1 为攻击 profile 增加 `manaDrain` 类型和严格非负整数校验。
- [x] 2.2 为 `2807` 汲法水蛭与 `3704` 奥秘法杖录入各攻击的法力流失值。

## 3. Runtime Migration

- [x] 3.1 增加对象攻击法力流失配置查询入口。
- [x] 3.2 让正式配置对象的扣法力逻辑消费结构化 profile，并保留实际伤害 / 首段 / 封顶规则。
- [x] 3.3 保留未配置夹具的旧文本解析路径，配置对象不得回退到文本法力流失。

## 4. Verification

- [x] 4.1 增加单段、多段和法力不足封顶的行为测试。
- [x] 4.2 增加移除显示文本后 `2807` / `3704` 仍使用正确法力流失值的测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、ESLint 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中迁移法力传输、攻击方获得法力、`3701` 狱火长鞭、`3710` 群兽法杖或 UI / 日志展示。
- [x] 5.2 不在本 change 中修改 UI、素材、Open Design 设计稿或玩家可见文案。
