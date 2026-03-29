## ADDED Requirements

### Requirement: 创建房间弹窗必须成为 AI 开局的统一配置入口
系统 MUST 在支持 AI 的游戏中，把人数、模组与 AI 座位配置统一放进创建房间弹窗，而不是拆成独立扳手弹窗。

#### Scenario: 创建房间内显示 AI 配置区
- **GIVEN** 某游戏声明 `manifest.ai.localAi = true` 或 `manifest.ai.remoteAi = true`
- **WHEN** 用户打开该游戏的详情弹窗
- **AND** 用户点击“创建房间”
- **THEN** 系统 MUST 打开创建房间弹窗
- **AND** MUST 在该弹窗中展示 AI 座位配置区

### Requirement: 创建房间弹窗中的 AI 配置必须复用 manifest 声明的开局字段
系统 MUST 使用游戏 manifest 中声明的 `playerOptions` 与 `setupOptions` 作为创建房间中 AI 配置区的字段来源，而不是为单个游戏硬编码表单。

#### Scenario: 大杀四方在创建房间中显示人数和模组字段
- **GIVEN** 大杀四方声明了 `playerOptions` 与 `setupOptions.expansions`
- **WHEN** 用户打开创建房间弹窗
- **THEN** 弹窗 MUST 展示人数选择
- **AND** MUST 展示模组多选字段
- **AND** MUST 展示 AI 座位控制区

#### Scenario: 没有 setupOptions 的游戏只显示实际声明字段
- **GIVEN** 某支持本地 AI 的游戏未声明任何 `setupOptions`
- **WHEN** 用户打开创建房间弹窗
- **THEN** 系统 MUST 只渲染该游戏实际声明的字段
- **AND** MUST 不为该游戏显示不存在的模组区块

### Requirement: 创建房间必须透传 AI 座位与 setup 配置
系统 MUST 在用户确认创建房间后，将人数、AI 座位和 setup 选项透传到房间 `setupData`，并使房主客户端能够托管这些 AI 座位。

#### Scenario: 配置结果进入联机房间
- **GIVEN** 用户在创建房间弹窗中选择了 3 人、关闭 Titans，并将其中一个座位切为本地 AI
- **WHEN** 用户确认创建房间
- **THEN** 系统 MUST 以可序列化方式把这些结果写入房间 `setupData`
- **AND** 大杀四方领域 setup MUST 能读取到相同的模组结果
- **AND** 房主客户端 MUST 能为该 AI 座位建立托管执行链路
