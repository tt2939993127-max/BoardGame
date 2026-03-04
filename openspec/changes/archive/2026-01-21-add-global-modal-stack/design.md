## Context
当前弹窗（Confirm/Auth/Email/GameDetails）与教程提示（TutorialOverlay）分别在各自组件内管理遮罩与层级，出现叠加时缺少统一的栈式规则与默认行为（ESC/遮罩/滚动锁/Portal）。

## Goals / Non-Goals
- Goals:
  - 建立全局 ModalStack：统一打开/关闭与层级管理。
  - 栈顶唯一可交互，默认开启 ESC/遮罩关闭与滚动锁。
  - 通过 Portal root 统一挂载，避免被父容器裁切。
  - 迁移现有弹窗与教程提示到栈内渲染。
- Non-Goals:
  - 不做刷新状态持久化。
  - 不引入路由级 Modal 历史栈。

## Decisions
- 使用 `ModalStackContext` 持有栈数组，提供 `openModal/closeModal/closeTop/replaceTop` API。
- `ModalStackRoot` 通过 Portal 渲染到 `#modal-root`，统一层级与键盘事件。
- 栈内条目提供配置：`closeOnEsc`、`closeOnBackdrop`、`lockScroll`、`zIndexBase` 等，默认全开。
- 仅栈顶允许交互与关闭行为；其余条目保持渲染但阻断交互。
- 现有 `ModalBase` 保持内容容器与动画样式；栈根负责挂载与层级。

## Risks / Trade-offs
- 迁移成本：需要将现有弹窗的 open 状态改为栈 API 调用。
- 教程提示与弹窗共存时需确保指针事件策略一致（允许透传时须显式配置）。

## Migration Plan
1. 新增 `ModalStackContext` 与 `ModalStackRoot`，在 App 根部挂载。
2. 在 `index.html` 增加 `#modal-root`。
3. 先迁移 ConfirmModal 场景，再迁移 Auth/Email/GameDetails。
4. 将 TutorialOverlay 作为栈条目渲染（关闭遮罩/滚动锁按需求配置）。

## Open Questions
- 教程提示是否需要可选“点击遮罩继续/下一步”的交互？
