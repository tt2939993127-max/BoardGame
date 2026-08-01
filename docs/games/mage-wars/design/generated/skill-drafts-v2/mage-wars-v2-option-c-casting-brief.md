# Mage Wars v2 方案 C：施法结算舞台优先 Open Design brief

> 状态：`option-c-brief / open-design-artifact-input / media-generate-forbidden / v21-baseline-retained / implementation-blocked`。
> 本文件是下一张 Open Design 独立 artifact 的输入 brief，不是设计稿、不含截图、不代表人工批准。当前仍禁止真实 Board/UI 实现、真实页面 E2E、移动端适配和 `od media generate`。

## 目标锁定

| 项目 | 本轮锁定 |
| --- | --- |
| 问题对象 | Mage Wars 两人学徒模式 PC 主对局 UI 的 **C：施法结算舞台优先** 独立设计稿输入 |
| 真相来源 | `design/README.md`、`skill-driven-user-selection-brief.md`、`skill-driven-ui-design-options.md`、`external-ui-methodology-baseline.md`、`step1-runtime-board-saturated-ui-design.md`、`step1-runtime-board-asset-input-manifest.md`、`apprentice-spellbooks.md`、`apprentice-card-field-contract.md`、v21 preflight / audit / geometry |
| 目标入口 / 环境 | Open Design HTML/CSS/JS artifact；1920x1080 PC；`mediaGenerate=false` |
| 验收口径 | 生成独立 artifact 与独立 PNG，再做 AI 图面核验和几何审计；AI PASS 后才允许给用户人工验收 |

## 路线裁定

- 本 brief 选定 **方案 C：施法结算舞台优先**，不是 v21 微调，也不是 v22 同母版变体。
- v21 必须保留为多设计稿前基线，不得覆盖、删除或重命名：
  - HTML：`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v21.html`
  - PNG：`docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21.png`
  - 审计：`docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21-audit.md`
- 本轮 C 方案必须是独立 artifact 文件和独立 PNG，不得塞进总览页、联系表或同一个 HTML 多区域。
- Open Design 只走 artifact 代码设计稿路线；禁止调用 `od media generate`，禁止把图片模型生图、media provider 或生图凭据当作本 brief 的阻塞项。
- 设计稿未获用户人工批准前，不实现 Board/UI，不启动真实运行页，不跑实现 E2E，不进入移动端。

## 与 v21 的实质差异

| 维度 | v21 基线 | 方案 C 必须改变 |
| --- | --- | --- |
| 第一视觉 | 竞技场 + 底部法术书浏览器 | 当前法术、来源、目标、骰子、伤害 / 状态形成主舞台结算链 |
| 结算承载 | 骰盘在目标旁，当前施法卡仍偏 dock 化 | 火球术正面从已计划槽抬升到主舞台，费用、骰子、结果都贴在来源到目标之间 |
| 操作路径 | 底部已计划槽 + 右侧确认 | 玩家视线按 `已计划法术 -> 目标 -> 骰子 / 伤害 -> 确认` 走，不靠右侧栏解释 |
| 法术书承载 | 底部 5 张候选 + 分类 + 分页 | 法术书压缩为支撑区，保留候选、分类、分页和已计划槽，但不抢结算主焦点 |
| 玩家信息 | 法师 HUD 水平化 | HUD 保持水平读数，但主视觉让位给当前施法链 |
| 视觉语法 | 规则区域和底部浏览条都较平均 | 施法路径、目标高亮、骰面和结果 token 是主体；边框只保护交互命中区 |

若下一张图只是把 v21 的目标框、骰盘或底部条加亮，直接判 `same-layout-failure`。

## 规则到画面结论

| 规则 / 合同结论 | 画面主体 | C 方案设计决策 / 禁止项 |
| --- | --- | --- |
| 学徒模式使用标准竞技场一半，即 `2x3` 六区域 | 中央竞技场和 `A1-B3` 区域 | 所有场上卡必须有唯一所属区域；结算 overlay 不得遮断区域归属 |
| 当前行动只能施放已计划法术 | 已计划槽、当前火球术卡 | 火球术必须从已计划槽抬升为当前来源；不能暗示从全书候选直接施法 |
| 施法包含宣告目标、反制、结算；支付前可取消 | 当前施法卡、目标、确认 / 取消 | 费用和确认必须贴近当前施法链；长说明不得常驻 |
| 火球术攻击西锁骑士需要攻击骰和效果骰结算 | 西锁骑士、攻击骰、效果骰、伤害 / 燃烧结果 | 骰盘和结果必须在目标附近的主舞台；不得进入右侧栏、日志或底部法术书 |
| 法术书是私有检索对象，对手不能得知计划 | 己方法术书、对手卡背 / 数量 | 己方可见候选正面；对手只显示卡背、数量和归属，不显示候选、不显示卡名 |
| 弃牌堆公开可检视但通常不是可施放来源 | 所属玩家边缘弃牌堆入口 | 弃牌堆保持低权重；当前无回收 / 复活 / 选择步骤时不得进中央 |
| 生命 / 法力 / 聚魔是持续读数 | 双方法师 HUD | 使用 `approved-programmatic-runtime-ui` 水平条；不复现整张法师状态板 |
| 法术牌字段承载费用、射程、目标、类型和效果 | 火球术正面、费用 chip、目标关系 | 主舞台必须用真实卡牌图表达当前法术，不用纯文字面板替代 |

