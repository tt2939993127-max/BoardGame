# Mage Wars v3 AI 图面核验

> 状态：`AI_PASS / human-review-allowed / implementation-blocked-until-user-approval`。本轮只生成 Open Design artifact 代码设计稿和导出 PNG；未调用 `od media generate`，未改真实 Board/UI，未跑真实页面 E2E。

## 交付物

| 顺序 | 设计稿 | PNG | Artifact 源 | AI 结论 |
| ---: | --- | --- | --- | --- |
| 1 | 施法结算态 | `mage-wars-v3-casting-resolution.png` | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v3-casting-resolution.html` | PASS |
| 2 | 法术书计划态 | `mage-wars-v3-spellbook-planning.png` | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v3-spellbook-planning.html` | PASS |
| 3 | 战场指挥态 | `mage-wars-v3-battlefield-command.png` | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v3-battlefield-command.html` | PASS |

## 核验结论

| 检查项 | 结论 | 证据 |
| --- | --- | --- |
| 玩家真实界面 | PASS | 三张图面不再出现“方案 / 优先 / Open Design / artifact / AI_PASS / E2E / 设计稿”等内部说明文字 |
| 规则命名 | PASS | 图面和 HTML 未命中“手牌 / hand / opponent-hand”；只使用法术书、已计划、弃牌堆、隐性结界等规则对象 |
| 正式素材主体 | PASS | 三张图均使用正式竞技场、法师牌、学徒法术牌、卡背、token 和攻击骰面；生命 / 法力 / 聚魔为 `approved-programmatic-runtime-ui` |
| 区域归属 | PASS | 三张几何审计均显示场上卡中心在所属区域内；最小所属区域占比：施法 `1.000`、计划 `0.797`、指挥 `1.000` |
| 结算落位 | PASS | 施法结算态骰盘到目标中心距离 `136.71px`，在西锁骑士目标附近，而非右侧栏 / 日志栏 |
| 计划态友好性 | PASS | 法术书工作台独立承载分类、分页、候选、已计划和弃牌堆；己方法师 HUD 已从工作台中让出，不再被覆盖 |
| 指挥态友好性 | PASS | 对象旁不再放第二套主动作按钮；火烙魔婴本体高亮，右侧是唯一主动作承接面 |
| 隐藏信息 | PASS | 对手已计划法术和隐性结界只显示卡背和数量，不公开卡名或正面 |

## 仍需人工判断

- 这三张是三种真实游戏状态，不是三套最终产品皮肤；用户需要选择哪种信息密度和交互承接更接近目标。
- 右侧动作区采用轻量深色承接面，是否还需要进一步减少底板，由人工验收决定。
- 用户批准前，真实 Board/UI 实现、移动端适配和真实页面 E2E 仍冻结。
