# Change: 增加全局 Modal 栈管理（覆盖弹窗与教程）

## Why
当前弹窗与教程提示由多个组件各自管理遮罩/动画/层级，未来邀请/教程等叠加时容易出现遮挡、关闭错层与滚动穿透问题。需要一套统一的全局栈来管理弹窗层级、默认行为（ESC/遮罩/滚动锁）与 Portal 渲染。

## What Changes
- 新增全局 ModalStack 管理器：提供 open/close/closeTop/replaceTop 能力，栈顶唯一可交互。
- 默认行为统一开启：ESC 关闭、遮罩点击关闭、body 滚动锁定。
- 引入 Portal root（`#modal-root`）统一挂载弹窗，避免被父容器裁切。
- 迁移现有弹窗到全局栈：ConfirmModal、AuthModal、EmailBindModal、GameDetailsModal。
- 教程提示（`TutorialOverlay`）改为通过栈渲染，允许关闭/遮罩/滚动锁配置可选。

## Impact
- Affected specs:
  - `specs/manage-modals/spec.md`（新增能力规格）
- Affected code:
  - `src/contexts/ModalStackContext.tsx`（新增）
  - `src/components/common/ModalStackRoot.tsx`（新增）
  - `src/components/common/ModalBase.tsx`（适配栈渲染）
  - `src/components/common/ConfirmModal.tsx`
  - `src/components/auth/AuthModal.tsx`
  - `src/components/auth/EmailBindModal.tsx`
  - `src/components/lobby/GameDetailsModal.tsx`
  - `src/components/tutorial/TutorialOverlay.tsx`
  - `src/pages/Home.tsx`
  - `src/pages/MatchRoom.tsx`
  - `index.html`
