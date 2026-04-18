# 在线 AI 攻击动画重复播复现核查（DiceThrone + SummonerWars）

## 时间
- 2026-04-18

## 目标
- 复现“触发响应并跳过后，回到 AI 回合不动/攻击动画重复播”问题。
- 优先使用真实在线链路 E2E。

## 执行用例
1. `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-ai-response-window.e2e.ts "AI vs AI: samurai honor token 场景下 Token 响应窗口应触发"`
2. `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线对局流程：召唤、移动、建造、攻击与弃牌"`

> 运行环境说明：本机 6174 端口不可绑定（EACCES），本轮通过 `PW_E2E_FRONTEND_PORT=37774` 切换到可绑定前端端口后执行。

## 截图证据（绝对路径）
- DiceThrone 失败截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\2026-04-18-dicethrone-ai-response-window-failed-1.png`
- SummonerWars 失败截图 1：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\2026-04-18-summonerwars-online-flow-failed-1.png`
- SummonerWars 失败截图 2：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\2026-04-18-summonerwars-online-flow-failed-2.png`

## 肉眼观察结论
1. DiceThrone 截图停留在“英雄选择/开局前”界面，没有进入到掷骰/攻击链路，因此该用例失败点发生在前置流程，不是“攻击动画重复播”位点。
2. SummonerWars 两张截图都处于正常棋盘画面，失败断言是 `sw-confirm-discard` 不可见；当前画面为“弃牌获取魔力/等待对手行动”状态，属于测试脚本断言与当前 UI 分支不一致，未直击“攻击动画重复播”。
3. 本轮两条 E2E 均未在真实攻击动画位点上复现“重复播”现象；因此不能用这两条失败结果证明问题已复现。

## 结论
- 当前现有 E2E 对这次问题位点（响应跳过 → AI 回合调度竞态 → 攻击动画重复播）覆盖不足，失败点主要在前置流程或过时断言。
- 按任务口径，转入“直接增强健壮性修复”路线。
