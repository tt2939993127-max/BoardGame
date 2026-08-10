# 响应提示的手牌区锚点与边沿流光

## 用户裁定

王权骰铸的真人响应提示属于手牌响应链的轻量操作入口，不是场景中央的结算弹窗。

- 响应入口必须归属手牌区自身，不能固定在屏幕/牌桌中轴，也不能覆盖中央角色板的卡面；不能锚到手牌容器的透明预留区。
- 鼠标悬浮手牌导致卡牌抬起时，提示必须临时上移，为抬起卡牌让出空间；手牌恢复后回到手牌区上沿。
- 强调效果是一段沿胶囊外沿连续绕行的细线流光。禁止继续使用横向扫光、任何面板/按钮/流光轨道阴影、堆叠式阴影或额外卡片壳冒充流光。
- 保持现有胶囊形提示和响应跳过动作；本裁定不改变响应窗口规则、可响应手牌、高亮、按钮语义或玩家权限。

## 验收

- 在 `1920x1080` 的真人响应窗口中，常态入口与可见手牌顶边保持 `8-20px` 间距，且不固定在屏幕中轴、不覆盖中央角色板卡面。
- 悬浮可响应手牌后，提示上移并与抬起卡牌保持至少 `6px` 间距。
- “可见手牌顶边”必须取承载缩放和上移变形的卡面矩形；外层拖拽壳或手牌预留容器的未变形矩形不得作为定位或 E2E 断言依据。
- 原始页面截图必须能看见常态手牌区锚点和悬浮避让两个状态；边沿流光必须是实际旋转的圆锥渐变轨道，不得退化为横向扫光。

## 验收记录（2026-08-09）

- 真实入口：`e2e/dicethrone/dicethrone-ai-ultimate-response.e2e.ts` 的“真人响应提示更显眼且可跳过并关闭响应窗口”，视口为 `1920x1080`。
- 常态截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-ai-ultimate-response.e2e\真人响应提示更显眼且可跳过并关闭响应窗口\01-真人响应位于手牌区上沿.jpg`。
- 悬浮避让截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-ai-ultimate-response.e2e\真人响应提示更显眼且可跳过并关闭响应窗口\02-悬浮手牌时响应提示自动上移避让.jpg`。
- 关闭截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-ai-ultimate-response.e2e\真人响应提示更显眼且可跳过并关闭响应窗口\03-真人跳过响应后提示关闭.jpg`。
- E2E 同时实测常态间距、悬浮后避让间距、实际外沿圆锥渐变旋转和跳过后的关闭状态。
- `verdict: REVISE`：上一轮图面裁决作废。重叠阴影虽已移除，但入口仍固定在屏幕中轴并覆盖中央角色板卡面；在手牌区的最终锚点未锁定前，不得再次判定通过。

## 验收记录（2026-08-10）

- 实现现在直接读取承载缩放与抬升的 `hand-card-visual` 卡面矩形；响应窗口存续期间持续同步该矩形，卡牌在鼠标静止处入场、悬浮或回落时也不会回到透明手牌容器的错误锚点。
- 真实入口：`e2e/dicethrone/dicethrone-ai-ultimate-response.e2e.ts` 的真人响应窗口，以及 `e2e/dicethrone/dicethrone-bonus-dice-e2e-screenshots.e2e.ts` 的万箭齐发、雷霆万钧奖励骰响应链，视口均为 `1920x1080`。
- 常态截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-bonus-dice-e2e-screenshots.e2e\武僧雷霆万钧：弹一手修改奖励骰后按改后点数和造成伤害\03a-雷霆万钧-奖励骰响应提示贴在手牌上沿.jpg`。
- 悬浮避让截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-bonus-dice-e2e-screenshots.e2e\武僧雷霆万钧：弹一手修改奖励骰后按改后点数和造成伤害\03b-雷霆万钧-悬浮手牌时响应提示自动避让.jpg`。
- 对照截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-bonus-dice-e2e-screenshots.e2e\万箭齐发：弹一手修改奖励骰后按改后弓面数加伤并施加缠绕\03b-万箭齐发-悬浮手牌时响应提示自动避让.jpg`。
- `verdict: PASS`：常态间距为 `8-20px`，悬浮后的卡面避让间距不少于 `6px`；两条奖励骰真实流程与真人响应专项均通过，边沿流光、胶囊形提示、跳过动作和右侧 2D 骰盘入口均保持有效。
