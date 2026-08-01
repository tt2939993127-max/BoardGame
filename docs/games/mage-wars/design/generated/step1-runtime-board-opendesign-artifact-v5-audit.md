# 法师战争 Step 1 Open Design Artifact v5 审计

> 状态：`AI_PASS / open-design-artifact / human-review-allowed / runtime-coordinate-mapping-pending`。本审计只针对 `mage-wars-step1-runtime-board-v5.html` 这个 Open Design artifact 代码设计稿及其 1920x1080 渲染截图；它不是 `od media generate` 生图结果，也不表示运行时 Board UI 已实现。

## 产物

| 项 | 路径 / 结果 |
| --- | --- |
| Open Design artifact 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v5.html` |
| Open Design artifact 元数据 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v5.html.artifact.json` |
| 渲染审计截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v5.png` |
| 截图尺寸 | `1920x1080` |
| 截图字节 | `2682737` |
| 截图 sha256 | `85F922363829CBD8165FB3F7A1E66FC6959E8A0904C1894248B6745FB72429A8` |
| 素材加载 | `26` 张图片全部 `complete` 且有自然尺寸 |
| 导出说明 | 使用 Playwright 渲染同一个 Open Design artifact HTML 产出审计截图；没有调用 `od media generate`、imagegen 或 media provider。 |

## 本轮启动自证

| 门禁 | 本轮结论 |
| --- | --- |
| 规则页段 | 已重读 `page_004.md`、`page_006.md`、`page_007.md`。 |
| 规则到画面 | 学徒模式只使用标准竞技场一半，即 `2x3`；当前画面直接呈现玩家可见的 `2x3` 学徒竞技场本体，不再把被忽略半场画入主舞台；区域距离仍按水平 / 垂直相邻理解；行动 / 快速施法 token 贴近法师牌；状态板只作为 setup 来源。 |
| 素材输入链 | artifact 直接引用 `refs/mage-wars-step1/**` 的正式竞技场、法师牌、学徒法术牌、卡背、行动 token、快速施法 token、守卫 / 伤害 token、攻击骰贴图；生命 / 法力 / 聚魔读数走 `approved-programmatic-runtime-ui`。 |
| 禁止替代 | 未引用 `mage-status-board.png` 作为主 UI 面板；未引用 `temp/` 临时裁图；未使用图片模型链。 |
| 人工验收 | 允许。v5 不把左 / 右源图半场作为玩家可见合同；运行时区域坐标映射仍需在实现前另行锁定。 |

## 规则 / 素材核验

| 门禁 | 结论 |
| --- | --- |
| 学徒半场 | PASS：画面只显示一个 `2x3` 学徒竞技场，不再显示右侧或左侧“忽略半场”，避免把未锁定的源图半场方向固化给玩家。 |
| 当前动作链 | PASS：火球术从己方手牌区抬升，火焰路径指向西锁骑士，确认 / 取消贴近当前目标。 |
| 规则目标 | PASS：火球术 `0-2`、目标为生物或魔物；画面中有合法目标、越距对象、确认入口和资源预扣。 |
| 法师 / 法术书组合 | PASS：邪术师使用火球术；对手为女祭司；当前目标西锁骑士来自女祭司法术书。 |
| 素材主体 | PASS：竞技场、法师牌、学徒法术牌、法术卡背、行动 / 快速施法 token、守卫 / 伤害 token 和攻击骰均使用正式素材或正式 crop。 |
| 状态板裁定 | PASS：法师状态板未作为主界面玩家面板出现；生命 / 法力 / 聚魔 / 伤害使用贴近法师牌的自制运行态 HUD。 |
| 隐藏信息 | PASS：对手手牌与对手计划法术使用正式法术卡背；己方计划可见正面；没有公开对手私有牌名。 |
| 骰子 | PASS：攻击骰使用 `attack-die-texture.png`；效果骰为来源锁定的蓝色 12 面程序化对象。 |
| 少边框 | PASS：主舞台由竞技场裁切、卡牌、token 和光区承担；没有 v3 / v4 那种大块硬面板或被忽略半场遮罩。 |
| 主 UI 文案 | PASS：主界面只使用对象名、短状态、数值和按钮标签，没有常驻规则解释段落。 |

## AI 图面裁决

```text
verdict: PASS
score: 92/100
hard_failures: []
issues:
  - evidence: 运行时源码仍未锁定 `a1/a2/a3/b1/b2/b3` 到标准竞技场源图的最终坐标映射。
    impact: 不阻塞设计稿人工验收；但进入 Board/UI 实现前必须补坐标映射合同，不能直接把 v5 的裁切坐标当运行时真相源。
    fix: 人工验收通过后，在实现前更新 `board-coordinate-contract.md` 的运行时映射，并用真实页面命中区截图验证。
```

## 玩家友好性批判

| 画面细节 | 当前表现 | 玩家友好性 | 结论 |
| --- | --- | --- | --- |
| 学徒竞技场 | 只显示 `2x3` 学徒半场本体 | 玩家不会被“另一半忽略区域”分散注意力 | PASS |
| 当前目标 | 西锁骑士有目标标签、命中光点和确认按钮 | 玩家第一眼知道要点 / 确认哪张牌 | PASS |
| 当前法术 | 火球术从手牌区抬升，并用路径连到目标 | 来源、目标和动作链清楚 | PASS |
| 法力预扣 | 邪术师 HUD 显示 `法力 12 → 4` | 代价反馈简洁，不重复费用 | PASS |
| 快速施法 | 快速施法 token 贴近邪术师，有 `将翻面` 短状态 | token 承担状态，不靠说明正文 | PASS |
| 生命 / 法力 / 聚魔 HUD | HUD 贴近法师牌，自制血条 / 蓝条 | 动态读数清楚，符合“运行态读数可自制 UI”裁定 | PASS |
| 隐藏信息 | 对手手牌 / 对手计划均为卡背 | 私有信息边界清楚 | PASS |
| 骰子 | 右侧骰区独立显示攻击骰和效果骰 | 随机源可辨认，不压目标卡 | PASS |
| 手里的牌 | 火球术留空位，其它手牌仍可见 | 玩家理解这张牌从手里被抬起施放 | PASS |
| 框体感 | 主要靠棋盘、卡牌和光区分层 | 不再像 dashboard 或框中框 | PASS |

## 下一步准入

1. 现在可以打开 v5 给用户人工验收。
2. 人工验收若通过，才能进入 Board/UI 实现。
3. 进入实现前仍需补运行时坐标映射、命中区、atlas loader、骰子组件和隐藏信息视角验证。
