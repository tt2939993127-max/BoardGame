# Smash Up Munchkin 汉化图集 intake 合同

- 生成时间：2026-08-01T01:18:01.935Z
- 主真相源：D:/gongzuo/webgame/gameasset/Smash Up! by Mervil (2833984701)-汉化图/新6扩小白
- 本轮目标：先生成正式运行时图集，再进入数据录入；玩法机制只登记讨论入口，不在本步猜实现。
- 图集口径：派系手牌按实体张数打包；数据录入阶段按唯一牌面登记 `count`，`previewRef.index` 指向该牌第一张实体图。
- 非标准尺寸处理：少量牌面不是 864x1232 或 1232x864，已用等比例 contain 填充到统一格，不拉伸、不裁掉文字。

## 图集清单

| atlasId 候选 | 对象 | 类型 | 正式源图路径 | 网格 | 单格 | 图集尺寸 | 帧数 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| munchkin_dwarves_cards | 矮人 / Dwarves 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_dwarves.png | 4x5 | 864x1232 | 4320x4928 | 20 | 760d39317aa4a1c9 |
| munchkin_dwarves_bases | 矮人 / Dwarves 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_dwarves_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | f30fe6d4cfa4554e |
| munchkin_halflings_cards | 半身人 / Halflings 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_halflings.png | 4x5 | 864x1232 | 4320x4928 | 20 | 29b454de7b6983a7 |
| munchkin_halflings_bases | 半身人 / Halflings 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_halflings_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | fad74583953e9975 |
| munchkin_thieves_cards | 盗贼 / Thieves 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_thieves.png | 4x5 | 864x1232 | 4320x4928 | 20 | e835952adb7cf4e8 |
| munchkin_thieves_bases | 盗贼 / Thieves 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_thieves_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | 30f3c5aa91fbd833 |
| munchkin_mages_cards | 法师 / Mages 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_mages.png | 4x5 | 864x1232 | 4320x4928 | 20 | cb4ce9155b7474f8 |
| munchkin_mages_bases | 法师 / Mages 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_mages_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | 4cbd9a4f6520b60f |
| munchkin_elves_cards | 木精灵 / Elves 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_elves.png | 4x5 | 864x1232 | 4320x4928 | 20 | c6c5c8586e706066 |
| munchkin_elves_bases | 木精灵 / Elves 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_elves_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | 4a3e234221781672 |
| munchkin_clerics_cards | 牧师 / Clerics 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_clerics.png | 4x5 | 864x1232 | 4320x4928 | 20 | ee0430559780355f |
| munchkin_clerics_bases | 牧师 / Clerics 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_clerics_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | e5403c478dde2c63 |
| munchkin_orcs_cards | 兽人 / Orcs 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_orcs.png | 4x5 | 864x1232 | 4320x4928 | 20 | a7bd268aaf9fc72d |
| munchkin_orcs_bases | 兽人 / Orcs 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_orcs_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | 9d1289015de03d50 |
| munchkin_warriors_cards | 勇士 / Warriors 手牌 | faction-cards | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_warriors.png | 4x5 | 864x1232 | 4320x4928 | 20 | 6a78000f4229f634 |
| munchkin_warriors_bases | 勇士 / Warriors 基地 | faction-bases | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\munchkin_warriors_bases.png | 1x2 | 1232x864 | 2464x864 | 2 | a9ebde6cbb2249c4 |
| munchkin_treasures_cards | 宝藏牌 / Treasures | treasures | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_treasures.png | 5x5 | 864x1232 | 4320x6160 | 22 | 9681fcc11c4feae2 |
| munchkin_monsters_cards | 怪物牌 / Monsters | monsters | D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\munchkin_monsters.png | 4x5 | 1232x864 | 6160x3456 | 20 | 30ab937b521e2270 |

