# 法师战争 Step 1 PC Open Design v28 图面审计

> 结论：`AI_PASS_REVOKED / REVISE / user-review-failed / rule-action-model-failed / layer-model-failed / implementation-blocked / mobile-blocked-until-pc-approval`。v28 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现；此前“可人工验收”口径已撤销。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v28.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v28.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v28.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v28-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 用户复核失败点

| 失败点 | 图面现象 | 影响 | 裁定 |
| --- | --- | --- | --- |
| 层级模型失败 | 法术书 / 已计划法术仍被当成“避开底图”的底部布局问题处理，而不是作为可与桌面低权重区域重叠的主交互 overlay | 当前可支配对象被挤在底边，设计没有说明哪些重叠允许、哪些对象必须保护 | `REVISE` |
| 伪确认控件 | 仍存在“确认 / 取消”，但当前规则合同只证明火球术来自已计划法术并选择合法目标，没有证明“施放前必须确认” | UI 凭直觉造了一个额外步骤，增加了玩家动作负担 | `REVISE` |
| 空白无职责 | 右下角和边缘空间没有说明承担安全区、结算层、展开区或对象容量 | 重要交互没有因规则而落位，空白被当作“干净”而非可解释空间 | `REVISE` |
| 动作入口依据不足 | `已计划 2/2 · 火球术 → 西锁骑士` 只能说明来源和目标，不能自动推出常驻确认按钮 | 应优先考虑点击已计划火球术、合法目标高亮、费用短状态和结算反馈，而不是确认条 | `REVISE` |

## 撤销原因

- 旧审计把“确认动作贴近已计划火球术”误判为通过；贴近只解决空间距离，不解决规则授权。
- 旧审计只检查了底部 rail 是否透明，未检查底部法术书是不是通过机械避让底图而牺牲主交互层级。
- 旧审计没有回答“右下为什么空着”，也没有证明空白承担真实职责。
- 旧审计没有把“UI 需要分层、允许有职责的重叠”作为门禁，因此不能继续作为人工验收候选。

## 下一版必须满足

- 出图前写明层级表：背景 / 棋盘、实体对象、主交互 overlay、结算 overlay、辅助 HUD。
- 写明允许重叠表：法术书、已计划法术、目标状态和结算层可压哪些低权重区域；哪些卡牌、区域、token、骰子和资源必须保护。
- 删除常驻确认按钮，除非前置包能证明当前规则或系统状态确实需要确认。
- 火球术施放态必须从“已计划法术”出发：点击已计划火球术或当前合法目标承接动作；费用、目标和结果反馈贴近来源 / 目标，不造额外流程。
- 右下 / 底边 / 侧边空白必须有职责；没有职责就不作为布局依据。

## 收口结论

- v28 不再允许打开人工验收；已打开记录只能作为历史失败输入。
- 用户明确批准新的 PC 设计稿前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
