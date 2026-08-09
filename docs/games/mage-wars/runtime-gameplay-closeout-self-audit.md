# 法师战争学徒运行链收口自审

> 状态：`apprentice-runtime-closeout-pass / scoped-not-full-game`。本文件只证明两人学徒基础版的正式联机核心链已经打通，不表示完整实体版 Mage Wars、全卡表或后续产品系统完成。

## 收口结论

- 已完成：正式双人联机入口从初始房间进入学徒模式，覆盖计划法术、部署生物、对手计划隐藏、守卫、施法、法力 / 弃牌变化、法术 FX、横屏移动、攻击、攻击骰 / 效果骰、伤害 token 和阶段推进。
- 已完成：学徒模式运行时使用正式素材链，截图证据来自真实页面，不是 Open Design 设计稿、静态预览或状态注入布局图。
- 未执行：服务器真实资源上传。上传会改变外部状态，本轮只做 `--check` dry-run。
- 不在本轮范围：全 322 张法术、自由构筑、四人模式、豪华竞技场、扩展法师、完整 AI、教程系统、行动日志 UI、撤回 UI。

## 正式入口 E2E 证据

命令：

```powershell
node scripts\infra\run-e2e-command.mjs ci --grep "Mage Wars formal online runtime"
```

结果：`3 passed (3.1m)`。

覆盖关系：

| 用例 | 覆盖内容 | 最新截图证据 |
| --- | --- | --- |
| 正式联机入口从双方计划到部署并保持对手计划隐藏 | 双人正式房间、双方计划、部署、隐藏计划卡背、守卫动作和守卫 token | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机入口从双方计划到部署并保持对手计划隐藏/01-双方计划后-对手计划仍隐藏.jpg` |
| 正式联机入口从双方计划到部署并保持对手计划隐藏 | 部署后场地生物与隐藏边界 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机入口从双方计划到部署并保持对手计划隐藏/02-部署完成后-场地生物和隐藏计划.jpg` |
| 正式联机入口从双方计划到部署并保持对手计划隐藏 | 守卫后服务端状态断言与守卫标记可见 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机入口从双方计划到部署并保持对手计划隐藏/04-正式联机守卫后-守卫标记可见.jpg` |
| 正式联机入口真实施放法术并产生法力、弃牌和法术 FX | 真实施放冲锋陷阵、法力和弃牌变化、法术 FX DOM 断言 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机入口真实施放法术并产生法力、弃牌和法术-FX/03-冲锋陷阵结算后-法力弃牌已变化.jpg` |
| 正式联机移动横屏入口真实移动、攻击并切换回合 | 960x540 横屏布局、场地对象直选 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机移动横屏入口真实移动、攻击并切换回合/05-横屏生物行动前-场地对象可直选.jpg` |
| 正式联机移动横屏入口真实移动、攻击并切换回合 | 丛林灰狼真实移动到目标区域 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机移动横屏入口真实移动、攻击并切换回合/06-横屏移动后-丛林灰狼进入目标区域.jpg` |
| 正式联机移动横屏入口真实移动、攻击并切换回合 | 圣光之柱攻击、攻击骰、效果骰、伤害 token | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机移动横屏入口真实移动、攻击并切换回合/07-横屏圣光之柱攻击后-骰盘和伤害状态.jpg` |
| 正式联机移动横屏入口真实移动、攻击并切换回合 | 攻击行动结束后进入终末快速施法窗口 | `test-results/evidence-screenshots/mage-wars/online-runtime.e2e/正式联机移动横屏入口真实移动、攻击并切换回合/08-攻击行动结束后-进入终末快速施法窗口.jpg` |

## 门禁结果

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| Mage Wars 定向单测 | `npx vitest run src/games/mage-wars --configLoader native` | `10 passed / 259 tests passed` |
| TypeScript | `npm run typecheck` | 通过 |
| ESLint | `npx eslint e2e\mage-wars\online-runtime.e2e.ts e2e\framework\evidenceScreenshots.ts` | 通过 |
| OpenSpec | `openspec validate add-mage-wars-runtime-gameplay-closeout --strict --no-interactive` | valid |
| 本地资源链 | `npm run assets:validate` | 通过 |
| 资源发布 dry-run | `node scripts\assets\upload-to-server.js --check --asset-prefix i18n/zh-CN/mage-wars --asset-prefix atlas-configs/mage-wars` | 找到 37 个待发布对象，未真实上传 |

## 证据边界

- `e2e/mage-wars/online-runtime.e2e.ts` 是本次正式玩法 E2E；它创建正式双人房间、双方占座 / 加入并通过页面点击推进。
- 状态注入布局类 E2E 只能证明布局回归，不再作为玩法完成证据。
- 曾临时新增的 `e2e/mage-wars/runtime-gameplay.e2e.ts` 是单页本地辅助入口，会和双方 ready 规则冲突；本次已从交付中移除，避免误伤 closeout。
- `_shared/online-runtime.e2e` 下的旧截图是早期归档路径错误的历史证据，不作为本文件依据。
