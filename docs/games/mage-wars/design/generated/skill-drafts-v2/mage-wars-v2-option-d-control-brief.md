# Mage Wars v2 方案 D 可访问专家操控 brief

> 状态：`option-d-control-brief / open-design-artifact-input / media-generate-forbidden / implementation-blocked / human-review-not-allowed`。
> 本文件只定义下一张 **独立 Open Design artifact** 的方案 D 输入合同，不是设计稿截图，不是 Board/UI 实现，也不是 E2E 证据。用户明确人工批准前，仍禁止启动真实运行页、编写或扩展 Board/UI、跑真实页面 E2E 或进入移动端适配。

## 本轮目标锁定

| 项目 | 锁定结果 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 主对局 UI 的方案 D：可访问专家操控优先 |
| 真相来源 | `step1-runtime-board-saturated-ui-design.md`、`external-ui-methodology-baseline.md`、`skill-driven-user-selection-brief.md`、`skill-driven-ui-design-options.md`、`step1-runtime-board-asset-input-manifest.md`、v21 preflight / audit / geometry、v22 多方案失败审计、`ui-change-gates.md`、`ui-ux.md`、`design-system/game-ui/MASTER.md`、`source-families.md` |
| 目标入口 / 环境 | 1920x1080 PC Open Design artifact 代码设计稿；每套候选必须独立 HTML artifact + 独立 PNG |
| 验收口径 | 先生成独立 artifact 和 PNG，再做 AI 图面核验；AI PASS 后才允许人工验收；人工批准前不得实现 |

## 本 brief 只允许做什么

- 允许后续创建独立 Open Design artifact，例如 `mage-wars-v2-option-d-control.html`。
- 允许后续从该 artifact 导出独立 1920x1080 PNG，例如 `mage-wars-v2-option-d-control.png`。
- 允许后续写独立 AI 审计和几何审计。
- 禁止调用 `od media generate`、imagegen 或任何图片模型生图；本路线必须保持 `mediaGenerate=false`。
- 禁止把 v21 / v22 的同母版 HTML 微调后改名冒充方案 D；D 必须有独立信息架构和独立操作路径。
- 禁止修改 `src/games/mage-wars/**`、Board/UI、运行时 HUD、PromptOverlay、页面骨架或 E2E。

## 为什么不能继续微调 v21 / v22

| 旧候选 | 可保留 | 必须放弃 |
| --- | --- | --- |
| v21 基线 | `2x3` 区域、场上卡唯一所属区域、水平法师 HUD、底部法术书候选 + 分类 + 分页、骰盘贴目标附近 | 不能把 v21 当作用户已批准稿；不能直接继承其整体母版做“换权重” |
| v22 A/B/C | 硬门禁数据可作对照：候选卡数、分类、分页、骰盘距目标、区域归属都曾达标 | 多方案仍过于同构，不能作为真正多方案交付；不得再做同页总览或同 DOM 变体 |
| 方案 D 原文字稿 | 稳定 dock、可读焦点、命中区、短错误和等待态是正确方向 | 右侧 dock 不能抢主舞台，不能承载骰子主结果，不能把对象直选退化成按钮代理 |

## 方案 D 的设计轴

方案 D 的核心不是“做一个强右栏”，而是：

```text
棋盘对象本体承接选择
+ 右侧稳定 dock 承接确认 / 取消 / 费用 / 短错误 / 等待
+ 底部法术书 rail 承接候选浏览和已计划槽
+ 主舞台 stage 承接当前来源 -> 目标 -> 骰子 -> 结果
```

D 的成功标准是玩家第一眼能回答：

1. 现在轮到谁，当前在做哪一步。
2. 我真正要点的是哪一个棋盘对象、区域或法术卡。
3. 点完对象后，到哪里确认、取消或查看费用。
4. 如果对象不可用，为什么不可用。
5. 当前骰子、伤害、状态结果作用到谁。

如果第一眼看到的是后台式右侧面板、说明列表或按钮墙，而不是竞技场 / 法术卡 / 当前目标，则方案 D 失败。

