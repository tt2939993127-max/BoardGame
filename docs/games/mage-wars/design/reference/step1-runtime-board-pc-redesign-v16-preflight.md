# 法师战争 Step 1 PC Open Design v16 出图前硬回执

> 状态：`REVISE / visual-overlap-risk / media-generate-forbidden / human-review-blocked`。v16 从 v15 分叉，目标是解决用户指出的奇怪 UI 重叠，但复核后仍未达人工验收标准。

## 继承的规则前提

- 当前主链仍限定为：竞技场、当前施放法术、目标、费用、确认 / 取消、攻击骰和 12 面效果骰。
- 法术书、已计划法术和弃牌堆属于所属玩家边缘牌区；弃牌堆是公开归档入口，不进入中央舞台。
- 正式卡牌、竞技场、骰面和 token 继续使用 Open Design artifact 中的 `refs/mage-wars-step1/**` 素材；未调用 `od media generate`。

## v16 修正点

| v15 失败点 | v16 处理 | 复核结论 |
| --- | --- | --- |
| 底部牌区与当前施法卡互相挤 | 火球术独立移到竞技场下方，底部牌区收紧 | 仍形成底边贴边和重复焦点 |
| 聚魔 token 盖在法师牌上 | token 移到 HUD 附近 | 仍像压在 HUD 上，视觉不够干净 |
| 左下法师牌擦到竞技场边 | 初步移动槽位 | 仍需在 v17 彻底分离 |

## 人工验收状态

当前状态：`human-review-blocked`。v16 只保留为中间失败候选，不得打开人工验收。
