## 1. Proposal And Scope

- [x] 1.1 建立独立 change，不修改已完成的 `add-mage-wars-config-package` 任务状态。
- [x] 1.2 明确基础攻击 / 防御 profile 与攻击特殊效果的边界，并在复查文档记录 deferred 范围。

## 2. Config Package Source And Loader

- [x] 2.1 为 `data.combatProfiles` 增加严格 TypeScript 类型和 JSON 校验。
- [x] 2.2 为本 change 覆盖的生物与武器装备录入攻击 profile、防御 profile 和基础伤害类型。
- [x] 2.3 增加校验：profile ID 唯一、攻击字段完整、远程攻击范围完整、近战攻击不接受远程范围、防御次数与阈值合法。

## 3. Runtime Migration

- [x] 3.1 增加按来源 CardID 查询结构化攻击 / 防御 profile 的配置包入口。
- [x] 3.2 让已配置正式卡牌的攻击目标范围、行动速度、骰数、穿刺、连击、伤害类型和防御次数消费配置字段。
- [x] 3.3 保留未配置测试夹具的对照解析路径，并禁止已配置卡牌缺 profile 时静默回退到中文文本。

## 4. Verification

- [x] 4.1 增加逐卡 profile 与现有卡面核对结果的等价性测试。
- [x] 4.2 增加配置卡牌不依赖 `attackOrTraitLine` 也能完成基础攻击 / 防御查询的测试。
- [x] 4.3 运行 Mage Wars 与共享 `game-config` 相关测试、ESLint 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中迁移法力流失、状态骰阈值、嗜血、冲锋、重生、飞行、遁逸、治疗行动、装备栏和职业限制。
- [x] 5.2 不在本 change 中修改 UI、素材、Open Design 设计稿或玩家可见文案。
