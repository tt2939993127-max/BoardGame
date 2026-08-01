# 法师战争学徒法术书录入合同

> 状态：`composition-locked / card-fields-and-runtime-atlas-linked`。本文件锁定规则第 5 页四名学徒法师的预设法术书组成、数量和 Workshop 卡牌索引候选；逐卡 S0 字段、正式 atlas/frame 和运行时预览接线已在后续合同中完成。组成真相仍以本文件为准，逐卡字段见 `apprentice-card-field-contract.md`，atlas/frame 见 `apprentice-card-atlas-contract.md`。

## 真相源表

| 来源类型 | 路径 | 获取 / 读取时间 | 覆盖对象 | 录入口径 |
| --- | --- | --- | --- | --- |
| 规则主真相源 | `D:\gongzuo\webgame\gameasset\法师战争\output\pdf\ai_readable_pdf_exports\101721 法师战争 Mage Wars 规则\pages\page_004.md` | 2026-07-26 | 学徒模式统一属性 | 学徒法师统一 10 点聚魔、24 点生命、初始 10 点法力、3 颗攻击骰基本近战攻击 |
| 规则主真相源 | `D:\gongzuo\webgame\gameasset\法师战争\output\pdf\ai_readable_pdf_exports\101721 法师战争 Mage Wars 规则\pages\page_005.md` | 2026-07-26 | 四名学徒法师预设法术书 | 规则页数量与中文牌名是法术书组成唯一真相 |
| Workshop 对照源 | `D:\gongzuo\webgame\gameasset\法师战争\Mods\Workshop\2607721556.json` | 2026-07-26 | 中文牌名、`CardID`、deck / atlas 候选 | 只用于反查素材索引；同名多候选不自动裁成唯一运行时 atlas |

## 属性合同

| 法师 | 起始生命 | 初始法力 | 聚魔 | 基本近战攻击 | 合同状态 |
| --- | ---: | ---: | ---: | ---: | --- |
| 兽王 | 24 | 10 | 10 | 3 颗攻击骰 | locked |
| 女祭司 | 24 | 10 | 10 | 3 颗攻击骰 | locked |
| 邪术师 | 24 | 10 | 10 | 3 颗攻击骰 | locked |
| 巫师 | 24 | 10 | 10 | 3 颗攻击骰 | locked |

## 法术书总数

| 法师 | 规则页逐项合计 | 当前代码落点 | 状态 |
| --- | ---: | --- | --- |
| 兽王 | 33 | `APPRENTICE_SPELLBOOKS[beastmaster_apprentice]` | locked |
| 女祭司 | 30 | `APPRENTICE_SPELLBOOKS[priestess_apprentice]` | locked |
| 邪术师 | 30 | `APPRENTICE_SPELLBOOKS[warlock_apprentice]` | locked |
| 巫师 | 30 | `APPRENTICE_SPELLBOOKS[wizard_apprentice]` | locked |

## 核对合同表

