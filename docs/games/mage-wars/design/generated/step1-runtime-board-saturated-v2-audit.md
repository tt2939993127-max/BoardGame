# 法师战争 Step 1 Open Design v2 饱和设计稿审计

> 状态：`REJECTED / failed-candidate / human-review-not-allowed`。本文件撤销旧的 `AI_PASS` 结论。用户已指出该候选稿没有正确参考 DiceThrone 骰子贴图用法、没有根据 Mage Wars 核心素材重新建立 UI 风格、玩家生命 / 法力读数仍像直接贴状态板素材、饱和状态表现为素材乱炖而不是有组织的完整游戏界面。因此该稿不得打开给用户人工验收，也不得作为后续实现依据。

## 失败产物

| 项 | 路径 / 值 |
| --- | --- |
| Open Design artifact | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-saturated-v2.html` |
| 审计截图 | `docs/games/mage-wars/design/generated/step1-runtime-board-saturated-v2.png` |
| HTML 源 | `docs/games/mage-wars/design/generated/mage-wars-step1-saturated-v2.html` |
| 构建脚本 | `temp/mage-wars/design-redesign/build-saturated-v2.cjs` |
| 当前处理 | 保留为失败证据；不得送人工验收；不得作为 Board/UI 实现合同 |

## 撤销原因

| 用户反馈 | 现实含义 | 裁定 |
| --- | --- | --- |
| 没看 DiceThrone 骰子贴图用法 | 没有先参考成熟骰子组件如何把物理 / 交互层和正式骰面贴图分开 | `FAIL` |
| UI 风格没有根据 Mage Wars 核心素材重新设计 | 棋盘、卡牌、token、骰子没有成为统一视觉语法，仍像通用暗色界面套素材 | `FAIL` |
| 玩家血量面板不应继续直接放原素材 | 生命、法力、聚魔、伤害这类动态读数应使用清晰自制 UI；状态板素材只能作为规则 / 设置 / 检视参考或局部来源 | `FAIL` |
| 饱和不是乱炖 | 高对象数必须有主次、分组、隐藏信息边界、当前动作焦点和溢出策略；不能靠堆叠素材证明完整 | `FAIL` |
| 没有先交 UI 设计让用户确认 | 当前流程应停在文字版 UI 设计审核，用户确认后才进入 Open Design / 设计稿 | `FAIL` |

## 返工前置

- 先完成并等待用户确认 `docs/games/mage-wars/design/reference/step1-runtime-board-saturated-ui-design.md`。
- 设计稿前必须重新绑定 DiceThrone 骰子参考：`docs/games/dicethrone/dice-box-threejs.md`、`src/games/dicethrone/ui/Dice3D.tsx`、`src/games/dicethrone/ui/DiceTray.tsx`。
- Mage Wars 攻击骰必须由 `public/assets/i18n/zh-CN/mage-wars/dice/attack-die-texture.png` 或等价正式皮肤承载；效果骰按蓝色 12 面程序化对象，不得画成普通 D6、数字方块或黑盒骰盘。
- 常驻玩家状态必须改为自制运行态 UI：生命条、法力条、聚魔短读数、伤害状态、行动 / 快速施法标记；不得把整张法师状态板当玩家血量面板常驻主 HUD。
- 下一版设计稿必须模拟有组织的饱和交互状态：主棋盘、当前行动、私密计划区、隐藏结界、反制等待、骰盘结算和对象状态各有固定职责。

## 当前结论

旧结论 `AI_PASS / human-review-allowed` 已撤销。当前只能继续做 UI 设计审核和返工准备；未获用户确认前，不得生成新的 Open Design artifact、不得出图、不得打开人工验收图。
