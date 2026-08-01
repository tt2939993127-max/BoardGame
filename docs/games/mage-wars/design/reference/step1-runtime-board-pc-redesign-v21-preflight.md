# Mage Wars Step 1 PC Open Design v21 出图前硬回执

> 状态：`consumed-by-v21-ai-pass / media-generate-forbidden / preflight-only`。本文件记录 v21 出稿依据。v21 是 Open Design artifact 代码设计稿，不是图片模型生图；用户人工批准前仍禁止进入真实 Board/UI 实现、真实页面 E2E 或移动端适配。

## 本轮规则读取回执

| 来源 | 读取结论 | 画面决策 |
| --- | --- | --- |
| `page_004.md` | 学徒模式使用 `2x3` 格区域竞技场；学徒法师生命 24、起始法力 10、聚魔 10 | 继续保留 v20 的右半场六区域与 24 生命体系；玩家状态用水平条表达，不复现整张状态板 |
| `page_007.md` | 标准竞技场共 12 个区域；行动标记和快速施法标记放在法师牌上 | 行动 / 快速施法标记继续贴近法师牌；竞技场区域继续作为第一视觉规则 |
| `page_009.md` | 计划阶段每名法师从法术书选择最多 2 个法术，且对手不能得知计划 | 底部展示“法术书浏览器 + 已计划 2 槽”；对手侧只显示卡背 / 数量 |
| `page_010.md` | 未施放法术在下个计划阶段开始时返回法术书；快速施法只能施放本回合准备的快速法术 | 当前可施放来源保持“已计划法术”，法术书浏览器只服务检索 / 准备 |
| `page_014.md` | 法术存放在法术书中直到准备；法术书帮助检索法术且不让对手察觉计划 | 法术书不能退成小牌堆角标；需要候选卡行、分类切换和分页 |
| `page_015.md` | 法师只能施放计划阶段准备的法术；弃牌堆可检视，已消耗法术通常不能再次使用 | 弃牌堆仍是所属玩家边缘公开归档入口，不进入中央主链 |
| `page_024.md` / `page_027.md` | 攻击目标、投骰、伤害和状态都绑定目标对象 | v21 继承 v20 的 B2 目标附近骰盘与 token 贴附 |

## 规则到画面映射

| 规则结论 | 画面主体 | 设计决策 / 禁止项 |
| --- | --- | --- |
| 法术书是大型私有检索对象，不是普通手牌区 | 己方底部法术书浏览器 | 一排候选卡 + 分类按钮 + `1/4` 分页 + 上一页 / 下一页；正式命名只用“法术书 / 法术候选 / 已计划法术” |
| 本回合只能施放已准备法术 | `已计划 2/2` 两张卡 | 已计划槽保持独立且可读；火球术从已计划槽进入当前施法链 |
| 对手不能知道计划 | 对手法术书与已计划法术 | 对手侧只显示卡背和数量，不展开候选、不显示卡名 |
| 生命 / 法力 / 聚魔是持续读数 | 双方法师状态 HUD | 使用水平生命条、法力条、聚魔短读数，贴近法师牌；HUD 不旋转 |
| 当前攻击骰是主结算反馈 | B2 目标与骰盘 | 继承 v20：骰盘在目标旁，右侧行动区不承载当前掷骰主结果 |

## 素材进入 artifact 链

| 主体 | 正式资源 / 来源 | artifact 呈现 | 裁定 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` | `<img class="arena-img">` 主棋盘 | `visible-subject` |
| 法师牌 | `refs/mage-wars-step1/mage-warlock-card.png`、`mage-priestess-card.png` | 双方法师卡 | `visible-subject` |
| 法术书候选卡 | `refs/mage-wars-step1/spell-1700-fireball.png`、`spell-1804-mage-bane.png`、`spell-1806-block.png`、`spell-1901-nullify.png`、`spell-3704-equipment.png` | 底部候选浏览行 | `visible-subject` |
| 已计划法术 | `spell-1804-mage-bane.png`、`spell-1700-fireball.png` | 底部已计划 2 槽 | `visible-subject / current-cast` |
| 通用法术卡背 | `refs/mage-wars-step1/spell-card-back.jpg` | 法术书、对手已计划法术、隐性结界、弃牌堆 | `visible-subject / hidden-info` |
| 行动 / 快速施法 token | `refs/mage-wars-step1/action-marker-*.png`、`quickcast-marker-front.png` | 双方法师 HUD 旁 | `visible-subject` |
| 攻击骰 / 效果骰 | 攻击骰正式裁图；效果骰规则来源锁定程序化对象 | B2 目标右侧骰盘 | `visible-subject / approved-programmatic-runtime-ui` |
| 生命 / 法力 / 聚魔 / 费用 | 规则页与状态板 reference-only 来源 | 水平状态条、费用石 | `approved-programmatic-runtime-ui` |

## 核心交互落位回执

| 核心对象 | 玩家当前问题 | 空间锚点 | 让位对象 |
| --- | --- | --- | --- |
| 法术书浏览器 | 我从哪里找本回合要准备 / 理解来源的法术？ | 己方底部边缘，候选卡行 + 分类 + 分页 | 旧小牌堆角标、说明文本 |
| 已计划法术 | 我现在能施放哪张？ | 法术书浏览器右侧的 `已计划 2/2` | 非当前候选卡 |
| 玩家状态 HUD | 我的生命 / 法力 / 聚魔是多少？ | 法师牌侧边水平条 | 斜放面板、状态板原图 |
| 当前目标与骰盘 | 火球术打谁，掷骰结果作用到谁？ | B2 目标旁竞技场上层 | 右侧栏、日志、牌区旁 |

## 框体职责回执

| 非素材边界 | 职责 | 裁定 |
| --- | --- | --- |
| 底部法术书浏览器暗底 | 保护候选卡、分类按钮、分页按钮和已计划槽的同一浏览区 | 保留，低对比、贴边 |
| 分类按钮底板 | 可点击分类入口，必须有命中区 | 保留 |
| 分页按钮底板 | 可点击翻页入口，必须有命中区 | 保留 |
| 右半场六格线 | 规则区域边界 | 保留 |
| B2 目标轻高亮 | 当前目标与掷骰结果归属 | 保留 |
| 确认 / 取消按钮底板 | 当前施法提交入口 | 保留 |

## 人工验收状态

- 出稿前默认：`human-review-not-allowed`。
- v21 截图和几何审计完成后，经 `step1-runtime-board-opendesign-artifact-v21-audit.md` 判定为 `AI_PASS`，当前可进入人工验收。
- 人工验收通过前：`implementation-blocked`、`mobile-blocked-by-desktop`。
