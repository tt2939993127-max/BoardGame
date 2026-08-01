# 法师战争学徒法术牌图集合同

> 状态：`atlas-source-locked / selected-frame-locked / runtime-atlas-wired`。本文件锁定四名学徒法师当前法术书所需的 Workshop deck 图集、本地源文件、网格规则、`CardID` frame 和同名候选裁定。逐卡 S0 字段已见 `apprentice-card-field-contract.md`；正式 atlas 已复制到 `public/assets/i18n/zh-CN/mage-wars/cards/spells/`，并通过 `public/assets/atlas-configs/mage-wars/apprentice-spell-atlases.json`、`CardPreview` 和真实 Board E2E 消费。

## 2026-07-29 完成快照

| 项 | 当前结论 |
| --- | --- |
| 学徒范围 | 覆盖四名学徒法师需要的 `91` 张卡牌 frame；不覆盖全 322 张法术或自由构筑。 |
| 字段合同 | `apprentice-card-field-contract.md` 已锁定 91 张 S0 字段。 |
| 正式资源 | deck `17/18/19/22/28/29/34/35/36/37` 已进入正式学徒 atlas，atlas config 覆盖 91 个 frame。 |
| 运行时接线 | `src/games/mage-wars/ui/cardAtlas.ts` 注册法师和学徒法术 atlas；真实入口 E2E 已证明 Board 消费正式素材。 |
| 临时裁图 | `temp/mage-wars/apprentice-card-crops/` 仍只作核对证据，禁止当正式运行时素材。 |

## 范围

- 覆盖对象：`docs/games/mage-wars/rule/apprentice-spellbooks.md` 中四名学徒法师已录入的预设法术书。
- 覆盖 deck：`17`、`18`、`19`、`22`、`28`、`29`、`34`、`35`、`36`、`37`。
- 不覆盖对象：全 322 张法术、自由构筑、扩展牌、墙体横向牌、法师牌正反面、token、骰子和完整状态图集。

## 真相源表

| 来源类型 | 路径 | 读取时间 | 覆盖对象 | 当前用途 |
| --- | --- | --- | --- | --- |
| 规则主真相源 | `D:\gongzuo\webgame\gameasset\法师战争\output\pdf\ai_readable_pdf_exports\101721 法师战争 Mage Wars 规则\pages\page_005.md` | 2026-07-26 | 四名学徒法师预设法术书组成 | 决定本阶段需要哪些卡名和数量 |
| 法术书合同 | `docs/games/mage-wars/rule/apprentice-spellbooks.md` | 2026-07-26 | 规则牌名、Workshop 名称、`CardID` 候选 | 本文件的逐卡候选输入 |
| Workshop 对照源 | `D:\gongzuo\webgame\gameasset\法师战争\Mods\Workshop\2607721556.json` | 2026-07-26 | `CustomDeck` 的 `FaceURL`、`BackURL`、`NumWidth`、`NumHeight` | 锁定 deck 图集和网格 |
| 本地图片源 | `D:\gongzuo\webgame\gameasset\法师战争\Mods\Images` | 2026-07-26 | Workshop URL 对应的本地图片文件 | 后续正式命名、压缩和 atlas config 输入 |

## Deck 图集合同

所有本阶段法术 deck 均为竖向卡牌图集，`NumWidth=7`、`NumHeight=4`、`UniqueBack=false`、`SidewaysCard=false`，并共享同一张通用法术卡背。

