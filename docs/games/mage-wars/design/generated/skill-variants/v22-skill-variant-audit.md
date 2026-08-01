# Mage Wars PC Open Design 多 skill 候选审计

> 状态：`comparison-candidates / implementation-blocked / mobile-blocked`。本批是 Open Design artifact 代码设计稿候选及其 Playwright 渲染截图，不是 `od media generate` 生图，也不是 Board/UI 实现。当前目标是给用户比较不同 UI 设计方法论方向；用户选定前不得进入真实实现。

## 使用的 skill / 方法论

| 候选 | 方法论来源 | 设计重点 | 取舍 |
| --- | --- | --- | --- |
| A `v22a-rules-tactical` | 项目 `boardgame-ui-imagegen` + `game-design` | 规则空间、2x3 区域、对象归属最强 | 法术书候选更克制，适合作为不再误读规则的基础版 |
| B `v22b-spellbook-operations` | `hicks-law-decision-optimization` + `user-centered-design` | 底部法术书浏览、分类、分页、已计划槽最清楚 | 占用底部最大，但已避开玩家法师牌和 HUD |
| C `v22c-cast-resolution` | `visual-player-guidance` + `fitts-law-ui-aiming` | 当前施法、目标、骰盘、确认动作主链最强 | 法术书相对压缩，适合施法结算体验优先 |

## 硬门禁结果

| 检查项 | A | B | C |
| --- | --- | --- | --- |
| Open Design artifact / 非生图 | PASS | PASS | PASS |
| `mediaGenerate=false` | PASS | PASS | PASS |
| 可见文案 / class / aria 无规则不存在的“手牌”牌区 | PASS | PASS | PASS |
| 双方玩家 HUD 不斜 | PASS | PASS | PASS |
| 法术书浏览：候选卡 + 分类 + 分页 | PASS | PASS | PASS |
| 己方法术书不压邪术师法师牌 / HUD | PASS | PASS | PASS |
| 场上卡牌唯一所属区域 | PASS | PASS | PASS |
| 骰盘贴近当前 B2 目标 | PASS | PASS | PASS |

## 几何证据

| 候选 | 法术书范围 | 候选卡数 | 分页 | 骰盘距目标中心 | 区域归属 |
| --- | --- | ---: | --- | ---: | --- |
| A | `left=492 top=892 width=810 height=178` | 5 | `1/4` | `139.09px` | 4/4 center inside, ownRatio `100%` |
| B | `left=420 top=882 width=990 height=188` | 5 | `1/4` | `139.09px` | 4/4 center inside, ownRatio `100%` |
| C | `left=438 top=920 width=820 height=152` | 5 | `1/4` | `139.27px` | 4/4 center inside, ownRatio `100%` |

## 文件

| 候选 | Open Design artifact | 渲染截图 |
| --- | --- | --- |
| A | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v22a-rules-tactical.html` | `docs/games/mage-wars/design/generated/skill-variants/step1-runtime-board-opendesign-artifact-v22a-rules-tactical.png` |
| B | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v22b-spellbook-operations.html` | `docs/games/mage-wars/design/generated/skill-variants/step1-runtime-board-opendesign-artifact-v22b-spellbook-operations.png` |
| C | `D:\codex-home\tools\open-design\.od\projects\mage-wars-ui-design\mage-wars-step1-runtime-board-v22c-cast-resolution.html` | `docs/games/mage-wars/design/generated/skill-variants/step1-runtime-board-opendesign-artifact-v22c-cast-resolution.png` |

## AI 建议

- 若首要目标是“不要再错规则、区域、弃牌/法术书权重”，选 A 做母版，再把 B 的法术书浏览尺寸吸收进去。
- 若首要目标是“玩家觉得法术书真的可操作、可翻找”，选 B 做母版，但后续需要继续压缩底部底板透明度，避免像大 HUD。
- 若首要目标是“施法动作和掷骰结算最有存在感”，选 C 做母版，再补 B 的浏览器承载。
- 我建议下一轮以 `A + B 吸收` 为主：A 保区域和规则空间，吸收 B 的候选卡尺度与分类/分页交互；C 的骰盘强调作为施法/攻击阶段子方案保留。
