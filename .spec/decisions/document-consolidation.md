# AI 规范文档无损整理台账

> 目标：减少根规范和大型规则文档的重复负担，同时保证内容不丢失、可追溯、可回查。

## 无损整理原则

1. 先确定唯一落点，再收拢分散内容；不得直接删除尚未迁移或尚未归档的规则。
2. 整理完成后只保留唯一入口；专项 SOP 下沉到 `.spec/knowledge/standards/`、`.spec/skills/` 或游戏 workflow。
3. 每次迁移必须记录：来源、目标、是否改变规则语义、后续待清理重复项。
4. 如果迁移时发现规则冲突，必须保留冲突双方原文位置，并新增“裁决原因”；不能只采用某一边。
5. 历史事故描述不继续堆在根文件；只保留抽象后的不变量，原始事故留在 evidence、用户故事或专项 bug 文档。

## 当前体量基线

| 文件 | 当前问题 | 处理方向 |
| --- | --- | --- |
| `AGENTS.md` | 同时承载入口规则、专项 SOP、E2E、部署、设计原则和游戏专属补充 | 压缩为路由 + 红线 + 入口 |
| `.spec/knowledge/standards/testing-audit.md` | 超大，混合审计原则、D 维度、E2E、历史教训、输出模板 | 拆成审计入口、维度库、证据模板、E2E 专项 |
| `.spec/knowledge/standards/engine-systems.md` | 引擎总览、领域层、UI 提示、动画、ActionLog 等多个主题混放 | 按系统主题拆分，doc-index 做入口 |
| `docs/automated-testing.md` + `docs/testing-best-practices.md` | 测试执行、结构门禁、E2E 口径与 AGENTS 有重叠 | 归并测试入口，保留工具细节 |
| `.spec/skills/create-new-game/SKILL.md` | 已完成首轮 references 拆分，主 skill 保留流程骨架与按需读取入口 | 后续只在新增职责混杂时继续下沉 references |

## 已完成迁移

