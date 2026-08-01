# 法师战争 Step 1 Open Design Artifact v4 审计

> 状态：`REVISE / visual-candidate-improved / side-selection-pending / human-review-not-allowed`。本审计只针对 `mage-wars-step1-runtime-board-v4.html` 这个 Open Design artifact 代码设计稿及其渲染截图；它不是 `od media generate` 生图结果，也不表示运行时 Board UI 已实现。v4 已修复 v3 的核心画面失败：法师、目标、合法对象和当前操作链均回到同一个 `2x3` 学徒半场候选内；但左半场仍是设计候选，不是规则或用户锁定，因此仍不能进入最终人工验收。

## 产物

| 项 | 路径 / 结果 |
| --- | --- |
| Open Design artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v4.html` |
| Open Design artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v4.html.artifact.json` |
| 渲染审计截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v4.png` |
| 截图尺寸 | `1920x1080` |
| 截图字节 | `3278784` |
| 截图 sha256 | `6021F93ED42DB5AC079FC6FA9DE5DE92FFD2E271E78BE4B0081B942FB44106B6` |
| 素材加载 | `26` 张图片全部 `complete` 且有自然尺寸 |
| 导出说明 | `od export` 的桌面截图链此前不可用；本轮仍用 Playwright 渲染同一个 artifact HTML 产出审计截图，没有调用 media / imagegen provider。 |

## 本轮启动自证

| 门禁 | 本轮结论 |
| --- | --- |
| 规则页段 | 已重读 `page_004.md`、`page_006.md`、`page_007.md`。 |
| 规则到画面 | 学徒模式使用标准竞技场一半 `2x3`；法师起始在同一半场两个对角；区域相邻只按水平 / 垂直；行动 / 快速施法 token 放在法师牌上；状态板只作为 setup 来源。 |
| 素材输入链 | artifact 直接引用 `refs/mage-wars-step1/**` 的正式竞技场、法师牌、学徒法术牌、卡背、行动 token、快速施法 token、守卫 / 伤害 token、攻击骰贴图；生命 / 法力 / 聚魔读数走 `approved-programmatic-runtime-ui`。 |
| 禁止替代 | 未引用 `mage-status-board.png` 作为主 UI 面板；未引用 `temp/` 临时裁图；未使用 `od media generate`、`imagegen` 或图片模型链。 |
| 人工验收 | 不允许。半场方向仍为 `left-half-design-candidate`，未锁定。 |

## 路线核验

| 检查项 | 结论 |
| --- | --- |
| 是否调用 `od media generate` | 否 |
| 是否依赖图片模型 / media provider | 否 |
| 是否为可编辑代码设计稿 | 是，HTML/CSS artifact |
| 是否使用 Open Design 项目相对素材 | 是，引用 `refs/mage-wars-step1/**` |
| 是否允许人工验收 | 否，项目合同仍要求先锁定学徒半场方向 |

## 规则 / 素材核验

| 门禁 | 结论 |
| --- | --- |
| 学徒半场一致性 | PASS-PARTIAL：画面中邪术师、女祭司、目标生物、守卫生物、行动 / 快速施法 token 和当前施法路径均落在左侧 `2x3` 候选半场；右侧半场被降噪为忽略区域。但左半场选择仍未被规则或用户锁定。 |
| 起始角落 | PASS：邪术师位于左半场左下角，女祭司位于左半场右上角，符合同一半场两个对角的画面语义。 |
| 当前动作链 | PASS：火球术从手牌抬升，火焰路径指向当前目标，目标卡上有短标签，确认 / 取消贴近目标区域。 |
| 规则目标 | PASS：火球术 `0-2`、目标为生物或魔物；目标生物在同一半场内，画面未再把对角不相邻当成常驻说明正文。 |
| 法师 / 法术书组合 | PASS：邪术师使用火球术；对手改为女祭司，并使用女祭司法术书中的西锁骑士作为当前目标。 |
| 素材主体 | PASS：竞技场、法师牌、学徒法术牌、法术卡背、行动 / 快速施法 token、守卫 / 伤害 token 和攻击骰均使用正式素材或正式 crop。 |
| 状态板裁定 | PASS：法师状态板未作为主界面玩家面板出现；生命 / 法力 / 聚魔 / 伤害使用贴近法师牌的自制运行态 HUD。 |
| 隐藏信息 | PASS：对手手牌与对手计划法术使用正式法术卡背，未公开对手私有牌面或卡名；己方计划可见正面。 |
| 骰子 | PASS：攻击骰使用 `attack-die-texture.png`；效果骰为蓝色 12 面程序化对象。 |
| 少边框 | PASS-PARTIAL：去掉了 v3 的硬格线和左侧决策框，区域状态主要由地面光区表达；仍保留少量半透明 HUD，但它们贴近真实法师牌和目标链路。 |
| 主 UI 文案 | PASS：主界面只使用对象名、短状态、数值和按钮标签，没有常驻规则解释段落。 |

## AI 图面裁决

```text
verdict: REVISE
score: 88/100
hard_failures:
  - side-selection-pending：学徒半场方向仍为左半场设计候选，未由规则图例、实现合同或用户确认锁定，不能进入最终人工验收。
issues:
  - evidence: 画面已经统一到左侧 2x3 半场，但 README / 坐标合同仍明确“左半场或右半场未 locked”。
    impact: 若直接进入实现或人工验收，后续可能把错误半场方向固化为正式合同。
    fix: 由用户确认采用左半场，或补规则图例 / 实现合同锁定半场方向；确认后再生成 `AI_PASS / human-review-allowed` 版本。
```

## 玩家友好性批判

| 画面细节 | 当前表现 | 玩家友好性 | 结论 |
| --- | --- | --- | --- |
| 学徒半场 | 所有当前操作对象均在左侧六格内，右侧降噪为忽略半场 | 比 v3 清楚；玩家不会再误以为右半场也可选 | PASS-PARTIAL |
| 半场裁定 | 左半场仍是候选 | 对玩家最终验收不友好；实现前必须知道到底用哪半边 | REVISE |
| 起始法师 | 邪术师左下、女祭司右上 | 符合同一半场对角关系 | PASS |
| 当前目标 | 西锁骑士位于左半场中右区域，有 `当前目标` 短标签和命中光点 | 玩家第一眼能知道当前要打哪张牌 | PASS |
| 当前法术 | 火球术从手牌旁抬升，火焰路径连到目标 | 卡牌来源和目标关系比 v3 清楚 | PASS |
| 确认 / 取消 | 按钮贴在目标区域下方 | 玩家知道选定后怎么继续或退出 | PASS |
| 法力预扣 | 只保留在邪术师 HUD 的 `法力 12 → 4` | 消除了 v3 的重复费用表达 | PASS |
| 快速施法 | 快速施法 token 贴邪术师牌，并有 `将翻面` 短状态 | 比文字面板友好；token 承担状态 | PASS |
| 行动标记 | 红 / 蓝行动 token 贴近各自法师 | 贴近规则 setup，不再像散落 UI | PASS |
| 生命 / 法力 / 聚魔 HUD | HUD 贴近法师，未使用状态板原图 | 动态读数清楚，符合用户“血条蓝条可自制 UI”的要求 | PASS |
| 守卫 / 伤害 token | token 贴近场上卡牌 | 能看出状态归属，但后续实现仍需 tooltip / 层数合同 | PASS-PARTIAL |
| 骰子 | 右侧骰区显示 6 颗攻击骰和 12 面效果骰 | 不压目标、不替代卡牌，随机源可辨认 | PASS |
| 隐藏信息 | 对手手牌 / 对手计划均为卡背 | 私有信息边界清楚 | PASS |
| 己方手牌 | 火球术位置留空并显示抬升卡 | 玩家能理解从手牌进入施法 | PASS |
| 框体 / 边框 | 大面板减少，竞技场与卡牌成为主体 | 比 v3 更像 Mage Wars 牌桌 | PASS-PARTIAL |
| 常驻说明正文 | 无大段规则解释 | 不把规则书塞进主 HUD | PASS |
| 视觉密度 | 手牌、计划、骰子、目标、token 同屏 | 饱和但主链路仍清楚 | PASS-PARTIAL |
| 实现合同价值 | 素材路径和交互结构可作为下一版输入 | 仍不能实现，因为半场方向未锁 | REVISE |

## 下一步准入

1. 用户或规则 / 实现合同确认学徒半场方向：`左半场` 或 `右半场`。
2. 若确认左半场，可在当前 v4 基础上更新审计为 `AI_PASS / human-review-allowed`，再按看图规则打开给用户人工验收。
3. 若确认右半场，必须镜像重排全部法师、目标、生物、token、HUD 和火球术路径，再重新截图审计。
4. 在人工验收通过前，不得进入 Board/UI 实现。