## 矮人 / Dwarves 手牌（munchkin_dwarves_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 矮人王 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\1矮人王.jpg | 5cc5e7dce325053e |
| 宝藏爱好者 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\2宝藏爱好者.jpg | 86a29e504063959f |
| 黄金挖掘者 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\3黄金挖掘者.jpg | de0537b14fb31783 |
| 宝石抓取者 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\4宝石抓取者.jpg | 71e91f33c47f0513 |
| 为了钱什么都可以 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\5为了钱什么都可以.jpg | e13fef22a58b591f |
| 套现 | 1 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\6套现.jpg | f3d8521dc2ded1d6 |
| 狡猾计划 | 1 | 12 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\7狡猾计划.jpg | e745b02fe718ae39 |
| 贪婪是好的 | 2 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\8贪婪是好的.jpg | 623d669a969631dd |
| 隐藏资产 | 2 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\9隐藏资产.png | b81c4efd05702a97 |
| 我的！ | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\10我的！.jpg | e778abe16bde6cc5 |
| 不！我的宝贝！ | 1 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\11不！我的宝贝！.jpg | 2d7f99fd2459db1d |
| 打捞 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\12打捞.jpg | 0de17f5d6fe306f1 |

## 矮人 / Dwarves 基地（munchkin_dwarves_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 矿洞 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\13矿洞.jpg | 8e383ef97a6a7614 |
| 宝藏池 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\矮人\14宝藏池.jpg | 33db1f3c223e04d4 |

## 半身人 / Halflings 手牌（munchkin_halflings_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 夏尔首领 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\1夏尔首领.jpg | b14d771ea2969f23 |
| 调皮鬼 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\2调皮鬼.jpg | c8370cea247f7060 |
| 吟游诗人 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\3吟游诗人.jpg | e0f09979496ece28 |
| 半身人 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\4半身人.jpg | fe47e4aa06472cf1 |
| 最后通牒 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\5最后通牒.jpg | f90e8ca482b8ac16 |
| 午餐散步 | 2 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\6午餐散步.jpg | 4829a11da6c2713e |
| 偷袭 | 1 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\7偷袭.jpg | 7251b6621bee9436 |
| 惊醒 | 1 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\8惊醒.jpg | 945b4d6a1c2229de |
| 小而坚韧 | 1 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\9小而坚韧.jpg | 2856885445b2d25b |
| 偷偷摸摸 | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\10偷偷摸摸.jpg | 1dac1d3d2dc69630 |
| 被宠坏的小家伙 | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\11被宠坏的小家伙.jpg | 9fd0f8226da378e7 |
| 意外的派对 | 2 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\12意外的派对.png | 6419bb35cbd3c589 |

## 半身人 / Halflings 基地（munchkin_halflings_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 生日派对 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\13生日派对.jpg | 65267919908c615e |
| 地下矮屋 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\半身人\14地下矮屋 (2).png | ed495f9dcb6838fe |

## 盗贼 / Thieves 手牌（munchkin_thieves_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 盗贼大师 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\1盗贼大师.jpg | d84db04bfba980ed |
| 销赃犯 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\2销赃犯.jpg | a721a550808c2163 |
| 猫咪窃贼 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\3猫咪窃贼.jpg | 0970ae68db454164 |
| 扒手 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\4扒手.jpg | 6a77dcec41225e9e |
| 背刺 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\5背刺.jpg | 7d27512b17ea03e1 |
| 转移注意力 | 1 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\6转移注意力.jpg | 2c0b28a0194c0fc7 |
| 打劫 | 1 | 12 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\7打劫.jpg | 51e83d4d02cdca83 |
| 药水腰带 | 2 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\8药水腰带.jpg | 415aaf9789c5e82c |
| 秘密藏匿处 | 1 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\9秘密藏匿处.jpg | 5640c0c5b075c8e6 |
| 走私 | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\10走私.jpg | 6e5d16b1992bcb79 |
| 剥光 | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\11剥光.jpg | 2bf170f5e74a4227 |
| 顺手拿走 | 2 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\12顺手拿走.jpg | f897e418c0225140 |

## 盗贼 / Thieves 基地（munchkin_thieves_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 金库 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\13金库.jpg | 27233223c51678e1 |
| 盗贼公会 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\盗贼\14盗贼公会.jpg | 9c4c89bee9a6aaf4 |

