# Mage Wars v2 方案 A Open Design brief：战场棋盘优先

> 状态：`brief-ready / option-a-battlefield-first / open-design-artifact-only / media-generate-forbidden / implementation-blocked / human-review-not-allowed`。
> 本文件是给下一步 Open Design artifact 使用的独立 brief，不是视觉稿、不是 PNG、不是真实 Board/UI 实现，也不是 E2E 证据。

## 目标锁定

| 项 | 当前锁定 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 主对局 UI，方案 A：战场棋盘优先 |
| 真相来源 | 本轮实际读取的规则、素材、坐标、v21 审计和外部方法论文档，见下表 |
| 目标入口 / 环境 | 当前 worktree：`D:\gongzuo\webgame\BoardGame\.worktrees\mage-wars`；下一步仅允许创建独立 Open Design HTML artifact |
| 验收口径 | 先用本 brief 生成独立 HTML artifact，再导出独立 1920x1080 PNG，完成 AI 图面核验；AI PASS 后才允许人工验收 |

## 本轮实际读取的文件

| 类型 | 文件 | 对本 brief 的直接结论 |
| --- | --- | --- |
| 设计目录状态 | `docs/games/mage-wars/design/README.md` | v21 只能作为多稿前基线；v22 同构微调失败；下一批必须是独立 artifact、独立 PNG、独立审计 |
| 用户选择摘要 | `docs/games/mage-wars/design/reference/skill-driven-user-selection-brief.md` | 方案 A 是“战场棋盘优先”，适合优先解决规则空间、区域归属、卡牌骑线和目标因果 |
| 外部 UI 方法论 | `docs/games/mage-wars/design/reference/external-ui-methodology-baseline.md` | 玩家当前问题、识别优先、映射 / 反馈、渐进披露、少边框必须进入设计 |
| 饱和 UI 设计 | `docs/games/mage-wars/design/reference/step1-runtime-board-saturated-ui-design.md` | 不得出现“手牌”；必须使用法术书、已计划法术、弃牌堆、隐性结界；攻击骰 / 效果骰贴目标 |
| 坐标合同 | `docs/games/mage-wars/design/implementable/board-coordinate-contract.md` | 标准竞技场素材为 `4x3`；学徒半场必须按 `2x3` 处理；状态板只作 reference-only |
| 区域锚点合同 | `docs/games/mage-wars/design/implementable/apprentice-zone-layout-contract.md` | `A1/B1/A2/B2/A3/B3` 六区域必须一眼可读；每张场上卡有唯一 `zoneId`，中心点在所属区域内 |
| 素材输入包 | `docs/games/mage-wars/design/reference/step1-runtime-board-asset-input-manifest.md` | 标准竞技场、法师牌、法术牌、卡背、token、攻击骰已有 Open Design 输入链；生命 / 法力等为自制运行态 UI |
| 学徒法术书 | `docs/games/mage-wars/rule/apprentice-spellbooks.md` | 四名学徒法师有固定法术书；邪术师 / 女祭司等法师法术数量和牌名已锁定 |
| v21 审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21-audit.md` | v21 通过水平 HUD、底部法术书浏览器、`2x3` 区域和骰盘目标附近检查，但用户未批准 |
| v21 几何 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21-geometry.json` | v21 场上卡牌区域归属 PASS；可作为几何基线，不得作为新方案同母版复用 |

## 禁止越界

- 禁止调用 `od media generate`、imagegen、图片模型或任何媒体生成链；本轮只允许 Open Design artifact 代码设计稿路线。
- 禁止启动真实运行页、编写或扩展 Board/UI、跑实现 E2E、跑移动端适配，或用运行页截图反推设计通过。
- 禁止覆盖、删除或改写 v21 基线 artifact / PNG / audit；v21 只能作为对照基线。
- 禁止把方案 A 做成 v21 的局部调色、局部放大、同页总览或同 DOM 母版微调。
- 禁止使用“手牌 / opponent-hand / hand”作为可见文案、class、aria、审计文本或设计说明；规则真实名称是法术书、已计划法术、弃牌堆、隐性结界。

## 与 v21 的关系

### 必须继承

