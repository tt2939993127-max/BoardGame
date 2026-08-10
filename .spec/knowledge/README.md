---
name: knowledge
description: "BoardGame 项目知识导航。开始中型或大型开发任务时，按任务类型找到相关标准和项目 workflow。"
metadata:
  type: index
---

# BoardGame Knowledge

> 只写“是什么 + 何时查”。规则正文、命令和长验收清单都在下钻目标。

## 使用

- 会改变项目结果的任务先用 `before-you-code` 判断小/中/大读取深度。
- 中型任务从本导航选择直接相关标准和 workflow。
- 产品需求与任务编排不属于本知识导航；大型 AI 规范结构变更进入 `.spec/decisions/`。

## 导航

| 任务 / 场景 | 下钻目标 |
| --- | --- |
| **新增/修改 ActionLog 伤害来源标注** (breakdown/来源显示) | `.spec/knowledge/standards/engine-action-log.md` § 伤害来源标注 |
| **处理资源** (图片/音频/图集/清单) | `docs/tools.md` + `.spec/knowledge/standards/asset-pipeline.md` + `.spec/knowledge/standards/critical-image-preload.md` + `.spec/knowledge/standards/audio-assets.md` |
| **参考图生成 Three.js / img2threejs 程序化模型** (图生模型、参考图重建、书本/棋盘/道具 3D 资产原型) | `.spec/skills/img2threejs-reconstruction/SKILL.md` + `.spec/knowledge/standards/asset-pipeline.md` |
| **需求交接式安全图片处理 / 视觉子代理 / OCR / 图集裁图核对** (图片文字读取、卡图/房间图规则录入、图片验收、读图卡死后继续任务) | `.spec/skills/safe-image-reading/SKILL.md` + `.spec/skills/data-entry-workflow/SKILL.md` |
| **新增派系 / 新英雄 / 新角色** (从素材做到可玩、含录入/资源/机制/审计/E2E) | `.spec/skills/add-new-faction/SKILL.md` + `.spec/skills/data-entry-workflow/SKILL.md` |
| **录入业务数据** (图片/规则书/Wiki/截图 → 名称/描述/数值/类型/索引/文案) | `.spec/skills/data-entry-workflow/SKILL.md` + `.spec/knowledge/standards/data-entry.md` |
| **配置表 / 配置审查 / 字段核对 / 配置重录与修正提案** (旧游戏 adapter、配置字段覆盖、表格行与正式源对账) | `D:\codex-home\skills\config-review-workflow\SKILL.md` + `.spec/knowledge/standards/game-config-package.md` + `.spec/skills/data-entry-workflow/SKILL.md` |
| **新游戏静态配置包实施** (严格 JSON、schema、能力绑定、运行时物化) | `.spec/skills/create-new-game/SKILL.md` + `.spec/knowledge/standards/game-config-package.md` |
| **录入 DiceThrone 角色** (新英雄/单角色图片 intake、裁图、卡牌/Token/骰面录入) | `.spec/skills/add-new-faction/SKILL.md` + `.spec/skills/data-entry-workflow/SKILL.md` + `docs/games/dicethrone/workflows/dicethrone-hero-intake.md` |
| **国际化资源架构** (i18n 路径/符号链接/locale) | `docs/i18n-asset-architecture.md` |
| **修改 DiceThrone** (文案/资源) | `docs/games/dicethrone/dicethrone-i18n.md` |
| **环境配置 / 部署** (端口/同域代理) | `docs/deploy.md` |
| **协作者接入 Open Design** (需要设计 MCP、本地 AI 设计工具、设计稿 / 视觉方案工作流) | `docs/infra/open-design.md` |
| **Android App 打包 / 上传 / 原生更新 / OTA / 网站下载入口** | `.spec/skills/android-app-release/SKILL.md` + `docs/mobile-release.md` + `docs/android-app-build.md` |
| **移动端素材包下载/清理/校验失败** (增量校验失败、本地临时文件校验失败、清理并重下仍失败) | `.spec/skills/android-app-release/SKILL.md` + `docs/mobile-release.md` + `.spec/knowledge/standards/asset-pipeline.md` |
| **本地联机测试** (单人同步调试) | `docs/test-mode.md` |
| **编写或修复测试** (Vitest/Playwright) | `docs/automated-testing.md` |
| **分支 / worktree 清理与跨游戏改动归属** (删错分支、清理工作树、把某游戏修到另一游戏分支、入口找错) | `.spec/knowledge/standards/worktree-branch-target-lock.md` + `.spec/skills/git-operations/SKILL.md` |
| **处理线上反馈 / 回写反馈状态** (open/in_progress/resolved/closed、修完立刻回写、区分反馈状态与部署状态) | `.spec/skills/feedback-closeout/SKILL.md` |
| **修改反馈提交入口 / 登录态 / 匿名提交** (`POST /feedback`、反馈弹窗、可选 JWT、失效 token) | `.spec/knowledge/standards/feedback-system.md` |
| **处理不可复现反馈 / 证据式收口** (线上已恢复、当前复现不了、需要判断是否继续深挖) | `docs/automated-testing.md` |
| **修规则 bug / 规则回归 / 等级效果不一致** (卡牌、技能、Token、状态、阶段、伤害、资源、升级版/基础版差异；含剧本/事件/任务流程缺失) | `.spec/skills/rule-bug-fix-workflow/SKILL.md` + `.spec/knowledge/standards/rule-contract-audit.md` + `.spec/knowledge/standards/regression-closeout.md` |
| **山屋惊魂牌桌 UI 回归** (投骰背景、骰面合计/加值/总点数、属性轨指针、骷髅死亡格、预兆/作祟状态、开局过场、剧本阅读承接) | `docs/games/betrayal/user-stories/board-ui-trait-haunt-status-contract-2026-07-31.md` + `docs/games/betrayal/sources/official/betrayal-3e-rulebook-en.md` + `D:\codex-home\skills\ui-audit-loop\SKILL.md` |
| **从 TTS / 外部脚本 / 旧平台实现还原规则或 UI** (Lua、Workshop JSON、解包资产、旧脚本、配置按钮、自动提示、规则变体) | `.spec/knowledge/standards/rule-contract-audit.md` § 外部脚本 / TTS 还原零猜测门禁 + `.spec/knowledge/standards/ui-change-gates.md` |
| **做审计 / 重审 / 为什么没审出来** (审计范围、层级、漏审归因、跨游戏门禁) | `.spec/knowledge/standards/testing-audit.md` + `.spec/knowledge/standards/testing-audit-core-principles.md` + `.spec/knowledge/standards/testing-audit-dimensions.md` + `.spec/knowledge/standards/audit-evidence-template.md` + `.spec/knowledge/standards/regression-closeout.md` |
| **处理 UI 回归恢复 / 功能开关双分支** (改回原来、默认关闭必须完全旧实现、开启后新体验单独成立、不能混用；含删除可选 3D/实验 UI 时保留默认 2D/旧动效) | `.spec/knowledge/standards/e2e-verification.md` + `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/standards/ui-ux.md` |
| **重构共享层 / 通用化 / 收口 helper / 为什么重构改坏功能** (shared helper、watchdog、transport、response-window、跨游戏 override、状态真相源迁移) | `.spec/knowledge/standards/shared-refactor-guard.md` + `.spec/knowledge/standards/testing-audit.md` + `.spec/knowledge/standards/testing-audit-core-principles.md` + `.spec/knowledge/standards/testing-audit-dimensions.md` |
| **E2E 与截图验收** (UI 交互、状态注入、真实开房、截图证据、用户直接要截图、AI 自己核图、用户可见截图交付) | `.spec/knowledge/standards/e2e-verification.md` + `docs/testing-best-practices.md` + `D:\codex-home\skills\show-image-to-user\SKILL.md` + `.spec/skills/screenshot-delivery/SKILL.md` |
| **教程 / 新手引导设计** (tutorial/onboarding、教程看不懂、只在教按钮、需要重做教学结构) | `.spec/skills/tutorial-workflow/SKILL.md` + `.spec/knowledge/standards/tutorial-design.md` + `.spec/skills/game-audit-workflow/SKILL.md` + `.spec/knowledge/standards/e2e-verification.md` |
| **打开图片 / 给我看图 / 重新打开 / 用户要看当前头像、图集或截图** | `D:\codex-home\skills\show-image-to-user\SKILL.md` + `.spec/skills/screenshot-delivery/SKILL.md` + `.spec/knowledge/standards/e2e-verification.md` |
| **首屏关键素材 / 图片预加载** (为什么没素材进度、为什么首帧抖动、atlas/牌背/桌面图是否必须预热) | `.spec/knowledge/standards/critical-image-preload.md` + `.spec/knowledge/standards/asset-pipeline.md` |
| **E2E 太慢 / 长链拆分 / 从主页起跑是否合理** | `.spec/knowledge/standards/e2e-verification.md` |
| **测试驱动是不是一直在写测试 / 为什么 45 分钟还没推进实现** | `.spec/knowledge/standards/e2e-verification.md` + `docs/automated-testing.md` |
| **开发前端 / 新增游戏** (引擎/组件) | `docs/framework/frontend.md` |
| **开发后端 / 数据库** (NestJS/Mongo) | `docs/framework/backend.md` |
| **接口调用 / 联调** (REST/WS) | `docs/api/README.md` |
| **处理系统反馈 / watchdog 自动反馈** | `.spec/knowledge/standards/engine-systems.md` § 在线 AI 决策视图与 watchdog / 系统反馈闭环 |
| **AI 接入 / AI 适配 / 自动回合 / watchdog / 自动跳过** | `.spec/skills/game-ai-adaptation/SKILL.md` + `.spec/knowledge/standards/ui-ux.md` |
| **使用 Undo / Fab 功能** | `docs/components/UndoFab.md` |
| **新增/修改游戏光标主题** (cursor/光标/鼠标样式) | `.spec/knowledge/standards/global-systems.md` § 光标主题系统 |
| **新增作弊/调试指令** | `docs/debug-tool-refactor.md` |
| **粒子特效开发** (Canvas 2D 引擎) | `docs/particle-engine.md` |
| **新增棋盘特效** (FX 系统) | `.spec/knowledge/standards/animation-effects.md` § 引擎级 FX 系统 |
| **动画数值时序** (HP/damage 跳变) | `.spec/knowledge/standards/engine-visual-events.md` § 动画表现与逻辑分离规范 |
| **卡牌 / 技能展示型特写** (瞬时反馈、短暂展示、阻塞阅读 / 复盘 / 确认型展示的分流) | `.spec/knowledge/standards/engine-visual-events.md` § 卡牌特写队列 + `.spec/knowledge/standards/ui-ux.md` § 特写生命周期必须按语义分流 |
| **多步骤特效编排** (序列特效) | `.spec/knowledge/standards/animation-effects.md` § 序列特效 + `.spec/knowledge/standards/engine-visual-events.md` |
| **新增/审查游戏机制实现** (技能/Token/事件卡/被动/主动开发或全面审查) | `.spec/knowledge/standards/description-to-implementation-audit.md` + `.spec/knowledge/standards/engine-systems.md` |
| **修改 DiceThrone 共享攻击结算** (`targetingRoll` / `withDamage` / `postDamage` / `ATTACK_RESOLVED`) | `docs/games/dicethrone/attack-settlement-invariants.md` + `docs/games/dicethrone/token-active-use-custom-action.md` |
| **修改 DiceThrone 卡牌时机 / 手牌可用性 / 改骰即时牌** (红色即时牌、黄色防御阶段牌、进攻/防御掷骰、响应窗口、修改自己或对方骰子) | `docs/games/dicethrone/card-timing-terms.md` + `.spec/knowledge/standards/rule-contract-audit.md` |
| **用户明确裁定 / 与规则书或既有实现偏离的需求** | `docs/user-stories/README.md` |
| **新游戏设计阶段** (领域建模/决策点/引擎缺口) | `.spec/knowledge/standards/engine-systems.md` § 领域建模前置审查 + `.spec/knowledge/standards/engine-ability-framework.md` |
| **大杀四方 POD 系统** (POD 卡牌/自动映射/数据一致性) | `src/games/smashup/rule/POD-SYSTEM.md` + `docs/games/smashup/refactor/pod/pod-system-architecture.md` |
| **大杀四方消灭触发链 / pendingSave** (`processDestroyTriggers` / `PREVENT_DESTROY_SOURCE_IDS` / 防止消灭交互) | `docs/games/smashup/destroy-pending-save.md` + `src/games/smashup/rule/ENGINE_GUIDE.md` |
| **判断是否有活跃交互 / 阻止手牌操作** (interactionBusy/disableInteraction) | `.spec/knowledge/standards/engine-systems.md` § 框架复用优先 → `useIsInteractionBusy` |
| **游戏结束检测** (gameover/胜负判定) | `.spec/knowledge/standards/engine-gameover.md` |
| **传输层/Board Props** (socket/dispatch/Provider) | `.spec/knowledge/standards/engine-transport.md` |
| **乐观更新/延迟优化** (optimistic/latency/预测) | `.spec/knowledge/standards/engine-transport.md` + `.spec/knowledge/standards/engine-visual-events.md` |
| **挑选/查找/对接音效** (查 key、换音效、补预加载、试听收口) | 系统 skill `D:\codex-home\skills\audio-integration\SKILL.md` + `.spec/knowledge/standards/audio-assets.md` + `docs/audio/audio-usage.md` |
| **从外部导入新音效素材** (新增音频资源) | 系统 skill `D:\codex-home\skills\audio-integration\SKILL.md` + `.spec/knowledge/standards/audio-assets.md` + `docs/audio/add-audio.md` |
| **音频不播放 / AudioContext** (浏览器兼容) | `.spec/knowledge/standards/golden-rules.md` § AudioContext |
| **状态同步/存储调优** (16MB 限制) | `docs/mongodb-16mb-fix.md` |
| **复杂任务规划** (多文件/长流程) | `D:\codex-home\skills\planning-with-files\SKILL.md` |
| **对话接续 / 交接摘要 / 上下文压缩后继续** (继续、接上、交接摘要冲突、临时覆盖矩阵接管目标) | `.spec/knowledge/standards/conversation-handoff-target-lock.md` |
| **AI 规范文档整理** (压缩根 AGENTS、拆分大文档、去重但不丢内容) | `.spec/decisions/document-consolidation.md` + `.spec/skills/README.md` |
| **根 AGENTS 该写到什么粒度** (渐进式披露 / 路由优先 / 只保留触发入口) | `.spec/decisions/document-consolidation.md` + 本文件 |
| **向用户索要保留/合并/真相源拍板** (是不是二选一、能不能都保留、哪边先翻正) | `.spec/skills/merge-decision-package/SKILL.md` + `.spec/knowledge/standards/worktree-branch-target-lock.md` |
| **UI/UX 设计** (配色/组件/动效) | `D:\codex-home\skills\ui-design-pipeline\SKILL.md` + `D:\codex-home\skills\ui-ux-pro-max\SKILL.md` + `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/standards/ui-ux.md` + `.spec/knowledge/standards/ui-animation-patterns.md` |
| **UI 审计 / 玩家视角验收 / 没过继续重构** (看图后判断好不好用、反复低级 UI 错误、不能只靠 E2E 绿灯) | `D:\codex-home\skills\ui-audit-loop\SKILL.md` + `.spec/knowledge/standards/ui-change-gates.md` § `UI 审计闭环` + `.spec/knowledge/standards/ui-ux.md` + `D:\codex-home\skills\ui-ux-pro-max\SKILL.md` |
| **新游戏设计稿 / 设计批准门禁** (先看图、先出 PNG/JPG/WebP、批准后才进骨架/前端) | `D:\codex-home\skills\ui-design-pipeline\SKILL.md` + `.spec/skills/boardgame-ui-imagegen/SKILL.md` + `.spec/skills/create-new-game/SKILL.md` |
| **Mage Wars 规则到 UI / 设计稿到真实 Board 实现** (法术书、已计划法术、弃牌堆、骰子、token、地图层级、用户标注纠正) | `.spec/skills/mage-wars-ui-design-memory/SKILL.md` + `docs/games/mage-wars/design/reference/user-correction-traceability-ledger.md` + `docs/games/mage-wars/rule/` + `docs/games/mage-wars/design/implementable/` |
| **设计前置动作证据 / 素材输入链** (防止只列路径、只写 prompt、只靠摘要就出稿) | `D:\codex-home\skills\ui-design-pipeline\SKILL.md` + `.spec/skills/boardgame-ui-imagegen/SKILL.md` |
| **设计流程失守回代** (用户指出没看规则、没用素材、边框过重、规则没有的牌区概念、旧稿继续微调) | `D:\codex-home\skills\skill-governance\SKILL.md` + `D:\codex-home\skills\ui-design-pipeline\SKILL.md` + `.spec/skills/boardgame-ui-imagegen/SKILL.md` |
| **游戏主交互槽位 / 规则牌区 / 持有区 / waiting / prompt / rail 抢位** (主交互被挤压、双主焦点、来源家族、交互壳层重排) | `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/standards/ui-responsive-layout.md` + `design-system/game-ui/MASTER.md` + `D:\codex-home\skills\ui-ux-pro-max\SKILL.md` |
| **显示游戏实施状态** (`statusTag` / `under_construction` / 实施中横幅) | `docs/framework/frontend.md` § 实施中状态横幅 |
| **七大恨区域工具 / 红线 truth / 工作区清点** | `docs/games/qidahen/workflows/qidahen-region-mask-truth-sources.md` |
| **七大恨区域拓扑 / 正式区与运行时区分层** | `docs/games/qidahen/workflows/qidahen-region-topology-truth-sources.md` |
| **七大恨主棋盘 UI / 生图约束** (共享行动指示器、特殊区域、年份或回合卡位、主行动模型) | `.spec/skills/boardgame-ui-imagegen/SKILL.md` + `docs/games/qidahen/workflows/qidahen-ui-imagegen-rules.md` |
| **生图设计稿 → 实现设计稿** (AI 生成 UI mockup 后按图实现/复刻) | `.spec/knowledge/standards/generated-design-implementation.md` + `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/standards/ui-ux.md` |
| **Home V2 移动横屏首页/详情/弹窗** (Home V2 书本界面、移动端专用首页、详情页、纸面弹窗) | `.spec/knowledge/standards/home-v2-design.md` + `.spec/knowledge/standards/generated-design-implementation.md` + `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/standards/ui-ux.md` + `.spec/knowledge/standards/ui-responsive-layout.md` |
| **大规模 UI 改动** (新页面/重做布局/新游戏UI) | 先 `D:\codex-home\skills\ui-design-pipeline\SKILL.md`，再全局 `ui-ux-pro-max --design-system` 与 `design-system/` |
| **游戏内 UI 交互** (按钮/面板/指示器) | `design-system/game-ui/MASTER.md` + `D:\codex-home\skills\ui-audit-loop\SKILL.md` |
| **玩家可见文案 / 能力横幅** (规则原文、提示文案、验收清单 / AI 过程话术 / 测试占位名不得进入玩家 UI) | `design-system/game-ui/MASTER.md` §4.11 + `design-system/game-ui/source-families.md`；若涉及剧本书/规则书原文展示，还必须读 `.spec/knowledge/standards/data-entry.md` + `.spec/knowledge/standards/rule-contract-audit.md` |
| **选择成熟交互来源家族** (prompt / waiting / 手牌区 / 右侧 rail / setup 壳层) | `design-system/game-ui/source-families.md` |
| **游戏 UI 风格选择** | `design-system/styles/` |
| **创建临时文件 / 清理根目录** (Bug 分析/测试脚本/Wiki 数据) | `docs/temp-files-management.md` |
