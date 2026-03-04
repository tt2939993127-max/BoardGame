## ADDED Requirements

### Requirement: 需求驱动的提示词与导入闭环
系统 SHALL 仅提供“需求 → 提示词 → 外部 AI → 粘贴导入”的闭环，不提供手动代码编辑入口。

#### Scenario: 生成提示词并粘贴导入
- **WHEN** 用户在任意需要代码的字段填写自然语言需求
- **THEN** 系统 MUST 生成提示词并提供粘贴导入入口，而不是手动编辑代码

### Requirement: 结构化效果块与触发条件
系统 SHALL 将卡牌效果存储为结构化效果块（含触发时机/条件/动作），并允许触发时机独立配置。

#### Scenario: 使用 AI 生成的效果块
- **WHEN** 用户粘贴外部 AI 生成的效果块
- **THEN** 系统 MUST 解析为 trigger/condition/actions 结构并保存

#### Scenario: 触发时机独立配置
- **WHEN** 用户在 UI 中配置触发时机
- **THEN** 系统 MUST 以该配置作为最终触发时机（未配置时使用 AI 输出）

### Requirement: 批量生成卡牌数据（含效果）
系统 SHALL 支持批量提示词与批量导入，并允许用户一次性输入所有卡牌效果。

#### Scenario: 批量导入卡牌数据
- **WHEN** 用户粘贴批量生成的数据（包含效果块）
- **THEN** 系统 MUST 按卡牌 ID 关联并导入所有卡牌数据与效果

### Requirement: 移除 code 字段类型
系统 SHALL 移除 `code` 字段类型，并提供向 `effects/condition` 的迁移策略。

#### Scenario: 旧字段迁移
- **WHEN** 系统检测到旧的 `code` 字段数据
- **THEN** 系统 MUST 移除或映射为 `effects/condition` 并提示迁移完成
