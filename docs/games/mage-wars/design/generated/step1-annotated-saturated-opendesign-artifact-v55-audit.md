# Mage Wars 底图最低层开放叠层 v55 AI 图面核验

> 当前结论：`AI_PASS_REVOKED / REVISE / repeated-card-face-fields / card-readability-failed / human-review-blocked / implementation-blocked / mobile-blocked`。本稿是 Open Design artifact 设计稿，不是 `od media generate` 或图片模型生图；用户指出卡图本身已包含卡名、费用和规则字段，v55 在法术书候选与已计划卡下方重复写卡名，且 90x136 / 76x107 等卡牌尺寸不足以承担读卡任务，因此撤销人工验收资格。

## 核验对象

| 项 | 内容 |
| --- | --- |
| artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v55.html` |
| 渲染截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v55.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v55-geometry.json` |
| 前置包 | `docs/games/mage-wars/design/reference/step1-annotated-saturated-v52-preflight.md` |
| 视口 | `1920x1080` |
| 截图尺寸 / sha16 | `1920x1080` / `745efdcd9cc67c3f` |

## 撤销原因

| 用户追问 | 现实问题 | 裁定 |
| --- | --- | --- |
| 规则是否已经禁止信息重复 | 既有 UI 规范已经禁止卡面字段复写；v55 仍把法术书候选、已计划法术的卡名写在卡图外 | FAIL |
| 卡图本身是否已有名字 / 费用 | 学徒法术牌素材本身已包含牌名、费用、类型和正文；外部 UI 不应重复这些印刷字段 | FAIL |
| 能否参考 DiceThrone 节省空间 | DiceThrone 的成熟做法是卡图本体承载印刷信息，运行态只加费用可支付、可用、inspect / spotlight 等状态；v55 没有落实这一点 | FAIL |
| 当前尺寸是否适宜阅读 | 法术书候选卡约 `90x136`，已计划次卡约 `76x107`，当前来源卡约 `124x175`；这些尺寸最多能辨认图面，不能可靠阅读牌名、费用和正文 | FAIL |

## 本轮核心裁定

| 用户问题 | v55 处理 | 裁定 |
| --- | --- | --- |
| 设计机械避让中间地图，导致 UI 拥挤 | 竞技场底图按最低层承载处理；法术书和已计划法术作为开放叠层覆盖底部低权重石砖区域 | PASS |
| UI 覆盖不能遮挡规则对象 | 法术书、已计划、弃牌和回合结束均不与场上四张实体卡重叠；B2 目标、骰子、token 和区域标签可读 | PASS |
| 骰子 / token 不得省略 | 保留 4 枚攻击骰、1 枚效果骰、伤害、燃烧、守卫、行动、快速施法 token | PASS |
| 效果骰不能是程序化蓝圆 | v55 改用 Workshop `效果骰 / Die_12 / CardID 20400` 正式图 `effect-die-d12-face.png` | PASS |
| 不要规则不存在的手牌和伪确认 | 未出现 `手牌`；未出现常驻 `确认 / 执行 / 取消`；目标由 B2 `西锁骑士` 本体高亮承接 | PASS |
| 卡面信息不得外部复写 | 法术书候选卡和己方已计划卡在卡图下方重复写了卡名 | FAIL |
| 当前可支配卡牌必须可读 | 法术书候选、已计划次卡和当前来源卡尺寸不足；没有同屏可靠焦点 / hover / spotlight 放大承接 | FAIL |

## 机器审计摘要

| 检查项 | 结果 |
| --- | --- |
| 图片加载失败 | `brokenImages=0` |
| `手牌` 术语 | `false` |
| 常驻 `确认 / 执行 / 取消` | `false` |
| 目标摘要 / 大箭头 | `.target-summary=0`，`.action-path=0` |
| 弃牌堆正面图片 | `discardImages=0` |
| 当前来源 / 目标 | `fireballImgs=1`，`westlockImgs=1` |
| 骰子 | `attackDice=4`，`effectDice=1`，`effectDieImgs=1` |
| token / 标记 | `tokens=5` |
| 开放叠层是否覆盖底图 | `bookOverlapsArena=true`，`planOverlapsArena=true` |
| 叠层是否压住场上实体卡 | `protectedCardOverlayPairs=[]` |

## 玩家视角评分

| 维度 | 分值 | 裁定 |
| --- | ---: | --- |
| 任务清晰度 | 19 / 20 | 当前阶段是选择目标；玩家第一眼能看到右下 `火球术` 作为施法来源，B2 `西锁骑士` 是可选目标。 |
| 视觉层级 | 14 / 15 | 地图是下层主场景，法术书 / 已计划是开放叠层；当前结算骰和 token 锚在目标附近。 |
| 对象可识别性 | 14 / 15 | 法师牌、场上卡、法术书候选、已计划法术、骰子、token 和卡背均可辨认；效果骰已换正式素材。 |
| 状态与动作载体 | 15 / 15 | 真实对象本体承接目标选择；无目标摘要、大箭头、问号代理区或第二张目标卡。 |
| 布局完整性 | 14 / 15 | 法术书和已计划不再机械避让底图，也没有压住场上卡；底部叠层仍保留后续可继续打磨的视觉密度风险。 |
| 素材完整性 | 10 / 10 | 正式竞技场、法师牌、学徒法术牌、卡背、攻击骰、效果骰和 token 均进入图面，无破图。 |
| 操作人体工学 | 9 / 10 | 来源、目标、骰子结果在同一视觉路径上；回合结束是普通命令并保持低权重。 |

总分撤销：旧 `95 / 100` 只覆盖层级、素材和几何；未覆盖“卡面字段复写”和“读卡尺寸”。当前硬失败项：`repeated-card-face-fields`、`card-readability-failed`。

## 负向影响检查

| 调整 | 可能负面影响 | 当前承载 |
| --- | --- | --- |
| 允许法术书覆盖底图 | 可能遮挡地图可读性 | 只覆盖底部低权重石砖和未参与当前点击的空地；不压区域标签和场上卡 |
| 去掉底部面板底板 | 可能降低牌区归属 | 通过卡牌实体、分类书签、页码和局部阴影表达“法术书浏览器”，不靠封闭盒子 |
| 已计划区进入主舞台下方 | 可能误读成场上对象 | 已计划卡位于 B3 外侧低层叠区，几何上不压 `缠绕藤蔓`；标题 `己方已计划` 与来源徽标区分职责 |
| 弃牌堆继续降权 | 玩家可能忽略归档入口 | 右下保留小卡背堆叠与 `弃牌 3`，作为公开检视入口，不与当前来源同权 |

## 阶段边界

- 允许：作为历史失败候选和 v56 重构输入继续引用。
- 禁止：继续打开 v55 给用户做人工作图验收；禁止据此实现真实 Board/UI、启动真实运行页、跑实现 E2E 或进入移动端适配。
- 下一步：按 DiceThrone 的卡图本体 / inspect 放大不变量重构 v56，删除卡外复写字段并提升当前来源 / 候选卡读卡尺寸。