## 画布结构

目标视口：`1920x1080` PC 桌面。

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 对手 HUD + 计划卡背 + 公开弃牌堆                        当前阶段短状态    │
│                                                                            │
│            ┌──────────────────────────────────────────────┐ ┌───────────┐ │
│            │                    ARENA                     │ │  DOCK     │ │
│            │ A1  B1                                       │ │ 确认/取消 │ │
│            │ A2  B2    火球术 ── 骰子 / 伤害 ── 西锁骑士  │ │ 短状态    │ │
│            │ A3  B3       结果 token 贴目标               │ │ 不放骰子  │ │
│            │ 场上卡牌全部锚定在唯一所属区域                │ └───────────┘ │
│            └──────────────────────────────────────────────┘               │
│ 己方 HUD        已计划 2 槽                                                │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 压缩法术书：分类 | 候选卡 | 分页 | 弃牌堆入口                          │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 尺寸建议

| 区域 | 目标尺寸 / 占比 | 设计说明 |
| --- | --- | --- |
| 中央竞技场 | 约 `1080-1180w x 780-840h` | 仍是规则空间主体；C 方案的结算链覆盖其上，但不遮断 `2x3` |
| 当前施法舞台 | 约 `520-640w x 260-320h`，位于来源到目标之间 | 火球术正面、费用、路径、骰盘、伤害 / 燃烧结果构成一条因果链 |
| 底部法术书 | 约 `760-880w x 130-160h` | 压缩为支撑区，保留分类、分页、候选和已计划来源 |
| 右侧 dock | 约 `180-230w` | 只放确认、取消、等待 / 无效短状态；不承载骰子主结果 |
| 目标附近结果 | 距目标中心约 `80-170px` | 攻击骰、效果骰、伤害和燃烧 token 必须贴目标 |

## 施法结算舞台组成

| 组件 | 可见内容 | 交互职责 | 禁止项 |
| --- | --- | --- | --- |
| 当前火球术卡 | 正面卡图、费用 8 | 证明来源是已计划法术，承接施法动作 | 不得用普通说明框替代卡牌 |
| 来源到目标路径 | 细火焰弧线 / 能量线 | 让玩家看懂谁影响谁 | 不得变成规则说明箭头或粗流程图 |
| 目标锁定 | 西锁骑士本体轻高亮 | 目标对象本体可识别 | 不得盖住卡面、区域编号或 token |
| 骰盘 | 6 颗攻击骰 + 12 面效果骰 | 当前结算主体 | 不得放进侧栏、底栏或日志 |
| 结果 token | 伤害、燃烧短 chip / token | 结算反馈贴目标 | 不得只进入摘要文字 |
| 右侧 dock | `确认`、`取消`、短状态 | 稳定主按钮和撤销入口 | 不得把 dock 做成主行动解释面板 |
| 底部法术书 | 候选、分类、分页、已计划槽 | 支撑检索与来源确认 | 不得抢过当前结算链 |

## 饱和状态输入

| 项目 | 设计输入 |
| --- | --- |
| 当前阶段 | 行动环节 / 邪术师快速施法窗口 |
| 当前玩家 | 邪术师对女祭司；邪术师仍有快速施法标记和足够法力 |
| 当前已计划 | `火球术` 与 `法师祸咒` 两张正面计划卡 |
| 当前选中 | `火球术` 从已计划槽抬升为当前施法卡，目标是西锁骑士 |
| 棋盘对象 | 邪术师、女祭司、火烙魔婴、烈焰狱鬼、西锁骑士、缠绕藤蔓等分布在 `2x3` 半场 |
| 结算反馈 | 目标西锁骑士附近显示攻击骰 / 效果骰、伤害 / 燃烧结果 |
| 法术书候选 | 展示火球术、法师祸咒、格挡、法力失效、奥秘法杖等真实候选 |
| 对手隐藏信息 | 女祭司计划区只显示 2 张卡背；隐性结界只显示卡背、宿主和归属，不泄露身份 |
| 资源读数 | 邪术师生命、法力、聚魔、费用预扣用水平读数和短 chip 表达 |

