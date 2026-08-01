# 法师战争 Step 1 PC Open Design v27 图面审计

> 结论：`REVISE / ai-visual-review-failed / human-review-blocked / implementation-blocked / mobile-blocked-until-pc-approval`。v27 是 Open Design artifact 代码设计稿及其导出截图，不是 `od media generate` 生图，也不是运行时 Board/UI 实现。机器几何通过，但 AI 肉眼复看后仍判失败：分类按钮仍像后台筛选器，确认条虽然靠近已计划法术但仍像浮在其上方的独立 UI。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v27.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v27.html.artifact.json` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v27.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v27-geometry.json` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## v26 反馈逐项裁定

| 反馈点 | v27 处理 | 机器裁定 |
| --- | --- | --- |
| 底部边框 / 容器感 | 删除 `.spellbook-rail` 可见背景、边框、圆角和阴影；候选卡直接摆在桌面下沿 | `PASS` |
| 沉浸感 | 法术书、候选、已计划和弃牌堆以卡牌 / 书页对象承担主体，分类与分页降为低权重书签 | `PASS` |
| 确认使用位置 | 费用、确认、取消从右下角移到已计划火球术附近 | `PASS` |
| 当前火球术来源 | 火球术只出现在已计划法术，不作为法术书候选重复出现 | `PASS` |

## 几何和规则门禁

| 检查项 | 结果 | 裁定 |
| --- | --- | --- |
| 六区域数量 | `6` | `PASS` |
| 场上卡牌区域归属 | `西锁骑士，当前火球术目标:B2:true`、`烈焰魔物:A2:true`、`火印魔婴:A3:true`、`缠绕藤蔓:B3:true` | `PASS` |
| 骰盘到目标中心距离 | `136.82px` | `PASS` |
| 确认动作到当前已计划火球术距离 | `176.95px` | `PASS` |
| 底部容器可见性 | `{"background":"rgba(0, 0, 0, 0)","backgroundImage":"none","borderTopWidth":"0px","boxShadow":"none","borderRadius":"0px","noVisibleContainer":true}` | `PASS` |
| 禁止牌区词 | `{"hand":0,"opponentHand":0,"chineseHand":0}` | `PASS` |
| 按钮尺寸 | `全部:46x44`、`攻击:46x44`、`结界:46x44`、`生物:46x44`、`装备:46x44`、`咒语:46x44`、`‹:44x44`、`›:44x44`、`确认:72x44`、`取消:72x44` | `PASS` |
| 图片素材数量 | `40` | `PASS` |

## AI 视觉复核硬失败项

- 分类按钮仍是按钮排，而不是法术书页签 / 书签语法；这会继续削弱沉浸感。
- 确认动作条还没有成为“已计划法术”槽的一部分，只是从右下移动到了附近。
- v27 不允许进入人工验收；下一稿必须进一步减少按钮壳，并把动作语义并入计划槽。

## 收口结论

- v27 只能作为中间迭代证据：它证明去容器化方向正确，但仍未达到用户要求的沉浸感。
- 下一稿应把分类降为更轻的书签 / 文字页签，并把 `费用 / 确认 / 取消` 直接作为已计划火球术槽的操作行。
- 用户明确批准前，真实 Board/UI 实现、真实页面 E2E 和移动端适配继续冻结。