## 法师 / Mages 手牌（munchkin_mages_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 爆破大师 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\1爆破大师.jpg | e3a3f2bb289f6a46 |
| 快乐小法师 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\2快乐小法师.jpg | 3283068dec8d1d5c |
| 魔杖天才 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\3魔杖天才.jpg | a589b475df8f531b |
| 勤读者 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\4勤读者.jpg | 05ea0c44826e52ea |
| 魅力 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\5魅力.jpg | 60a510a9617a585d |
| 大上一倍 | 1 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\6大上一倍.jpg | f7b89245a0324371 |
| 大召唤 | 1 | 12 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\7大召唤.png | 2aef692c4bd58ffa |
| 通往次元之门 | 1 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\8通往次元之门.jpg | a163608f3ec6be15 |
| 恢复奥术智慧 | 2 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\9恢复奥术智慧.jpg | ac4f1c355f265107 |
| 神奇的夜晚 | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\10神奇的夜晚.jpg | 79ad314840ea5e0e |
| 快速阅读 | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\11快速阅读.jpg | fe7b268a59829a0d |
| 快速攻击！ | 2 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\12快速攻击！.jpg | 4f9600b92a136374 |

## 法师 / Mages 基地（munchkin_mages_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 次元之门 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\13次元之门.jpg | 9d8933422398c513 |
| 法师之塔 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\法师\14法师之塔.jpg | 882f458c38d4de4b |

## 木精灵 / Elves 手牌（munchkin_elves_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 精灵斗士 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\1精灵斗士.jpg | d3706adb975314a7 |
| 优雅贵族 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\2优雅贵族.jpg | 2e977600995463be |
| 花之子 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\3花之子.jpg | ec7e89eed7f8d0b9 |
| 精灵帮助大师 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\4精灵帮助大师.jpg | f0fe324579b5a5be |
| 在你之后 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\5在你之后.png | 389a23cd46ed407c |
| 舞动之根 | 1 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\6舞动之根.jpg | e3c57143a7afcad2 |
| 援手 | 1 | 12 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\7援手.jpg | 5675a0d3a451c34f |
| 力量训练 | 2 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\8力量训练.jpg | 25f33d854663d1b6 |
| 逃跑吧！ | 1 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\9逃跑吧！.jpg | 4810a0906c97c51b |
| 赶紧逃跑吧！ | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\10赶紧逃跑吧！.jpg | 3ce6149b65fedcb4 |
| 贸易 | 2 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\11贸易.jpg | f4eeb4fc75bb1bf1 |
| 旅行精灵 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\12旅行精灵.jpg | 07a6733ec3d3c393 |

## 木精灵 / Elves 基地（munchkin_elves_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 援助山谷 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\13援助山谷.jpg | 124d10fc6ac2d661 |
| 树屋 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\木精灵\14树屋.jpg | 482c8fa98c95e862 |

## 牧师 / Clerics 手牌（munchkin_clerics_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 红衣主教 | 1 | 0 | 896x1200 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\1红衣主教.png | 4b285e0aa86705c3 |
| 资深修士 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\2资深修士.jpg | fa52f3367c213817 |
| 特纳 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\3特纳.jpg | c5d8a18d6dc7cf53 |
| 圣临者 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\4圣临者.jpg | 75deea0540b78b30 |
| 垃圾处理 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\5垃圾处理.jpg | 4bf42da743f751a5 |
| 光盘 | 2 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\6光盘.jpg | 8db62d129b1c919d |
| 监禁诅咒 | 1 | 13 | 896x1200 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\7监禁诅咒.png | d708357c1ee3040d |
| 无用诅咒 | 1 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\8无用诅咒.jpg | 024ce8e8a6e952b9 |
| 好习惯 | 1 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\9好习惯.jpg | 9c727daff4196367 |
| 加入团队 | 2 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\10加入团队.jpg | a9600ad2d4a72ee0 |
| 解除诅咒 | 1 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\11解除诅咒.jpg | 94f262f855065a09 |
| 回忆祷词 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\12回忆祷词.jpg | 104f334c8d6467d5 |

## 牧师 / Clerics 基地（munchkin_clerics_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 圣洁酒店 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\13圣洁酒店.png | c7afc0dcb4f84787 |
| 抓鬼 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\牧师\14抓鬼.jpg | 27ad07ae4c31ce16 |

