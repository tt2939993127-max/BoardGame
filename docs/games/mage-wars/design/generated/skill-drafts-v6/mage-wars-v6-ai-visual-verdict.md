# 法师战争 v6 Open Design AI 图面核验

> 状态：`AI_PASS_REVOKED / human-review-blocked / implementation-blocked-until-user-approval`。本文件原先裁定 v6 三套 PC Open Design 设计稿可以送用户人工比较；该裁定已按用户反馈撤销。v6 三稿虽然是独立 artifact / PNG，且未进入真实 Board/UI、未进入移动端、未调用 `od media generate`，但图面仍共用同一棋盘壳、同一 HUD 语言、同一素材摆法和同一施法结算构图，只是局部权重变化，不满足“多个真正不同设计稿”的需求。

## 用户反馈撤销原因

| 问题 | 结论 | 后续约束 |
| --- | --- | --- |
| 多稿差异不足 | 三张都保留同一 `2x3` 棋盘主体、同一左右玩家 HUD、同一火球术目标链、同一棕色边缘工作台视觉语法 | 下一轮必须先做文字 UI 设计轴重分配，不得从 v6 局部微调 |
| “独立文件”被误当成“独立设计” | v6 满足文件独立，但没有在主交互路径、空间模型、信息组织和视觉语法上拉开足够距离 | 多方案必须至少改变三项：空间模型、主点击路径、玩家信息区、素材主体职责、结算反馈层 |
| 人工验收不成立 | 用户明确指出“大差不差”，因此 AI_PASS 不能继续作为送验依据 | v6 只能作为失败复盘输入，不得再次打开为通过候选 |

## 共同核验结论

| 检查项 | 结论 | 证据 |
| --- | --- | --- |
| 交付形态 | PARTIAL | 三套均为独立 Open Design HTML artifact + 独立 PNG；未调用 `od media generate`，但独立文件不等于独立设计 |
| 规则状态 | PASS | 同一饱和状态：邪术师使用已计划 `火球术`，目标为女祭司侧 `西锁骑士` |
| 牌区语义 | PASS | 只出现法术书、已计划、弃牌堆、隐性结界；未出现“手牌 / hand” |
| 区域规则 | PASS | 三套均为 `2列 x 3行` 六区域；所有场上卡中心点在所属区域内 |
| 素材主体 | PASS | 竞技场、法师牌、法术牌、卡背、骰面、伤害 / 守卫 / 行动 token 使用正式输入包素材 |
| 隐藏信息 | PASS | 对手已计划法术和隐性结界只显示卡背，不泄露正面或卡名 |
| 结算位置 | PASS | 攻击骰、效果骰、伤害和燃烧贴近西锁骑士目标区域；未放入右侧日志或远端侧栏 |
| 实现阶段 | PASS | 只生成设计稿候选；未进入真实 Board/UI、真实游戏页 E2E 或移动端 |
| 多稿差异 | FAIL | 三稿视觉骨架和操作语法过近，不能作为三套真正不同的设计稿 |

## 候选 1：竞技场战术桌

| 项 | 判断 |
| --- | --- |
| 文件 | `docs/games/mage-wars/design/generated/skill-drafts-v6/mage-wars-v6-arena-tactical-table.png` |
| Open Design 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v6-arena-tactical-table.html` |
| 主焦点 | `2x3` 竞技场、场上卡、目标确认 |
| AI 结论 | REVISE，旧 PASS 撤销；只能作为同壳失败复盘输入 |
| 对玩家友好点 | 棋盘占比高，区域边界、目标高亮、骰子和确认条都围绕当前目标；法术书和弃牌堆降为边缘入口 |
| 风险 | 底部法术书浏览较轻，若用户优先关注“怎么找法术”，此稿不如第二张 |

## 候选 2：法术书底部浏览器

| 项 | 判断 |
| --- | --- |
| 文件 | `docs/games/mage-wars/design/generated/skill-drafts-v6/mage-wars-v6-spellbook-bottom-browser.png` |
| Open Design 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v6-spellbook-bottom-browser.html` |
| 主焦点 | 法术书分类、分页、候选卡与已计划槽 |
| AI 结论 | REVISE，旧 PASS 撤销；只能作为同壳失败复盘输入 |
| 对玩家友好点 | 明确回应底部一排法术候选、分类按钮和分页；已计划 2 槽与全书候选分开 |
| 风险 | 底部工作台较重，棋盘垂直空间少；后续实现需要严格防止再次压住场上对象 |

## 候选 3：开放施法链路

| 项 | 判断 |
| --- | --- |
| 文件 | `docs/games/mage-wars/design/generated/skill-drafts-v6/mage-wars-v6-open-casting-lane.png` |
| Open Design 源 | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-v6-open-casting-lane.html` |
| 主焦点 | 来源法师、火球术、骰子、目标和确认形成一条开放施法链 |
| AI 结论 | REVISE，旧 PASS 撤销；只能作为同壳失败复盘输入 |
| 对玩家友好点 | 最明显地表达谁对谁施法、骰子为什么在那里、伤害和燃烧作用于谁；HUD 最轻 |
| 风险 | 当前法术卡作为主舞台叠层较强，后续若实现动效，需要保证它在目标选择态退场或不遮挡可点对象 |

## 人工验收口径

- 这三张图不得再次作为通过候选打开给用户比较。
- 用户批准前，状态仍是 `implementation-blocked-until-user-approval`。
- 下一步必须先重写需求简述和多设计轴合同，再生产新的 Open Design artifact；不得从 v6 微调后继续送验。