| 日期 | 来源 | 目标 | 语义变化 | 说明 |
| --- | --- | --- | --- | --- |
| 2026-06-03 | `AGENTS.md` § E2E 测试强制要求 | `.spec/knowledge/standards/e2e-verification.md` | 有小幅澄清 | 保留原有截图验收、证据路径、看图要求；新增“默认状态注入，真实开房仅用于跨入口合同”的边界。 |
| 2026-06-03 | `AGENTS.md` § 验证测试、`docs/automated-testing.md` § 测试框架 API | `.spec/knowledge/standards/e2e-verification.md` | 对齐口径 | 将“所有 E2E 必须状态注入 / 只有用户明确要求才真实链路”收敛为同一规则：默认状态注入；跨入口合同需要证明时可用真实链路，并必须写清额外证明点。 |
| 2026-06-04 | `docs/audio/audio-usage.md`、`docs/audio/add-audio.md` 中的执行型 SOP | 系统 skill `D:\codex-home\skills\audio-integration\SKILL.md` | 有结构性重构，无核心语义放宽 | 将“查找 key、接配置、生成产物、/dev/audio 收口、最终汇报”下沉到 audio workflow；音频文档保留架构合同、命令入口、目录/产物/运行时约束。 |
| 2026-06-09 | `AGENTS.md` § 测试编写规范 / 验证测试 | `.spec/knowledge/standards/e2e-verification.md` + `.spec/knowledge/README.md` | 有结构性收口 | 根文件改成“测试分层 + 文档路由 + 红线”，把三板斧定义、主页/进局分层、长链预算、组合式验证下沉到二级文档。 |
| 2026-06-09 | 当前对话关于“测试太慢 / 三板斧失守 / 根 AGENTS 渐进式披露”的复盘 | `.spec/knowledge/standards/e2e-verification.md` + `.spec/knowledge/README.md` | 有约束增强 | 新增“15 分钟定位预算”“长链不得作为默认调试循环”“同一目标最多二次自然链后必须拆合同”，并把“为什么慢 / 是否还在推进实现”的入口也路由到二级文档。 |
| 2026-06-14 | `.spec/knowledge/standards/ui-ux.md` 中误放的“实施中状态呈现”规则 | `docs/framework/frontend.md` § 实施中状态横幅 + `.spec/knowledge/README.md` | 无语义放宽 | 将 `statusTag='under_construction'` 必须复用 `ImplementationStatusRibbon` 的规则从通用 UI/UX 审美规范迁到前端框架组件合同；`doc-index` 只保留路由入口。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit.md` 顶部规则 bug 合同门禁、回归处理与漏审复盘口径 | `.spec/knowledge/standards/rule-contract-audit.md` + `.spec/knowledge/standards/regression-closeout.md` + `.spec/skills/rule-bug-fix-workflow/SKILL.md` + `.spec/knowledge/README.md` | 无语义放宽，有职责拆分 | 将“先判断录入合同是否被实现正确消费”“冲突才回图面/规则源”“修复必须回写合同入口”“回归漏审复盘与同类扩审”拆到短文档和项目 skill；`testing-audit.md` 头部只保留路由摘要，避免同一规则在大文档中继续扩写。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit.md` § D 维度库、维度选择指南、输出格式 | `.spec/knowledge/standards/testing-audit-dimensions.md` + `.spec/knowledge/README.md` + `.spec/skills/game-audit-workflow/SKILL.md` | 无语义放宽，纯拆分 | 将 D1-D57 细则从大文档无损搬到独立维度库；`testing-audit.md` 只保留入口摘要，审计 skill 与索引改为显式读取维度库。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit-dimensions.md` § 需要展开的关键维度 | `.spec/knowledge/standards/testing-audit-dimensions-semantics-interaction.md` + `.spec/knowledge/standards/testing-audit-dimensions-resource-timing.md` + `.spec/knowledge/standards/testing-audit-dimensions-state-pipeline.md` + `.spec/knowledge/standards/testing-audit-dimensions-deferred-interaction.md` + `.spec/knowledge/standards/testing-audit-dimensions.md` 索引 | 无语义放宽，纯拆分 | 将超大 D 维度细则按主题拆成分卷；入口维度库只保留分卷索引、摘要表、选择指南和输出格式，避免后续审计每次加载整本细则。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit.md` § 核心原则 / 交互入口语义矩阵 / 技能完整流程矩阵 | `.spec/knowledge/standards/testing-audit-core-principles.md` + `.spec/knowledge/standards/testing-audit.md` 入口摘要 | 无语义放宽，纯拆分 | 将 fail-close 速查、全面审计完成定义、录入/图片/旧 evidence 边界、交互入口语义矩阵和技能完整流程矩阵无损搬到核心原则短文档；`testing-audit.md` 只保留入口摘要与证据分层。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit.md` § E2E 测试框架规范 / 流程截图证据链 | `.spec/knowledge/standards/e2e-verification.md` + `.spec/knowledge/standards/testing-audit.md` 入口摘要 | 无语义放宽，纯归并 | 将流程截图证据链、奖励骰/特写截图、生效时机判定、成功路径和对外口径门禁并入 E2E 专文；`testing-audit.md` 只保留 E2E 路由入口。 |
| 2026-07-04 | `.spec/knowledge/standards/testing-audit.md` § 描述→实现全链路审查规范 | `.spec/knowledge/standards/description-to-implementation-audit.md` + `.spec/knowledge/README.md` + `.spec/knowledge/standards/engine-systems.md` 入口摘要 | 无语义放宽，纯拆分 | 将权威描述锁定、原子断言、交互链拆分、八层追踪、grep 消费点和复杂语义模式搬到专项短文档；`testing-audit.md` 只保留专项路由入口，`engine-systems.md` 不再误指审计大文档为唯一权威。 |
| 2026-07-04 | `.spec/knowledge/standards/engine-systems.md` § 传输层、游戏结束、SimpleChoice、动画/EventStream/特写、ActionLog | `.spec/knowledge/standards/engine-transport.md` + `.spec/knowledge/standards/engine-gameover.md` + `.spec/knowledge/standards/engine-simple-choice.md` + `.spec/knowledge/standards/engine-visual-events.md` + `.spec/knowledge/standards/engine-action-log.md` + `.spec/knowledge/README.md` | 无语义放宽，纯拆分 | 将被 `doc-index.md` 直接引用的引擎系统章节无损搬到专项短文档；`engine-systems.md` 原位置改为入口摘要，避免引擎总览继续承载系统百科。 |
| 2026-07-04 | `.spec/knowledge/standards/engine-systems.md` § 通用能力框架、伤害计算管线、DiceThrone Token ActiveUse、SmashUp pendingSave | `.spec/knowledge/standards/engine-ability-framework.md` + `.spec/knowledge/standards/engine-damage-pipeline.md` + `docs/games/dicethrone/token-active-use-custom-action.md` + `docs/games/smashup/destroy-pending-save.md` + `.spec/knowledge/README.md` | 无语义放宽，纯拆分 | 将跨游戏能力/伤害原语留在 `docs/ai-rules`，把 DiceThrone 和 SmashUp 的单游戏 runtime 合同下沉到游戏目录；`engine-systems.md` 只保留入口摘要。 |
| 2026-07-04 | `.spec/knowledge/standards/ui-ux.md` § UI 动画设计原则、多端布局策略 | `.spec/knowledge/standards/ui-animation-patterns.md` + `.spec/knowledge/standards/ui-responsive-layout.md` + `.spec/knowledge/README.md` | 无语义放宽，纯拆分 | 将动画触发/结果揭示事件身份与双端布局/单位选择规则拆到专项短文档；`ui-ux.md` 只保留入口摘要、审美、组件单一来源和游戏 UI 特化规则。 |
| 2026-07-04 | `.spec/knowledge/standards/ui-ux.md` § UI 改动分级、样式/布局边界、真实截图、主交互槽位、UI 回归恢复 | `.spec/knowledge/standards/ui-change-gates.md` + `.spec/knowledge/README.md` + `.spec/skills/ui-ux-pro-max/SKILL.md` | 无语义放宽，纯拆分 | 将 UI 改动前置门禁与验收口径拆到专项短文档；`ui-ux.md` 主体只保留审美准则、组件单一来源、动画/响应式入口和游戏 UI 特化范式，项目 UI overlay 改为先读门禁文档。 |
| 2026-07-04 | `.spec/knowledge/standards/asset-pipeline.md` § 关键图片预加载、音频资源规范 | `.spec/knowledge/standards/critical-image-preload.md` + `.spec/knowledge/standards/audio-assets.md` + `.spec/knowledge/README.md` | 无语义放宽，纯拆分 | 将 `criticalImageResolver`、两阶段预加载、教程资源裁剪、图集初始化与音频运行时架构、共享音频包路径合同、音效触发路径拆到专项短文档；`asset-pipeline.md` 只保留资源总览、图片链路、服务器资源主源和 App 素材包入口。 |
| 2026-07-04 | `.spec/skills/create-new-game/SKILL.md` § 流程边界、前置门禁、机制/数据设计、UI 实现、收尾启用 | `.spec/skills/create-new-game/references/workflow-boundaries.md` + `preflight-gates.md` + `mechanics-data-design.md` + `ui-implementation-gates.md` + `finalization-checklist.md` | 无语义放宽，纯拆分 | 将 1800+ 行新游戏 workflow 拆成主入口 + references；主 `SKILL.md` 保留触发、必读索引、阶段骨架和按需读取规则，长门禁按职责分卷，避免每次触发加载整本。 |
| 2026-07-19 | `design-system/game-ui/source-families.md` 与 `docs/games/summonerwars/workflows/summonerwars-faction-intake.md` 中重复的玩家文案规则 | `design-system/game-ui/MASTER.md` §4.11 + `design-system/game-ui/source-families.md` + `.spec/knowledge/README.md` | 无语义放宽，纯收口 | 将“玩家文案 vs 内部验收问题”的总原则收敛到 `MASTER.md`；来源家族只保留棋盘直选承接不变量；召唤师战争 workflow 只引用总原则和家族表，避免同一文案规则三处维护。 |
| 2026-07-19 | 小黑屋日志/撤回误判复盘 | `.spec/knowledge/standards/testing-audit.md` + `docs/components/UndoFab.md` | 有约束增强 | 明确通用能力必须拆成系统层、Board/页面入口层和玩家真实可见入口分别证明；撤回/FAB 文档补齐 `UndoProvider + GameHUD + Board 层测试` 判定口径，避免把系统层通过误写成用户入口已接入。 |
| 2026-07-19 | 当前对话接续摘要把小黑屋目标污染成 DiceThrone 特写 | `D:\codex-home\AGENTS.md` + `AGENTS.md` + `.spec/knowledge/standards/conversation-handoff-target-lock.md` + `.spec/knowledge/README.md` + `temp/current-thread-goal-coverage.md` | 有约束增强 | 新增“交接摘要不得接管目标”跨项目红线与项目接续门禁；临时覆盖矩阵顶部必须声明 active/historical/superseded，摘要与用户当前主线冲突时立即停线，避免把旧摘要当作当前实现目标。 |
| 2026-07-19 | DiceThrone 特写 UI 被放进 token / 状态显示区域的截图复盘 | `.spec/knowledge/standards/ui-change-gates.md` + `D:\codex-home\skills\ui-audit-loop\SKILL.md` | 有约束增强 | 将“改 UI 不能只看新增 UI 自己”升级为同屏保护槽位门禁：token、状态、资源、玩家面板、阶段、骰盘、牌堆、手牌、prompt 等必须逐项过账；新 UI 抢占这些槽位直接判 REVISE。 |
| 2026-08-08 | `.spec/knowledge/standards/ui-change-gates.md` 旧版 `0.1-0.4` blockquote 外壳与现行 UI 门禁章节 | `.spec/knowledge/standards/ui-change-gates.md` `## 0.0C` + `.spec/knowledge/standards/e2e-verification.md` + `.spec/knowledge/standards/ui-responsive-layout.md` | 无语义放宽，重复外壳删除，独有规则保留 | 样式升级、新 UI 门禁和设计系统读取等重复正文回现行章节；旧版独有的视觉、空间、真实入口和主交互槽位规则归并到 `0.0C`；E2E 证据链与双端布局细则继续由各自主源承载。 |
| 2026-08-11 | `.spec/skills/screenshot-delivery/SKILL.md`、`.spec/knowledge/standards/e2e-verification.md` 中重复的用户开图、多图编号、查看器和交付步骤 | 系统 `D:\codex-home\skills\show-image-to-user\SKILL.md` 保留唯一通用正文；项目 skill / E2E 标准改为 adapter 与证据资格入口；UI / 测试路由补充阅读顺序 | 无语义变化，消除多重真相 | 系统 skill 统一负责用户可见开图、原图与标记副本、多图顺序、查看器和失败回退；项目层只保留 BoardGame 证据目录、项目脚本、服务器相册限制和截图资格，不再复制开图 SOP。 |
| 2026-08-08 | `.spec/knowledge/standards/asset-pipeline.md` 的图片/音频总标题与已拆出的专项主源 | `.spec/knowledge/standards/asset-pipeline.md` + `critical-image-preload.md` + `audio-assets.md` | 无语义变化，职责标识澄清 | 将总文档标题改为“图片资源与发布总规范”，导言明确关键图片预加载和音频运行时合同分别回专项文档；不搬移、不删除正文。 |
| 2026-08-08 | 根 `AGENTS.md` 的“大杀四方 Wiki 爬虫规范”与项目背景段 | `docs/games/smashup/workflows/smashup-faction-intake.md` + 根 `AGENTS.md` 入口摘要 | 无语义放宽，专项流程下沉 | Wiki 脚本、执行顺序、来源优先级、Firecrawl 例外和勘误处理迁入 Smash Up intake workflow；根文件只保留触发条件和入口，项目背景压缩为范围说明。 |
| 2026-08-08 | `docs/workflows/dicethrone-hero-intake.md` 旧顶层 workflow 与 `docs/games/dicethrone/workflows/dicethrone-hero-intake.md` | `docs/games/dicethrone/workflows/dicethrone-hero-intake.md` | 无语义放宽，旧入口删除 | 顶层旧 workflow 的有效内容已逐项迁入更完整的游戏目录主 workflow；保留历史裁图脚本路径说明，确认仓内无旧入口引用后删除顶层副本。 |
| 2026-08-08 | `docs/workflows/smashup-faction-intake.md` 旧顶层 workflow 与 `docs/games/smashup/workflows/smashup-faction-intake.md` | `docs/games/smashup/workflows/smashup-faction-intake.md` | 无语义放宽，旧入口删除 | 顶层旧 workflow 的有效内容已逐项迁入更完整的游戏目录主 workflow；确认仓内无旧业务入口引用后删除顶层副本。 |
| 2026-08-08 | `docs/refactor/pod-*.md` 五份大杀四方 POD 文档 | `docs/games/smashup/refactor/pod/` + `src/games/smashup/rule/POD-SYSTEM.md` | 无语义变化，职责归位 | POD 文档只服务大杀四方，整体迁到游戏目录；规则 / 运行时合同仍以 `src/games/smashup/rule/POD-SYSTEM.md` 为主源，架构说明留在游戏目录 refactor/pod。 |

