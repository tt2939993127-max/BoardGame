# DiceThrone 弃牌/撤回循环卡死 - E2E 证据（2026-04-11）

## 用例
- 用例名称：Online DiceThrone 弃牌超限时应可正常弃到手牌上限并自动推进下一回合（避免弃牌/撤回循环卡死）
- 运行命令：
node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online DiceThrone 弃牌超限时应可正常弃到手牌上限并自动推进下一回合（避免弃牌/撤回循环卡死）"

## 关键截图与观察

### 1) 弃牌前（手牌超限 + 弃牌阶段提示）
- 截图：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-DiceThrone-弃牌超限时应可正常弃到手牌上限并自动推进下一回合（避免弃牌-撤回循环卡死）\21-discard-overflow-before.png
- 观察：左侧阶段栏高亮在“7.弃牌阶段”，底部手牌区可见多张手牌，画面下方出现红色弃牌提示条，符合弃牌超限前置场景。
- 结论：✅ 进入弃牌阶段并触发弃牌提示，场景构造正确。

### 2) 弃牌后（自动推进到下一回合）
- 截图：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-DiceThrone-弃牌超限时应可正常弃到手牌上限并自动推进下一回合（避免弃牌-撤回循环卡死）\22-discard-overflow-after.png
- 观察：阶段栏切换到“3.主要阶段(1)”，画面中央出现“正在思考中”，弃牌阶段高亮不再存在；底部手牌区仅剩单张手牌可见。
- 结论：✅ 弃牌完成后自动推进到下一回合，未出现弃牌/撤回循环卡死。

## 小结
- E2E 覆盖了“弃牌超限 → 弃到手牌上限 → 自动推进下一回合”的完整链路，验证了修复后的弃牌流程不会被撤回卖牌循环卡死。