| deck | 正面本地文件 | 尺寸 | 字节 | sha256 前 16 位 | 网格 | 背面 |
| --- | --- | ---: | ---: | --- | --- | --- |
| `17` | `httpcloud3steamusercontentcomugc16274785127624945072A3AEEC75AF7CFAF96F3720246AF576D6F9F20FD.png` | `4096x3298` | `37289080` | `0f2260b5e3e16016` | `7x4` | 通用法术卡背 |
| `18` | `httpcloud3steamusercontentcomugc16274785127625096013D4B67220CABBCF19A2697831236FBBAC10D667E.png` | `4096x3294` | `40761569` | `017c65360ef6f323` | `7x4` | 通用法术卡背 |
| `19` | `httpcloud3steamusercontentcomugc16274785127625173185EF406F58460164DDCF5D7B3F19D62610E8FC556.png` | `4096x3292` | `41205970` | `d6a3d9220d6e11c8` | `7x4` | 通用法术卡背 |
| `22` | `httpcloud3steamusercontentcomugc1627478512762543851DE9696214538A130D117ED46C16FC344993AD565.png` | `4096x3294` | `40139859` | `d3ff013c82ba3318` | `7x4` | 通用法术卡背 |
| `28` | `httpcloud3steamusercontentcomugc16274785127625789538AEEB93524A6EB29235AFEE73BE3CE4911D66694.png` | `4096x3292` | `40497360` | `409fa2a08333fe9a` | `7x4` | 通用法术卡背 |
| `29` | `httpcloud3steamusercontentcomugc162747851276258405427CB2C144AB360EB9C5CAFA20ED603BF116E65E9.png` | `4096x3294` | `40427409` | `70ae37ac5a0e1951` | `7x4` | 通用法术卡背 |
| `34` | `httpcloud3steamusercontentcomugc1627478512762615476EDE19B9361D30836BF2D909F914CE94DD9D555BE.png` | `4096x3288` | `40389306` | `6852bc07bd2cdd3a` | `7x4` | 通用法术卡背 |
| `35` | `httpcloud3steamusercontentcomugc1627478512762619156A4599019407F6838CFA49EBB0B6B45EBEB934C30.png` | `4096x3294` | `40588760` | `17039e81fb484437` | `7x4` | 通用法术卡背 |
| `36` | `httpcloud3steamusercontentcomugc16274785127626227623BE742E3BFB1D49644D5F8184CF8819C4831A007.png` | `4096x3276` | `10496419` | `6d4faf252a53802b` | `7x4` | 通用法术卡背 |
| `37` | `httpcloud3steamusercontentcomugc162747851276262593341CBEE1784AACF3CC52CDDA246FB4BC76704D7A9.png` | `4096x3292` | `39861566` | `da584dd0b194a459` | `7x4` | 通用法术卡背 |

通用法术卡背：`httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg`，尺寸 `992x1391`，字节 `2048510`，sha256 前 16 位 `3d51171b2794f48c`。

## Frame 候选规则

当前只允许把 `CardID` 用作 frame 候选入口，不允许直接标成正式运行时 frame locked：

| 字段 | 候选计算 |
| --- | --- |
| deck | `Math.floor(CardID / 100)` |
| slot | `CardID % 100` |
| 列 | `(slot % 7) + 1`，从左到右，1-based |
| 行 | `Math.floor(slot / 7) + 1`，从上到下，1-based |
| 归一化裁切 | `left=(col-1)/7`、`top=(row-1)/4`、`width=1/7`、`height=1/4` |
| 锁定条件 | 必须从对应 deck 正面源图裁出完整单卡，核对牌名、费用、派系、等级、类型、目标和效果文本后，才能把该 frame 升级为 `locked` |

## 本阶段用到的 CardID 候选

| deck | 学徒法术书用到的 `CardID` 候选 | 当前状态 |
| --- | --- | --- |
| `17` | `1700`、`1701`、`1702`、`1703`、`1704`、`1705`、`1706`、`1709`、`1710`、`1711` | `frame-candidate-by-cardid` |
| `18` | `1800`、`1801`、`1804`、`1806`、`1808`、`1809`、`1813`、`1815`、`1816`、`1818`、`1820`、`1825`、`1826` | `frame-candidate-by-cardid` |
| `19` | `1901`、`1903`、`1904`、`1908`、`1910`、`1911`、`1912`、`1913`、`1914`、`1916`、`1917` | `frame-candidate-by-cardid` |
| `22` | `2224` | `frame-candidate-by-cardid` |
| `28` | `2800`、`2801`、`2802`、`2803`、`2804`、`2807`、`2808`、`2809`、`2810`、`2811`、`2812`、`2813`、`2814`、`2816`、`2819`、`2820`、`2822`、`2824`、`2825`、`2826` | `frame-candidate-by-cardid` |
| `29` | `2901`、`2906`、`2907`、`2909` | `frame-candidate-by-cardid` |
| `34` | `3400`、`3401`、`3402`、`3403`、`3404`、`3405`、`3406`、`3407`、`3408`、`3409`、`3410`、`3411`、`3417`、`3419`、`3425` | `frame-candidate-by-cardid` |
| `35` | `3523` | `frame-candidate-by-cardid` |
| `36` | `3605`、`3606` | `frame-candidate-by-cardid` |
| `37` | `3700`、`3701`、`3702`、`3703`、`3704`、`3705`、`3706`、`3708`、`3709`、`3710`、`3711`、`3715`、`3716`、`3721` | `frame-candidate-by-cardid` |

