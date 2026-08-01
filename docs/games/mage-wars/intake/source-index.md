# 法师战争来源索引

> 状态：`foundation-source-index-complete / runtime-assets-verified`。本文件锁定来源与读取结论；阶段 0 来源索引已被后续运行时素材计划、资源链审计和真实入口 E2E 消费。当前 foundation 完成证据见 `docs/games/mage-wars/foundation-completion-self-audit.md`。

## 执行现场

| 项目 | 当前值 |
| --- | --- |
| gameId | `mage-wars` |
| 游戏中文名 | 法师战争 |
| 实施 worktree | `D:\gongzuo\webgame\BoardGame\.worktrees\mage-wars` |
| 分支 | `feat/mage-wars` |
| 主素材目录 | `D:\gongzuo\webgame\gameasset\法师战争` |
| 当前阶段 | `add-mage-wars-foundation` 技术门禁已通过；v6 / v7 视觉稿验收资格已撤销，下一步必须重出 v8 设计稿 |

## 主真相源

| 来源 | 路径 | 读取结果 | 当前用途 |
| --- | --- | --- | --- |
| 规则书 PDF | `D:\gongzuo\webgame\gameasset\法师战争\101721 法师战争 Mage Wars 规则.pdf` | 48 页；已有逐页 Markdown 导出 | 规则主真相源 |
| FAQ/勘误 PDF | `D:\gongzuo\webgame\gameasset\法师战争\101721 法师战争 Mage Wars 常见问题与勘误.pdf` | 18 页；已有逐页 Markdown 导出 | 规则边界与测试用例真相源 |
| 规则书 Markdown | `output/pdf/ai_readable_pdf_exports/101721 法师战争 Mage Wars 规则/pages/page_001.md` 到 `page_048.md` | 可读；包含页码、图片对象和正文 | intake 引用源 |
| FAQ/勘误 Markdown | `output/pdf/ai_readable_pdf_exports/101721 法师战争 Mage Wars 常见问题与勘误/pages/page_001.md` 到 `page_018.md` | 可读；攻击、结界、强制行动、法术绑定等边界明确 | intake 引用源 |

## 素材与布局来源

| 来源 | 路径 | 读取结果 | 当前用途 |
| --- | --- | --- | --- |
| TTS/Workshop 存档 | `Mods/Workshop/2607721556.json` | `SaveName=法师战争高清中文版`；顶层对象 96 个；递归对象 2229 个；`CustomDeck` 贴图条目 2013 个 | 素材索引、布局关系、对象命名候选 |
| Workshop 缩略图 | `Mods/Workshop/Thumbnails/2607721556.png` | 已发现 | 候选缩略图来源 |
| 图片目录 | `Mods/Images` | 129 张图片：104 PNG、25 JPG；大量随机 URL 文件名 | 候选运行时素材来源 |
| 模型目录 | `Mods/Models` | 2 个 OBJ | 攻击骰或容器模型候选；首轮不直接承诺接入 |

## URL 匹配账本

| 账本 | 结论 |
| --- | --- |
| `workshop-url-file-map.md` | Workshop 中 182 个唯一图片 URL 全部命中本地 `Mods/Images`；未命中项仅为模型网格/碰撞体 URL，不计入图片缺口 |
| `runtime-asset-plan.md` | 已为标准竞技场、法师牌 atlas、卡背、攻击骰贴图、就绪/伤害/守卫/基础状态 token 制定语义命名和正式落点，并完成正式落盘、压缩、manifest、运行时代码接线、服务器回查和 Android 包回查 |

## 关键事实

| 事实 | 证据 |
| --- | --- |
| 图片目录包含高分辨率大图 | 最大组多为 `4096 x 3280~3300`，疑似卡牌/组件大图集 |
| 图片目录包含大量 token 尺寸组 | `497 x 497`、`526 x 526`、`502 x 502`、`390 x 390`、`343 x 343` 等 |
| Workshop 存档含正式中文对象名 | 递归昵称至少 570 个，例如兽王、女祭司、巫师、邪术师、格挡、火球术、燃烧、腐化、守卫等 |
| Workshop 存档含布局对象 | 标准竞技场、豪华竞技场、四人游戏、装备栏、结界栏、友方结界、敌方结界、弃牌堆、TTS HandTrigger 座位方向参考 |
| Workshop 存档含组件袋 | 攻击骰、效果骰、行动标记、伤害、聚魔、状态、法师特殊标记、法术书、新手法术书 |

## 当前裁定

- 规则主真相源：中文规则 PDF 与中文 FAQ/勘误。
- 素材主来源：用户本地素材目录中的 TTS/Workshop 存档与 `Mods/Images`。
- Workshop/TTS 坐标只作为对象关系和布局参考，不作为最终 UI 视觉风格合同。
- 当前没有引入 Wiki、BGG、官网或其它外部对照源；如后续需要核对卡牌全文，再单独登记为对照源。
- 当前首轮 foundation 图片已正式落到 `public/assets/i18n/zh-CN/mage-wars/`，并通过压缩、manifest、正式 Board 页面消费、服务器素材主源回查和 Android 游戏素材包回查。
- 当前已有 URL 到本地文件的确定映射；首轮 foundation 素材链已闭合。全 322 张法术、自由构筑、四人模式、豪华竞技场和扩展法师仍属于后续范围。