## 兽人 / Orcs 手牌（munchkin_orcs_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 剑王 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\1剑王.jpg | 8628414d49efb95a |
| 粉碎者 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\2粉碎者.jpg | b8d3af78f1389b7c |
| 重击者 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\3重击者.jpg | 94629a9d50bf957f |
| 呆瓜兽人 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\4呆瓜兽人.jpg | 8e763cfeb5127408 |
| 躺下！ | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\5躺下！.jpg | fb4ba443fd5069de |
| 愤怒的掠夺者 | 2 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\6愤怒的掠夺者.jpg | 857c0419019c25c5 |
| 挤碎 | 1 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\7挤碎.jpg | 84629d98534e2321 |
| 死亡之息 | 1 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\8死亡之息.jpg | bf7936105046c99e |
| 狗堆 | 2 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\9狗堆.jpg | cf2d49f96d386640 |
| 给我！ | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\10给我！.jpg | 43ba3cd2932a0fe9 |
| 洗手间 | 1 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\11洗手间.jpg | a63dce96a676b460 |
| 太难了 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\12太难了.jpg | 7bc88fe1a666dfcc |

## 兽人 / Orcs 基地（munchkin_orcs_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 要塞 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\13要塞.jpg | 7aa4eb62d5914a0a |
| 坑洞 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\兽人\14坑洞.jpg | 9eaf979687992361 |

## 勇士 / Warriors 手牌（munchkin_warriors_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 大英雄 | 1 | 0 | 896x1200 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\1大英雄.png | 46d800423247dc4e |
| 明星勇士 | 2 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\2明星勇士.jpg | 3481576d4c3cc024 |
| 狂战士 | 3 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\3狂战士.jpg | 22bbede697c1ffcd |
| 嘲讽者 | 4 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\4嘲讽者.jpg | f51ac506310443e0 |
| 领导运动 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\5领导运动.jpg | 7e98a6b15767adfd |
| 斩杀 | 2 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\6斩杀.jpg | 3e338bc78c3db9f3 |
| 哑铃 | 1 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\7哑铃.jpg | 1fab61a286bc9f6e |
| 地牢诱饵 | 2 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\8地牢诱饵.jpg | c4e00069887f4503 |
| 永恒的英雄 | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\9永恒的英雄.jpg | 3c68e8a595583184 |
| 骚乱 | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\10骚乱.jpg | 0be426161c940324 |
| 无处不在之盾 | 1 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\11无处不在之盾.jpg | 300fc3fca719c8af |
| 战争怒吼 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\12战争怒吼.jpg | 853bae198cbede4f |

## 勇士 / Warriors 基地（munchkin_warriors_bases）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 堡垒 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\13堡垒.jpg | 67513dfa944afed3 |
| 锦标赛 | 1 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\勇士\14锦标赛.jpg | 5b0b04a612972ba9 |

## 宝藏牌 / Treasures（munchkin_treasures_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 矮人雇佣兵 | 1 | 0 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\1矮人雇佣兵.jpg | 31e52c8c43db33ff |
| 半身人雇佣兵 | 1 | 1 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\2半身人雇佣兵.jpg | 788e55509c6c2c60 |
| 虎骑士 | 1 | 2 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\3虎骑士.jpg | e063f2070b1b62ff |
| 一袋铁蒺藜 | 1 | 3 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\4一袋铁蒺藜.png | 48f7c34ff166a084 |
| 尖刺靴 | 1 | 4 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\5尖刺靴.jpg | 5be9fd14079f874b |
| 火箭靴 | 1 | 5 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\6火箭靴.jpg | e1aeb087f06bf411 |
| 摆动的盾牌 | 1 | 6 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\7摆动的盾牌.jpg | 0f7d127b372b3cc2 |
| 血腥肢解电锯 | 1 | 7 | 848x1264 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\8血腥肢解电锯.jpg | e7435a8da30c239b |
| 大量宝藏 | 1 | 8 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\9大量宝藏.jpg | 1f2505f82a70fbfa |
| 十字弓 | 1 | 9 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\10十字弓.jpg | 68bc403af98e4ade |
| 地牢规则书 | 1 | 10 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\11地牢规则书.jpg | b45c07df3804efa3 |
| 时间错乱的喷气背包 | 1 | 11 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\12时间错乱的喷气背包.jpg | ca8cd67dde222f54 |
| 诱惑护膝 | 1 | 12 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\13诱惑护膝.jpg | 7fb3a58d5d5f48e6 |
| 魔法导弹 | 1 | 13 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\14魔法导弹.jpg | a0277773e226e1f2 |
| 怯懦药水 | 1 | 14 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\15怯懦药水.jpg | 4c5a0f687dfa730c |
| 口臭药水 | 1 | 15 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\16口臭药水.jpg | 365a482ddcbe14a4 |
| 愚蠢勇气药水 | 1 | 16 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\17愚蠢勇气药水.png | 73a7ebb979e7c6fe |
| 直线跑路药水 | 1 | 17 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\18直线跑路药水.jpg | 1bbd736042483eba |
| 麻痹药水 | 1 | 18 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\19麻痹药水.jpg | ede945de106fca44 |
| 复制药水 | 1 | 19 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\20复制药水.jpg | ffba801dc534bd3b |
| 探宝棒 | 1 | 20 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\21探宝棒.jpg | f58e76fd41189e07 |
| 许愿指环 | 1 | 21 | 864x1232 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\宝藏牌\22许愿指环.jpg | 0fa9f3b81c84f3af |