| v21 通过点 | 方案 A 继承方式 |
| --- | --- |
| 学徒 `2x3` 六区域已通过几何锚点审计 | 继续使用 `A1/B1/A2/B2/A3/B3`，每张场上卡声明 `data-zone-id` |
| 双方法师 HUD / 法师牌不再斜放 | 继续保持水平 HUD、水平状态条和未旋转法师牌 |
| 法术书底部候选浏览 + 分类 + 分页成立 | 保留底部候选行、分类、分页和已计划 2 槽，但在方案 A 中压低权重 |
| 禁止牌区词为 0 | 继续强制字符串门禁 |
| 攻击骰 / 效果骰贴近 B2 当前目标 | 继续让骰盘在目标附近，而不是进入 dock 或边栏 |

### 必须改变

| v21 倾向 | 方案 A 改法 |
| --- | --- |
| 竞技场有效半场偏像右侧可用区域，整体仍接近旧稿布局 | 让 `2x3` 学徒战场成为第一视觉主体：居中、放大、六区边界更明确，未使用半场明显退场 |
| 底部法术书浏览器占据较强视觉权重 | 底部法术书保留为薄工作带；已计划 2 槽高于普通候选卡，但不得抢棋盘主视线 |
| 右侧确认区仍有旧 dock 影子 | dock 只承载确认 / 取消 / 短错误 / 等待，不承载骰子主结果、不承载目标列表 |
| 火球术因果链还可以更强 | 来源法师 / 已计划火球术 -> B2 目标 -> 骰子 -> 伤害 / 燃烧 token 必须形成同一条主舞台链 |

## 方案 A 核心设计命题

方案 A 的第一视觉必须是“规则战场”，不是“法术书工作台”或“右侧操作面板”。

```text
玩家第一眼要回答：
1. 当前可用的是哪 6 个区域？
2. 哪些对象分别属于哪个区域？
3. 火球术从哪里来，正在打谁？
4. 骰子和伤害结果作用在哪个目标上？
5. 我确认 / 取消在哪里，但确认按钮不能替我选择目标。
```

如果这五个问题必须靠说明正文才能理解，artifact 直接判 `REVISE`。

## 1920x1080 PC 构图合同

| 区域 | 位置 / 占比 | 内容 | 设计要求 |
| --- | --- | --- | --- |
| 中央战场 | 屏幕中央第一视觉，建议约 `1180x760` 级主舞台；有效 `2x3` 半场不得小于主舞台面积的 55% | 标准竞技场素材、可用 `A1/B1/A2/B2/A3/B3` 六区域、法师 / 生物 / 魔物 / 目标 | 六区域边界用素材地砖 / 光照 / 轻分割表达，禁止厚框；未使用半场必须降噪 |
| 场上对象 | 完全落在所属区域内 | 邪术师、女祭司、火印魔婴、烈焰魔物、西锁骑士、皇家箭手、缠绕藤蔓等饱和对象 | 每个 `.field-card` 必须有 `data-zone-id`；中心点在所属区域内，包围盒至少 85% 在所属区域 |
| 当前结算层 | B2 目标附近，贴战场上层 | 火球术目标、攻击骰、效果骰、伤害 / 燃烧 token | 骰盘到目标中心距离建议小于 `170px`；骰子不得进右侧 dock |
| 双方法师 HUD | 分别贴近己方 / 对方法师牌，不参与主战场网格 | 法师牌、生命条、法力条、聚魔、行动 / 快速施法 token、公开附件摘要 | 水平、可读、低框感；状态板素材不得作为常驻面板 |
| 已计划法术 | 己方战场下沿与法术书上沿之间，优先于普通候选卡 | `已计划 2/2`，火球术 / 法师祸咒等当前可施放来源 | 已计划卡比候选卡更靠近战场；必须一眼知道只有这里能施放 |
| 法术书候选 | 底部薄横带 | 候选卡 5-6 张、分类按钮、分页 `1/4`、法术书入口 | 保留浏览能力，但不能把底部做成主视觉工作台 |
| 弃牌堆 | 所属玩家边缘小入口 | 公开归档数量和卡背 / 简要入口 | 不进入中央主链；不暗示当前要从弃牌堆选择 |
| 行动 dock | 右下稳定锚点，靠近战场和已计划槽 | 确认、取消、跳过、等待响应、短错误 | 只负责提交和状态，不负责目标选择；禁止承载骰盘和大结果 |

