# 战场指挥态 AI 几何预审

> 状态：`PASS_FOR_VISUAL_REVIEW`。本文件只证明字符串、区域锚点和结算落位预审；最终仍要 AI 肉眼看图后决定是否打开给用户。

| 项 | 结果 |
| --- | --- |
| PNG | `mage-wars-v3-battlefield-command.png` |
| mediaGenerate | `false` |
| 禁止图面词命中 | `0` |
| 禁止源码词命中 | `0` |
| 场上卡最小所属区域占比 | `1` |
| 场上卡中心均在所属区域 | `true` |
| 骰盘到目标距离 | `N/A` |

## 设计前置证据块

- 规则来源：学徒法术书组成、91 张学徒牌字段合同、主 UI 素材矩阵、2x3 区域锚点合同。
- 规则映射：法术书 / 已计划法术 / 弃牌堆命名；对手隐藏信息卡背；场上卡唯一所属区域；结算骰在目标附近。
- 素材链：artifact 使用 `refs/mage-wars-step1/` 内正式竞技场、法师牌、法术牌、卡背、token 和攻击骰面。
- 人工验收：AI 肉眼图面核验 PASS 前仍为 `human-review-not-allowed`。