## 怪物牌 / Monsters（munchkin_monsters_cards）

| 图面名称 | 实体张数 | previewRef 第一索引 | 源图尺寸 | 主真相源文件 | sha256 前缀 |
| --- | --- | --- | --- | --- | --- |
| 宝藏龙 | 1 | 0 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\1宝藏龙.jpg | 2d4e99dadbedc24d |
| 大脚怪 | 2 | 1 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\2大脚怪.jpg | f6f681351e50141c |
| 天马 | 3 | 3 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\3天马.jpg | 26e33d6f97724bf5 |
| 长毛巨魔 | 4 | 6 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\4长毛巨魔.jpg | 0aa48045e93d5c52 |
| 活死人骑士 | 1 | 10 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\5活死人骑士.jpg | abfcced4b1bfbe82 |
| 图坦卡蒙 | 2 | 11 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\6图坦卡蒙.jpg | 71e6a435ffd17c8f |
| 食尸鬼 | 3 | 13 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\7食尸鬼.jpg | 2bb248c72646813a |
| 鸟之冤魂 | 4 | 16 | 1232x864 | D:\gongzuo\webgame\gameasset\Smash Up! by Mervil (2833984701)-汉化图\新6扩小白\怪物牌\8鸟之冤魂.jpg | 24bcbe4d7eb6efcf |

## 静态接入收口状态（2026-08-01）

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 8 个 Munchkin 派系 atlas 注册 | passed | `src/games/smashup/domain/ids.ts`、`src/games/smashup/domain/atlasCatalog.ts` 已注册 8 组手牌、8 组基地、宝藏牌、怪物牌图集 |
| 静态牌库数据 | passed | `src/games/smashup/data/factions/munchkin.ts` 已录入 96 张普通派系牌和 16 个基地；`src/games/smashup/data/cards.ts` 已注册普通派系牌和基地 |
| 派系选择页入口 | passed | `src/games/smashup/ui/factionMeta.ts` 已加入矮人、半身人、盗贼、法师、木精灵、牧师、兽人、勇士，状态均为 `in_progress` |
| 宝藏牌 / 怪物牌 | scoped-debt | 仅作为特殊图集注册并发布资源；未加入普通派系卡池，未建立宝藏/怪物玩法规则与 handler |
| 本地运行时资源 | passed | `public/assets/i18n/zh-CN/smashup/cards/compressed/munchkin_*.webp` 与 `public/assets/i18n/zh-CN/smashup/base/compressed/munchkin_*_bases.webp` 均存在 |
| manifest 校验 | passed | `node scripts/assets/generate_asset_manifests.js --root public/assets/i18n/zh-CN --id smashup --validate`；`node scripts/assets/generate_asset_manifests.js --id i18n --validate` |
| 服务器资源发布 | passed | `node scripts/assets/upload-to-server.js --asset-prefix ...` 发布 18 个 Munchkin WebP，`serverPrimaryRelease=20260801022037072` |
| 远端代表 URL 回查 | passed | 矮人手牌、矮人基地、宝藏牌、怪物牌公开 URL 均 `HEAD 200`，`X-Asset-Source: server` |
| 静态合同单测 | passed | `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/munchkinIntake.test.ts --configLoader native`，20 tests passed |
| 关联回归 | passed | `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/cardI18nIntegrity.test.ts src/games/smashup/__tests__/criticalImageResolver.test.ts --configLoader native`，44 tests passed |
| ESLint 定向检查 | passed | `npx eslint src/games/smashup/data/factions/munchkin.ts src/games/smashup/domain/ids.ts src/games/smashup/domain/atlasCatalog.ts src/games/smashup/data/cards.ts src/games/smashup/ui/factionMeta.ts src/games/smashup/__tests__/munchkinIntake.test.ts` |
| TypeScript 类型检查 | passed | `npm run typecheck` |