## 后续候选批次

1. `AGENTS.md` 的部署/Android OTA 细则：应下沉到 `.spec/skills/android-app-release/SKILL.md`、`docs/deploy.md` 和 `docs/mobile-release.md`，根文件只保留触发入口。
2. `AGENTS.md` 的 UI/UX 规范：已完成首轮压缩；后续只在发现根文件继续复制专项 SOP 时处理。
3. 根目录历史计划/日志：`task_plan.md`、`progress.md`、`findings.md`、`lint-output.txt`、`e2e-ai-test-*.txt`、`WIKI-*.md` 需要先判断当前/历史/临时状态，再迁入 `temp/`、`evidence/` 或补状态标记；不得直接删除。
4. 单游戏文档双入口：`docs/features/*`、`docs/refactor/*`、`docs/plans/*`、`docs/improvements/*` 中已发现与 `docs/games/<gameId>/...` 精确重复的文档；倾向保留游戏目录为长期入口，旧顶层入口需先查引用后处理。
5. OpenSpec 已完成但未归档变更：`openspec/changes/` 中多项 `tasks.md` 已全勾选但仍未进入 `archive/`；需单独按 OpenSpec 流程验证并归档。

## 2026-08-08 全仓文档盘点

- 只读扫描约 3,748 个 Markdown / 文本文档：`evidence/` 约 1,916 个，`openspec/` 约 1,000 个，`docs/` 约 478 个，`.spec/skills/` 约 54 个。
- 已补 `docs/README.md` 作为总入口，并在根 `README.md` 的文档段落加入该入口；这是入口整理，不改变任何规则语义。
- 用户纠偏：本轮真正目标是“AI 规范重构”，不是“产品规格实施”。已新增 `.spec/knowledge/README.md` 作为 AI 规范层主入口，并明确 `openspec/` 只管产品/架构能力规格，不作为 AI 规范重构主线。
- 已新增 `.spec/decisions/document-merge-ledger.md`，开始按 P0-P5 批次判断 AI 规范文档的主从关系、合并方向和待精读项；本轮扫描 `.spec/knowledge/standards/` + `.spec/skills/` 未发现哈希完全相同的文件，问题主要是主题重叠和主从关系不清。
- P1 UI 组第一步已完成主从标注：`.spec/skills/screenshot-delivery/SKILL.md` 和 `.spec/skills/boardgame-ui-imagegen/SKILL.md` 明确降为 workflow，只引用 `e2e-verification.md`、`ui-change-gates.md`、`ui-ux.md`、`asset-pipeline.md` 等规范主源。
- P2 测试/审计组第一步已完成主从标注：`.spec/skills/game-audit-workflow/SKILL.md` 明确降为 workflow；行级检查未发现 `testing-audit.md` 与核心/维度分卷存在可直接删除的逐行重复，后续只做段落级迁移和压缩。
- P2.1 已将 `.spec/skills/game-audit-workflow/SKILL.md` 的「默认执行口径」长红线原样拆到 `.spec/skills/game-audit-workflow/references/audit-redlines.md`；主 skill 只保留审计入口、必读主源、Step 0-6 骨架和 evidence 产出要求。
- P2.2 已将 `.spec/knowledge/standards/testing-audit.md` 的审计 evidence 模板和自检脚本长正文压缩为入口；`.spec/knowledge/standards/audit-evidence-template.md` 承接模板字段、自检扫描范围、`--include-untracked` / `audit:evidence:all`、轻量 evidence 检查和脚本局限。
- P2.3 已将 `.spec/knowledge/standards/testing-audit.md` 的「深度审计流程」Step 0-5 与深审禁区无损迁入 `.spec/knowledge/standards/testing-audit-core-principles.md`；testing-audit 只保留深审入口和主源读取要求。
- P2.4 已复核 `testing-audit.md` 的「禁止假阳性收口」：该段属于证据分层和对外结论口径短清单，当前保留在 testing-audit，不迁移到 core-principles。
- P2.5 已将 `testing-audit.md` 的回归问题处理长流程压缩为入口；`.spec/knowledge/standards/regression-closeout.md` 承接用户症状保真、最后正常证据、引入提交 / hunk 归因、回归还原、首跑红测、原始位点 E2E、UI 最小还原例外、代理按钮合同和输出模板。
- P2.6 已将 `testing-audit.md` 的同类扩审执行细则压缩为入口；`regression-closeout.md` 承接搜索维度、共享层覆盖、命中处理和交付口径，testing-audit 保留“测试覆盖声明必须对账”作为证据口径。
- P2.7 已复核 `testing-audit.md` 的「指定最近合并 PRxx 为权威基线时的红测归因」：该段属于测试失败归因与断言基线裁决口径，merge workflow / regression-closeout 均不是完整主源，当前保留在 testing-audit。
- P2.8 已将 `testing-audit.md` 的「根因分级与处置」正文迁入 `.spec/knowledge/standards/testing-audit-core-principles.md`；testing-audit 只保留根因分级入口和主源读取要求。
- P2.9 已复核 `testing-audit.md` 的测试工具选型、效果数据契约测试、交互链完整性审计和 CI 质量门禁：该段属于审计工具路由短表，当前保留在 testing-audit，不迁移到 automated-testing 或 testing-best-practices。
- P2.10 已将 `testing-audit.md` 的 E2E 选择器一致性检查清单和反模式迁入 `docs/automated-testing.md`；testing-audit 只保留审计入口，E2E 测试写法主源承接选择器来源、交互路径、i18n 按钮文本和状态断言。
- P2.11 已将 `automated-testing.md` 中截图核对、外部资源缺失、流程截图、状态切换、奖励骰/特写和视觉项等重复验收清单压缩为入口；`.spec/knowledge/standards/e2e-verification.md` 承接截图验收主源，并补齐无有效业务截图、线上/特定环境现状图、移动端 preferredOrientation 主方向和牌面美术未渲染口径。
- P2.12 已继续压缩 `testing-audit.md`：结论等级和缺口分类回 `audit-evidence-template.md`，L1-L4、跨层通用能力、deferred/finalize 和时序 UI 证据门禁归入 `testing-audit-core-principles.md`；末尾重复的“教训附录 / D 维度库”入口合并。测试工具选型短表仍保留为审计路由，不迁成测试教程。
- P2.13 已将 `.spec/skills/game-audit-workflow/references/dimensions.md` 从 D1-D52 的第二份维度清单压缩为高风险速查；完整 D1-D58 维度名称和定义统一回 `.spec/knowledge/standards/testing-audit-dimensions.md`，并修正 `testing-audit.md` 中空的 D1-D24 章节和过时的 D1-D57 文案。
- P3 资源/录入组第一步已完成主从标注：`.spec/skills/data-entry-workflow/SKILL.md` 和 `.spec/skills/atlas-crop/SKILL.md` 明确降为 workflow；`asset-pipeline.md`、`critical-image-preload.md`、`audio-assets.md`、`data-entry.md` 当前未发现可直接删除的逐行重复。
- P3.1 已压缩 `.spec/skills/data-entry-workflow/SKILL.md`：通用录入门禁回 `.spec/knowledge/standards/data-entry.md`，资源链回 `.spec/knowledge/standards/asset-pipeline.md`，读图 / OCR 回 `.spec/skills/safe-image-reading/SKILL.md`，机制承接回 `.spec/knowledge/standards/engine-systems.md`；workflow 只保留触发、S0-S4、批量门禁、游戏路由和交付要求。
- P3.2 已复核 `.spec/skills/atlas-crop/SKILL.md`：当前约 82 行，已是脚本 / 参数 / 抽样验收 workflow；主源回 `asset-pipeline.md` 与 `data-entry.md`，本轮裁定不再拆分。
- P3.4 已收口音频双入口：`.spec/knowledge/standards/audio-assets.md` 只承载跨游戏运行时架构、共享包路径和音效触发主合同；`docs/audio/audio-usage.md` 只承载命令、查找、试听、BGM 与项目接入细节。删除 `audio-usage.md` 中重复的三层架构和本地包路径正文，并修正不存在的项目 skill 路径。
- P3.5 已收口新增音频命令重复：`docs/audio/audio-usage.md` §3 作为压缩、registry、资源清单、AI registry 和语义目录命令主源；`docs/audio/add-audio.md` 只保留新增素材执行顺序和验收入口，并迁移可选压缩参数到命令主源。
- P3.6 已复核剩余图片资源组：`asset-pipeline.md` 负责图片资源链与发布合同，`critical-image-preload.md` 负责 critical/warm 预加载、教程裁剪和图集初始化，`atlas-crop` 只负责裁切脚本与抽样验收；三者职责已分离，本批不迁移、不删除。
- P4 新游戏/新增派系组第一步已完成职责分线：`create-new-game` 管从零新增游戏，`add-new-faction` 管已有游戏新增对象，`smashup-faction-addition` 只做大杀四方 adapter；OpenSpec 在这里只承担产品/架构能力规格，不作为 AI 规范重构入口。
- P4.1 已将 `.spec/skills/create-new-game/SKILL.md` 顶部 19 条新游戏红线无损搬入 `.spec/skills/create-new-game/references/intake-redlines.md`，主 skill 改为索引入口，减少长红线堆叠。
- P4.2 已将 `.spec/skills/create-new-game/SKILL.md` 阶段 0 的详细清单和一票否决迁入 `references/intake-redlines.md`，主 skill 阶段 0 只保留入口骨架。
- P4.3 已压缩 `.spec/skills/create-new-game/SKILL.md` 阶段 5，把 UI/设计/截图链细则统一回 `references/ui-implementation-gates.md`，主 skill 只保留 4 条入口骨架。
- P5 Git/合并组第一步已完成职责分层：`git-operations` 管日常提交/推送，`merge-pr-workflow` 管 PR/分支合并执行，`merge-decision-package` 管给用户的合并裁决包，`worktree-branch-target-lock.md` 管目标锁定标准。
- P5.1 已压缩 `AGENTS.md` §1.4 Git/分支/worktree 长段落，把执行细节下沉到 `git-operations`、`merge-pr-workflow`、`merge-decision-package` 和 `worktree-branch-target-lock.md`，根文件只保留入口和硬红线。
- P1/P3 根段落级合并已完成：`AGENTS.md` 资源段和 UI/UX 段已从长正文压缩为入口 + 硬红线；图片 locale 口径补到 `asset-pipeline.md`，`defineEvents()` 音频策略补到 `audio-assets.md`，项目内不存在的 audio workflow 路径修正为系统 skill，UI 细则回 `ui-ux.md` / `ui-change-gates.md` / `ui-responsive-layout.md` / `docs/mobile-adaptation.md`。
- P2/P5 标准工作流段落级合并已完成：`AGENTS.md` 代码质量检查段压缩为最小验证入口 + 生产依赖验证；审查/提交/push 的静态分析、hook 和快速路径口径回前文与 `.spec/skills/git-operations/SKILL.md`；验证测试段保留为测试文档入口清单。
- 小黑屋 legacy 中文规则双份已处理：`src/games/betrayal/rule/legacy-zh/` 判定为唯一就近入口，`docs/games/betrayal/sources/legacy-zh/` 归档镜像删除；删除前确认两侧各 29 个文件，除 README 外 28 个文件哈希一致，README 侧以 `src` 版本为信息更完整的保留侧。
- docs 内 14 份 0 字节 Markdown 已删除：删除前确认全部长度为 0，且全仓无完整路径引用、无文件名引用；这些文件不承载正文信息。
- 小黑屋 PDF 空抽取结果已合并：原 `docs/games/betrayal/sources/pdf-text/pdf-01.md` 到 `pdf-08.md` 仅含 CRLF，无正文；已改为 `docs/games/betrayal/sources/pdf-text/README.md` 记录 8 个扫描型 PDF 的空抽取结论，原空文件删除。
- DiceThrone 音频 AI registry 双份已处理：保留 `docs/audio/registry.ai.dicethrone.json` 和通用生成脚本 `scripts/audio/generate_ai_audio_registry_dicethrone.js`；删除 `docs/games/dicethrone/audio/registry.ai.dicethrone.json` 和仅输出路径不同的旧脚本 `scripts/games/dicethrone/audio/generate_ai_audio_registry_dicethrone.js`；`docs/audio/audio-usage.md` 已改到通用脚本入口。
- evidence 内 8 份无引用 0 字节文件已删除；`evidence/_shared/p0-audit-batch2.md` 被历史审计清单引用，已补占位说明防止误当成完整审计正文；`evidence/_shared/rolldie-logs.txt` 是脚本输出路径，暂保留为空。
- evidence 内 5 组 Markdown 精确重复已收口：跨项目审计报告保留 `evidence/_shared/`，DiceThrone 专项报告保留 `evidence/dicethrone/`，删除根级同名副本。
- 已新增 `evidence/README.md` 作为证据目录入口，明确 `_shared`、游戏目录、专项截图链的职责，并写明截图 / 图片重复不得按哈希直接删除。
- 已按“保留侧存在 + 哈希完全一致 + 仓内无引用旧路径”的证据，删除 8 份顶层单游戏重复副本：`docs/features/smashup-base-restrictions-ui.md`、`docs/features/cardia-card-magnify.md`、`docs/refactor/dicethrone-hand-area-refactor.md`、`docs/refactor/dicethrone-auto-advance-upkeep-income.md`、`docs/improvements/smashup-actionlog-reason-display.md`、`docs/plans/2026-02-20-smashup-cursor-design.md`、`docs/dicethrone-new-heroes-progress.md`、`docs/dicethrone-audio-plan.md`。
- Smash Up POD 文档重复入口已收口：选择性覆盖示例合并到 `docs/games/smashup/refactor/pod/pod-system-architecture.md` 后删除独立文件；架构文档只保留补充职责，当前运行时合同仍在 `src/games/smashup/rule/POD-SYSTEM.md`，自动映射 / stub / 总结文档保留为历史记录并明确降权。
- 公共 `docs/refactor/` 两份剩余文档已完成内容级归并：音效架构方案归入 `.spec/knowledge/standards/audio-assets.md`，PixiJS 压测与重新评估条件归入 `.spec/knowledge/standards/animation-effects.md`；删除旧方案入口，保留决策证据与有效边界。
- 根 `AGENTS.md` 部署 / Android OTA 长段已压缩为入口和两条发布硬红线；详细分流、命令、包体、版本、服务器部署和回查分别回 `.spec/skills/android-app-release/SKILL.md`、`docs/deploy.md`、`docs/mobile-release.md`、`docs/android-app-build.md` 和 `docs/ios-testflight-build.md`。
- docs 内 Markdown / 文本 / JSON 精确重复已清零；evidence 图片重复曾被单独排除在 AI 规范正文重构之外，后续已按独立历史证据仓规则处理明确副本，不把图片清理结果冒充规范正文去重。
- 已开始 evidence 图片逐组去重：石像小天使自然回合子目录 3 张截图与父目录逐张 SHA256 一致，子目录索引只是父目录完整证据组的子集，且无路径引用，已收口到父目录；作祟后探索两批仅部分截图一致且分支 / 标注语义不同，保留两批。
- 已继续收口两个同目录别名副本：删除无引用的教程调试图 `debug-second-chapter-after-use-click-latest.png` 和带协议噪声的 Fantasy Realms 图片 `fantasyrealms-board-tabletop-implementation-http.png`，各自保留同哈希的稳定命名文件。
- 当前图片重复的主要机制不是“所有规范正文重复”，而是证据组缺少唯一入口、批次索引可独立导出、历史验收图与用户交付图没有明确角色标识；规范层已经补上“图片不得仅凭哈希删除”的门禁。
- 图片精确重复已逐组归类：明确的同目录稳定别名和子集副本已删除；设计 / 最终、修复阶段、不同分支、用户批次和不同步骤的同像素图片已记录为保留，不再批量清理。
- 后续若要继续去重，必须继续查引用并证明被删侧有效内容已迁移或明确失效。
## 2026-08-10 知识导航继续下沉为任务域路由

