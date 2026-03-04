# manage-modals Specification

## Purpose
TBD - created by archiving change add-global-modal-stack. Update Purpose after archive.
## Requirements
### Requirement: 全局 Modal 栈管理
系统 SHALL 提供全局 Modal 栈管理能力，支持打开、关闭与替换栈顶弹窗，并以栈顶作为当前可交互弹窗。

#### Scenario: 连续打开多个弹窗
- **WHEN** 用户依次打开多个弹窗
- **THEN** 系统 MUST 按打开顺序入栈并以最后打开的弹窗作为栈顶

#### Scenario: 关闭栈顶弹窗
- **WHEN** 栈顶弹窗触发关闭
- **THEN** 系统 MUST 仅关闭栈顶并恢复下一层为新的栈顶

### Requirement: 统一默认行为（ESC/遮罩/滚动锁）
系统 SHALL 默认启用 ESC 关闭、遮罩点击关闭与 body 滚动锁。

#### Scenario: ESC 关闭栈顶
- **WHEN** 用户按下 ESC
- **THEN** 系统 MUST 关闭当前栈顶弹窗

#### Scenario: 遮罩点击关闭
- **WHEN** 用户点击弹窗遮罩
- **THEN** 系统 MUST 关闭当前栈顶弹窗

#### Scenario: 弹窗打开期间锁定滚动
- **WHEN** 栈内存在任意弹窗
- **THEN** 系统 MUST 锁定 body 滚动

### Requirement: Portal Root 渲染
系统 SHALL 将弹窗渲染到 `#modal-root` 以避免父容器裁切与层级冲突。

#### Scenario: 弹窗渲染到 Portal Root
- **WHEN** 系统打开弹窗
- **THEN** 弹窗 MUST 挂载在 `#modal-root` 下

### Requirement: 教程提示纳入栈管理
系统 SHALL 允许教程提示通过全局栈渲染，并可配置是否启用遮罩/滚动锁。

#### Scenario: 教程提示关闭遮罩与滚动锁
- **WHEN** 教程提示以禁用遮罩与滚动锁方式打开
- **THEN** 系统 MUST 保持背景可见且不阻断交互

