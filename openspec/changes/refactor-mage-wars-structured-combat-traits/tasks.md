## 1. Proposal And Scope

- [x] 1.1 建立独立 change，不回写已完成的 profile、状态效果和法力流失 change。
- [x] 1.2 明确只迁移嗜血卡牌级特性，保留其它卡牌级能力为 deferred。

## 2. Config Package Source And Loader

- [x] 2.1 增加 `combatTraits.bloodthirst` 类型和严格正整数校验。
- [x] 2.2 为 `2804` 录入基础嗜血值与同区法师额外嗜血值。

## 3. Runtime Migration

- [x] 3.1 增加按来源 CardID 查询卡牌级战斗特性的入口。
- [x] 3.2 让正式配置对象的嗜血骰数修正消费结构化特性，保留现有目标 / 第一段 / 近战条件。
- [x] 3.3 保留未配置夹具的旧文本解析路径，配置对象不得回退到中文特性文本。

## 4. Verification

- [x] 4.1 增加配置特性查询和旧合同等价测试。
- [x] 4.2 增加移除展示文本后仍能正确处理同区嗜血的测试。
- [x] 4.3 运行 Mage Wars / game-config 测试、ESLint 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中迁移冲锋、迅捷、重生、遁逸、传奇、法力传输或其它卡牌级能力。
- [x] 5.2 不在本 change 中修改 UI、素材、Open Design 设计稿或玩家可见文案。