## 规则到画面映射

| 规则结论 | 画面主体 | 方案 A 设计决策 / 禁止项 |
| --- | --- | --- |
| 学徒模式使用标准竞技场一半，即 `2x3` 六区域 | 中央战场 | 有效六区域是第一视觉；未使用半场降噪；禁止抽象六格替代正式竞技场素材 |
| 距离和相邻只按水平 / 垂直区域计算 | 区域边界与合法目标 | 合法目标高亮贴对象 / 区域本体；斜向或范围外目标保留但降噪 |
| 场上对象必须属于单一区域 | 法师 / 生物 / 魔物卡 | 卡牌中心和大部分包围盒必须在所属区域；不得骑线、跨格、格外摆放 |
| 每回合从法术书准备最多 2 个计划法术 | 已计划 2 槽 | 已计划卡是当前可施放来源；法术书候选不能表现成可直接施放的普通手牌 |
| 对手不能得知计划 | 对手已计划 / 隐性结界 | 对手只见卡背、数量、控制归属；不得显示对手计划卡正面、卡名或候选法术 |
| 施法先宣告目标，支付前可取消，支付后结算或被反制 | 当前行动 dock + 目标链 | 确认按钮与费用预览、目标摘要同组；支付前可取消；支付后取消退场 |
| 攻击 / 治疗骰决定目标结果 | 目标附近骰盘 | 攻击骰用正式攻击骰贴图或等价皮肤；效果骰为来源锁定蓝色 d12；禁止普通 D6、纯数字公式、黑盒骰盘 |
| 伤害和状态记录在目标对象上 | token / 飘字 / 状态贴附 | 伤害、燃烧、守卫等 token 贴宿主对象；不得只写日志或进入侧栏摘要 |

## 可见主体素材账本

| 主体 | 资源 / 来源 | artifact 呈现 | 角色裁定 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg`，源自 `public/assets/i18n/zh-CN/mage-wars/board/standard-arena.jpg` | 主战场底图，必须是第一视觉主体 | `visible-subject` |
| 邪术师 / 女祭司法师牌 | `refs/mage-wars-step1/mage-warlock-card.png`、`mage-priestess-card.png` | 双方法师 HUD 旁真实法师牌 | `visible-subject` |
| 学徒法术牌 | `spell-1700-fireball.png`、`spell-1804-mage-bane.png`、`spell-1806-block.png`、`spell-1901-nullify.png`、`spell-3704-equipment.png` 等输入包裁图 | 已计划法术与底部候选卡 | `visible-subject` |
| 法术卡背 | `refs/mage-wars-step1/spell-card-back.jpg` | 对手已计划、隐性结界、法术书背面、弃牌堆入口 | `visible-subject / hidden-info` |
| 行动 / 快速施法 token | `action-marker-*.png`、`quickcast-marker-front.png` | 贴近法师牌和当前可用行动 | `visible-subject` |
| 守卫 / 伤害 / 聚魔 token | `guard-token.png`、`damage-token-front.png`、`channeling-token-front.png` | 宿主对象边缘或 HUD 短状态 | `visible-subject / runtime-feedback` |
| 攻击骰 | `attack-die-texture.png` | 目标附近骰盘，骰面可读 | `visible-subject` |
| 蓝色 12 面效果骰 | Workshop `Die_12` 来源锁定，无独立贴图 | 目标附近蓝色多面体程序化骰 | `approved-programmatic-runtime-ui / source-locked` |
| 生命 / 法力 / 聚魔 / 费用预扣 | 规则页 + 状态板 `reference-only` 轨道语义 | 贴法师牌的水平条、数值、费用短 chip | `approved-programmatic-runtime-ui` |
| 法师状态板 | `mage-status-board.png` | 只允许作规则 / setup / 详情来源，不得在主界面可见复现 | `reference-only` |

## Open Design artifact 产物合同

| 项 | 要求 |
| --- | --- |
| Open Design 项目 | `mage-wars-ui-design` |
| HTML artifact 建议路径 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v2-option-a-battlefield.html` |
| artifact 元数据 | `mediaGenerate=false`；不得需要 media provider 凭据 |
| PNG 导出目标 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-a-battlefield.png` |
| 审计目标 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-a-battlefield-audit.md` |
| 几何审计目标 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-a-battlefield-geometry.json` |
| 对照基线 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21.png`，只对照，不覆盖 |