| 法师 | 数量 | 规则牌名 | Workshop 名称 | Workshop CardID | deck | 组成状态 | 素材索引状态 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 兽王 | 1 | 巨熊皮甲 | 巨熊皮甲 | `3711` | `37` | locked | single-candidate |
| 兽王 | 1 | 群兽法杖 | 群兽法杖 | `3710` | `37` | locked | single-candidate |
| 兽王 | 1 | 元素斗篷 | 元素斗篷 | `3709` | `37` | locked | single-candidate |
| 兽王 | 2 | 丛林灰狼 | 丛林灰狼 | `2819` | `28` | locked | single-candidate |
| 兽王 | 1 | 翠绿树蜥 | 翠绿树蜥 | `2808` | `28` | locked | single-candidate |
| 兽王 | 1 | 钢爪灰熊 | 钢爪灰熊 | `2802` | `28` | locked | single-candidate |
| 兽王 | 2 | 苦木林狐 | 苦木林狐 | `2812` | `28` | locked | single-candidate |
| 兽王 | 1 | 雷隙猎鹰 | 雷隙猎鹰 | `2820` | `28` | locked | single-candidate |
| 兽王 | 1 | 深林幽影切维尔 | 深林幽影切维尔 | `2824` | `28` | locked | single-candidate |
| 兽王 | 2 | 野性山猫 | 野性山猫 | `2906` | `29` | locked | single-candidate |
| 兽王 | 2 | 缠绕藤蔓（魔物） | 缠绕藤蔓 | `2224` | `22` | locked | alias-single-candidate |
| 兽王 | 1 | 反戈一击 | 反戈一击 | `1903` | `19` | locked | single-candidate |
| 兽王 | 1 | 格挡 | 格挡 | `1806` | `18` | locked | single-candidate |
| 兽王 | 2 | 巨熊力量 | 巨熊力量 | `1914` | `19` | locked | single-candidate |
| 兽王 | 1 | 灵蛇反射 | 灵蛇反射 | `1809` | `18` | locked | single-candidate |
| 兽王 | 1 | 体肤重生 | 体肤重生 | `1916` | `19` | locked | single-candidate |
| 兽王 | 2 | 犀牛兽皮 | 犀牛兽皮 | `1917` | `19` | locked | single-candidate |
| 兽王 | 1 | 冲锋陷阵 | 冲锋陷阵 | `3407` | `34` | locked | single-candidate |
| 兽王 | 1 | 次级治疗 | 次级治疗 | `3402` | `34` | locked | single-candidate |
| 兽王 | 1 | 荒野呼唤 | 荒野呼唤 | `3417` | `34` | locked | single-candidate |
| 兽王 | 1 | 驱散 | 驱散 | `3606` | `36` | locked | workshop-apprentice-instance-selected |
| 兽王 | 1 | 群体治疗 | 群体治疗 | `3405` | `34` | locked | single-candidate |
| 兽王 | 1 | 兽性觉醒 | 兽性觉醒 | `3403` | `34` | locked | single-candidate |
| 兽王 | 1 | 瓦解 | 瓦解 | `3605` | `36` | locked | workshop-apprentice-instance-selected |
| 兽王 | 2 | 间歇喷泉 | 间歇喷泉 | `1710` | `17` | locked | single-candidate |
| 兽王 | 1 | 气流 | 气流 | `1711` | `17` | locked | single-candidate |
| 女祭司 | 1 | 阿希拉法杖 | 阿希拉法杖 | `3706` | `37` | locked | single-candidate |
| 女祭司 | 1 | 风龙皮甲 | 风龙皮甲 | `3708` | `37` | locked | single-candidate |
| 女祭司 | 1 | 偏移护腕 | 偏移护腕 | `3715` | `37` | locked | single-candidate |
| 女祭司 | 2 | 阿希拉牧师 | 阿希拉牧师 | `2811` | `28` | locked | single-candidate |
| 女祭司 | 1 | 布洛根·血石 | 布洛根血石 | `2813` | `28` | locked | alias-single-candidate |
| 女祭司 | 1 | 高地独角兽 | 高地独角兽 | `2814` | `28` | locked | single-candidate |
| 女祭司 | 1 | 皇家箭手 | 皇家箭手 | `2816` | `28` | locked | single-candidate |
| 女祭司 | 1 | 灰衣天使 | 灰衣天使 | `2907` | `29` | locked | single-candidate |
| 女祭司 | 2 | 西锁骑士 | 西锁骑士 | `2909` | `29` | locked | single-candidate |
| 女祭司 | 1 | 法力失效 | 法力失效 | `1901` | `19` | locked | single-candidate |
| 女祭司 | 2 | 格挡 | 格挡 | `1806` | `18` | locked | single-candidate |
| 女祭司 | 1 | 公牛耐力 | 公牛耐力 | `1808` | `18` | locked | single-candidate |
| 女祭司 | 1 | 神力加护 | 神力加护 | `1813` | `18` | locked | workshop-apprentice-instance-selected |
| 女祭司 | 1 | 圣佑领地 | 圣佑领地 | `1913` | `19` | locked | single-candidate |
| 女祭司 | 1 | 犀牛兽皮 | 犀牛兽皮 | `1917` | `19` | locked | single-candidate |
| 女祭司 | 2 | 心灵安抚 | 心灵安抚 | `1912` | `19` | locked | single-candidate |
| 女祭司 | 1 | 次级治疗 | 次级治疗 | `3402` | `34` | locked | single-candidate |
| 女祭司 | 1 | 单体治疗 | 单体治疗 | `3408` | `34` | locked | single-candidate |
| 女祭司 | 1 | 昏睡 | 昏睡 | `3411` | `34` | locked | single-candidate |
| 女祭司 | 1 | 驱散 | 驱散 | `3606` | `36` | locked | workshop-apprentice-instance-selected |
| 女祭司 | 1 | 群体治疗 | 群体治疗 | `3405` | `34` | locked | single-candidate |
| 女祭司 | 1 | 瓦解 | 瓦解 | `3605` | `36` | locked | workshop-apprentice-instance-selected |
| 女祭司 | 1 | 原力推斥 | 原力推斥 | `3523` | `35` | locked | workshop-apprentice-instance-selected |
| 女祭司 | 2 | 圣光之柱 | 圣光之柱 | `1706` | `17` | locked | single-candidate |
| 女祭司 | 1 | 眩目闪光 | 眩目闪光 | `1709` | `17` | locked | single-candidate |
| 邪术师 | 1 | 恶魔胸甲 | 恶魔胸甲 | `3700` | `37` | locked | single-candidate |
| 邪术师 | 1 | 皮革手套 | 皮革手套 | `3702` | `37` | locked | single-candidate |
| 邪术师 | 1 | 狱火长鞭 | 狱火长鞭 | `3701` | `37` | locked | single-candidate |
| 邪术师 | 1 | 暗契屠魔 | 暗契屠魔 | `2800` | `28` | locked | single-candidate |
| 邪术师 | 1 | 暗沼蝙蝠 | 暗沼蝙蝠 | `2825` | `28` | locked | single-candidate |
| 邪术师 | 2 | 火烙魔婴 | 火烙魔婴 | `2801` | `28` | locked | single-candidate |
| 邪术师 | 2 | 骷髅哨兵 | 骷髅哨兵 | `2826` | `28` | locked | single-candidate |
| 邪术师 | 1 | 狼人宠物戈伦 | 狼人宠物戈伦 | `2804` | `28` | locked | single-candidate |
| 邪术师 | 2 | 烈焰狱鬼 | 烈焰狱鬼 | `2803` | `28` | locked | single-candidate |
| 邪术师 | 1 | 法师祸咒 | 法师祸咒 | `1804` | `18` | locked | single-candidate |
| 邪术师 | 1 | 巨熊力量 | 巨熊力量 | `1914` | `19` | locked | single-candidate |
| 邪术师 | 1 | 剧痛难当 | 剧痛难当 | `1800` | `18` | locked | single-candidate |
| 邪术师 | 1 | 身心俱疲 | 身心俱疲 | `1816` | `18` | locked | single-candidate |
| 邪术师 | 1 | 尸鬼腐化 | 尸鬼腐化 | `1820` | `18` | locked | single-candidate |
| 邪术师 | 1 | 死亡链接 | 死亡链接 | `1801` | `18` | locked | single-candidate |
| 邪术师 | 1 | 死亡印记 | 死亡印记 | `1826` | `18` | locked | single-candidate |
| 邪术师 | 1 | 鲜血贪噬 | 鲜血贪噬 | `1910` | `19` | locked | single-candidate |
| 邪术师 | 2 | 汲血之击 | 汲血之击 | `3404` | `34` | locked | single-candidate |
| 邪术师 | 1 | 驱散 | 驱散 | `3606` | `36` | locked | workshop-apprentice-instance-selected |
| 邪术师 | 1 | 生命汲取 | 生命汲取 | `3400` | `34` | locked | single-candidate |
| 邪术师 | 1 | 炎爆 | 炎爆 | `3401` | `34` | locked | single-candidate |
| 邪术师 | 1 | 原力推斥 | 原力推斥 | `3425` | `34` | locked | workshop-apprentice-instance-selected |
| 邪术师 | 1 | 火球术 | 火球术 | `1700` | `17` | locked | single-candidate |
| 邪术师 | 1 | 火焰风暴 | 火焰风暴 | `1701` | `17` | locked | single-candidate |
| 邪术师 | 2 | 烈焰爆弹 | 烈焰爆弹 | `1702` | `17` | locked | single-candidate |
| 巫师 | 1 | 奥秘法杖 | 奥秘法杖 | `3704` | `37` | locked | single-candidate |
| 巫师 | 1 | 龙鳞锁甲 | 龙鳞锁甲 | `3703` | `37` | locked | single-candidate |
| 巫师 | 1 | 皮革长靴 | 皮革长靴 | `3721` | `37` | locked | single-candidate |
| 巫师 | 1 | 抑制斗篷 | 抑制斗篷 | `3705` | `37` | locked | single-candidate |
| 巫师 | 1 | 元素魔杖 | 元素魔杖 | `3716` | `37` | locked | single-candidate |
| 巫师 | 1 | 暗沼九头蛇 | 暗沼九头蛇 | `2901` | `29` | locked | single-candidate |
| 巫师 | 1 | 戈尔贡箭手 | 戈尔贡箭手 | `2810` | `28` | locked | single-candidate |
| 巫师 | 2 | 汲法水蛭 | 汲法水蛭 | `2807` | `28` | locked | single-candidate |
| 巫师 | 2 | 蓝色精怪 | 蓝色精怪 | `2822` | `28` | locked | single-candidate |
| 巫师 | 1 | 石目蛇蜥 | 石目蛇蜥 | `2809` | `28` | locked | single-candidate |
| 巫师 | 1 | 厄运 | 厄运 | `1825` | `18` | locked | single-candidate |
| 巫师 | 1 | 法力失效 | 法力失效 | `1901` | `19` | locked | single-candidate |
| 巫师 | 1 | 格挡 | 格挡 | `1806` | `18` | locked | single-candidate |
| 巫师 | 1 | 攻击逆转 | 攻击逆转 | `1904` | `19` | locked | single-candidate |
| 巫师 | 1 | 精华汲取 | 精华汲取 | `1815` | `18` | locked | single-candidate |
| 巫师 | 1 | 原力法剑 | 原力法剑 | `1818` | `18` | locked | single-candidate |
| 巫师 | 1 | 原力之握 | 原力之握 | `1908` | `19` | locked | single-candidate |
| 巫师 | 1 | 传送 | 传送 | `3410` | `34` | locked | single-candidate |
| 巫师 | 2 | 次级治疗 | 次级治疗 | `3402` | `34` | locked | single-candidate |
| 巫师 | 1 | 昏睡 | 昏睡 | `3411` | `34` | locked | single-candidate |
| 巫师 | 1 | 结界窃取 | 结界窃取 | `3409` | `34` | locked | single-candidate |
| 巫师 | 1 | 驱散 | 驱散 | `3606` | `36` | locked | workshop-apprentice-instance-selected |
| 巫师 | 1 | 瓦解 | 瓦解 | `3605` | `36` | locked | workshop-apprentice-instance-selected |
| 巫师 | 1 | 雷导术 | 雷导术 | `1704` | `17` | locked | single-candidate |
| 巫师 | 1 | 连锁闪电 | 连锁闪电 | `1703` | `17` | locked | single-candidate |
| 巫师 | 2 | 闪电箭矢 | 闪电箭矢 | `1705` | `17` | locked | single-candidate |