## 素材与程序化对象账本

| 画面主体 | 输入路径 / 来源 | 在图面中的职责 | 裁定 |
| --- | --- | --- | --- |
| 标准竞技场 | `refs/mage-wars-step1/standard-arena.jpg` | 主棋盘、`2x3` 区域承载 | `visible-subject` |
| 法师牌 | `mage-warlock-card.png`、`mage-priestess-card.png` | 双方法师身份和 HUD 锚点 | `visible-subject` |
| 当前火球术 | `spell-1700-fireball.png` | 当前施法卡和已计划来源 | `visible-subject / current-cast` |
| 目标西锁骑士 | `spell-2909-knight-of-westlock.png` | 当前目标 | `visible-subject` |
| 其它场上对象 | `spell-2801-firebrand-imp.png`、`spell-2803-flaming-hellion.png`、`spell-2224-conjuration.png` | 饱和棋盘对象 | `visible-subject` |
| 法术候选与已计划 | `spell-1804-mage-bane.png`、`spell-1806-block.png`、`spell-1901-nullify.png`、`spell-3704-equipment.png` | 底部压缩法术书和已计划槽 | `visible-subject` |
| 卡背 | `spell-card-back.jpg` | 对手已计划、隐性结界、未公开内容 | `visible-subject / hidden-info` |
| 攻击骰 | `attack-die-face-*.png` | 当前目标结算骰面 | `visible-subject` |
| 效果骰 | 规则来源锁定的蓝色 12 面程序化对象 | 当前效果结果 | `approved-programmatic-runtime-ui` |
| 生命 / 法力 / 聚魔 / 费用 / 焦点 | 规则字段 + 状态板 reference-only | 动态读数和交互反馈 | `approved-programmatic-runtime-ui` |
| 法师状态板 | `mage-status-board.png` | 只作规则和轨道参考 | `reference-only`，不得可见复现 |

素材必须实际进入 Open Design artifact 渲染来源；只在 prompt / brief 里点名路径不算使用素材。

## 隐藏信息和命名红线

- 可见文案、class、aria、审计文本禁止出现：`手牌`、`hand`、`opponent-hand`、`默认持牌区`。
- 正式名称只用：`法术书`、`法术候选`、`已计划法术`、`弃牌堆`、`隐性结界`、`公开场上法术 / 装备 / 生物 / 魔物`。
- 对手法术书不展示候选，不展示卡名；只展示卡背、数量、控制归属。
- 主 UI 常驻文字只允许对象名、数值、短状态、按钮标签；规则说明、教程句、验收句不得进入画面。

## AI 图面核验清单

| 检查项 | PASS 标准 |
| --- | --- |
| C 方案差异 | 第一眼能看出是“施法结算舞台优先”，不是 v21 底部浏览条或目标框微调 |
| 因果链 | 火球术、目标、费用、骰盘、伤害 / 燃烧处在同一主舞台链路 |
| 棋盘不被遮断 | `2x3` 区域、场上对象、目标归属仍清楚 |
| 骰子归位 | 攻击骰 / 效果骰在目标附近，不在底部、侧栏、日志或纯按钮区 |
| 已计划来源 | 当前火球术仍能回到 `已计划 2/2`，候选池不能被误读为直接施法来源 |
| 法术书保留 | 底部仍有候选卡、分类和分页，但视觉低于当前结算链 |
| 隐藏信息 | 对手候选 / 计划正面没有泄露 |
| 素材主体 | 竞技场、法师牌、法术牌、卡背、token、骰面承担第一视觉主体 |
| 少边框 | 框只服务素材边界、焦点、合法目标和可点击控件，不出现厚面板堆叠 |
| 命名正确 | 没有“手牌 / hand / opponent-hand”等规则不存在概念 |
| 1920x1080 | 截图为 PC Open Design 设计稿，不是移动端、运行页截图或临时实现预览 |

任一硬项失败，C 方案只能记为 `REVISE`，不得打开给用户人工验收。

## 产物命名

| 产物 | 路径 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v2-option-c-casting.html` |
| artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v2-option-c-casting.html.artifact.json` |
| 导出 PNG | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting-geometry.json` |
| 图面审计 | `docs/games/mage-wars/design/generated/skill-drafts-v2/mage-wars-v2-option-c-casting-audit.md` |

## 当前不做

- 不调用 `od media generate`。
- 不改真实 Board/UI。
- 不跑真实页面 E2E。
- 不做移动端适配。
- 不覆盖 v21 基线。
