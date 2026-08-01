# 法师战争 Workshop URL 到本地文件匹配表

> 状态：`source-mapped / partial-local-asset-ready`。本文件首先证明 Workshop/TTS 存档里的图片 URL 能命中用户素材目录；其中首轮学徒基础素材已有一部分完成正式语义命名、移动、压缩、manifest 或 atlas config。它仍不表示运行时代码已接入，也不表示全部规则对象已 `pass`。

## 匹配摘要

| 项目 | 结果 |
| --- | ---: |
| 解析来源 | `D:\gongzuo\webgame\gameasset\法师战争\Mods\Workshop\2607721556.json` |
| 本地图片目录 | `D:\gongzuo\webgame\gameasset\法师战争\Mods\Images` |
| 图片 URL 引用次数 | 4106 |
| 唯一图片 URL | 182 |
| 已命中本地图片 | 182 |
| 未命中本地图片 | 0 |
| 未命中非图片 URL | 模型网格 / 碰撞体 URL，例如 `MeshURL`、`ColliderURL`；不计入图片缺口 |

## 关键对象映射

| 规则对象 | Workshop 对象 / deck | URL 字段 | 本地文件 | 尺寸 | 当前用途 |
| --- | --- | --- | --- | --- | --- |
| 标准竞技场 | `标准竞技场` / `Custom_Board` | `ImageURL` | `httpcloud3steamusercontentcomugc1702910670704188662A394920C000036951DA1D3F7A636CC61ECFC9445.jpg` | `3210x2407` | 已正式落盘为 `board/standard-arena.jpg`；12 区域坐标见 `board-coordinate-contract.md`，学徒半场方向仍待裁定 |
| 法师状态板 | `Custom_Board` / 玩家状态板 | `ImageURL` | `httpcloud3steamusercontentcomugc16274784517920313953F5AE90D6DBBD8CCA4F25724A93E2ECD386561E2.png` | `3093x1628` | 已正式落盘为 `boards/mage-status/mage-status-board.png`；承载生命、伤害、法力池、聚魔轨道 |
| 法师牌 atlas | `法师` / deck `26` | `FaceURL` | `httpcloud3steamusercontentcomugc162747851276256917931A9A1D74C791E1674ECB5D2262EBBBA79674D32.png` | `4096x3302` | 兽王、女祭司、巫师、邪术师等法师牌正面 atlas |
| 法师牌补充 atlas | `法师` / deck `27` | `FaceURL` | `httpcloud3steamusercontentcomugc1627478512762575428D041ADFAE99C7BE7669CDE898547D216E424BED5.png` | `4096x3284` | 战神等补充法师牌；首轮默认后续 |
| 通用卡背 | 多数卡牌 | `BackURL` | `httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg` | `992x1391` | 法术书未知内容、已计划法术背面、隐性结界和弃牌堆入口背面候选；不得命名为手牌 |
| 横向卡背 / 墙体背 | 部分墙体/横向牌 | `BackURL` | `httpcloud3steamusercontentcomugc1725416402719847600782167FB0498E3E21CD711683F78E4B1B642E606.jpg` | `1391x992` | 墙体或横向卡牌背面候选 |
| 攻击骰贴图 | `攻击骰` / `Custom_Model` | `DiffuseURL` | `https40mediatumblrcomc6fcb742b9b66d90bef404852e09a317tumblrnvh8swsaWv1uhjh6fo11280png.png` | `1280x1280` | 攻击骰视觉候选；模型网格 URL 未本地化但图片贴图已命中 |
| 就绪正面 | `就绪` / deck `204` | `FaceURL` | `httpcloud3steamusercontentcomugc1627478451792267951C0E7FD1247835F627FE138F5BD8C025497D167CC.png` | `329x329` | 就绪/冷却标记候选 |
| 就绪背面 | `就绪` / deck `204` | `BackURL` | `httpcloud3steamusercontentcomugc1627478451792268407C6C14ADDD086BE07EA7E31DC28F7C33138B80DF8.png` | `329x329` | 就绪/冷却翻面候选 |
| 红色行动标记正面 | `行动标记` / 红色候选 | `FaceURL` | `https40mediatumblrcomfa20e01096137870a08f4613138420d6tumblro1kwvyH7gl1uhjh6fo3100jpg.jpg` | `86x78` | 已正式落盘为 `tokens/action/action-marker-red-front.png`；两人模式红方法师行动标记 |
| 红色行动标记背面 | `行动标记` / 红色候选 | `BackURL` | `https40mediatumblrcomb262b5afef1cb60d5393aead5e640db1tumblro1kwvyH7gl1uhjh6fo4100jpg.jpg` | `86x78` | 已正式落盘为 `tokens/action/action-marker-red-back.png`；两人模式红方法师行动标记 |
| 蓝色行动标记正面 | `行动标记` / 蓝色候选 | `FaceURL` | `https41mediatumblrcom3a827079f5d1b080f678145ec577775atumblro1kwvyH7gl1uhjh6fo1100jpg.jpg` | `86x78` | 已正式落盘为 `tokens/action/action-marker-blue-front.png`；两人模式蓝方法师行动标记 |
| 蓝色行动标记背面 | `行动标记` / 蓝色候选 | `BackURL` | `https41mediatumblrcom9b24dabe7472a7c79008d81642c76989tumblro1kwvyH7gl1uhjh6fo2100jpg.jpg` | `86x78` | 已正式落盘为 `tokens/action/action-marker-blue-back.png`；两人模式蓝方法师行动标记 |
| 快速施法标记正面 | `Custom_Tile` / 快速施法候选 | `ImageURL` | `httpcloud3steamusercontentcomugc16939036219658095369DD80C0825ED7F6166BB7FA96DFAED1C9A746938.png` | `80x80` | 已正式落盘为 `tokens/quickcast/quickcast-marker-front.png`；黑色快速施法标记白色符号面 |
| 快速施法标记背面 | `Custom_Tile` / 快速施法候选 | `ImageSecondaryURL` | `https40mediatumblrcom3bbf7d9a48e1077d961a4e6b7444ad12tumblro1kxldjgqh1uhjh6fo2100jpg.jpg` | `86x78` | 已正式落盘为 `tokens/quickcast/quickcast-marker-back.jpg`；黑色快速施法标记冷却面 |
| 伤害正面 | `伤害` / deck `202` | `FaceURL` | `httpcloud3steamusercontentcomugc16274784517922581910C488293AA7FF65FA3618166528783082704A008.png` | `283x283` | 伤害标记候选 |
| 伤害背面 | `伤害` / deck `202` | `BackURL` | `httpcloud3steamusercontentcomugc16274784517922585215001DAAE6CDF3978EBD8C3C28B76C2F97D8769AD.png` | `390x390` | 伤害标记翻面候选 |
| 聚魔正面 | `聚魔` / deck `203` | `FaceURL` | `httpcloud3steamusercontentcomugc1627478451792264709AB582815315524A6BCFA8507AEB4580ED0ED318D.png` | `283x283` | 已正式落盘为 `tokens/channeling/channeling-token-front.png` |
| 聚魔背面 | `聚魔` / deck `203` | `BackURL` | `httpcloud3steamusercontentcomugc16274784517922651900947861533658EC9F4DF7B7ABCEA6B40D48BC501.png` | `336x336` | 已正式落盘为 `tokens/channeling/channeling-token-back.png` |
| 守卫 | `状态` / deck `206` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc162747845179219110241FD9978DBED6A7FA3C3773D64C9B7BB20728A93.png` | `339x339` | 守卫状态 token 候选 |
| 燃烧 | `状态` / deck `231` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc1627478451792809358FAAFDD8C9A05EB031CB4859CB28B04948152A3C6.png` | `497x497` | 基础状态 token 候选 |
| 腐化 | `状态` / deck `234` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc1627478451792831015544503F2A35FEE1042B4E82F6B7DDBC41783AABD.png` | `497x497` | 基础状态 token 候选 |
| 眩晕 | `状态` / deck `236` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc16274784517928368401B6E7C37FA07F89E5B381B349D82D94FC17F2DED.png` | `497x497` | 基础状态 token 候选 |
| 昏迷 | `状态` / deck `230` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc16274784517928052134B3C4713E6E0B51D63AFCBC9C4244037FF2F611E.png` | `497x497` | 基础状态 token 候选 |
| 沉睡 | `状态` / deck `239` | `FaceURL`/`BackURL` | `httpcloud3steamusercontentcomugc162747845179285712670BD653127F21E74664F4EDC30C8B1264F56873E.png` | `497x497` | 基础状态 token 候选 |

## 法师牌 atlas 内对象

| 法师 | cardId | deck | 本地正面 atlas | 本地背面 |
| --- | ---: | ---: | --- | --- |
| 邪术师 | `2600` / `2601` | `26` | `httpcloud3steamusercontentcomugc162747851276256917931A9A1D74C791E1674ECB5D2262EBBBA79674D32.png` | `httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg` |
| 巫师 | `2602` / `2603` | `26` | `httpcloud3steamusercontentcomugc162747851276256917931A9A1D74C791E1674ECB5D2262EBBBA79674D32.png` | `httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg` |
| 女祭司 | `2604` / `2605` | `26` | `httpcloud3steamusercontentcomugc162747851276256917931A9A1D74C791E1674ECB5D2262EBBBA79674D32.png` | `httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg` |
| 兽王 | `2606` / `2607` | `26` | `httpcloud3steamusercontentcomugc162747851276256917931A9A1D74C791E1674ECB5D2262EBBBA79674D32.png` | `httpcloud3steamusercontentcomugc1725416402719671791BB79007C02B5E0E42D97FF6D1CF78BA3C79EF9C4.jpg` |

## 新手法术书映射结论

| 项目 | 结果 |
| --- | --- |
| Workshop 对象 | `新手法术书` bag，包含 14 项 |
| 递归卡牌对象 | 854 张；存在重复卡实例 |
| 唯一卡牌图片 URL | 已包含在 182 个唯一图片 URL 内，全部命中本地 `Mods/Images` |
| 关键示例 | 次级治疗、驱散、圣光之柱、法师魔杖、巨熊皮甲、巢穴等均能回到 deck/atlas 和本地文件 |
| 下一步 | 按规则学徒清单先抽 4 名基础法师的预设法术书，不直接把 854 张实例当运行时数据 |

## 仍未完成

- 学徒法术与法师 atlas 已另行生成 atlas config：`public/assets/atlas-configs/mage-wars/mages-core-atlas.json`、`public/assets/atlas-configs/mage-wars/apprentice-spell-atlases.json`。
- 首轮基础素材中已有 34 张正式源图移动到 `public/assets/i18n/zh-CN/mage-wars/`，并已压缩、写入 `assets-manifest.json`；其中法师状态板、红 / 蓝行动标记、快速施法标记与聚魔 token 已完成正式落盘；详见 `runtime-asset-plan.md`。
- 本文件不是运行时接线证据；正式资源仍需要 Board / atlas loader / critical image resolver 等运行时代码引用后才能升为 `pass`。
- 仍有对象未完成正式素材链或运行时合同：独立法力指示物、学徒半场方向、区域热区运行时点击 / 槽位布局合同；效果骰已锁 Workshop 内置 `Die_12` 来源，但仍未接入运行时渲染组件。
- 攻击骰模型网格 URL 仍未本地化；首轮可以用已命中的贴图做 2D/简化 3D 方案，但必须在运行时方案里明确裁定。