## 对照与冲突待裁定

| 对象 | 规则真相源结论 | Workshop 对照源结论 | 当前裁定 |
| --- | --- | --- | --- |
| 缠绕藤蔓（魔物） | 规则第 5 页写作 `缠绕藤蔓（魔物）` | Workshop 牌名为 `缠绕藤蔓`，`CardID=2224` | 组成 locked；运行时展示保留规则名，素材索引用 Workshop 名 |
| 布洛根·血石 | 规则第 5 页含间隔点 | Workshop 牌名为 `布洛根血石`，`CardID=2813` | 组成 locked；运行时展示保留规则名，素材索引用 Workshop 名 |
| 驱散 | 规则页只给牌名与数量 | Workshop 出现 `3419` / `3606` 两组候选；新手法术书四名学徒相关实例使用 `3606` | 组成 locked；素材 frame 选 `3606`，`3419` 作为同名重印 / 对照候选保留 |
| 瓦解 | 规则页只给牌名与数量 | Workshop 出现 `3406` / `3605` 两组候选；新手法术书四名学徒相关实例使用 `3605` | 组成 locked；素材 frame 选 `3605`，`3406` 作为同名重印 / 对照候选保留 |
| 神力加护 | 规则页只给牌名与数量 | Workshop 出现 `1813` / `1911` 两组候选；新手法术书女祭司实例使用 `1813` | 组成 locked；素材 frame 选 `1813`，`1911` 作为重复图面 / 对照候选保留 |
| 原力推斥 | 规则页只给牌名与数量 | Workshop 出现 `3425` / `3523` 两组候选；新手法术书女祭司使用 `3523`，邪术师使用 `3425` | 组成 locked；按法师实例分别选 frame，另一候选作为同名重印 / 对照候选保留 |

## 后续实现准入

- 可以使用本合同进入 setup / 法术书数量 / 私有法术书区域建模；当前 `domain/data/apprenticeSpellbooks.ts` 已消费四名学徒法术书组成。
- 不能只凭本文件读取卡牌效果、费用、派系、等级、目标或施法类型；这些字段以 `apprentice-card-field-contract.md` 为准。
- 素材 deck、网格、`CardID` frame、同名多候选裁定和运行时 atlas 接线见 `apprentice-card-atlas-contract.md` 与 `runtime-asset-plan.md`。
- 全 322 张法术和自由构筑仍属于后续 change，不因本学徒法术书合同完成而自动进入 foundation 范围。
