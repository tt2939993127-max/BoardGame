# 法师战争 Step 1 Open Design Artifact v7 审计

> 状态：`AI_PASS_REVOKED / REVISE / rule-ui-semantics-failed / hand-concept-invalid / human-review-blocked / implementation-frozen`。本审计只针对 `mage-wars-step1-runtime-board-v7.html` 这个 Open Design artifact 代码设计稿及其 `1920x1080` 渲染截图。它不是 `od media generate` 生图结果，也不是运行时 Board UI 实现批准。用户指出 v7 把 Mage Wars 规则不存在的“手牌 / 对手手牌”引入主 UI，旧 PASS 撤销。

## 产物

| 项 | 路径 / 结果 |
| --- | --- |
| Open Design artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v7.html` |
| Open Design artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v7.html.artifact.json` |
| 出图前硬回执 | `docs/games/mage-wars/design/reference/step1-runtime-board-pc-redesign-v7-preflight.md` |
| 渲染审计截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v7.png` |
| 截图尺寸 | `1920x1080` |
| 截图字节 | `2671844` |
| 截图 sha256 | `5BF2E5D4E29B25CC07F3DFBCA3CC3C601340B0361C43E7450BE3FEEBBD3EB986` |
| 素材加载 | `39` 张图片全部 `complete` 且有自然尺寸 |
| 导出说明 | 使用 Playwright 渲染同一个 Open Design artifact HTML 产出审计截图；未调用 `od media generate`、imagegen 或 media provider。 |

## 本轮启动自证

| 门禁 | 本轮结论 |
| --- | --- |
| 规则页段 | 本轮实际重读 `page_004.md`、`page_006.md`、`page_007.md`、`page_008.md`、`page_015.md` 和 `apprentice-spellbooks.md`。 |
| 规则到画面 | FAIL：画面呈现 `2x3` 学徒竞技场和火球术施法链路，但错误把来源写成“己方计划 / 手札链路”。规则应为法术书中准备的已计划法术，不存在手牌主概念。 |
| 素材输入链 | artifact 直接引用 `refs/mage-wars-step1/**` 下正式竞技场、法师牌、学徒法术牌、法术卡背、行动 token、快速施法 token、守卫 / 伤害 / 聚魔 token 和攻击骰贴图。 |
| 程序化 UI 裁定 | 生命、法力、聚魔和伤害读数是 `approved-programmatic-runtime-ui`；蓝色效果骰是来源锁定的 12 面程序化对象。 |
| 禁止替代 | 未引用 `temp/` 临时裁图；未把 `mage-status-board.png` 复现为主 UI 面板；未用普通 D6、CSS 假卡、文字壳或图片模型生成物替代正式素材。 |
| 人工验收 | BLOCKED：旧 AI 自检通过结论撤销；v7 不得打开给用户人工验收。 |

## AI 图面核验

| 门禁 | 结论 |
| --- | --- |
| 牌区语义 | FAIL：artifact 可见语义、aria / class 和审计文本出现“手牌 / 对手手牌 / hand / opponent-hand”，违反 Mage Wars 法术书、已计划法术、弃牌堆流转规则。 |
| 学徒半场 | PASS：中央主舞台是正式竞技场裁切出的 `2x3` 学徒半场，不再把未使用半场当完成态展示。 |
| 规则对象 | PASS：邪术师、女祭司、火球术、西锁骑士、灰衣天使、皇家箭手、缠绕藤蔓、火烙魔婴、烈焰狱鬼、装备、隐性结界、行动标记和快速施法标记均与饱和状态对应。 |
| 正式素材主体 | PASS：棋盘、法师、法术牌、卡背、token 和攻击骰由正式资源或正式 atlas crop 承担主视觉。 |
| 动态读数裁定 | PASS：生命 / 法力 / 聚魔 / 伤害没有复现状态板，使用贴近法师牌的自制短读数。 |
| 隐藏信息 | FAIL：图面使用卡背不泄露正面这一点方向正确，但命名为“对手手牌”是规则错误；应为对手已计划法术、隐性结界或未公开法术书内容。 |
| 主动作链 | PASS：当前卡牌、火焰路径、目标、8 法力代价、确认 / 取消和骰盘在同一视觉链路上。 |
| 骰盘 | PASS：骰盘移到目标附近；攻击骰使用 `attack-die-texture.png`，效果骰为蓝色 12 面程序化对象。 |
| 少边框 | PASS：删除了 v6 的侧栏分舱和独立骰区框，画面主要由棋盘、卡牌、token、光路和对象贴身短标签组织。 |
| 主 UI 文案 | PASS：常驻文字是对象名、数字、短状态和按钮标签；没有规则说明正文、教程句或实现验收话术。 |
| PC-only | PASS：本轮只产 PC `1920x1080` 设计稿；未转移动端，未启动真实运行页。 |

## 玩家友好性批判

| 细节 | 当前表现 | 对玩家是否友好 | 裁决 |
| --- | --- | --- | --- |
| 第一眼主语 | 中央是正式竞技场，真实卡牌和 token 直接在桌面上 | 玩家先看到的是 Mage Wars 桌面，不是 dashboard 框体 | PASS |
| 当前任务 | 顶部短状态为“你的回合 / 选择目标”，火球术连接到西锁骑士 | 玩家能在 1 秒内知道当前要选择目标 | PASS |
| 当前目标 | 西锁骑士卡面被光效、短标签和骰盘包围 | 目标明确，且仍保留真实卡牌本体 | PASS |
| 费用反馈 | 蓝色 `8` 贴近确认按钮，邪术师法力显示 `12 → 4` | 支付代价可读；支付前取消也可见 | PASS |
| 施法来源 | 火球术大卡从错误命名的“手牌 / 计划区域”抬升并连接棋盘 | 视觉来源清楚，但规则语义错误；应改成“已计划法术槽” | FAIL |
| 骰盘位置 | 骰子在目标附近而不是右侧孤岛 | 结算对象和随机源相邻，比 v6 更友好 | PASS |
| 隐藏信息 | 对手隐藏信息只显示卡背，但其中被错误命名为对手手牌 | 不泄露正面是对的，命名错误会误导玩家理解规则 | FAIL |
| 法师状态 | 血蓝条贴近法师牌，数值短 | 动态读数清楚，没有把状态板硬贴成面板 | PASS |
| 状态 token | 守卫、伤害、燃烧、束缚等贴近对象 | 状态跟随对象，不要求看日志 | PASS |
| 边框感 | 只保留按钮底、短标签和素材自身边界 | 框体明显减少；棋盘边缘是素材裁切，不是 UI 框 | PASS |
| 右侧空间 | 对手隐藏卡背 / 计划卡背保留在右侧桌面空位 | 空间有呼吸感，但名称必须改为计划法术 / 隐性结界 / 法术书未知内容 | REVISE |
| 底部计划法术 | 真实卡牌足够大，选中火球术留下空槽 | 空槽可表达当前已计划法术被抬升；不得称为手牌 | REVISE |
| 标签密度 | 目标、射程、隐藏、状态均为短标签 | 能解释当前选择态，不是常驻规则正文 | PASS |
| 可复刻性 | 主要由真实图片、绝对定位、短标签、光效和透明 overlay 组成 | 前端可按当前组件能力高保真复刻；光效可降级 | PASS |

## AI 图面裁决

```text
verdict: FAIL
score: 0/100
hard_failures:
  - rule-ui-semantics-failed: Mage Wars does not have a hand zone in this scope; v7 introduced hand / opponent-hand.
  - human-review-blocked: old AI_PASS is revoked and the artifact cannot be opened for user approval.
notes:
  - 可保留的方向只有：2x3 学徒半场、真实素材主体、少框、目标附近骰盘。
  - 必须重做的方向是：法术书 / 已计划法术 / 弃牌堆 / 隐性结界语义和所有 class / aria / 审计文案。
  - 这不是可人工验收设计稿；用户批准前不得进入运行时实现、真实页面 E2E 或移动端适配。
```

## 下一步准入

1. v7 不得打开给用户人工验收，状态为 `human-review-blocked / failed-candidate`。
2. 下一步必须先写 v8 出图前硬回执，牌区白名单固定为法术书、已计划法术、弃牌堆、隐性结界。
3. v8 生成前后必须做字符串审查，禁止出现 `手牌`、`hand`、`opponent-hand`。
