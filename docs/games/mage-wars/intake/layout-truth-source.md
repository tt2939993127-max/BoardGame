# 法师战争布局真相源合同

> 状态：`in_progress`。Workshop/TTS 只作为结构、位置、对象关系来源；最终 UI 风格仍需后续 Design I/O 和 `design-system/games/mage-wars.md` 裁定。

## 可用布局来源

| 来源 | 证据 | 用途 |
| --- | --- | --- |
| 规则书竞技场说明 | 规则 p4、p7 | 标准竞技场 12 区域；学徒 2x3；对角起始 |
| 规则书组件/设置图 | 规则 p6-p7 | 法师状态板、行动/快速施法/就绪/守卫/伤害/法力标记位置语义 |
| Workshop JSON | `Mods/Workshop/2607721556.json` | 对象坐标、玩家区、牌槽、标记袋和卡牌关系 |
| Workshop `HandTrigger` | 顶层 4 个 TTS 手牌触发区 | 只作玩家座位方向参考，不等于 Mage Wars 规则 UI 牌区 |
| Workshop `标准竞技场` | 顶层包，包含 `Custom_Board` | 标准竞技场图与缩放候选 |

## 当前布局对象

| 对象 | Workshop 证据 | 现实含义 | 当前处理 |
| --- | --- | --- | --- |
| 标准竞技场 | `Bag` 昵称 `标准竞技场`，Contained `Custom_Board` | 首轮主棋盘候选 | 图片已正式落盘；12 区域坐标见 `docs/games/mage-wars/design/implementable/board-coordinate-contract.md`；学徒半场方向仍待裁定 |
| 玩家法师牌 | 顶层两张 `英雄卡`，坐标在对角玩家区 | 法师当前场上实体 | 需和起始区域绑定 |
| 装备栏 | 顶层和四人包内多张 `CardCustom` 昵称 `装备栏` | 法师装备槽 | 需判断装备类型槽位和可重叠/替换规则 |
| 结界栏 | `结界栏`、`友方结界`、`敌方结界` | 附属隐性/显性结界 | 必须支持私密可见性和堆叠顺序 |
| 弃牌堆 | 两个 `弃牌堆` | 玩家弃牌区 | 需绑定卡牌拥有者规则 |
| 标记袋 | 攻击骰、效果骰、行动、守卫、就绪、伤害、聚魔、状态 | 公共组件供应区 | 运行时通常派生为资源池/状态菜单 |
| TTS 手牌触发区 | 4 个 `HandTrigger` | TTS 工具层玩家牌区 | 仅可作为桌面方向参考；最终 UI 必须使用法术书、已计划法术和弃牌堆 |

## 空间合同草案

| 空间对象 | 合同字段 | 当前状态 |
| --- | --- | --- |
| 竞技场区域 | `zoneId`、行列、相邻、起始角、是否属于学徒半场 | 12 区域坐标已建；学徒半场方向和逻辑 ID 映射仍待裁定 |
| 墙体边界 | `wallEdgeId`、连接的两个区域、视线阻挡、通行规则、通行伤害 | missing |
| 生物/法师位置 | `entityId`、所在区域、控制者、行动标记、守卫状态 | source-mapped-contract-pending |
| 装备槽 | `slotId`、装备类型限制、控制者、附属法师 | source-mapped-contract-pending |
| 结界槽 | `attachmentId`、附属对象、控制者、拥有者、面朝下/已展示、堆叠顺序 | source-mapped-contract-pending |
| 法术计划区 | `plannedSpellId`、来源法术书、施法者、是否隐藏、未施放返回时机 | source-mapped-contract-pending |

## UI 风格边界

- TTS 桌面提供的是结构参考：对象在哪、相对层级、槽位族、组件袋和玩家方向。
- 最终前端 UI 不应直接复刻 TTS 的桌面壳层或散乱布局。
- 进入 Board/UI 前必须先完成阶段 0 素材矩阵、OpenSpec approval、Design I/O 和 `design-system/games/mage-wars.md`。

## 下一步

1. 裁定学徒 `2x3` 使用标准竞技场左半场还是右半场，并把 `a1/a2/a3/b1/b2/b3` 映射到源图区域。
2. 抽取装备栏、结界栏、弃牌堆和法术书 / 已计划法术入口坐标到布局表；`HandTrigger` 只能用于座位方向参考。
3. 根据规则对象决定哪些槽位进入正式 UI，哪些只是 TTS 参考。
4. 接入 Board 运行时命中区、atlas loader 和状态板 / 状态方块组件。