## 机制讨论入口

本轮只完成图集和静态 intake。Munchkin 扩展的完整玩法实现仍需单独裁定下列新机制，不能用当前静态接入结论代替：

| 机制对象 | 当前状态 | 需要讨论 / 裁定的问题 |
| --- | --- | --- |
| 宝藏牌 | scoped-debt | 宝藏牌是否作为独立牌堆、如何获得、是否进入玩家手牌、与普通行动/随从的牌型和使用时机如何区分 |
| 怪物牌 | scoped-debt | 怪物如何进入基地、是否由系统控制、力量如何参与破基地、击败或得分时如何发放宝藏 / VP / 其它奖励 |
| Munchkin 派系牌文案 | blocked-for-implementation | 当前 locale 对行动牌保留“当前仅完成静态接入”提示；后续实现前需逐卡拆子句，尤其是宝藏、怪物、诅咒、额外打出、弃牌堆回收、得分前后触发 |
| 现有 Smash Up 引擎扩展点 | pending | 需要先对照旧派系的抽牌、额外打出、基地得分、特殊能力和响应窗口，再决定是复用 handler、扩展共享机制，还是新增 Munchkin 专用系统 |

## 2026-08-06 当前实现回写：对象级 L0-L4 对账

> 本节是对上面 2026-08-01 历史状态的当前回写，不删除历史结论。`PASS` 只表示该层已有直接证据；`scoped-debt` 表示当前范围仍缺对象级证据，不能被代表性截图替代。

### 分层定义

| 层级 | 本项目当前含义 |
| --- | --- |
| L0 | 数据对象存在、中文/英文名称和牌面规则字段已录入，并与牌库数量一致 |
| L1 | 对象绑定正确图集索引，运行时资源与远端 manifest 可加载 |
| L2 | 领域规则、选择约束、空选/否定分支和状态清理有自动化验证 |
| L3 | 当前真实牌桌入口由玩家手动点击完成，并有状态断言和截图产物 |
| L4 | 对当前真实入口截图逐张做玩家视角图面审计，确认无遮挡、重复源卡、错误锚点和移动端布局问题 |

### 8 个普通派系

| 派系 | 对象范围 | L0 | L1 | L2 | L3 | L4 | 当前裁决 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 矮人 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 领域规则与 12 张牌/2 个基地真实入口已纳入当前回归；L4 仍缺逐对象图面审计 |
| 半身人 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 领域规则与真实入口已纳入当前回归；L4 仍缺逐对象图面审计 |
| 盗贼 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 领域规则与真实入口已纳入当前回归；L4 仍缺逐对象图面审计 |
| 法师 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 领域 12/12、真实入口已通过；L4 仍缺逐对象图面审计 |
| 木精灵 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 领域 13/13、真实入口已通过；L4 仍缺逐对象图面审计 |
| 牧师 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 真实入口已覆盖手牌、天赋、响应和基地链；L4 仍缺逐对象图面审计 |
| 兽人 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 真实入口已覆盖保护、响应、计分清理和多步选择；L4 仍缺逐对象图面审计 |
| 勇士 | 12 张牌、2 个基地 | PASS | PASS | PASS | PASS | scoped-debt | 真实入口已覆盖怪物选择、模式选择、计分和附着卡本体；L4 仍缺逐对象图面审计 |

### 22 张宝藏

