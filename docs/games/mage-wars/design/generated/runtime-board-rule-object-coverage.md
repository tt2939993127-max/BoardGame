# Mage Wars foundation Board 规则对象覆盖矩阵

> 角色：`evidence / drift-check`。本文件记录当前真实 `Board.tsx` foundation 实现如何承载规则对象；可用于送验前防遗漏，但不是独立规范来源。规范真相源为 `.spec/skills/mage-wars-ui-design-memory/SKILL.md`，用户纠正账本为 `docs/games/mage-wars/design/reference/user-correction-traceability-ledger.md`。

更新时间：2026-08-01，状态：`AI_OBJECT_SPLIT_PASS / full-ui-approval-not-implied`

## 当前现场

- 工作区：`D:\gongzuo\webgame\BoardGame\.worktrees\mage-wars`
- 真实入口：`/play/mage-wars`
- 实现文件：`src/games/mage-wars/Board.tsx`
- 饱和态构造：`e2e/mage-wars/foundation-board-runtime.e2e.ts`
- 最新桌面截图：`test-results/evidence-screenshots/mage-wars/foundation-board-runtime/e2e-desktop-board.png`
- 最新桌面截图时间：2026-08-01 12:44:10 +08:00
- 当前裁决：`AI_OBJECT_SPLIT_PASS 92/100`。旧 `AI_RECHECK_PASS 90/100` 已撤回；新图已把 HUD 玩家 / 法师提示卡、竞技场法师战场实体和完整规则卡职责拆开。但这只是“法师三对象混淆”问题的重审通过，不代表完整 Mage Wars UI 或后续完整游戏范围已获人工批准。
- TTS / atlas 证据：`public/assets/atlas-configs/mage-wars/mages-core-atlas.json` 中同一法师存在成对素材：完整规则卡 `2600/2605/2606/2603` 与肖像 / 人物提示视觉 `2601/2604/2607/2602`。实现和审计必须先裁定职责，不能凭 `card` / `portrait` 变量名猜。

## 三对象职责覆盖

| 规则对象 | UI 必要元素 | 布局锚点 | 素材 / 程序来源 | 验收方式 | 当前结论 |
| --- | --- | --- | --- | --- | --- |
| 己方法师战场实体 | 代表法师本人位置、来源 / 目标身份、伤害 token / 守卫 token 宿主 | `mageZoneId` 所属竞技场格内；即使同格有生物 / 魔物也必须可见 | foundation 当前使用完整法师规则卡 frame；代码锚点 `mage-wars-zone-mage-entity`，`data-mage-ui-role="mage-battle-entity"` | 饱和态截图在 A2 看见邪术师实体；E2E 断言 `data-mage-preview-kind="card"` 且中心在格内 | `visible` |
| 对手法师战场实体 | 代表对手法师本人位置、目标身份、公开状态 token 宿主 | `mageZoneId` 所属竞技场格内；同格有场上卡时不消失 | foundation 当前使用完整法师规则卡 frame；代码锚点 `mage-wars-zone-mage-entity`，`data-mage-ui-role="mage-battle-entity"` | 饱和态截图在 B2 看见女祭司实体；E2E 断言 `data-mage-preview-kind="card"` 且中心在格内 | `visible` |
| 玩家 / 法师提示卡 | 当前玩家归属、昵称上方提示、行动中 / 选择目标等短状态 | 己方左下、对手右上角色 HUD；不占竞技场区域锚点，不替代战场实体 | 肖像 / 人物提示视觉 frame；代码锚点 `mage-wars-mage-hud-hint-card`，`data-mage-ui-role="player-hint-card"` | E2E 断言 `data-mage-preview-kind="portrait"`；截图中提示挂 HUD，不挂场地 | `visible` |
| 法师规则卡 / 详情入口 | 完整能力文字和规则回看 | 详情 / inspect / 后续规则卡入口；默认不是 HUD 提示卡 | 完整法师规则卡 frame | foundation 当前未做独立详情入口；若使用完整规则卡承载战场实体，必须明确只承担战场实体职责 | `deferred-detail / not-hud` |
| 场上生物 / 魔物 | 正式卡图、合法目标高亮、结算 token 贴近目标 | 对应竞技场格内，不能把法师挤没 | 学徒法术 atlas | E2E 场上卡 4 张仍在，且不与法师战场实体重叠 | `visible` |
| 骰子 / token / 结算层 | 攻击骰、效果骰、伤害 token、燃烧 token | 主舞台上层，锚定来源 / 目标链 | 正式骰子和 token 素材 | E2E 素材断言 + 截图自审 | `visible` |

