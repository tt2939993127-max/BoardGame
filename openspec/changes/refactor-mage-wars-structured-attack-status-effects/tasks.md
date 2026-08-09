## 1. Proposal And Scope

- [x] 1.1 建立独立 change，不回写已完成的 combat profile change。
- [x] 1.2 锁定状态 token 效果范围，并记录推斥、法力流失、嗜血、冲锋等 deferred 能力。

## 2. Config Package Source And Loader

- [x] 2.1 为攻击 profile 增加 `statusEffects` 类型和严格 JSON 校验。
- [x] 2.2 录入首批对象攻击的燃烧、腐化、眩晕、昏迷、虚弱和残废效果骰区间。
- [x] 2.3 校验状态 token 合法、效果骰区间合法、层数为正整数。

## 3. Runtime Migration

- [x] 3.1 增加按结构化攻击 profile 解析效果骰状态的领域入口。
- [x] 3.2 让正式配置对象的状态 token 放置消费结构化 `statusEffects`。
- [x] 3.3 保留未配置夹具的旧文本解析路径，并禁止配置对象回退到文本状态效果。

## 4. Verification

- [x] 4.1 增加单阈值、多阈值和多状态攻击的逐卡等价测试。
- [x] 4.2 增加移除显示文本后正式配置对象仍能放置正确状态 token 的测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、ESLint 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中迁移推斥、法力流失、嗜血、冲锋、重生、飞行、治疗行动、以太 / 非活体加伤、装备栏或职业限制。
- [x] 5.2 不在本 change 中修改 UI、素材、Open Design 设计稿或玩家可见文案。