| 宝藏对象 | L0 | L1 | L2 | L3 | L4 |
| --- | --- | --- | --- | --- | --- |
| 矮人雇佣兵 | PASS | PASS | PASS | PASS | scoped-debt |
| 半身人雇佣兵 | PASS | PASS | PASS | PASS | scoped-debt |
| 虎骑士 | PASS | PASS | PASS | PASS | scoped-debt |
| 一袋铁蒺藜 | PASS | PASS | PASS | PASS | scoped-debt |
| 尖刺靴 | PASS | PASS | PASS | PASS | scoped-debt |
| 火箭靴 | PASS | PASS | PASS | PASS | scoped-debt |
| 摆动的盾牌 | PASS | PASS | PASS | PASS | scoped-debt |
| 血腥肢解电锯 | PASS | PASS | PASS | PASS | scoped-debt |
| 大量宝藏 | PASS | PASS | PASS | PASS | scoped-debt |
| 十字弓 | PASS | PASS | PASS | PASS | scoped-debt |
| 地牢规则书 | PASS | PASS | PASS | PASS | scoped-debt |
| 时间错乱的喷气背包 | PASS | PASS | PASS | PASS | scoped-debt |
| 诱惑护膝 | PASS | PASS | PASS | PASS | scoped-debt |
| 魔法导弹 | PASS | PASS | PASS | PASS | scoped-debt |
| 怯懦药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 口臭药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 愚蠢勇气药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 直线跑路药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 麻痹药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 复制药水 | PASS | PASS | PASS | PASS | scoped-debt |
| 探宝棒 | PASS | PASS | PASS | PASS | scoped-debt |
| 许愿指环 | PASS | PASS | PASS | PASS | scoped-debt |

> 宝藏 L2/L3 的直接证据为 `munchkinMechanics.test.ts`、`munchkinIntake.test.ts` 和当前工作区 `e2e/smashup/smashup-munchkin-monster-treasure-ui.e2e.ts` 的 132/132 全量真实入口回归；L4 不把“截图已生成”越权解释成“22 张逐对象图面已审计”。

### 8 张唯一怪物

| 怪物对象 | 实体张数 | L0 | L1 | L2 | L3 | L4 | 当前裁决 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 宝藏龙 | 1 | PASS | PASS | PASS | PASS | scoped-debt | 通用基地、击败和宝藏奖励链已有真实入口；缺逐对象 L4 |
| 大脚怪 | 2 | PASS | PASS | PASS | PASS | scoped-debt | 多条真实入口使用；缺逐对象 L4 |
| 天马 | 3 | PASS | PASS | PASS | PASS | scoped-debt | 勇士战争怒吼等真实入口使用；缺逐对象 L4 |
| 长毛巨魔 | 4 | PASS | PASS | PASS | PASS | scoped-debt | 金库计分压力态使用；缺逐对象 L4 |
| 活死人骑士 | 1 | PASS | PASS | PASS | PASS | PASS | 当前真实怪物行逐张手动击败入口已通过；三张 1440x900 当前截图逐张审计通过 |
| 图坦卡蒙 | 2 | PASS | PASS | PASS | PASS | PASS | 当前真实怪物行逐张手动击败入口已通过；三张 1440x900 当前截图逐张审计通过 |
| 食尸鬼 | 3 | PASS | PASS | PASS | PASS | scoped-debt | 牧师抓鬼、法师和勇士真实入口使用；缺逐对象 L4 |
| 鸟之冤魂 | 4 | PASS | PASS | PASS | PASS | scoped-debt | 牧师/宝藏奖励相关真实入口使用；缺逐对象 L4 |

### 当前证据与残余范围

| 项目 | 当前证据 | 裁决 |
| --- | --- | --- |
| 普通派系数据范围 | `munchkin.ts`：8 个派系、96 张唯一牌、16 个基地；`munchkinIntake.test.ts` 当前 23/23 | PASS |
| 宝藏对象范围 | 22 张唯一牌，全部已有静态定义、规则入口和当前 E2E 引用 | PASS；L4 逐对象图面仍为 scoped-debt |
| 怪物对象范围 | 8 张唯一怪物、20 张实体牌；新增静态测试逐对象核对力量、宝藏奖励、图集索引和实体数量；活死人骑士与图坦卡蒙真实入口 1/1 通过 | PASS；8 张对象的 L0-L3 已有证据，8 张对象的 L4 仍需逐对象补齐，当前代表图面已通过 |
| 全 Smash Up 领域回归 | `npm run test:smashup`，当前工作区退出码 0；命令输出包含全目录通过汇总，负向断言日志为预期测试输出 | PASS |
| 真实 UI 入口回归 | `run-e2e-single.mjs ci ... --project=chromium`，132/132 passed，单 worker，当前工作区截图已重生成 | PASS；不能替代逐对象 L4 |
| 互动与证据门禁 | `npm run audit:interactions`、`npm run audit:evidence:selfcheck`、`npm run typecheck` | PASS |