## 1920x1080 空间合同

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 对方法师 HUD + 对手已计划卡背 + 弃牌堆入口        短阶段状态 / 当前行动者 │
│                                                                            │
│ ┌──────────────────────────────────────────────────────┐ ┌───────────────┐│
│ │                        ARENA                         │ │  ACTION DOCK  ││
│ │     A1                 B1                            │ │ 当前阶段      ││
│ │     A2                 B2  target + dice near target │ │ 当前对象摘要  ││
│ │     A3                 B3                            │ │ 费用 / 非法因 ││
│ │  field object click remains primary                  │ │ 确认 / 取消   ││
│ └──────────────────────────────────────────────────────┘ │ 等待响应      ││
│ 己方法师 HUD                                              └───────────────┘│
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ SPELLBOOK RAIL: 分类 | 候选卡 5-6 张 | 分页 | 已计划 1 | 已计划 2 | 弃牌 │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

| 区域 | 建议范围 | 职责 | 禁止项 |
| --- | --- | --- | --- |
| 主竞技场 stage | 约 1040-1120px 宽，680-760px 高；右半场 `2x3` 为第一规则视觉 | 区域、对象、目标、骰子、伤害 / 状态结果 | 不得被 dock、rail、解释条或日志压缩到不可读 |
| 右侧 action dock | 300-340px 宽，贴右侧中下，不进入棋盘格 | 当前阶段、当前对象摘要、费用预扣、非法短原因、确认 / 取消、等待响应 | 不承载骰子主结果，不替代目标点击，不显示长规则说明 |
| 底部 spellbook rail | 180-210px 高，贴底但不截断卡牌 | 法术书分类、候选卡、分页、已计划 2 槽、弃牌堆入口 | 不压住己方法师牌 / HUD，不把候选和已计划混成同一语义 |
| 双方法师 HUD | 贴近法师牌，水平读数 | 生命、法力、聚魔、行动 / 快速施法 token、公开附件摘要 | 不复现整张状态板，不做斜放面板 |
| 结算 overlay | 目标或来源附近，优先在 B2 目标侧 | 攻击骰、效果骰、伤害、燃烧 / 守卫等 token 反馈 | 不进入右侧 dock 或日志，不遮住目标本体归属 |

## 规则到画面决策

| 规则结论 | 画面主体 | D 方案决策 / 禁止项 |
| --- | --- | --- |
| 学徒模式使用 `2x3` 半场 | 中央竞技场 `A1-B3` | `2x3` 区域线必须一眼可见；所有场上卡中心点必须在所属区域内 |
| 玩家从法术书准备最多 2 张法术 | 底部法术书 rail + 已计划 2 槽 | 候选卡是浏览对象，已计划槽才是当前可施放来源；不得出现“手牌”命名 |
| 对手不能知道计划法术 | 对手已计划区域 | 只显示卡背、数量和控制归属；不得显示卡名或正面 |
| 施法必须宣告目标、可支付前取消、支付后进入反制 / 结算 | 棋盘目标 + action dock | 目标必须点对象本体；费用、确认和取消在 dock；支付后取消退场 |
| 攻击 / 效果骰决定目标伤害和状态 | 目标旁结算 overlay | 骰面和伤害贴目标，不进入 dock；dock 只显示已选摘要和确认 |
| 弃牌堆可公开检视但通常不是当前来源 | 双方边缘弃牌入口 | 弃牌堆只做公开归档入口，当前无回收步骤时不得进入中央主链 |
| 法师状态板只作规则来源 | 玩家 HUD | 生命 / 法力 / 聚魔用自制水平条和数字；状态板不作为可见面板 |
| 状态 token 影响行动 | 场上对象本体 | 守卫、燃烧、伤害等 token 贴对象外侧或角边，不遮挡卡面主体 |

## 主交互槽位五联单

