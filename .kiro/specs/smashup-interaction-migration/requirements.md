# Smash Up Prompt 系统迁移到 InteractionSystem - 需求文档

## 1. 背景与目标

### 1.1 当前状态
Smash Up 游戏目前使用了一套自定义的 Prompt 系统来处理玩家交互：
- 通过 `CHOICE_REQUESTED` 事件触发交互
- 使用 `promptContinuation.ts` 注册表管理继续函数
- 通过 `systems.ts` 中的 `SmashUpEventSystem` 桥接事件和 InteractionSystem

### 1.2 问题
根据 AGENTS.md 中的规范：
> **面向百游戏设计（强制）**
> - **禁止写桥接系统**：不得创建"游戏事件→创建 Prompt/Interaction→解决后转回游戏事件"的桥接系统，应在 execute 中直接调用 `createSimpleChoice()` / `createInteraction()`。
> - **参考现有游戏时先检查模式时效性**：现有三个游戏仍有历史债务（SmashUp 的 promptContinuation、DiceThrone 的 pendingInteraction），这些是反模式，新游戏禁止模仿。

当前的实现是一个反模式，需要重构。

### 1.3 目标
将 Smash Up 的 Prompt 系统迁移到标准的 InteractionSystem 模式：
- 移除 `CHOICE_REQUESTED` 事件和桥接逻辑
- 移除 `promptContinuation.ts` 注册表
- 在能力执行器中直接调用 `createSimpleChoice()` 和 `queueInteraction()`
- 简化 `systems.ts`，移除桥接代码

## 2. 用户故事

### 2.1 作为开发者
**我希望** 能力系统直接使用 InteractionSystem  
**以便** 代码更简洁、更符合引擎规范、更易维护

**验收标准：**
- 能力执行器可以直接创建 Interaction
- 不再需要通过事件桥接
- 代码结构清晰，符合引擎规范

### 2.2 作为玩家
**我希望** 游戏交互体验保持不变  
**以便** 重构不影响游戏玩法

**验收标准：**
- 所有需要选择的能力仍然正常工作
- 交互提示和选项显示正确
- 选择结果正确应用到游戏状态

## 3. 功能需求

### 3.1 移除桥接系统
- 移除 `CHOICE_REQUESTED` 事件类型
- 移除 `ChoiceRequestedEvent` 接口
- 移除 `systems.ts` 中的桥接逻辑
- 移除 `promptContinuation.ts` 文件

### 3.2 重构能力执行器
- 识别所有使用 `CHOICE_REQUESTED` 的能力
- 重构为直接调用 `createSimpleChoice()` 和 `queueInteraction()`
- 将继续逻辑内联到能力执行器中

### 3.3 更新命令处理
- 能力执行器需要能够访问 `MatchState` 以调用 `queueInteraction()`
- 可能需要调整命令执行流程以支持状态更新

### 3.4 保持向后兼容
- UI 层使用 `asSimpleChoice()` 辅助函数保持兼容
- 测试用例需要更新但功能保持一致

## 4. 非功能需求

### 4.1 代码质量
- 遵循 AGENTS.md 中的编码规范
- 代码注释清晰，说明设计决策
- 符合"面向百游戏设计"原则

### 4.2 测试覆盖
- 所有现有测试必须通过
- 更新测试以反映新的实现方式
- 确保边缘情况被覆盖

### 4.3 性能
- 重构不应降低性能
- 减少事件桥接应该略微提升性能

## 5. 技术约束

### 5.1 引擎限制
- 必须使用 InteractionSystem 提供的 API
- 不能修改引擎层代码（除非发现 bug）
- 遵循引擎的命令-事件-状态流程

### 5.2 兼容性
- 保持与现有 UI 组件的兼容性
- 不破坏其他游戏的功能
- 保持游戏规则的正确性

## 6. 范围界定

### 6.1 包含
- 所有使用 Prompt 的能力重构
- 移除桥接系统代码
- 更新相关测试
- 更新文档和注释

### 6.2 不包含
- UI 组件的重构（保持现有实现）
- 其他游戏的迁移（仅 Smash Up）
- 新功能开发

## 7. 风险与依赖

### 7.1 风险
- 能力数量较多，重构工作量大
- 可能遗漏某些边缘情况
- 测试覆盖可能不完整

### 7.2 缓解措施
- 分批次重构，每批次运行测试
- 仔细审查所有使用 `CHOICE_REQUESTED` 的代码
- 保持测试用例的完整性

### 7.3 依赖
- InteractionSystem 必须功能完整
- 现有测试套件必须可运行
- 开发环境配置正确

## 8. 验收标准

### 8.1 代码层面
- [ ] 移除 `promptContinuation.ts`
- [ ] 移除 `CHOICE_REQUESTED` 事件
- [ ] 简化 `systems.ts`
- [ ] 所有能力直接使用 InteractionSystem
- [ ] 代码通过 TypeScript 编译
- [ ] 代码通过 lint 检查

### 8.2 功能层面
- [ ] 所有现有测试通过
- [ ] 手动测试所有交互能力
- [ ] 游戏流程正常运行
- [ ] 交互体验无变化

### 8.3 文档层面
- [ ] 更新代码注释
- [ ] 更新相关文档
- [ ] 记录设计决策

## 9. 实施计划

### 9.1 阶段 1：准备工作
- 识别所有使用 Prompt 的能力
- 分析依赖关系
- 制定重构策略

### 9.2 阶段 2：核心重构
- 重构能力执行器
- 移除桥接系统
- 更新类型定义

### 9.3 阶段 3：测试与验证
- 运行所有测试
- 修复失败的测试
- 手动验证功能

### 9.4 阶段 4：清理与文档
- 移除废弃代码
- 更新文档
- 代码审查

## 10. 成功指标

- 所有测试通过率：100%
- 代码行数减少：预计减少 100+ 行
- 编译错误：0
- 运行时错误：0
- 游戏功能完整性：100%
