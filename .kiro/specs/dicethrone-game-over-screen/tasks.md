# 任务列表：王权骰铸风格结算界面

## 任务

- [x] 1. 框架层扩展：RematchActions 新增 renderButton 插槽
  - [x] 1.1 在 RematchActionsProps 中新增 RematchButtonProps 接口和 renderButton 可选属性
  - [x] 1.2 重构 RematchActions 内部按钮渲染逻辑，提取按钮为独立渲染单元，当 renderButton 存在时使用自定义渲染，否则使用现有 HoverOverlayLabel 样式
  - [x] 1.3 编写 RematchActions 向后兼容测试：验证不传 renderButton 时渲染输出与扩展前一致（Property 5）
- [x] 2. 游戏层组件：DiceThroneEndgame.tsx
  - [x] 2.1 创建 src/games/dicethrone/ui/DiceThroneEndgame.tsx，实现 DiceThroneEndgameContent 组件（英雄肖像、角色名称、HP/CP、Token 摘要）
  - [x] 2.2 实现 renderDiceThroneButton 函数（街机立体风格按钮，琥珀金主色调 + slate 次要色）
  - [x] 2.3 实现 framer-motion 入场动画（面板弹簧缩放、肖像交错延迟 150ms、标题延迟 300ms）
  - [x] 2.4 实现胜负视觉区分逻辑（胜者肖像放大/高亮，败者灰暗/缩小，平局对等）
  - [x] 2.5 添加 aria-label 无障碍标注
- [x] 3. 集成：BoardOverlays 接入自定义结算界面
  - [x] 3.1 修改 BoardOverlays 中的 EndgameOverlay 调用，注入 renderContent（DiceThroneEndgameContent）和 renderActions（RematchActions + renderDiceThroneButton）
  - [x] 3.2 从 Board.tsx 传递 players、locale 等必要数据到 BoardOverlays（如尚未传递）
- [x] 4. i18n 文案
  - [x] 4.1 在 game-dicethrone.json（zh-CN 和 en）中添加结算界面文案（胜利/失败/平局标题、Token 名称如缺失）
- [x] 5. 测试
  - [x] 5.1 编写 DiceThroneEndgameContent 单元测试：内容完整性（Property 1）、胜负视觉区分（Property 2）、标题颜色匹配（Property 3）
  - [x] 5.2 编写 Property 4 静态验证测试：扫描 DiceThroneEndgame.tsx 源码确认不含投票逻辑分支
  - [x] 5.3 编写 RematchActions renderButton 属性测试：向后兼容性（Property 5）
  - [x] 5.4 编写无障碍属性测试：aria-label 正确性（Property 6）
