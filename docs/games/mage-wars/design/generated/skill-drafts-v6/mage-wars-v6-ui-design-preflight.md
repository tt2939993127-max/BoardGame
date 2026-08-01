# 法师战争 v6 Open Design 多设计稿出图前回执

> 状态：`preflight-ready / open-design-artifact-only / media-generate-forbidden / implementation-blocked-until-user-approval`。本轮只生产 PC 端 Open Design artifact 代码设计稿和导出 PNG，禁止调用 `od media generate`，禁止进入真实 Board/UI 实现、真实游戏页 E2E 或移动端适配。

## 用户需求简述

- 交付物是多套独立 PC 端 Open Design 设计稿候选，不是同一页面上的多个缩略图，也不是旧稿改色 / 微调。
- 每套候选必须基于 Mage Wars 规则和已落盘素材，不能复制召唤师战争的牌区概念、皮肤或布局。
- 设计稿必须是饱和交互状态：玩家能看出当前是谁行动、用哪张已计划法术、目标是谁、骰子 / 伤害 / 燃烧如何结算，以及确认 / 取消在哪里。
- 用户人工批准前，设计稿只能送审；不得启动真实运行页、写 Board/UI、做移动端、或用运行截图冒充设计通过。

## 本轮实际读取的规则来源

| 来源 | 本轮结论 | 画面决策 |
| --- | --- | --- |
| `docs/games/mage-wars/design/implementable/board-ui-preflight-matrix.md` | 主 UI 必须以标准竞技场、学徒 2x3 半场、法师卡、法术书 / 已计划法术 / 弃牌堆、隐藏卡背、攻击骰、效果骰和 token 为主体 | 三张稿都使用正式竞技场和正式卡图 / token；弃牌堆只做边缘归档入口；结算主体不进侧栏 |
| `docs/games/mage-wars/rule/apprentice-spellbooks.md` | 学徒法师为 24 生命、10 初始法力、10 聚魔；预设法术书、已计划法术和卡牌索引已锁定 | 法师读数使用贴近法师牌的自制生命 / 法力条；法术书显示为规则对象，不命名为手牌 |
| `docs/games/mage-wars/design/implementable/apprentice-zone-layout-contract.md` | 学徒模式是 `2列 x 3行` 六区域；场上对象必须有唯一所属区域，token 贴附宿主 | 所有场上卡牌带 `data-zone-id`，中心点落在所属区域内；目标、骰子、确认条贴近目标区 |
| `docs/games/mage-wars/design/implementable/board-coordinate-contract.md` | 标准竞技场源图为 `4x3`，设计稿应展示半场；状态板只作 reference-only，效果骰是来源锁定的蓝色 12 面骰 | 不把状态板复现为常驻玩家面板；用蓝色 d12 程序化对象表达效果骰，不画普通 D6 |

## 可见主体素材账本

| 主体 | 输入包文件 | 角色 | 当前画面职责 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` | `visible-subject` | 主棋盘与 2x3 区域承载 |
| 邪术师 / 女祭司 | `mage-warlock-card.png`、`mage-priestess-card.png` | `visible-subject` | 来源法师、对手法师和贴身资源读数锚点 |
| 法术牌正面 | `spell-1700-fireball.png`、`spell-1804-mage-bane.png`、`spell-1901-nullify.png`、`spell-2801-firebrand-imp.png`、`spell-2803-flaming-hellion.png`、`spell-2816-royal-archer.png`、`spell-2907-gray-angel.png`、`spell-2909-knight-of-westlock.png`、`spell-3408-heal.png`、`spell-3701-lash-of-hellfire.png`、`spell-3708-wind-wyvern-hide.png`、`spell-3715-deflection-bracers.png` | `visible-subject` | 当前施法、场上生物 / 装备、法术书候选、弃牌堆顶部 |
| 法术卡背 | `spell-card-back.jpg` | `visible-subject / hidden-info-boundary` | 对手已计划法术、隐性结界、法术书牌堆，不泄露正面 |
| 攻击骰 | `attack-die-face-*.png` | `visible-subject` | 当前火球术攻击结算，贴近西锁骑士目标 |
| 效果骰 | 来源锁定程序化蓝色 d12 | `approved-programmatic-runtime-ui` | 燃烧 / 效果结果，贴近攻击骰和目标 |
| 行动 / 快速施法 / 伤害 / 守卫 | `action-marker-*.png`、`quickcast-marker-front.png`、`damage-token-front.png`、`guard-token.png` | `visible-subject` | 就绪状态、快速施法、目标伤害和守卫状态 |
| 生命 / 法力 / 聚魔读数 | 规则 + 状态板 reference-only | `approved-programmatic-runtime-ui` | 贴近法师卡显示，不复现整张状态板 |

## 牌区白名单与禁止项

| 规则名 | UI 名称 | 可见性 | 流转关系 | 默认位置 |
| --- | --- | --- | --- | --- |
| 法术书 | 法术书 | 当前玩家可浏览；对手只显示卡背 / 数量 | 计划法术来源 | 己方边缘或底部浏览器 |
| 已计划法术 | 已计划法术 | 当前玩家正面；对手背面 | 本轮可施放来源 | 当前施法链或法术书旁 |
| 弃牌堆 | 弃牌堆 | 公开检视 | 已消耗归档 | 所属玩家边缘小入口 |
| 隐性结界 | 隐性结界 | 控制者隐藏；对手只见卡背 | 附着到实体 / 区域 | 宿主附近小卡背 |
| 公开场上法术 / 装备 / 生物 | 卡牌本体 | 公开 | 场上对象 / 附件 / 目标 | 所属区域或法师附件区 |

禁止：`手牌` / `hand` / 对手正面计划法术 / 文字壳代替卡图 / 卡牌骑线 / 骰子跑到右侧日志或仪表盘 / 大块边框分舱。

## 三套独立设计轴

| 候选 | 主焦点 | 点击路径 | 空间比例 | 视觉语法 |
| --- | --- | --- | --- | --- |
| `v6-arena-tactical-table` | 学徒 2x3 区域和目标选择 | 当前施法卡 -> 目标区 -> 目标旁确认 | 棋盘最大，牌区收边 | 桌面实物 + 贴对象轻量 HUD |
| `v6-spellbook-bottom-browser` | 法术书浏览与已计划施法 | 底部法术书分类 / 分页 -> 已计划火球术 -> 目标确认 | 底部法术书为命令台，棋盘上半场保留 | 低矮纸带 + 正式卡图浏览 |
| `v6-open-casting-lane` | 来源到目标的开放施法链 | 来源法师 -> 火球术 -> 骰子 / 伤害 -> 目标旁确认 | 施法链居中穿过竞技场，HUD 最轻 | 无大面板，光路 / 实物叠层为主 |

## 人工验收状态

- 当前状态：`human-review-not-allowed`。
- 只有三张 PNG 生成后通过 AI 图面核验，才允许打开给用户人工验收。
- 本轮若任一稿仍像旧稿换皮、规则对象不清、素材主体不足、边框过重或三稿同构，则整体保持 `REVISE`。
