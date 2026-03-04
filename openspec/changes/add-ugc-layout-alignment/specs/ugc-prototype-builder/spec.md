## ADDED Requirements

### Requirement: 布局锚点与对齐数据模型
系统 SHALL 支持在 UGC Builder 布局组件中使用 `anchor/pivot/offset` 描述对齐与定位，并兼容旧的 `x/y/width/height` 模式。

#### Scenario: 旧布局兼容
- **WHEN** 布局组件仅包含 `x/y/width/height`
- **THEN** 系统 MUST 使用旧模式渲染且结果与升级前一致

#### Scenario: 锚点定位
- **WHEN** 布局组件包含 `anchor/pivot/offset`
- **THEN** 系统 MUST 按锚点公式解析并渲染组件位置

### Requirement: Builder 对齐/分布工具
系统 SHALL 提供对齐与分布工具，用于多选组件的左/中/右、上/中/下对齐与等距分布。

#### Scenario: 左对齐
- **WHEN** 用户对多个组件执行“左对齐”
- **THEN** 系统 MUST 将组件对齐到共同的左边缘

#### Scenario: 水平等距分布
- **WHEN** 用户对多个组件执行“水平等距分布”
- **THEN** 系统 MUST 调整组件间距并保持顺序不变

### Requirement: 网格与吸附辅助
系统 SHALL 支持网格吸附与组件边缘/中心吸附，并提供可视化参考线。

#### Scenario: 网格吸附
- **WHEN** 用户拖拽组件且开启网格吸附
- **THEN** 系统 MUST 将组件位置吸附到网格

#### Scenario: 边缘吸附
- **WHEN** 用户拖拽组件靠近另一组件边缘/中心
- **THEN** 系统 MUST 显示参考线并吸附对齐
