## 1. Implementation
- [x] 1.1 新增 `ModalStackContext`：维护栈数组与 `openModal/closeModal/closeTop/replaceTop` API。
- [x] 1.2 新增 `ModalStackRoot`：Portal 渲染到 `#modal-root`，统一层级与 AnimatePresence 动画。
- [x] 1.3 实现默认行为：ESC 关闭栈顶、遮罩点击关闭栈顶、body 滚动锁（栈非空时）。
- [x] 1.4 `index.html` 增加 `#modal-root` 挂载节点。
- [x] 1.5 迁移 ConfirmModal 调用（Home/MatchRoom/GameDetailsModal）到栈式打开与关闭。
- [x] 1.6 迁移 AuthModal 与 EmailBindModal 为栈式打开（保留原样式）。
- [x] 1.7 迁移 GameDetailsModal 为栈式打开（保留原样式）。
- [x] 1.8 迁移 TutorialOverlay：作为栈条目渲染，允许配置遮罩/滚动锁/ESC 行为。

## 2. Validation
- [ ] 2.1 `npm run lint` 无报错。
- [ ] 2.2 `npm run build` 通过。
- [ ] 2.3 Home 页面：登录/注册/邮箱绑定/房间详情弹窗正常打开与关闭。
- [ ] 2.4 MatchRoom 页面：确认弹窗与自动退出提示正常，ESC/遮罩关闭生效。
- [ ] 2.5 教程提示正常展示且层级稳定，页面背景不滚动。
