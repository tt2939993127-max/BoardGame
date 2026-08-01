# Mage Wars v2 多设计稿独立差异矩阵

> 状态：`option-c-ai-pass / v21-baseline-retained / media-generate-forbidden / implementation-blocked-until-user-approval`。
> 本文件汇总 v21 基线与 A/B/C/D 四条独立设计轴。当前 C 方案已生成独立 Open Design artifact、独立 PNG 和独立审计；它仍不代表用户人工批准，也不允许进入真实 Board/UI 实现。

## 当前锁定

| 项 | 结论 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 主对局 UI 多设计稿重做 |
| 基线 | v21 只作为多设计稿前对照基线，保留不覆盖 |
| 设计路线 | Open Design artifact 代码设计稿；禁止 `od media generate` 和图片模型生图 |
| 交付边界 | 每个候选必须是独立 HTML artifact 与独立 PNG；不得做同页总览冒充多稿 |
| 实现边界 | 用户批准某一稿前，不改真实 Board/UI，不跑真实页面 E2E，不做移动端 |

## 已有输入文件

| 编号 | 文件 | 状态 |
| --- | --- | --- |
| v21 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21.png` | 已作为基线打开给用户确认保留 |
| A | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-a-battlefield-brief.md` | brief ready |
| B | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-b-spellbook-brief.md` | brief ready |
| C | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting-brief.md` | brief consumed by independent artifact |
| D | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-d-control-brief.md` | brief ready |

## 已生成独立产物

| 方案 | Open Design artifact | PNG | AI 审计 | 几何审计 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| C | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v2-option-c-casting.html` | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting.png` | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting-audit.md` | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting-geometry.json` | `AI_PASS / human-review-allowed / implementation-blocked` |

## 独立差异矩阵

| 方案 | 主焦点 | 主要点击路径 | 空间比例 | 视觉语法 | 素材主体 | 隐藏信息边界 | 主要风险 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| v21 基线 | 竞技场 + 底部法术书浏览器的平衡稿 | 已计划法术 -> 棋盘目标 -> 右侧确认 | 中央战场较大，底部浏览器中等权重 | 暗底棋盘 + 横向 HUD + 底部浏览条 | 竞技场、法师牌、法术牌、卡背、token、骰子 | 对手计划和隐性结界只显示卡背 | 只是基线，不是已批准稿；后续不得同母版微调 |
| A 战场棋盘优先 | `2x3` 学徒战场和区域归属 | 棋盘对象本体 -> 目标附近骰盘 -> 右下确认 | 战场占画面第一主体，法术书降为薄工作带 | 石质竞技场、区域光照、轻量高亮，少面板 | 标准竞技场与场上卡牌优先，骰子贴目标 | 对手计划 / 隐性结界只卡背；己方法术书二级可见 | 容易把法术书压太低，导致已计划来源不清 |
| B 法术书工作台优先 | 私有法术书检索、分类、分页和已计划 2 槽 | 分类 / 分页 -> 候选卡 -> 已计划槽 -> 棋盘目标 | 底部 300-340px 工作台增强，上方战场仍保持清楚 | 桌游施法准备桌、羊皮纸 / 卡牌台面，少边框 | 学徒法术牌、卡背、分类控件、已计划卡是主体 | 己方候选正面可见；对手只见卡背、数量、归属 | 容易把候选误读成可直接施放，或压缩棋盘过度 |
| C 施法结算舞台优先 | 当前火球术施法链、骰盘和结果 | 已计划火球术 -> B2 西锁骑士 -> 攻击骰 / 效果骰 -> 确认 | 主舞台 overlay 强化，法术书压缩为二级支撑 | 来源到目标的魔法路径、目标贴附结果、阻塞结算层 | 当前法术牌、目标卡、攻击骰、效果骰、伤害 / 燃烧 token | 反制 / 等待只显示短状态和卡背，不泄露隐藏卡名 | 容易遮断区域归属，或把结算层做成说明流程图 |
| D 可访问专家操控优先 | 对象直选 + 稳定动作 dock + 底部 rail | 棋盘对象本体选择 -> 右侧确认 / 取消 / 费用 -> 目标附近结果 | 主战场、右侧 dock、底部 rail 三槽稳定分工 | 高可读控件、短错误、稳定命中区，禁止后台表单感 | 竞技场和对象仍是主体，dock 只承接确认 / 取消 / 短状态 | 对手计划、隐性结界均卡背；dock 不暴露隐藏信息 | 容易让右侧 dock 抢主舞台，或退化为按钮墙 |

## 共同硬门禁

- 禁止在可见 UI、class、aria、审计文本或设计说明中引入规则不存在的“手牌”牌区概念；规则牌区只使用法术书、已计划法术、弃牌堆、隐性结界。
- 攻击骰、12 面效果骰、伤害和燃烧是当前结算主体，必须在目标 / 来源附近主舞台上层，不能放进右侧栏、日志栏、底部工作台或边缘 HUD。
- 真实素材必须进入 artifact 渲染来源：标准竞技场、法师牌、学徒法术牌、卡背、token、攻击骰都不能退化成文字壳或普通 CSS 圆点。
- 生命、法力、聚魔、费用等动态读数允许使用自制运行态 UI，但必须贴主体、清晰可读、材质协调，不能是普通蓝圆或调试感胶囊。
- 常驻主 UI 只允许对象名、数值、短状态和按钮标签；规则解释、教程句、验收文案和内部黑话不能放进主界面。
- 每个候选必须独立 artifact、独立 PNG、独立 AI 审计和几何审计；总览页只能作为索引，不能作为设计稿。

## 建议产物命名

| 方案 | Open Design artifact | PNG | AI 审计 | 几何审计 |
| --- | --- | --- | --- | --- |
| A | `mage-wars-v2-option-a-battlefield.html` | `mage-wars-v2-option-a-battlefield.png` | `mage-wars-v2-option-a-battlefield-audit.md` | `mage-wars-v2-option-a-battlefield-geometry.json` |
| B | `mage-wars-v2-option-b-spellbook.html` | `mage-wars-v2-option-b-spellbook.png` | `mage-wars-v2-option-b-spellbook-audit.md` | `mage-wars-v2-option-b-spellbook-geometry.json` |
| C | `mage-wars-v2-option-c-casting.html` | `mage-wars-v2-option-c-casting.png` | `mage-wars-v2-option-c-casting-audit.md` | `mage-wars-v2-option-c-casting-geometry.json` |
| D | `mage-wars-v2-option-d-control.html` | `mage-wars-v2-option-d-control.png` | `mage-wars-v2-option-d-control-audit.md` | `mage-wars-v2-option-d-control-geometry.json` |

PNG、AI 审计和几何审计统一落点：

`docs/games/mage-wars/design/generated/skill-drafts-v2/`

Open Design artifact 统一落点：

`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\`

## 下一步

1. 若继续补齐多稿，对 A/B/D 分别生成独立 Open Design artifact 和独立 PNG；不得把四套放在同一个 HTML 或同一张总览图里。
2. 对 A/B/D 每张 PNG 做 AI 图面核验和几何审计；失败稿保持 `REVISE`，不得打开给用户人工验收。
3. 当前 C 方案已 AI PASS，可作为 PC Open Design 人工验收候选。
4. 用户明确批准某一稿前，继续冻结真实 Board/UI 实现、移动端和真实页面 E2E。