**本附录后的真实状态：** C1-C4、C6 已有直接证据；两张此前未独立夹具的普通怪物已补齐 L3/L4。C5/C7 仍保留为未完成，原因只剩 8 个派系与 22 张宝藏的 L4 逐对象审计，以及移动端逐对象范围没有被当前代表图替代收口。

## 2026-08-07 续审记录：剩余两张普通怪物真实入口

| 项目 | 证据 | 结论 |
| --- | --- | --- |
| 活死人骑士 / 图坦卡蒙真实入口 | `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-munchkin-monster-treasure-ui.e2e.ts "活死人骑士和图坦卡蒙" --project=chromium` | `passed`：1/1；玩家先手动点击活死人骑士，再手动点击图坦卡蒙；两次奖励分别进入手牌，两个怪物进入怪物弃牌堆，公共宝藏牌堆从 4 张收口到 0 张 |
| 当前截图 | `test-results/evidence-screenshots/smashup/smashup-munchkin-monster-treasure-ui.e2e/活死人骑士和图坦卡蒙可从真实怪物行逐张手动击败并领取宝藏/` 下 3 张 JPG，1440x900 | `PASS / 92`：怪物行位于矿洞下方；两个怪物在基地下方横向排列且逐步收口；宝藏小牌、牌库、弃牌区、基地、泰坦槽和结束回合入口均可读；没有调试面板、中央重复源卡或异常遮挡 |
| 首次重跑失败 | Playwright 60 秒超时，调用栈落在 `readCoreState -> ensureDebugStateTab` | `scoped_debt_resolved`：失败来自证据夹具先隐藏调试面板后又要求辅助函数重新打开调试面板，不是玩法失败；改用 `game.getState()` 读取状态并重新跑通 |
| 当前范围裁决 | 8 张唯一怪物对象矩阵 | `L0-L3 passed`；活死人骑士与图坦卡蒙的 L4 已通过；其它 6 张怪物保留原有代表图面通过记录，整体 L4 逐对象审计仍为 scoped-debt |

## 2026-08-07 当前工作区最终回归记录

| 项目 | 证据 | 结论 |
| --- | --- | --- |
| Munchkin 真实入口全量回归 | `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-munchkin-monster-treasure-ui.e2e.ts --project=chromium` | `passed`：`Running 133 tests using 1 worker`，最终 `133 passed`，约 18.9 分钟；新增活死人骑士 / 图坦卡蒙用例位于第 2 条，其余原有 132 条全部通过 |
| Munchkin 领域与录入回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/munchkinIntake.test.ts src/games/smashup/__tests__/munchkinMechanics.test.ts --configLoader native --reporter=dot` | `passed`：2 个文件、`120/120`；负向测试中的“当前没有可选择的宝藏牌”是预期拒绝日志，不是测试失败 |
| 类型与交互门禁 | `npm run typecheck`、`npm run audit:interactions` | `passed`：类型检查通过；交互审计 OK，动态强制选择仅保留现有非阻塞 warning |
| 证据完整性 | `npm run audit:evidence:selfcheck` | `passed`：检查 4 个文件、3 个审计文档，结果 OK |
| 定向静态审查 | `npx eslint e2e/smashup/smashup-munchkin-monster-treasure-ui.e2e.ts src/games/smashup/__tests__/munchkinIntake.test.ts`、目标文件 `git diff --check` | `passed`：0 errors；大型 E2E 文件保留既有 103 条 `no-explicit-any` warning；差异无内容错误 |
| 当前任务裁决 | 结合本附录全部 L0-L4 矩阵 | `in_progress`：功能、数据、资源、真实入口和新增怪物对象已通过；剩余是其它 8 个派系 / 22 张宝藏的逐对象 L4 与移动端逐对象审计，不能把 133/133 外推成整体验收完成 |
