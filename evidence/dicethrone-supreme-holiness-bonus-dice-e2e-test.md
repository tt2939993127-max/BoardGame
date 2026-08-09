# 至高圣洁奖励骰：真实入口验收

运行现场：`D:\gongzuo\webgame\BoardGame`，DiceThrone 炽天使真实手牌入口，桌面端 Chromium。

规则前提：至高圣洁投掷一颗奖励骰；它没有免费重投，但可以被通用改骰牌修改。投到圣洁吊坠（6）时获得 2 飞行和 2 净化。

## 截图链

1. `test-results/evidence-screenshots/dicethrone/tianshi-ability-card-real-entry.e2e/至高圣洁应只在右侧骰盘显示，并可从真实手牌改为圣洁吊坠后自动结算/tianshi-supreme-holiness-right-tray-before-modification.jpg`
   - 至高圣洁投掷出结果 1、尚未被改骰牌修改时，右侧骰盘只显示一颗骰子。
   - 桌面中央没有奖励骰浮层，也没有自己打出的至高圣洁卡牌特写。
   - 不存在“结算奖励骰”确认按钮；持有通用改骰牌时只出现可响应的改骰窗口。

2. `test-results/evidence-screenshots/dicethrone/tianshi-ability-card-real-entry.e2e/至高圣洁应只在右侧骰盘显示，并可从真实手牌改为圣洁吊坠后自动结算/tianshi-supreme-holiness-card-after-closeout.jpg`
   - 从真实手牌打出“骰子变 6”并选择右侧骰子后，奖励骰自动结算。
   - 左侧状态显示 2 飞行和 2 净化；右侧骰盘保留这一次的最终骰面 6，且为只读回看。
   - 中央没有残留奖励骰层、卡牌特写或确认入口；下一次投掷或阶段切换前，骰盘不会自行清空。

## AI 图面审计

verdict: PASS
score: 94/100
hard_failures: []
negative_impact_checks:
- 旧中央奖励骰层已移除，结果仍由右侧骰盘清楚承接。
- 自己打出的卡不再以中央特写遮住桌面；可用的“骰子变 6”手牌仍可见并可操作。
- 改骰后响应提示和确认入口正确退场；右侧骰盘保留最终骰面为只读回看，状态标记保留在玩家面板。
issues: []

## 自动化结果

`$env:PW_E2E_SERVICE_REUSE='isolated'; node scripts/infra/run-e2e-single.mjs isolated e2e/dicethrone/tianshi-ability-card-real-entry.e2e.ts "至高圣洁应只在右侧骰盘显示，并可从真实手牌改为圣洁吊坠后自动结算"`

结果：1 passed。