## Foundation 覆盖矩阵

| 规则对象 | 真相源 / 范围 | 当前阶段职责 | UI 承载 / 实体锚点 | 可见性结论 | 验收方式 |
| --- | --- | --- | --- | --- | --- |
| 学徒 2x3 竞技场区域 | foundation scope；区域合同 | 主空间、移动 / 目标选择、来源归属 | 标准竞技场底图 + 2x3 区域锚点；来源、目标、可移动格贴回区域本体 | `visible` | 桌面饱和态截图中区域、来源和目标高亮同屏可见 |
| 己方法师 | foundation scope；学徒模式生命 24 | 玩家状态、当前行动来源、资源读数 | 拆成 HUD 提示卡 + 竞技场 A2 法师战场实体；生命 / 法力 / 聚魔为程序化读数 | `visible` + `approved-programmatic` | `MageStatusBars`、`mage-wars-mage-hud-hint-card`、`mage-wars-zone-mage-entity` 与重拍饱和态截图 |
| 对手法师 | foundation scope；学徒模式生命 24 | 对手状态、目标 / 守卫状态 | 拆成 HUD 提示卡 + 竞技场 B2 法师战场实体；守卫 token 贴附状态 | `visible` + `approved-programmatic` | `mage-wars-mage-hud-hint-card`、`mage-wars-zone-mage-entity` 与重拍饱和态截图 |
| 己方法术书 6 张 | 学徒法术书合同；用户要求 6 张 | 当前可支配候选集合 | 底部 `SpellbookShelf`，6 张正式 atlas 卡图，左侧分类标签 | `visible` | E2E 饱和态截图；`mage-wars-desktop-spellbook-card` |
| 己方已计划法术 2 张 | 学徒计划规则；用户要求与法术书同尺寸 | 当前可施放来源 | 底部计划槽，2 张正式 atlas 卡图；不重复生成“已选法术”第二实体 | `visible` | E2E 几何断言：已计划卡与法术书卡宽高差 <= 2px |
| 对手已计划法术 | 隐藏信息边界 | 对手隐藏计划数量与席位镜像 | 左上对手计划槽，只显示法术卡背 / 数量 | `hidden-by-rule` | 饱和态截图中左上卡背镜像己方计划 |
| 公开弃牌堆 | 公开归档；用户裁定能看就显示正面 | 低权重可检视归档入口 | 右侧竖向空位，顶牌正面半露 + 数量 | `collapsed-with-visible-entry` | 饱和态截图；`DiscardPile` 使用 top card preview |
| 隐性结界 / 未公开信息 | 隐藏信息边界 | 保持隐藏，不泄露对手信息 | 卡背承载，不把隐藏对象展开为正面 | `hidden-by-rule` | 设计合同与当前卡背语义 |
| 攻击骰 / 效果骰 / token | foundation 攻击结算；素材链 | 当前结算物件和状态宿主 | 主舞台上层，锚定目标 / 来源；token 贴对象 | `visible` | 饱和态截图与 E2E 断言 |
| 来源对象 / 合法目标 / 可移动区域 | 开放式直选 | 玩家下一步可点击对象 | 场上对象 / 区域本体高亮，非代理面板 | `visible` | 饱和态截图；区域和对象高亮同屏 |
| 当前阶段 / 当前动作 / 回合结束入口 | 回合主链 | 告诉玩家当前状态和真实阶段推进 | 短标签 + `回合结束` 按钮；不是施法 / 攻击确认按钮 | `visible` | E2E 断言页面包含阶段与入口 |

## 结论

- 旧通过结论已撤回：12:23:35 的旧图不能作为人工验收图，因为 HUD 提示卡和战场法师实体被混用。
- 当前代码已按三对象职责改名和拆素材职责；12:44:10 新图、E2E 和自审均证明“法师三对象混淆”这一问题已修正。
- 本次 `AI_OBJECT_SPLIT_PASS` 只覆盖三对象职责、素材和锚点，不自动批准完整 Mage Wars UI、设计稿历史版本或 foundation 以外范围。
- 本矩阵只覆盖已批准 foundation 范围；全 322 张法术、自由构筑、四人模式、豪华竞技场、扩展法师、完整 AI、教程系统、行动日志 UI 和撤回 UI 仍为 `out-of-scope`。
