# Mage Wars UI 方案用户选择 brief

> 状态：`selection-brief / v1-drafts-rejected / baseline-retained / awaiting-independent-drafts / implementation-blocked`。这是给用户快速判断用的摘要，不替代完整方案文档。`v21` 保留为“开始多设计稿之前”的基线候选；v1 多图因同页同母版被用户否定。下一批必须是多个独立 Open Design artifact 文件和独立 PNG。用户选定方向前，不实现 Board/UI，不做移动端。

## 已找到并使用的 UI 设计 skill

| skill | 用途 | 对本次设计的贡献 |
| --- | --- | --- |
| `ui-design-pipeline` | 主流程 | 强制先做文字 UI 设计，不能直接画旧稿变体 |
| `game-design` | 玩家任务和规则空间 | 让棋盘、目标、回合阶段从玩法问题出发 |
| `frontend-design` | 视觉与动效 | 防止边框 UI，强调素材主体和动作因果链 |
| `ui-ux-pro-max` | 可访问性底线 | 保留焦点、命中区、对比度、反馈；不采纳其目录页风格误判 |
| `existing-ui-design-baseline` | 旧稿边界 | 确认本轮是重做，不继承 v21/v22 母版 |

## 四套方案一句话

| 方案 | 一句话 | 你应该选它如果 | 最大风险 |
| --- | --- | --- | --- |
| A 战场棋盘优先 | 棋盘和 `2x3` 区域是绝对主角 | 你最担心规则空间、区域归属和卡牌骑线 | 法术书浏览不够强 |
| B 法术书工作台优先 | 底部法术书像一个完整操作台 | 你最关心法术候选、分类、分页和已计划槽 | 棋盘容易被压缩 |
| C 施法结算舞台优先 | 当前法术、目标、骰子、伤害组成主动作链 | 你最关心攻击掷骰、FX 和谁影响谁 | overlay 设计难度最高 |
| D 可访问专家操控优先 | 稳定 dock + 清楚焦点 + 大命中区 | 你最关心可点、可读、可稳定实现 | 容易像后台边栏，不够有游戏感 |

## 低保真结构草图

完整 A/B/C/D 和推荐组合的 1920x1080 结构缩略图见 `docs/games/mage-wars/design/reference/skill-driven-layout-thumbnails.md`。这份草图只用于判断空间关系，不是 Open Design 视觉稿。

## v1 草稿图复盘

> v1 草稿图来自 Open Design artifact 代码渲染，`mediaGenerate=false`，未调用图片模型生图。但用户已裁定它们“长一个样子、比之前更差”。因此以下路径只作为失败复盘，不再作为选择入口。

| 顺序 | 图 | 路径 | 用途 |
| ---: | --- | --- | --- |
| 1 | 总览对比 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-overview.png` | 失败复盘：同页同母版 |
| 2 | A 战场棋盘优先 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-a.png` | 失败复盘：同一棋盘母版 |
| 3 | B 法术书工作台优先 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-b.png` | 失败复盘：只是底部权重变化 |
| 4 | C 施法结算舞台优先 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-c.png` | 失败复盘：遮罩更脏 |
| 5 | D 可访问专家操控优先 | `docs/games/mage-wars/design/generated/skill-drafts/mage-wars-ui-draft-d.png` | 失败复盘：右侧 dock 仍像旧母版 |

## 基线保留

| 类型 | 路径 | 用途 |
| --- | --- | --- |
| 多设计稿前基线 HTML | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v21.html` | 后续新稿对照，不得覆盖 |
| 多设计稿前基线 PNG | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21.png` | 后续 PureRef 对照第一张 |
| 基线审计 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v21-audit.md` | 记录基线当时通过点和仍需人工批准的边界 |

## v2 独立设计稿要求

- 每套设计稿必须是独立 HTML artifact 和独立 PNG，不再塞进同一个页面。
- 每套必须改变主焦点、操作路径、法术书承载形态和玩家信息放置方式；不能只换颜色、大小或局部权重。
- v21 作为第一张基线对照图保留，v2 方案只作为新候选，不覆盖基线。

## 建议选择

我建议下一张 Open Design PC 稿采用：

```text
C 的施法结算舞台
+ B 的底部法术书工作台
+ A 的 2x3 区域锚点
+ D 的可访问性硬门禁
```

理由：

- 用户已经多次指出骰子 / 攻击结算应该在主舞台，C 直接解决这个核心失败。
- 用户明确要求底部一排法术候选、分类、分页，必须吸收 B。
- Mage Wars 的区域和对象归属不能再错，必须吸收 A。
- 命中区、焦点、可读性不能再靠感觉，必须吸收 D。

## 你只需要回一句

- `选 A`：先把棋盘和规则空间做到最稳。
- `选 B`：先把法术书工作台做到最好。
- `选 C`：先把施法 / 攻击 / 骰子结算做到最好。
- `选 D`：先把可点、可读、可实现做到最稳。
- `按推荐组合继续`：用 `C+B+A+D` 组合生成下一版 Open Design PC 设计稿。

## 选定后的下一步

1. 写 `v23-preflight.md`：把选定方案转成出稿前硬回执。
2. 生成 Open Design artifact：仍然 `mediaGenerate=false`，不走图片模型生图。
3. 渲染 PC 截图并做 AI 图面核验。
4. AI PASS 后再用 PureRef 打开给用户人工验收。
5. 用户批准前仍不实现真实 Board/UI。
