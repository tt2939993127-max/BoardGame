# Mage Wars Step 1 PC Open Design v32 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-only / media-generate-forbidden / v31-user-review-failed / human-review-not-allowed-until-ai-pass`。v32 是 v31 用户验收失败后的重新构图，不是沿 v31 微调。目标是解决底部卡牌区不可读、右下空间未有效分流、B2 中央结算拥挤。

## 本轮前提锁定

| 项 | 锁定结果 |
| --- | --- |
| 问题对象 | Mage Wars 学徒模式 PC Open Design Step 1 运行时主界面设计稿，v31 人工验收失败后重构为 v32 |
| 真相来源 | 当前轮次读取 v31 原图、`ui-design-pipeline`、`game-design` UCD / Hick / Fitts / visual guidance、`ui-ux-pro-max`、`boardgame-ui-imagegen`、`ui-change-gates.md`、学徒法术书合同、素材输入包和外部游戏 UI 范式 |
| 目标入口 / 环境 | Open Design artifact 代码设计稿：`D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v32.html`；`mediaGenerate=false` |
| 验收口径 | 先 AI 图面核验；只有 AI PASS 才允许打开给用户人工验收。用户批准前实现、真实页面 E2E 和移动端继续冻结 |

## v31 用户失败点保真记录

| 用户反馈 | v32 设计要求 |
| --- | --- |
| 底部卡牌区不是给玩家看的 | 当前可执行对象必须变成可读大卡；非当前法术书浏览降级为入口 / 分类 / 分页，不再铺不可读候选墙 |
| 右下角为什么空着 | 右下必须承接当前法术大图和关键结算摘要，并且要真实减少底部/中心压力，不只是放装饰 |
| 中间拥挤看不出来 | B2 只保留目标卡、克制骰组和结果 token；移除路径线、重复状态和候选卡挤压 |

## 外部范式回代

| 来源 | 采用结论 | v32 设计动作 |
| --- | --- | --- |
| BGA Studio Guidelines | 桌游数字化主游戏区居中、接近实体桌面；交互对象不应过小 | 竞技场仍居中；可点击牌堆/分页按 32px 以上设计；当前卡变大 |
| Magic Online card zoom update | 卡牌游戏读卡不能依赖难发现的额外操作 | 同屏给火球术大卡焦点；当前法术本体也保持大尺寸 |
| Game UI Design Guide | 忙态要检验可读性、可达性和反馈，不看安静 artboard | v32 按结算忙态设计，不以空态或几何不重叠过关 |
| HUD / gaze guidance | 关键反馈不能把视线从当前动作拉远 | 骰子和结果仍贴 B2 目标；右下只做详情放大，不承接主结算 |

## 空间预算

| 区域 | 最大可见对象 | 最小可读尺寸 / 策略 | 让位顺序 |
| --- | ---: | --- | --- |
| 竞技场主舞台 | 4 张场上卡 + 1 个目标高亮 + 1 组结算 | 场上卡约 `96x135`；骰子不压目标卡；结果 token 贴目标下沿 | 先删路径线、再删重复状态、再压缩非当前 HUD |
| 当前来源 | 2 张已计划法术 | 当前火球术约 `164x231`；另一张约 `116x164` | 保留已计划，完整法术书让位 |
| 法术书浏览 | 牌堆入口 + 分类 + 页码 | 本状态不展示小候选墙；浏览由抽屉 / 后续状态承接 | 永远让位给已计划法术和结算 |
| 右下焦点 | 1 张大卡 + 两个短状态 | 焦点卡约 `210x296` | 只承接读卡，不替代主结算 |
| 归档入口 | 弃牌堆小入口 | 只显示顶牌 / 数量，不进中央 | 永远让位给当前来源和结算 |

## 前置硬失败禁止清单

- 底部再次出现不可读卡牌墙。
- 右下仅放装饰或重复信息，不能减轻底部/中心压力。
- B2 同时叠目标、骰子、token、路径线、候选卡和长标签。
- 规则不存在的手牌 / hand / opponent-hand。
- 常驻确认 / 取消 / 提交 / 下一步。
- 用户批准前进入真实 Board/UI、真实页面 E2E 或移动端。
