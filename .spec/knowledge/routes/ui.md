# UI 与截图交付

本路由处理玩家可见的 UI、交互承接、布局、设计稿和截图验收。

## UI 改动与交互

- 修改 UI、布局、样式、交互壳层、主交互槽位或做 UI 回归恢复：读 [`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-ux`](../standards/ui-ux.md)；涉及双端再读 [`ui-responsive-layout`](../standards/ui-responsive-layout.md)。
- 规则对象、token、棋子、怪物、房间对象或其它需要真实素材承载的 UI：在读取 UI 标准后，必须同时转读 [`资源与数据录入`](data-assets.md) 路由指向的 [`asset-pipeline`](../standards/asset-pipeline.md)；游戏专项对象还必须读取对应游戏的规则/素材合同。不能只按“UI 样式修改”处理而跳过素材规范。
- 设计配色、组件、动效、游戏 HUD/牌桌/面板：读系统 `ui-design-pipeline`、`ui-ux-pro-max`，并读 [`ui-change-gates`](../standards/ui-change-gates.md) 和 [`ui-ux`](../standards/ui-ux.md)。
- 选择 prompt、waiting、手牌区、右侧 rail、setup 等成熟交互来源：读 `design-system/game-ui/source-families.md`；游戏内按钮、面板、指示器再读 `design-system/game-ui/MASTER.md`。
- 处理主交互槽位被挤压、规则牌区/持有区/waiting/prompt/rail 抢位：读 [`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-responsive-layout`](../standards/ui-responsive-layout.md)、`design-system/game-ui/MASTER.md`。
- DiceThrone 响应窗口、改骰、奖励骰确认或“确认按钮跑到弹窗”：先读 [`卡牌时机术语`](../../../docs/games/dicethrone/card-timing-terms.md)，再读 [`ui-change-gates`](../standards/ui-change-gates.md) 与 [`e2e-verification`](../standards/e2e-verification.md)；普通响应由手牌上方共享提示框承接，骰子确认只由右侧 2D 骰盘承接。
- 修改玩家可见文案、能力横幅或规则展示：读 `design-system/game-ui/MASTER.md` §4.11 和 `design-system/game-ui/source-families.md`；涉及规则书原文还要读 [`data-entry`](../standards/data-entry.md) 与 [`rule-contract-audit`](../standards/rule-contract-audit.md)。
- 处理 cursor、粒子、棋盘特效、动画数值时序、卡牌/技能特写或序列特效：分别读 [`global-systems`](../standards/global-systems.md)、[`animation-effects`](../standards/animation-effects.md)、[`engine-visual-events`](../standards/engine-visual-events.md) 和 [`ui-animation-patterns`](../standards/ui-animation-patterns.md)。

## 设计稿与专项页面

- 新游戏位图设计稿、设计批准门禁：读系统 `ui-design-pipeline`、项目 [`boardgame-ui-imagegen`](../../skills/boardgame-ui-imagegen/SKILL.md)、[`create-new-game`](../../skills/create-new-game/SKILL.md)。
- 生图/mockup/参考图落地为真实前端：读 [`generated-design-implementation`](../standards/generated-design-implementation.md)、[`ui-change-gates`](../standards/ui-change-gates.md) 和 [`ui-ux`](../standards/ui-ux.md)。
- 设计前置证据、素材输入链或设计流程失守回代：读系统 `ui-design-pipeline`、项目 [`boardgame-ui-imagegen`](../../skills/boardgame-ui-imagegen/SKILL.md) 和系统 `skill-governance`。
- Home V2 移动横屏首页、详情页、登录/创建房间/密码弹窗：读 [`home-v2-design`](../standards/home-v2-design.md)、[`generated-design-implementation`](../standards/generated-design-implementation.md)、[`ui-responsive-layout`](../standards/ui-responsive-layout.md)。
- Qidahen 主棋盘 UI 或生图约束：读 [`Qidahen UI 生图 workflow`](../../../docs/games/qidahen/workflows/qidahen-ui-imagegen-rules.md) 和项目 [`boardgame-ui-imagegen`](../../skills/boardgame-ui-imagegen/SKILL.md)。
- 七大恨区域工具的玩家可见棋盘 UI：规则真相先转 [`规则与游戏逻辑`](rule-bug.md)，布局和截图回到本路由。
- 大规模 UI 改动：先读系统 `ui-design-pipeline` 与 `ui-ux-pro-max --design-system`，再读取 `design-system/` 对应家族。
- 游戏 UI 风格选择：读 `design-system/styles/`；实施状态横幅：读 [`frontend 实施状态`](../../../docs/framework/frontend.md) § 实施中状态横幅。

## 截图、图片与教程交付

- E2E 截图、AI 图面验收或截图交付：先读 [`e2e-verification`](../standards/e2e-verification.md) 取得证据资格；用户需要看图时读系统 [`show-image-to-user`](D:/codex-home/skills/show-image-to-user/SKILL.md)，需要 BoardGame 证据目录、项目脚本或相册规则时再读项目 [`screenshot-delivery`](../../skills/screenshot-delivery/SKILL.md)。
- 用户明确说“打开图片/图呢/给我看图”：第一入口固定是系统 [`show-image-to-user`](D:/codex-home/skills/show-image-to-user/SKILL.md)；项目 [`screenshot-delivery`](../../skills/screenshot-delivery/SKILL.md) 只提供 BoardGame 证据交付适配，不复制系统开图正文。
- 教程、新手引导或教程 E2E：读项目 [`tutorial-workflow`](../../skills/tutorial-workflow/SKILL.md)、[`tutorial-design`](../standards/tutorial-design.md) 和 [`e2e-verification`](../standards/e2e-verification.md)。
- UI 审计、玩家视角验收、截图不通过后继续重构：读系统 `ui-audit-loop`、[`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-ux`](../standards/ui-ux.md)。