## 多候选裁定清单

这些对象在法术书组成上已经 locked，但素材 frame 还不能裁成唯一值。后续必须裁出完整单卡并逐项对照卡名与正文，不能靠相同中文名或 `CardID` 数字直接选一个。

| 规则牌名 | 候选 `CardID` | 候选 deck/frame | 涉及法师 | 当前裁定 |
| --- | --- | --- | --- | --- |
| 驱散 | `3419` / `3606` | deck `34` slot `19` / deck `36` slot `6` | 兽王、女祭司、邪术师、巫师 | `selected-by-apprentice-instance`: 四名学徒相关实例均选 `3606`；`3419` 保留为同名重印 / 对照候选 |
| 瓦解 | `3406` / `3605` | deck `34` slot `6` / deck `36` slot `5` | 兽王、女祭司、巫师 | `selected-by-apprentice-instance`: 四名学徒相关实例均选 `3605`；`3406` 保留为同名重印 / 对照候选 |
| 神力加护 | `1813` / `1911` | deck `18` slot `13` / deck `19` slot `11` | 女祭司 | `selected-by-apprentice-instance`: 女祭司实例选 `1813`；`1911` 为重复图面 / 对照候选 |
| 原力推斥 | `3425` / `3523` | deck `34` slot `25` / deck `35` slot `23` | 女祭司、邪术师 | `selected-by-apprentice-instance`: 女祭司实例选 `3523`，邪术师实例选 `3425` |

## 多候选图面核对结果

| 规则牌名 | CardID | 图面结论 | 费用 | 类型 / 学派 | 等级 | 目标栏 | 正文原文 | 底部编号 | 状态 |
| --- | ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 驱散 | `3419` | 同名旧版 / 对照候选 | `X` | 咒语 / 超魔 | 1 | 显性结界 | 摧毁目标。X等于目标结界的法力总费用（施法费用加展示费用）。 | `MWPR01` | locked-as-alternate |
| 驱散 | `3606` | 新手法术书实例使用版本 | `X` | 咒语 / 超魔 | 1 | 显性结界 | 摧毁显性结界目标。X等于目标结界的法力总费用（施法费用加展示费用）。 | `FWI11` | locked-selected |
| 瓦解 | `3406` | 同名旧版 / 对照候选 | `X` | 咒语 / 酸性 | 1 | 法师 | 当你施放瓦解时，选择一个附属在目标法师上的装备对象。X等于装备的施法费用。摧毁被选择的装备。 | `MW1107` | locked-as-alternate |
| 瓦解 | `3605` | 新手法术书实例使用版本 | `X` | 咒语 / 酸性 | 1 | 法师 | 当你施放瓦解时，选择一个附属在目标法师上的装备对象。摧毁被选择的装备。X等于装备的施法费用。 | `FWI16` | locked-selected |
| 神力加护 | `1813` | 新手法术书女祭司实例使用版本 | `2 + 2` | 结界 / 加护、庇护 | 1 | 活体生物 | 法师绑定 +2。本生物获得庇护1特性。 | `MW1E12` | locked-selected |
| 神力加护 | `1911` | 图面与 `1813` 相同 / 对照候选 | `2 + 2` | 结界 / 加护、庇护 | 1 | 活体生物 | 法师绑定 +2。本生物获得庇护1特性。 | `MW1E12` | locked-as-alternate |
| 原力推斥 | `3425` | 新手法术书邪术师实例使用版本 | `3` | 咒语 / 原力 | 1 | 生物 | 目标生物按你选择的方向被推斥1格区域。本次推斥不能将其穿越具有通行伤害特性的墙体，除非你在施放本法术时额外支付3点法力。 | `MW1112` | locked-selected-for-warlock |
| 原力推斥 | `3523` | 新手法术书女祭司实例使用版本 | `3` | 咒语 / 原力 | 1 | 生物 | 目标生物按你选择的方向推斥1格区域。本次推斥不能将其穿越具有通行伤害特性的墙体，除非你在施放本法术时额外支付3点法力。 | `FWI17` | locked-selected-for-priestess |

