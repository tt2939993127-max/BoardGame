# Mage Wars Step 1 PC Open Design v20 出图前硬回执

> 状态：`consumed-by-v20-ai-pass / media-generate-forbidden / preflight-only`。本文件记录 v20 出稿依据。v20 是 Open Design artifact 代码设计稿，不是图片模型生图；用户人工批准前仍禁止进入真实 Board/UI 实现、真实页面 E2E 或移动端适配。

## 本轮规则读取回执

| 来源 | 读取结论 | 画面决策 |
| --- | --- | --- |
| `page_004.md` | 学徒模式使用 `2x3` 格区域竞技场；只使用标准竞技场一半；学徒法师生命 24、起始法力 10、聚魔 10 | PC 稿必须先表现右半场六区域；左半场退场；玩家 HUD 使用 24 生命体系，不复现整张状态板 |
| `page_007.md` | 标准竞技场共 12 个区域；区域是移动与射程距离单位；水平 / 垂直共享边才相邻 | 区域边界是规则线，不是装饰；v20 必须让 `A1/B1/A2/B2/A3/B3` 先于卡牌成立 |
| `page_024.md` | 近战攻击目标必须与攻击方处于同一格区域；攻击目标必须合法 | 场上卡牌必须有唯一 `data-zone-id`，中心点不能落在区域边界、缝隙或未使用半场 |
| `page_027.md` | 攻击骰 / 效果骰决定伤害和状态；状态标记放在目标对象上 | 攻击骰、效果骰、伤害和守卫 token 必须贴近目标 / 宿主，不能进右侧栏或漂在格线 |

## 规则到画面映射

| 规则结论 | 画面主体 | 设计决策 / 禁止项 |
| --- | --- | --- |
| 学徒模式 `2x3` 半场 | 竞技场右半场六区 | 六格先成立，用地砖缝、亮度分区和坐标锚点表达；不得只靠几何隐藏线 |
| 卡牌必须唯一归属区域 | 西锁骑士、烈焰魔物、火印魔婴、缠绕藤蔓 | 每张卡声明唯一 `data-zone-id`；几何审计要求中心入格、所属面积 ≥85%、跨区 ≤12% |
| 未使用半场应忽略 | 左半标准竞技场 | 左半场退场且不摆规则对象；允许保留实体桌面氛围，但不能像可用摆放区 |
| 当前掷骰是攻击结算主体 | 火球术目标、攻击骰、效果骰 | 骰盘锚在 B2 目标旁；右侧只保留确认 / 取消和费用，不承载当前骰子主结果 |
| 法术书 / 已计划法术 / 弃牌堆各有不同权重 | 玩家边缘牌区 | 法术书和已计划法术靠玩家边缘；弃牌堆是公开归档入口，不进入中央 |

## 素材进入 artifact 链

| 主体 | 正式资源 / 来源 | artifact 呈现 | 裁定 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` | `<img class="arena-img">` 主棋盘 | `visible-subject` |
| 法师牌 | `refs/mage-wars-step1/mage-warlock-card.png`、`mage-priestess-card.png` | 双方法师卡 | `visible-subject` |
| 学徒法术牌 / 生物 / 魔物 | `refs/mage-wars-step1/spell-*.png` | 场上卡、已计划法术、装备 | `visible-subject` |
| 通用法术卡背 | `refs/mage-wars-step1/spell-card-back.jpg` | 法术书、对手已计划法术、隐性结界、弃牌堆 | `visible-subject / hidden-info` |
| 行动 / 快速施法 token | `refs/mage-wars-step1/action-marker-*.png`、`quickcast-marker-front.png` | 双方法师 HUD 旁 | `visible-subject` |
| 守卫 / 伤害 token | `refs/mage-wars-step1/guard-token.png`、`damage-token-front.png` | B2 目标卡旁 | `visible-subject` |
| 攻击骰 | `refs/mage-wars-step1/attack-die-face-*.png` | B2 目标右侧骰盘 | `visible-subject` |
| 效果骰 / 生命 / 法力 / 聚魔 / 费用 | 规则页与 Workshop 来源锁定 | 12 面蓝色程序化骰、条形 HUD、费用石 | `approved-programmatic-runtime-ui` |

## 核心交互落位回执

| 核心对象 | 玩家当前问题 | 空间锚点 | 让位对象 |
| --- | --- | --- | --- |
| 当前目标 | 火球术要打谁？ | 西锁骑士卡本体与 B2 区域 | 右侧牌区、说明文本 |
| 攻击骰 / 效果骰 | 掷出了什么、结果作用到谁？ | B2 目标右侧的竞技场上层 | 右侧栏、日志、弃牌堆 |
| 确认 / 取消 | 是否提交这次施法？ | 右下行动槽，贴近费用和当前动作标题 | 日志、帮助 |
| 弃牌堆 | 已消耗卡可否检视？ | 所属玩家边缘入口 | 中央主舞台 |

## 框体职责回执

| 非素材边界 | 职责 | 裁定 |
| --- | --- | --- |
| 右半场六格线 | 规则区域边界，服务移动 / 射程 / 目标归属 | 保留，属于规则线 |
| B2 目标轻高亮 | 当前目标与掷骰结果归属 | 保留，轻量 |
| 按钮底板 | 确认 / 取消命中区 | 保留 |
| 法术书 / 弃牌堆短标签底 | 边缘入口可读性 | 保留，低权重 |

## 人工验收状态

- 出稿前默认：`human-review-not-allowed`。
- v20 截图和几何审计完成后，经 `step1-runtime-board-opendesign-artifact-v20-audit.md` 判定为 `AI_PASS`，当前可进入人工验收。
- 人工验收通过前：`implementation-blocked`、`mobile-blocked-by-desktop`。
