## ADDED Requirements

### Requirement: 通用战场拖拽放大只能作为补充导航能力
项目 SHALL 将通用战场 `pinch + pan` 视为移动端补充导航能力，而不是完成核心玩法的前置条件。

#### Scenario: 启用了 shell-pinch-pan 的游戏
- **GIVEN** 某个游戏声明 `mobileBattlefieldZoom = 'shell-pinch-pan'`
- **WHEN** 用户不进行双指缩放
- **THEN** 用户仍 MUST 能沿默认主交互路径完成核心操作
- **AND** 系统 MUST 不要求用户“先缩放再操作”

### Requirement: 缩放态下仍需维持主壳层可达性
项目 SHALL 保证移动端进入战场缩放态后，主壳层的关键 UI 仍然可达且不被一起拖走。

#### Scenario: 用户在缩放后拖拽战场
- **GIVEN** 用户已把主画布缩放到大于 `1`
- **WHEN** 用户拖拽平移战场
- **THEN** 顶部 HUD、结束回合区、底部手牌 rail 等壳层关键 UI MUST 仍保持在原始视口位置
