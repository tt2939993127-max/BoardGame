# 法师战争 Step 1 PC Open Design v18 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-route / media-generate-forbidden / human-review-not-allowed-until-ai-pass`。v18 专门修复 v17 的硬失败：攻击掷骰被放到右侧边栏，未作为当前结算主体落在主舞台上层。

## 本轮规则读取回执

| 规则来源 | 本轮读取结论 | 画面影响 |
| --- | --- | --- |
| `page_004.md` | 学徒模式使用 `2x3` 半场；学徒法师为 10 聚魔、24 生命、3 颗基础攻击骰 | 主舞台仍是标准竞技场的一半；法师读数贴法师牌，不复现整张状态板 |
| `page_006.md` | 组件包含攻击骰、12 面效果骰、法术书、法师牌、状态板、行动 / 快速施法标记 | 攻击骰和效果骰必须用正式素材 / 来源锁定程序化对象表达，不能用普通数字块 |
| `page_007.md` | 法师牌、行动标记、快速施法标记、状态板和法术书属于 setup 核心对象 | 法师牌、行动 token、快速施法 token、法术书、已计划法术和弃牌堆仍按所属玩家边缘组织 |
| `page_024.md` | 攻击步骤明确包含“投掷骰子”，攻击目标必须合法 | 火球术攻击西锁骑士时，骰盘属于当前攻击结算，而不是辅助面板信息 |
| `page_027.md` | 攻击骰结果决定普通 / 致命 / 无伤害，12 面效果骰决定附加效果和状态 | 掷骰结果必须靠近目标或攻击路径，玩家才能把骰面、伤害和状态归到西锁骑士 |

## 规则到画面映射

| 规则结论 | 影响主体 | v18 设计决策 / 禁止项 |
| --- | --- | --- |
| 投掷骰子是攻击结算步骤，不是日志或摘要 | 攻击骰、12 面效果骰、西锁骑士 | 骰盘移到西锁骑士右上方的竞技场上层；禁止继续放在右侧边栏 |
| 目标承受伤害和附加效果 | 西锁骑士、伤害 token、守卫 token | 骰盘不得遮挡目标卡、伤害 token、守卫 token；结果视觉应贴目标区域 |
| 法术书 / 已计划法术 / 弃牌堆是所属玩家边缘对象 | 己方 / 对手牌区 | 牌区保持边缘入口；弃牌堆不进入中央；右侧不再把骰盘当牌区同级对象 |
| 生命 / 法力 / 聚魔来自状态板语义但运行态需要可读 | 双方法师 HUD | 继续使用贴近法师牌的自制条和短读数；状态板仍为 `reference-only` |

## 素材进入 artifact 链

| 画面主体 | 正式资源 / 来源 | artifact 渲染来源 | 角色 |
| --- | --- | --- | --- |
| 竞技场 | `public/assets/i18n/zh-CN/mage-wars/board/standard-arena.jpg` | `refs/mage-wars-step1/standard-arena.jpg` | `visible-subject` |
| 法师牌 | `cards/mages/mages-core-atlas` | `refs/mage-wars-step1/mage-warlock-card.png`、`mage-priestess-card.png` | `visible-subject` |
| 当前法术火球术 | 学徒法术 atlas `1700` | `refs/mage-wars-step1/spell-1700-fireball.png` | `visible-subject` |
| 目标西锁骑士 | 学徒法术 atlas `2909` | `refs/mage-wars-step1/spell-2909-knight-of-westlock.png` | `visible-subject` |
| 攻击骰 | 正式攻击骰面裁图 | `refs/mage-wars-step1/attack-die-face-*.png` | `visible-subject / current-settlement` |
| 12 面效果骰 | Workshop `Die_12` 蓝色骰来源锁定 | CSS 程序化 `effect-die` | `approved-programmatic / current-settlement` |
| 法术书 / 卡背 / 已计划 / 弃牌堆 | 通用法术卡背与学徒法术 atlas | `refs/mage-wars-step1/spell-card-back.jpg`、对应 spell png | `visible-subject` |
| 生命 / 法力 / 聚魔 | 状态板轨道规则来源 | CSS 条形和短数字 | `approved-programmatic-runtime-ui` |

## 框体职责回执

| 框体 / 底板 | 保留原因 | v18 裁定 |
| --- | --- | --- |
| 目标轻量角标 | 表达当前合法目标，贴目标卡本体 | 保留，但不得遮挡卡面 |
| 骰盘柔光底 | 只作为临时结算层阴影，帮助骰子脱离棋盘纹理 | 保留极轻透明度；不得形成右侧托盘 |
| 确认 / 取消按钮底板 | 可点击命令热区 | 保留 |
| 右侧大结算托盘 | 没有真实对象职责，会把掷骰降级为边栏信息 | 删除 |

## 人工验收状态

当前状态：`human-review-not-allowed`。v18 必须完成截图导出、图片加载检查、禁词扫描、几何检查、OpenSpec 校验和 AI 图面审计后，才允许打开给用户人工验收。
