## ADDED Requirements

### Requirement: 显式移动端与壳目标声明

系统 SHALL 要求已启用的游戏在 `manifest.ts` 中显式声明自己的移动端支持 profile、推荐方向、适配预设与壳目标，作为后续运行时适配与分发控制的唯一配置来源。

#### Scenario: 已启用游戏声明移动支持信息
- **GIVEN** 某个 `enabled=true` 的游戏条目
- **WHEN** 系统读取该游戏的 `manifest.ts`
- **THEN** 系统 MUST 能读取该游戏显式声明的移动端支持信息
- **AND** 这些信息 MUST 可被运行时和分发控制逻辑消费

#### Scenario: 新增游戏时必须显式选择 profile
- **GIVEN** 开发者新增一个新的已启用游戏目录
- **WHEN** 开发者补齐该游戏的 `manifest.ts`
- **THEN** 该游戏 MUST 显式选择自己的移动支持 profile
- **AND** 不得依赖框架根据游戏名或布局结构隐式推断