artifact 必须是独立文件，不能把 A/B/C/D 塞进同一个 HTML，也不能在 v21 文件里直接改名覆盖。

## artifact DOM / 数据要求

- 根节点标记：`data-design-option="A-battlefield-first"`、`data-media-generate="false"`、`data-viewport="1920x1080"`。
- 六区域元素必须有 `data-zone-id="A1"` 到 `data-zone-id="B3"`。
- 每张场上卡必须有 `class="field-card"` 和明确 `data-zone-id`，并用 `alt` 或可读属性写中文对象名。
- 当前目标必须有 `data-current-target="true"`；骰盘必须有 `data-role="settlement-dice"`。
- 法术书候选必须写成 `data-role="spellbook-candidate"`；已计划法术写成 `data-role="prepared-spell"`。
- 对手已计划和隐性结界只能使用卡背，写 `data-hidden-info="back-only"`。
- 全文字符串门禁：不得出现 `手牌`、`hand`、`opponent-hand`、`deck-hand`。

## 给 Open Design 的 brief 文案

```text
Create one independent 1920x1080 PC Open Design HTML artifact for Mage Wars Apprentice Mode, Option A: battlefield-first.

This is not image generation. Do not use od media generate. Build an editable HTML/CSS/JS artifact with mediaGenerate=false, using project-relative images from refs/mage-wars-step1/.

Primary design goal:
The battlefield and the Apprentice 2x3 zone grid are the first visual subject. The user must immediately understand the six active zones A1/B1/A2/B2/A3/B3, which cards belong to which zone, and how Fireball resolves from source to target.

Use real Mage Wars assets as visual subjects:
- standard-arena.jpg as the central battlefield.
- mage-warlock-card.png and mage-priestess-card.png as mage cards.
- spell-1700-fireball.png and other apprentice spell crops for prepared spells and spellbook candidates.
- spell-card-back.jpg for opponent prepared spells and hidden enchantments.
- action / quickcast / guard / damage tokens from refs/mage-wars-step1/.
- attack-die-texture.png for attack dice; render the blue d12 effect die as source-locked approved-programmatic-runtime-ui.

Layout:
- Make the active 2x3 battlefield the dominant center composition.
- The unused half of the standard arena must visibly recede and must not hold gameplay cards.
- All field cards must stay inside exactly one zone. No card may ride grid lines or sit outside the active half.
- Current Fireball target is 西锁骑士 in B2. Place attack dice and the blue effect die near this target, not in the dock.
- Player HUDs are horizontal and attached to mage cards; use clear health/mana/channeling bars as approved-programmatic-runtime-ui.
- Bottom spellbook row stays available but is secondary: categories, 5-6 candidate spell cards, page controls, and two prepared spell slots.
- Prepared spells are the only current cast source; spellbook candidates must not look like direct hand cards.
- Right/bottom action dock only holds Confirm, Cancel, short invalid reason, and waiting state. It must not hold dice, target lists, combat results, logs, or rule explanations.

Text rules:
- Use Chinese gameplay terms only: 法术书, 法术候选, 已计划法术, 弃牌堆, 快速施法, 确认, 取消.
- Do not use 手牌, hand, opponent-hand, or any default card-hand language.
- Main UI text must be short labels, numbers, and button names only. No tutorial prose, no implementation notes, no E2E labels.

Visual language:
- Use Mage Wars stone arena, parchment card borders, token colors, and magical fire / arcane material cues.
- Avoid thick panels, nested frames, glass dashboard blocks, generic sci-fi UI, marketing hero composition, or right-side admin panels.
- Borders are allowed only for real card edges, six zone boundaries, current target highlight, and button hit areas.

Required visible state:
- Warlock vs Priestess saturated midgame.
- Warlock has Fireball selected from prepared spells.
- Legal targets in the 2x3 zone grid are clear; illegal objects remain visible but subdued.
- Opponent prepared spells and hidden enchantments show backs only.
- Fireball -> B2 target -> dice -> damage/status reads as one cause-and-effect chain.
```