| 场景 | 主交互对象 | 固定槽位 | 让位顺序 | 禁止侵入对象 | 来源家族 |
| --- | --- | --- | --- | --- | --- |
| 法术书浏览 / 计划 | 法术候选卡本体、已计划 2 槽 | 底部 spellbook rail | 日志、帮助、装饰状态先退 | 己方法师 HUD、主竞技场、对手隐藏计划 | 底部非阻塞卡牌查看 / 选择面板 |
| 施法选目标 | 棋盘区域、法师、生物、魔物、显性结界本体 | 主竞技场 stage | 法术书 rail 压缩、详情抽屉退场 | 目标本体、区域线、隐藏结界身份 | 棋盘对象 / 位置直选 |
| 确认 / 取消 / 费用 | 已选法术 + 已选目标摘要 | 右侧 action dock | 次级状态、提示、帮助退场 | 骰子主结果、目标选择态、法术候选本体 | 固定右侧动作槽 |
| 等待响应 / 反制窗口 | 对手响应状态、隐性结界卡背 | 目标附近轻 overlay + dock 短状态 | 普通按钮退场，说明句退场 | 对手隐藏卡名、棋盘目标本体 | 中央 ownership / waiting shell 的轻量变体 |
| 攻击 / 治疗结算 | 目标对象 + 骰子 + token 结果 | 目标附近 stage overlay | dock 只保留确认 / 下一步，rail 降噪 | 骰子、目标、伤害 / 状态 token | 阻塞结果主舞台 / 棋盘对象直选 |

交互前 / 中 / 后要求：

- 交互前：玩家能在底部 rail 找到已计划法术，或在棋盘看到当前可行动对象。
- 交互中：只有一组主操作焦点；目标选择由棋盘对象承接，dock 不能像第二个目标列表。
- 交互后：overlay 退场，dock 回到下一步短动作，rail 和 HUD 不漂移、不残留抢位空壳。
- 双主焦点检查：如果 dock、rail、stage 同时都像“下一步入口”，截图直接判失败。

## Action dock 详细合同

### Dock 必须显示

- 当前阶段短标签：例如 `优先快速施法`、`生物行动`、`等待响应`。
- 当前对象摘要：例如 `火球术 -> 西锁骑士`。
- 费用 / 消耗：例如 `8 法力`、`消耗快施`。
- 确认 / 取消 / 跳过中的当前可用动作，按钮必须有 44px 级命中区。
- 非法短原因：例如 `范围外`、`目标不符`、`快速施法已用`，只在对应失败态出现。

### Dock 禁止显示

- 攻击骰 / 效果骰的主视觉结果。
- 目标候选列表或目标代理按钮。
- 法术书候选卡列表。
- 长规则说明、教程句、验收标签、AI 审计文案。
- `source`、`target`、`pending`、`AI_PASS`、`E2E`、`dock`、`rail`、`stage` 等内部词作为玩家可见文本。

## Spellbook rail 详细合同

| 元素 | 要求 |
| --- | --- |
| 分类 | 至少包含 `全部 / 攻击 / 结界 / 生物 / 装备 / 咒语`；当前选中态必须肉眼可辨 |
| 候选卡 | 1920x1080 下至少 5 张候选卡可见；卡图本体是浏览入口，不退化成文字按钮 |
| 分页 | 显示 `‹ 1/4 ›` 或等价分页；按钮要像可点控件，不是小字 |
| 已计划 2 槽 | 与候选卡明确分区；当前可施放来源从这里进入 stage |
| 弃牌堆 | 公开归档入口，贴所属玩家边缘或 rail 末端；不进入当前主链 |
| 隐藏信息 | 对手计划法术只用卡背和数量，不显示候选卡正面 |

## 素材账本