## 临时完整单卡裁图批次

| 项目 | 结果 |
| --- | --- |
| 裁图目录 | `temp/mage-wars/apprentice-card-crops/` |
| 索引文件 | `temp/mage-wars/apprentice-card-crops/index.md` |
| 裁图数量 | `91` 张学徒法术牌候选 |
| 裁图用途 | 只用于录入核对；禁止移动到 `public/assets/**` 或作为正式运行时素材 |
| 尺寸核验 | 已抽样并批量检查，`badCount=0`；样例尺寸约 `585x823~825` |
| 图面抽样 | `cardid-1700.png` 已核到完整 `火球术` 卡面，可见名称、费用、目标、攻击条和正文 |
| 当前限制 | 91 张临时完整单卡均已有 S0 字段合同；正式 atlas/frame 资源落盘仍需最终抽样复核、正式命名、atlas config、压缩/manifest 和运行时接入 |

## 字段录入批次

| 批次 | 范围 | 合同文件 | 当前结论 |
| --- | --- | --- | --- |
| `deck17-1700-1706` | `火球术`、`火焰风暴`、`烈焰爆弹`、`连锁闪电`、`雷导术`、`闪电箭矢`、`圣光之柱` | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 7 张攻击法术核心规则字段 locked；风味引文不作为基础版执行字段 |
| `deck17-1709-1711` | `眩目闪光`、`间歇喷泉`、`气流` | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 3 张攻击法术核心规则字段 locked；风味引文不作为基础版执行字段 |
| `deck18` | 13 张学徒结界法术 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 13 张结界字段 locked；同名 `神力加护` 已区分新手实例与对照候选 |
| `deck19` | 11 张学徒结界法术 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 11 张结界字段 locked；同名 `神力加护` 对照候选保留 |
| `deck22` | `缠绕藤蔓` | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 1 张魔物字段 locked |
| `deck28` | 20 张学徒生物 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 20 张生物字段 locked；本轮新增 |
| `deck29` | 4 张学徒生物 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 4 张生物字段 locked |
| `deck34` | 15 张学徒咒语 / 同名对照候选 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 15 张咒语字段 locked；`3406` / `3419` 保留为同名旧版对照候选；本轮新增 |
| `deck35-36` | `3523`、`3605`、`3606` | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 3 张新手实例咒语字段 locked；本轮新增 |
| `deck37` | 14 张学徒装备 | `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 14 张装备字段 locked；本轮新增 |

## 正式资源命名计划

| 源 deck | 拟正式 atlas 名 | 拟正式落点 | 阻塞点 |
| --- | --- | --- | --- |
| `17` | `spell-attack-core-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-attack-core-atlas.png` | done-runtime-wired |
| `18` | `spell-enchantment-core-a-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-enchantment-core-a-atlas.png` | done-runtime-wired |
| `19` | `spell-enchantment-core-b-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-enchantment-core-b-atlas.png` | done-runtime-wired |
| `22` | `spell-conjuration-core-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-conjuration-core-atlas.png` | done-runtime-wired |
| `28` | `spell-creature-core-a-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-creature-core-a-atlas.png` | done-runtime-wired |
| `29` | `spell-creature-core-b-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-creature-core-b-atlas.png` | done-runtime-wired |
| `34` | `spell-incantation-core-a-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-incantation-core-a-atlas.png` | done-runtime-wired |
| `35` | `spell-incantation-core-b-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-incantation-core-b-atlas.png` | done-runtime-wired |
| `36` | `spell-incantation-core-c-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-incantation-core-c-atlas.png` | done-runtime-wired |
| `37` | `spell-equipment-core-atlas.png` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/spell-equipment-core-atlas.png` | done-runtime-wired |

## 下一步准入

1. 当前 91 张临时完整单卡主核对图和 S0 字段合同已完成；后续只有发现字段缺失、来源冲突或对象归属不清时，才回到临时裁图 / 核读图补证。
2. 正式 atlas/frame 已落盘、压缩、生成 atlas config 并接入运行时；后续不得再使用 `temp/` 单卡裁图替代正式 atlas。
3. 全 322 张法术、自由构筑和完整卡表仍属于后续 change；本文件只证明学徒范围 runtime atlas 已闭合。