本轮确认上一轮唯一真相源迁移已经解决“正文分散”和“重复维护”，但没有解决“从入口找到该读哪份规范”：`.spec/knowledge/README.md` 仍保留约 85 条任务表，调用者必须扫描一张总表才能定位标准。

- `knowledge/README.md` 只保留读取顺序、6 个任务域和层级边界。
- 任务场景迁入 `knowledge/routes/`：规则与游戏逻辑、UI 与截图交付、测试与审计、资源与数据录入、引擎与共享架构、协作与运行事务。
- 路由只负责“什么情况下读什么”，不复制标准正文；DiceThrone 的攻击结算、卡牌时机、改骰/奖励骰和战术优势入口集中在规则路由。
- `spec-lint` 强制检查路由存在、主入口挂载、主入口保持浅层，并把路由内容纳入标准可达性检查。
- 旧规范兼容页、`.spec/knowledge/standards/` 正文和 `openspec/` 产品任务编排均保持原职责，没有因本次入口重构删除或复制正文。

## 本轮事故回代

这次“余牌查询开启但正式对局点牌堆无响应”的流程问题，暴露的是两个层面：

- 代码层：房间配置与运行时状态没有单一真相。
- 规范层：E2E 验证边界写得太重且散在根文件，导致真实开房被机械升级，而不是先判断它是否能证明更多。

已通过 `.spec/knowledge/standards/e2e-verification.md` 固化边界：默认状态注入；只有跨入口合同需要证明时，才使用真实开房链路。

## 2026-06-09 本轮补充

- 本轮新增的不是“更多根规则”，而是把根 `AGENTS.md` 朝渐进式披露再收一层：
  - 根文件保留：什么时候触发测试规则、哪些红线不能越过、先看哪份文档。
  - 二级文档承载：三板斧定义、主页/进局分层、长链时长预算、组合式验证、拆分命名。
- 这次沉淀的本质问题不是“Fantasy Realms 某条 E2E 太慢”，而是**默认测试入口和验证粒度没有被硬性约束**，导致容易机械把多个合同绑成同一条长链。
- 这次进一步补强的点也不是“以后少跑测试”这么空泛，而是把**停线条件**写实：超过预算、重复自然开局、仍未命中问题位点时，必须立刻拆合同并退回状态注入/低层验证，不能继续把 E2E 当主调试循环。
