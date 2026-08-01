# Mage Wars v3 玩家界面设计稿前置包

> 状态：`preflight-ready / open-design-artifact-only / human-review-not-allowed-before-ai-pass`。本轮重写只生成 Open Design artifact 源文件与导出 PNG，不调用 `od media generate`，不进入真实 Board/UI 实现。

## 本轮目标

| 项 | 锁定 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 桌面对局设计稿 |
| 真相来源 | `apprentice-spellbooks.md`、`apprentice-card-field-contract.md`、`board-ui-preflight-matrix.md`、`apprentice-zone-layout-contract.md`、正式素材输入包 |
| 目标入口 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\` 下的独立 HTML artifact |
| 验收口径 | AI 先按规则 / 素材 / 少边框 / 玩家友好自审；通过后才允许打开给用户人工验收 |

## 规则到画面结论

| 规则结论 | 影响主体 | v3 设计决策 |
| --- | --- | --- |
| 学徒模式使用标准竞技场一半，即 `2x3` 六区域 | 中央竞技场、场上卡牌 | 三张稿都以六区域为第一视觉；每张场上卡必须有唯一 `data-zone-id`，不得骑线或格外 |
| 法术从法术书计划，最多 2 张已计划法术；规则没有“手牌”主概念 | 法术书、已计划法术、弃牌堆 | 只使用 `法术书 / 已计划法术 / 弃牌堆 / 隐性结界` 命名；禁止出现“手牌 / hand” |
| 对手计划法术和隐性结界保持隐藏信息 | 对手牌区、附件区 | 对手侧只显示卡背、数量、控制归属；不显示正面、卡名或效果 |
| 当前结算主体必须锚在来源 / 目标 / 主舞台 | 攻击骰、效果骰、伤害、燃烧 | 施法结算稿把骰子放在西锁骑士所在区域和目标卡附近，不放到右侧栏或日志栏 |
| 状态板只作 reference-only，生命 / 法力 / 聚魔适合自制运行态 UI | 双方法师 HUD | 用贴近法师牌的水平生命条、法力条、聚魔读数；不复现整张状态板，也不用粗糙蓝圆 |
| 弃牌堆是公开归档 / 可检视入口，不是当前主任务 | 弃牌堆 | 只作为所属玩家边缘紧凑入口；不放中央，不做大面板 |

## 三张真实状态稿

| 稿件 | 玩家此刻问题 | 主焦点 | 必须交互 |
| --- | --- | --- | --- |
| `casting-resolution` | 火球术是否命中、目标受到什么结果、是否还能取消 / 等待反制 | 来源法术、目标、西锁骑士附近骰子与伤害反馈 | 目标、费用、确认、取消、反制等待、骰子结果 |
| `spellbook-planning` | 本回合计划哪两张法术、法术书如何分类 / 翻页、已计划是否满 | 底部法术书工作台和两张已计划法术 | 分类、分页、候选卡、加入计划、移除计划、完成 |
| `battlefield-command` | 当前激活对象能移动 / 攻击 / 守卫什么，合法目标在哪里 | 六区域竞技场、活动生物和对象附近命令 | 移动、攻击、守卫、跳过、合法区域 / 对象高亮 |

## 可见主体素材账本

| 画面主体 | 素材 / 来源 | 状态 | 呈现方式 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` | `visible-subject` | 每张稿主棋盘背景 |
| 法师牌 | `mage-warlock-card.png`、`mage-priestess-card.png` | `visible-subject` | 双方法师 HUD 和场上对象 |
| 法术牌正面 | `spell-1700-fireball.png`、`spell-1804-mage-bane.png`、`spell-1806-block.png`、`spell-1901-nullify.png`、`spell-3408-heal.png`、`spell-3704-equipment.png` | `visible-subject` | 法术书候选、已计划法术、当前施法 |
| 生物 / 魔物 | `spell-2801-firebrand-imp.png`、`spell-2803-flaming-hellion.png`、`spell-2816-royal-archer.png`、`spell-2907-gray-angel.png`、`spell-2909-knight-of-westlock.png`、`spell-2224-conjuration.png` | `visible-subject` | 场上卡牌，必须锚定唯一区域 |
| 法术卡背 | `spell-card-back.jpg` | `visible-subject` | 对手已计划法术、隐性结界、法术书堆 |
| token / 骰子 | `quickcast-marker-front.png`、`action-marker-*.png`、`guard-token.png`、`damage-token-front.png`、`attack-die-face-*.png` | `visible-subject` | 行动状态、守卫 / 伤害、攻击骰 |
| 生命 / 法力 / 聚魔 / 费用 / 效果骰 | 规则字段 + 状态板 reference-only + Workshop 内置效果骰 | `approved-programmatic-runtime-ui` | 水平条、短读数、石质费用徽、蓝色 12 面效果骰 |

## 图面禁止项

- 不显示 `方案 / 优先 / Open Design / artifact / AI_PASS / E2E / 设计稿` 等内部评审文字。
- 不显示“手牌 / hand / opponent-hand”等规则不存在概念。
- 不用说明段落解释规则；常驻主 UI 只保留对象名、数值、短状态和按钮标签。
- 不用大边框、框中框、说明面板或日志栏承载主信息。
- 不把攻击骰、效果骰、伤害或燃烧放到边栏、日志栏或底部工具台。

## AI 审计门槛

| 检查项 | PASS 标准 |
| --- | --- |
| 规则命名 | 只出现法术书、已计划法术、弃牌堆、隐性结界等规则牌区 |
| 素材主体 | 棋盘、卡牌、卡背、token、骰子为第一视觉主体，不被容器壳替代 |
| 区域锚点 | 所有场上卡中心在所属区域内，区域内面积足够高 |
| 结算落位 | 当前骰子与伤害结果靠近目标或来源-目标链路 |
| 玩家友好 | 玩家第一眼知道当前阶段、当前对象、可点目标和确认 / 取消位置 |
| 阶段边界 | AI PASS 前不打开给用户；用户批准前不实现 Board/UI |