## AI 图面核验表

| 检查项 | PASS 标准 | REVISE 条件 |
| --- | --- | --- |
| 独立稿 | A 是独立 HTML + 独立 PNG | A/B/C/D 同页、复用同母版、覆盖 v21 |
| artifact 路线 | `mediaGenerate=false`，没有 `od media generate` | 调用图片模型或把 media provider 当阻塞 |
| 战场第一视觉 | `2x3` 战场和场上对象是第一眼主体 | 第一眼是底部法术书、右侧 dock、框体或说明文字 |
| 六区域 | `A1/B1/A2/B2/A3/B3` 一眼可读，未使用半场退场 | 区域不清、六格像装饰、未使用半场像可操作 |
| 区域归属 | 每张场上卡中心在所属区域，包围盒大部分在格内 | 骑线、跨格、格外、token 漂离宿主 |
| 骰盘位置 | 骰子贴 B2 目标附近，能看出作用到西锁骑士 | 骰子进右侧 dock、底部法术书、日志或角落 |
| 法术书边界 | 底部候选 + 分类 + 分页保留，但权重低于战场 | 法术书退成角标，或变成主视觉工作台压战场 |
| 已计划来源 | 已计划 2 槽清楚是当前可施放来源 | 候选卡看起来可直接施放，或已计划槽不可读 |
| 隐藏信息 | 对手计划 / 隐性结界只显示卡背和数量 | 泄露对手正面、卡名或完整候选 |
| 素材主体 | 正式竞技场、法师牌、法术牌、卡背、token、攻击骰承担主体 | CSS 假卡、文字壳、普通圆点、普通 D6 或边框壳抢主体 |
| 自制运行态 UI | 生命 / 法力 / 聚魔 / 费用条清晰、贴对象、材质协调 | 普通蓝圆、随机胶囊、调试感图形 |
| 少边框 | 边框只服务区域、目标、高亮、按钮命中 | 框中框、厚面板、玻璃 dashboard、分舱围栏 |
| 文案 | 只出现对象名、短状态、数字、按钮 | 规则说明句、教程句、实现验收文案 |
| 字符串门禁 | `手牌/hand/opponent-hand = 0` | 任一命中 |
| v21 对照 | 继承 v21 通过点，同时明显改变主焦点和空间比例 | 看起来只是 v21 调色 / 放大 / 同构微调 |

## 几何审计最低输出

生成 PNG 后必须输出 `mage-wars-v2-option-a-battlefield-geometry.json`，至少包含：

- `viewport.width=1920`、`viewport.height=1080`。
- 六区域 pixel rect：`A1/B1/A2/B2/A3/B3`。
- 每张 `.field-card` 的 `alt`、`zoneId`、rect、center、`centerInsideOwn`、`ownRatio`、`maxOtherRatio`。
- 骰盘 rect、当前目标 rect、`diceCenterDistanceToTarget`。
- 法术书候选卡数量、已计划槽数量、候选卡是否被底部裁切。
- `bodyText` 字符串，用于检查禁止牌区词和说明正文。

建议硬阈值：

- `ownRatio >= 0.85`。
- `maxOtherRatio <= 0.12`。
- `diceCenterDistanceToTarget <= 170`。
- 候选卡、分页、分类按钮、确认 / 取消按钮均完整在 1920x1080 视口内。

## 后续步骤

1. 使用本 brief 创建独立 Open Design HTML artifact：`mage-wars-v2-option-a-battlefield.html`。
2. 从 artifact 导出独立 1920x1080 PNG：`mage-wars-v2-option-a-battlefield.png`。
3. 运行几何审计和 AI 图面核验，写入对应 audit / geometry 文件。
4. AI 图面核验 `PASS` 后，才允许把 PNG 打开给用户人工验收。
5. 用户明确人工批准前，继续冻结真实 Board/UI、实现 E2E 和移动端。
