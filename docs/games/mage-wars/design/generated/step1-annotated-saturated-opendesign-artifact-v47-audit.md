# Mage Wars 标注图饱和布局 v47 图面审计

> 结论：`AI_PASS_REVOKED / human-review-blocked / open-design-artifact-only / mediaGenerate=false / implementation-blocked / mobile-blocked / v48-required`。本图是 Open Design artifact 的导出审计图，不是图片模型生图，也不是运行时实现。用户复核指出对手计划槽位、问号区域规则必要性和分页样式没有按标注图与规则身份正确裁定，因此 v47 不再允许人工验收。

## 审计对象

| 项 | 内容 |
| --- | --- |
| artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-annotated-saturated-v47.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v47.png` |
| 几何审计 | `docs/games/mage-wars/design/generated/step1-annotated-saturated-opendesign-artifact-v47-geometry.json` |
| 阶段 | 行动目标选择 + 攻击压力饱和态 |

## 图面事实记录

> 本节只记录截图事实，不作规则裁定；裁定统一放到下一节的规范引用矩阵。

| 事实对象 | v47 图面证据 |
| --- | --- |
| 用户标注元素 | 左下玩家区存在；书签式分类 `5 个`；底部法术书浏览 `5 张候选`；右下计划区 `2 张已计划`；计划关系箭头存在；回合结束按钮 `1 个` |
| 攻击骰 / 效果骰 | `5 个`，距目标约 `224px`，位于目标附近上层 |
| token | `9 个`，含行动、快速施法、守卫、伤害、燃烧、聚魔、就绪；目标 token 贴附目标附近 |
| 对手隐藏信息 | 已计划法术只显示卡背和数量 |
| 常驻命令 | 确认 / 执行 / 取消控件数量 `0`；回合结束按钮数量 `1` |
| 区域锚点 | `4` 张场上卡声明区域且中心在区域内 |
| 规则术语 | 上屏使用“法术书浏览 / 已计划法术 / 弃牌堆”；字符串统计 `{"defaultHoldingAreaTerm":0,"cardFieldRewrite":0,"instructionCopy":0}` |

## 规范引用验收矩阵

> 规范单一来源：`docs/games/mage-wars/design/reference/step1-runtime-board-saturated-ui-design.md`。本节不得新增规则，只能引用该文件或相关设计合同的既有条款。

| 设计规范条款 | v47 图面证据 | 结论 |
| --- | --- | --- |
| `对手计划必须按席位镜像`、`对手已计划法术区` | 对手已计划法术挂在对方法师右侧状态区，没有放到左上镜像槽 | 不符合，v48 必须重构 |
| `问号区只保留规则职责` | 左下大玩家区、底部当前来源大卡、右下大计划框和关系箭头仍像独立规则区 | 不符合，v48 必须逐项裁掉无规则职责区域 |
| `分页样式继承用户标注` | 分页仍是漂浮圆形小按钮，没有贴近法术书书页边缘 | 不符合，v48 必须改为贴边 / 页角翻页 |
| `直接执行 / 撤选` | 常驻确认 / 执行 / 取消控件数量 `0` | 符合，但只能作为规范引用结论，不再单独列为验收规则 |
| `攻击 / 治疗需要骰子结算`、`素材职责矩阵 / 真实素材主体` | 攻击骰、效果骰和目标 token 出现在目标附近上层 | 符合，但不抵消上方失败项 |
| `规则里没有“手牌”却把卡牌区画成手牌`、`卡面字段不需要 UI 代抄` | 上屏术语未出现默认持牌区词；UI 未另写费用 / 射程 / 骰数 / 效果文本 | 符合，但不抵消上方失败项 |
| `空间预算`、`场上卡必须保留唯一 zoneId 和可见区域归属` | `4` 张场上卡声明区域且中心在区域内 | 符合，但不抵消上方失败项 |

## 撤销原因

v47 的失败不是因为缺少一个新的验收清单，而是因为它相对设计规范仍有三项不符合：对手计划没有左上镜像、问号区没有规则职责裁定、分页没有使用用户标注的贴边 / 页角样式。因此 `AI_PASS` 撤销，不能进入人工验收。

## 阶段边界

- 本稿只证明 PC Open Design 设计稿候选。
- 用户明确批准前，真实 Board/UI、运行页 E2E 和移动端适配仍冻结。
- v47 已降为失败候选；下一稿必须先消费 Mage Wars 专项 UI 设计规范后再生成，本审计只作为失败证据记录。