| 主体 | 必须来源 | D 方案角色 |
| --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` / `public/assets/i18n/zh-CN/mage-wars/board/standard-arena.jpg` | `visible-subject`，画面第一主体 |
| 法师牌 | `mage-warlock-card.png`、`mage-priestess-card.png` 等 atlas crop | `visible-subject`，HUD 锚点 |
| 学徒法术牌 | `spell-1700-fireball.png`、`spell-1804-mage-bane.png`、`spell-1806-block.png`、`spell-1901-nullify.png`、`spell-3704-equipment.png` 等 | `visible-subject`，候选、已计划、当前施法卡 |
| 法术卡背 | `spell-card-back.jpg` | `visible-subject / hidden-info`，对手计划和隐性结界 |
| 行动 / 快速施法 token | `action-marker-*.png`、`quickcast-marker-front.png` | `visible-subject`，贴近法师或生物 |
| 攻击骰 | `attack-die-texture.png` 或由其派生的骰面 | `visible-subject`，目标附近主结算 |
| 效果骰 | 来源锁定程序化蓝色 12 面骰 | `approved-programmatic-runtime-ui`，但必须像正式对象 |
| 生命 / 法力 / 聚魔 | 规则页 + 状态板 reference-only | `approved-programmatic-runtime-ui`，水平条 + 数字 |
| 法师状态板 | `mage-status-board.png` | `reference-only`，不得作为主界面可见面板 |

## Open Design artifact 输出要求

后续生成 artifact 时必须满足：

- 独立 artifact 文件，不与 A/B/C 或 v21/v22 共用同一总览页。
- 独立 PNG 导出，不用同页裁切冒充独立设计稿。
- artifact 元数据必须保持 `mediaGenerate=false`。
- HTML / CSS / aria / class / 可见文本中不得出现规则不存在的“手牌 / opponent-hand / hand”牌区概念；历史引用除外。
- 可见文案只允许对象名、数值、短状态和按钮标签。
- 正式素材必须通过 Open Design 项目相对路径、`refs/mage-wars-step1/`、atlas crop 或明确渲染来源进入图面主体；不能只在 prompt / brief 里列路径。
- 生成后必须写同稿同源证据块，覆盖规则读取、素材账本、禁止替代、人工验收状态。

建议文件名：

| 类型 | 建议路径 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v2-option-d-control.html` |
| 导出 PNG | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-d-control.png` |
| AI 审计 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-d-control-audit.md` |
| 几何审计 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-d-control-geometry.json` |

## AI 图面核验表

| 检查项 | PASS 标准 |
| --- | --- |
| Open Design 路线 | artifact 独立存在，`mediaGenerate=false`，未调用 `od media generate` |
| 多方案差异 | 与 v21 / v22 不只是 CSS 权重变化；右侧 dock、底部 rail、主 stage 的空间比例和操作路径有实质差异 |
| 棋盘区域 | `2x3` 区域一眼可见；场上卡中心点在所属区域内，最大跨区占比为 0 或可解释为轻微阴影 |
| 对象直选 | 目标选择由棋盘对象 / 区域本体承接；dock 不出现目标代理列表 |
| 骰子位置 | 攻击骰 / 效果骰在目标或来源附近；不在右侧 dock 内 |
| 法术书 rail | 至少 5 张候选卡、分类、分页、已计划 2 槽全部可见且不互相混淆 |
| 隐藏信息 | 对手计划法术和隐性结界只显示卡背 / 数量 / 控制归属 |
| HUD | 双方法师 HUD 水平、可读，法师状态板不作为主面板出现 |
| Dock | 只承接确认、取消、费用、短错误和等待；按钮可读可点，不像后台表单 |
| 少边框 | 第一眼看到竞技场、法术卡、目标和骰子，不是框中框、玻璃栏或 dashboard |
| 常驻文字 | 没有规则解释句、教程句、验收文案、内部黑话 |
| 人工验收 | AI 图面核验 PASS 前保持 `human-review-not-allowed` |

## 失败反例

- 右侧 dock 里放了骰子、伤害主结果或完整目标列表。
- 点击确认按钮自动代选唯一目标，而不是先让棋盘对象高亮并由玩家点对象本体。
- 法术书 rail 只剩小牌堆角标，不能看到候选、分类和分页。
- 已计划法术和全书候选混成一排，玩家不知道哪张能施放。
- 对手计划法术显示正面或卡名。
- 法师状态板被整张或裁切成主 HUD。
- 画面主要靠深色大面板、厚边框、分栏底板成立。
- 可见文本出现“手牌”“点击绿色目标”“E2E 已通过”“AI_PASS”等非玩家主 UI 文案。

## 当前收口

- 本文件完成的是方案 D 的 **Open Design artifact 输入 brief**。
- 当前没有生成新的 HTML artifact、PNG、AI 审计图或几何审计。
- 当前没有修改 Board/UI，也没有运行真实页面 E2E。
- 下一步若继续，应先按本 brief 生成独立 Open Design artifact，再导出 1920x1080 PNG，并按上方 AI 图面核验表审计；AI PASS 后才允许给用户人工验收。
