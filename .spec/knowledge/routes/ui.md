# UI 与截图交付

本路由处理玩家可见的 UI、交互承接、布局、设计稿和截图验收。涉及视觉结果时，代码测试不能替代真实页面图面验收。

## UI 改动与交互

- 修改 UI、布局、样式、交互壳层、主交互槽位或做 UI 回归恢复：读 [`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-ux`](../standards/ui-ux.md)；涉及双端再读 [`ui-responsive-layout`](../standards/ui-responsive-layout.md)。
- 规则对象、token、棋子、怪物、房间对象或其它需要真实素材承载的 UI：在读取 UI 标准后，必须同时转读 [`资源与数据录入`](data-assets.md) 路由指向的 [`asset-pipeline`](../standards/asset-pipeline.md)；游戏专项对象还必须读取对应游戏的规则/素材合同。不能只按“UI 样式修改”处理而跳过素材规范。
- 设计配色、组件、动效、游戏 HUD/牌桌/面板：读系统 `ui-design-pipeline`、`ui-ux-pro-max`，并读 [`ui-change-gates`](../standards/ui-change-gates.md) 和 [`ui-ux`](../standards/ui-ux.md)。
- 选择 prompt、waiting、手牌区、右侧 rail、setup 等成熟交互来源：读 `design-system/game-ui/source-families.md`；游戏内按钮、面板、指示器再读 `design-system/game-ui/MASTER.md`。
- 处理主交互槽位被挤压、规则牌区/持有区/waiting/prompt/rail 抢位：读 [`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-responsive-layout`](../standards/ui-responsive-layout.md)、`design-system/game-ui/MASTER.md`。
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

- E2E 截图、AI 图面验收或截图交付：先读 [`e2e-verification`](../standards/e2e-verification.md) 取得证据资格，再读系统 `show-image-to-user` 处理用户可见开图；只有需要 BoardGame 截图目录、项目脚本或相册规则时，才追加项目 [`screenshot-delivery`](../../skills/screenshot-delivery/SKILL.md)。
- 用户明确说“打开图片/图呢/给我看图”：第一入口固定是系统 `show-image-to-user`；项目 `screenshot-delivery` 只作为本地脚本与项目路径适配，不重新定义开图、编号、查看器或成功标准。
- 教程、新手引导或教程 E2E：读项目 [`tutorial-workflow`](../../skills/tutorial-workflow/SKILL.md)、[`tutorial-design`](../standards/tutorial-design.md) 和 [`e2e-verification`](../standards/e2e-verification.md)。
- UI 审计、玩家视角验收、截图不通过后继续重构：读系统 `ui-audit-loop`、[`ui-change-gates`](../standards/ui-change-gates.md)、[`ui-ux`](../standards/ui-ux.md)。

## 职责落点

同一张截图可能同时用于测试证据、玩家视角审计和用户交付，但三者不是同一职责。按下面的主从关系读取，不要把一个入口的步骤复制到另一个入口：

| 需要回答的问题 | 唯一正文 / 执行入口 | 其它入口的职责 |
| --- | --- | --- |
| UI 的布局、空间、主交互槽位和 BoardGame 特有改动门禁 | [`ui-change-gates`](../standards/ui-change-gates.md) | `ui-ux` 只承载审美、组件单一来源和游戏 UI 范式；`ui-responsive-layout` 承载双端专项。 |
| E2E 从哪里起跑、状态如何触发、截图能证明什么 | [`e2e-verification`](../standards/e2e-verification.md) | `docs/automated-testing.md` 只承载运行命令、API、启动链和产物目录。 |
| AI 如何做图面审计、何时继续返工 | 系统 [`ui-audit-loop`](D:/codex-home/skills/ui-audit-loop/SKILL.md) | `ui-change-gates` 只补 BoardGame 项目门禁；不得复制查看器选择和通用循环。 |
| 如何把通过的图展示给用户 | 系统 [`show-image-to-user`](D:/codex-home/skills/show-image-to-user/SKILL.md) | `screenshot-delivery` 只补项目路径、命名辅助脚本和授权后的相册入口。 |
| 项目截图目录、标记图脚本和相册发布边界 | 项目 [`screenshot-delivery`](../../skills/screenshot-delivery/SKILL.md) | 不定义截图是否通过，也不定义用户是否已经看到图。 |
