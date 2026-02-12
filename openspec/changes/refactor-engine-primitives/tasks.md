## 1. 新建 engine/primitives/ 模块
- [ ] 1.1 创建 `engine/primitives/expression.ts` — ExpressionNode 类型 + evaluate 纯函数
- [ ] 1.2 创建 `engine/primitives/condition.ts` — ConditionNode 类型 + evaluate + ConditionHandlerRegistry
- [ ] 1.3 创建 `engine/primitives/target.ts` — TargetRef 类型 + resolve + TargetResolverRegistry
- [ ] 1.4 创建 `engine/primitives/effects.ts` — EffectDef 类型 + execute + EffectHandlerRegistry
- [ ] 1.5 创建 `engine/primitives/zones.ts` — drawCards/shuffleDeck/moveCard/peekCards/returnCards
- [ ] 1.6 创建 `engine/primitives/dice.ts` — rollDice/lockDice/rerollDice（从 DiceSystem 提取纯函数）
- [ ] 1.7 创建 `engine/primitives/resources.ts` — getResource/setResource/modifyResource + clamp
- [ ] 1.8 创建 `engine/primitives/index.ts` — 统一导出
- [ ] 1.9 创建 `engine/primitives/types.ts` — 公共类型定义

## 2. 单元测试
- [ ] 2.1 expression.ts 测试（literal/var/add/mul/min/max/嵌套）
- [ ] 2.2 condition.ts 测试（and/or/not/compare/自定义处理器）
- [ ] 2.3 target.ts 测试（内置解析 + 自定义解析器注册）
- [ ] 2.4 effects.ts 测试（处理器注册 + 执行 + 未注册类型报错）
- [ ] 2.5 zones.ts 测试（draw/shuffle/move/peek/边界条件）
- [ ] 2.6 dice.ts 测试（roll/lock/reroll/统计计算）
- [ ] 2.7 resources.ts 测试（get/set/modify/clamp 边界）

## 3. 游戏迁移
- [ ] 3.1 SummonerWars — 替换 Expression/AbilityCondition/TargetRef 为 primitives 调用
- [ ] 3.2 DiceThrone — 替换 damageCalculation/条件评估/资源操作为 primitives 调用
- [ ] 3.3 SmashUp — 替换 power 计算/卡牌区域操作为 primitives 调用

## 4. 清理与文档
- [x] 4.1 删除旧 systems 目录
- [ ] 4.2 更新 `AGENTS.md` 中 systems/ 相关引用 → primitives/
- [ ] 4.3 更新 `docs/ai-rules/engine-systems.md` 中系统清单
- [ ] 4.4 更新 openspec `dice-system` spec 反映新 API
