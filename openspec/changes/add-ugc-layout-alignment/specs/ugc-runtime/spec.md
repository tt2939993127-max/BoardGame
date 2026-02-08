## ADDED Requirements

### Requirement: 预览与运行时统一布局解析
系统 SHALL 在预览与运行时使用统一的布局解析器，支持 `anchor/pivot/offset` 与旧布局数据。

#### Scenario: 预览解析一致性
- **WHEN** UGC Builder 预览渲染布局
- **THEN** 系统 MUST 使用与运行时相同的解析逻辑

#### Scenario: 运行时锚点解析
- **WHEN** 运行时收到包含 `anchor/pivot/offset` 的布局数据
- **THEN** 系统 MUST 正确解析并渲染组件位置
