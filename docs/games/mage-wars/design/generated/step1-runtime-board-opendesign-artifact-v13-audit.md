# 法师战争 Step 1 PC Open Design v13 图面审计

> 结论：`AI_PASS_REVOKED / overlap-hard-failure / human-review-blocked / implementation-blocked`。v13 曾被误判为可送人工验收；复核原始截图后确认右下骰盘压住场上卡牌，属于 UI 重叠硬失败。用户明确批准前仍禁止进入 Board/UI 实现、真实页面 E2E 或移动端适配。

## 审计对象

| 项 | 内容 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v13.html` |
| 导出截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-opendesign-artifact-v13.png` |
| 截图尺寸 | `1920x1080` |
| 路线 | Open Design artifact；`mediaGenerate=false`；未调用图片模型生图 |

## 机器检查

| 检查 | 结果 |
| --- | --- |
| 图片请求失败 | `0` |
| 坏图 / 空图 | `0` |
| HTML 图片引用 | `38` 次引用，`26` 个唯一资源，`missing=[]` |
| 禁止牌区词 | artifact 未出现规则不存在的默认持牌区相关词 |
| 旧几何重叠检查 | `issues=[]`；该检查漏掉了骰盘与场上卡牌之间的碰撞，不能作为通过证据 |
| 复核几何重叠检查 | `dice-cluster` 与 `field-card vine` 相交约 `10345px²` |

## 玩家视角审计

| 维度 | 判定 | 说明 |
| --- | --- | --- |
| 第一眼主线 | REVISE | 主视觉仍能识别施法动作，但骰盘覆盖场上生物 / 魔物卡区域，干扰玩家读取场上对象。 |
| 牌区落位 | PASS | 己方法术书 / 已计划 / 弃牌堆在己方下边缘；对手法术书 / 已计划 / 弃牌堆移到右侧对手边缘，不再压竞技场上沿。 |
| 弃牌堆权重 | PASS | 弃牌堆只作为所属玩家边缘归档入口，未进入中央施法链。 |
| 重叠 / 保护槽位 | FAIL | v11 的左下压叠和 v12 的上沿压叠有所缓解，但 v13 新增右下骰盘与场上卡牌碰撞；结算 UI 侵入场上对象保护槽位。 |
| 正式素材使用 | PASS | 竞技场、法师牌、法术牌、卡背、行动 / 快速施法 token、守卫 / 伤害 / 聚魔 token 和攻击骰面均来自正式素材输入。 |
| 程序化 UI | PASS | 费用为古铜多边形费用石；效果骰为蓝色 12 面对象；动态读数贴法师对象，不复现状态板。 |
| 主界面文案 | PASS | 主 UI 只保留对象名、数值、短状态和按钮标签，没有规则解释句。 |

## 失败点

- v13 不得打开给用户人工验收。
- v13 的失败不是素材加载问题，而是结算 UI 与场上对象空间预算错误。
- 下一版必须把攻击骰 / 效果骰放入独立结算槽，且几何检查必须覆盖骰盘、场上卡牌、状态 token、牌区、确认区和双方 HUD。
