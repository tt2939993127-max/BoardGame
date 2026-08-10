# AI 规范文档合并台账

> 目标：逐批判断 AI 规范文档哪些要保留、合并、下沉、改成索引，哪些只是历史证据或任务状态。本文是合并裁决台账，不直接承载新规范正文。

## 裁决口径

每一组文档先判职责，再决定动作。

| 角色 | 含义 | 允许动作 |
| --- | --- | --- |
| canonical-source | 唯一规范正文 | 保留、拆分、压缩、改正文；其它文件只能引用它。 |
| index | 导航入口 | 只写“什么时候读哪份”，不复制规则正文。 |
| workflow | 可执行步骤 | 放 `.spec/skills/`，写命令、阶段、检查清单和项目路径。 |
| adapter | 对上位规范的项目补充 | 只写 BoardGame 增量约束，不复制系统/通用正文。 |
| evidence | 历史证据/审计记录 | 不作为规范来源；只能记录执行结果。 |
| task-state | 当前或历史任务状态 | 不自动接管目标；需要标当前/历史/完成。 |
| duplicate-copy | 已证明等价副本 | 保留侧明确、旧路径无引用后删除。 |
| review-needed | 疑似重叠但未读完 | 只进候选，不删除。 |

## 总体扫描（2026-08-08）

- 范围：`.spec/knowledge/standards/` 与 `.spec/skills/`。
- 文件数：约 94 份。
- 结论：AI 规范层未发现哈希完全相同的文件；主要问题是同一主题拆分后缺少主从关系说明，导致后续 agent 不知道该先读哪份、哪份只是 workflow。
- 第一批不删除文件，先做主从裁决；只有后续精读证明“等价副本 + 无引用旧路径”才删。

## P0：AI 规范入口

| 文件 | 当前角色 | 裁决 | 动作 |
| --- | --- | --- | --- |
| `AGENTS.md` | canonical-source / rules | 项目硬红线入口 | 后续批次压缩为“触发条件 + 读哪份 + 不得做什么”。 |
| `.spec/knowledge/README.md` | index | AI 规范重构主入口 | 已新增；只管分层和重构路线，不写长 SOP。 |
| `.spec/knowledge/README.md` | index | 场景触发索引 | 保留；后续检查是否复制了太多规则正文。 |
| `.spec/decisions/document-consolidation.md` | decisions | 整理迁移台账 | 保留；记录迁移、删除、语义变化和待处理批次。 |
| `.spec/decisions/document-merge-ledger.md` | decisions | 本轮逐批合并裁决台账 | 新增；后续每批精读后更新。 |

## P1：UI 规范 / 视觉 / 截图

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.spec/knowledge/standards/ui-ux.md` | canonical-source 候选 | UI 审美和通用设计原则主文档 | 压缩成 UI 总原则；具体门禁下沉/引用其它文件。 |
| `.spec/knowledge/standards/ui-change-gates.md` | canonical-source 候选 | UI 改动前置门禁与验收主文档 | 保留为 UI gate 主源；避免与 `ui-ux.md` 双写验收。 |
| `.spec/knowledge/standards/ui-responsive-layout.md` | canonical-source 候选 | 响应式/双端布局专项 | 保留为专项分卷，由 `ui-change-gates.md` 或 `ui-ux.md` 引用。 |
| `.spec/knowledge/standards/ui-animation-patterns.md` | canonical-source 候选 | UI 动画专项 | 保留为专项分卷；与 `animation-effects.md` 区分 UI 动画 vs 引擎 FX。 |
| `.spec/skills/boardgame-ui-imagegen/SKILL.md` | workflow | 生图/设计稿执行流 | 保留 workflow；只引用 UI 标准，不复制标准正文。 |
| `.spec/skills/screenshot-delivery/SKILL.md` | workflow | 给用户看图/交付截图执行流 | 保留 workflow；截图验收规则应引用 E2E/UI gate。 |

待精读判断：`ui-ux.md`、`ui-change-gates.md` 和 `e2e-verification.md` 是否重复写了“截图验收必须真实入口/AI 审图/PureRef 展示”。

### P1 精读裁决（2026-08-08）

- `ui-ux.md` 顶部已经声明详细门禁拆到 `ui-change-gates.md`，当前不删；后续重点是继续压缩 §0 的最小执行口径，避免和 `ui-change-gates.md` 双写。
- `ui-change-gates.md` 是 UI 改动和玩家视角审计主源；`ui-ux.md` 不应复制它的截图闭环细则。
- `e2e-verification.md` 的“看图验收 / 截图来源与证据文档”是截图证据主源；它可以和 UI gate 互相引用，但不应承载“如何打开给用户”的执行步骤。
- `.spec/skills/screenshot-delivery/SKILL.md` 是截图交付 workflow。本轮已补“规范来源与职责边界”，明确它引用 `e2e-verification.md` 与 `ui-change-gates.md`，不作为第二份截图验收规范。
- `.spec/skills/boardgame-ui-imagegen/SKILL.md` 是生图 workflow。本轮已补“规范来源与职责边界”，明确 UI 标准、UI gate、资源链分别由 `ui-ux.md`、`ui-change-gates.md`、`asset-pipeline.md` 承担。

P1 本轮动作：先做主从标注，不删除文件；下一步若继续 P1，应精读 `ui-ux.md` §0 与 `ui-change-gates.md` 的重复段，做段落级迁移/压缩。

### P1.2 UI 改动门禁旧版外壳归并（2026-08-08）

- 双边范围：`.spec/knowledge/standards/ui-change-gates.md` 现行章节与文件末尾旧版 `0.1-0.4` blockquote 外壳。
- 重复裁决：旧版外壳中的样式任务升级门禁、新 UI 端到端门禁、新 UI 类型判断、新派系展示页边界、大规模 UI 改动阈值和设计系统读取顺序，已在现行 `0.0`、`0.0A`、`0.1` 与 `0.0C` 章节有唯一正文；旧版重复外壳删除。
- 独有内容保留：旧版 `0.4` 独有的动态证据、整体构图、满载空间预算、贴附 token、共享组件模式矩阵、真实入口锁定、主交互槽位五联单、双主焦点和请求确认等规则，已归并到现行 `## 0.0C 视觉、空间与主交互槽位细则`，没有丢弃。
- 主源回归：E2E 截图来源、状态触发、截图命名和证据文档要求回 `.spec/knowledge/standards/e2e-verification.md`；PC/移动参考分辨率和双端布局回 `.spec/knowledge/standards/ui-responsive-layout.md`；`ui-change-gates.md` 只保留改动门禁、空间与交互槽位裁决。
- 验证口径：现行联机前置规则、一级/二级动作规则和主交互槽位规则均只保留一份；旧版 `> ### 0.1`、`> ### 0.2`、`> ### 0.3`、`> ### 0.4` 标题均已清零。

## P2：测试 / 审计 / E2E

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.spec/knowledge/standards/testing-audit.md` | index / canonical-source 候选 | 测试审计总入口 | 倾向压缩为入口；核心原则和维度分卷已存在。 |
| `.spec/knowledge/standards/testing-audit-core-principles.md` | canonical-source 候选 | 审计核心原则 | 保留为核心原则主源。 |
| `.spec/knowledge/standards/testing-audit-dimensions.md` | index | D 维度库索引 | 保留；分卷承载细则。 |
| `.spec/knowledge/standards/testing-audit-dimensions-*.md` | canonical-source 分卷 | 维度细则 | 保留；后续检查是否仍被总入口重复。 |
| `.spec/knowledge/standards/e2e-verification.md` | canonical-source 候选 | E2E 与截图验收主源 | 保留但需拆；截图交付、UI gate、E2E 可能重复。 |
| `.spec/skills/game-audit-workflow/SKILL.md` | workflow | 全游戏审计执行流 | 保留 workflow；应引用审计标准和维度库。 |

待精读判断：`testing-audit.md` 是否已经只是入口；若仍复制核心原则或 D 维度正文，迁到核心/分卷后删除重复段。

### P2 精读裁决（2026-08-08）

- 行级查重结果：`testing-audit.md` 与 `testing-audit-core-principles.md`、`testing-audit-dimensions*.md` 没有可直接删除的逐行重复。
- 语义关系：`testing-audit.md` 仍承载审计结论等级、证据分层、深度审计流程、假阳性收口、回归处理、审计文档模板和自检门禁；这些不是分卷的完整重复，暂不删除。
- `testing-audit-core-principles.md` 是 fail-close、全面审计完成定义、交互入口语义矩阵和技能完整流程矩阵主源。
- `testing-audit-dimensions.md` 是 D 维度索引和输出格式主源；分卷承载细则。
- `.spec/skills/game-audit-workflow/SKILL.md` 是审计执行 workflow。本轮已补“规范来源与职责边界”，明确它只引用审计标准，不作为第二份规范正文。

P2 本轮动作：不删除文档；先完成 workflow 降权和主从标注。下一步若继续 P2，应段落级精读 `testing-audit.md` 的 Step 0-5 与核心原则文档，判断哪些可迁入核心原则后把总入口压缩。

### P2.1 game-audit workflow 红线拆分（2026-08-08）

- 已将 `.spec/skills/game-audit-workflow/SKILL.md` 的「默认执行口径」长红线原样拆到 `.spec/skills/game-audit-workflow/references/audit-redlines.md`。
- 主 `SKILL.md` 只保留审计 workflow 入口、必读主源、Step 0-6 执行骨架和 evidence 产出要求。
- `testing-audit.md`、`testing-audit-core-principles.md`、`testing-audit-dimensions.md` 仍是审计规范主源；新 reference 只是保留项目内高风险红线，后续冲突时先改主源。
- 本批不删除语义；减少的是主 workflow 的长篇红线堆叠，防止它继续被误当成第二份审计规范正文。

### P2.2 审计 evidence 模板主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 中「审计文档最低模板」和「审计后自检」长正文压缩为模板入口。
- `.spec/knowledge/standards/audit-evidence-template.md` 作为 evidence 模板主源，承接审计范围、结论等级、权威来源、逐项结论、验证证据、共享根因、修订记录、继续任务防重复门禁、测试语义对账与同类扩审。
- testing-audit 中独有的自检脚本行为已迁入模板 6.1：默认扫描已跟踪 / 已暂存 evidence、未跟踪文件需显式路径或 `--include-untracked`、全量扫描用 `audit:evidence:all`、轻量 evidence 检查和脚本局限。
- 本批不删除模板信息；只是避免审计入口和 evidence 模板双写字段与脚本说明。

### P2.3 深度审计流程主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 中「深度审计流程」Step 0-5 与深审禁区无损迁入 `.spec/knowledge/standards/testing-audit-core-principles.md`。
- `testing-audit-core-principles.md` 继续作为 fail-close、全面审计完成定义、深度审计执行步骤、交互入口语义矩阵和技能完整流程矩阵主源。
- `testing-audit.md` 对应位置已压缩为「深度审计流程入口」，只保留适用场景、核心目标和读取主源要求，不再复制步骤细则。
- 本批不删除语义；减少的是审计总入口与核心原则文档之间的段落级双写。

### P2.4 禁止假阳性收口裁决（2026-08-08）

- 已复核 `.spec/knowledge/standards/testing-audit.md` 中「禁止假阳性收口」与 `testing-audit-core-principles.md`、`game-audit-workflow` 红线的关系。
- 裁决：该段是 `testing-audit.md` 的证据分层和对外结论口径补充，不是 D 维度或 workflow 步骤；当前保留在 `testing-audit.md`，不迁移。
- 理由：core-principles 已承载 fail-close 和对象级深审矩阵；testing-audit 作为审计入口仍需保留“哪些证据不能支撑玩法收口”的短清单，帮助读者在入口层先降级结论。
- 本批不删除、不搬移；后续只有当该段继续扩写成长 SOP 时，才再拆回 core-principles 或 evidence 模板。

### P2.5 回归处理主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 的「回归问题处理流程」长正文压缩为回归处理入口。
- `.spec/knowledge/standards/regression-closeout.md` 作为回归收口主源，承接原 testing-audit 中独有的回归细节：不得改写用户症状、数量级不得降级、未复现要直说、最后正常证据、`git blame` / `git log -S/-G` / `git show` / `git bisect`、引入 hunk diff、默认还原错误 hunk、首跑红测保留、不得换场景绕过失败、原始位点 E2E、UI 最小还原例外、代理按钮合同和输出模板。
- `testing-audit.md` 只保留适用场景、回归成立前 / 修复前 / 修复后的三条入口提示，并要求读取 `regression-closeout.md`。
- 本批不删除语义；减少的是审计入口与回归收口文档之间的段落级双写。

### P2.6 同类扩审主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 的「Bug 修复后的同类扩审」细则压缩为同类扩审入口。
- `.spec/knowledge/standards/regression-closeout.md` 的「同类扩审最低要求」承接搜索维度、共享层覆盖、命中处理和交付口径。
- `testing-audit.md` 仍保留“测试覆盖声明必须对账”短规则，因为它属于 evidence / 对外汇报的证据分层口径，不是同类扩审执行 SOP。
- 本批不删除语义；减少的是 testing-audit 与 regression-closeout 对同类扩审流程的双写。

### P2.7 PR 基线红测归因裁决（2026-08-08）

- 已复核 `.spec/knowledge/standards/testing-audit.md` 中「指定最近合并 PRxx 为权威基线时的红测归因」与 `AGENTS.md`、`.spec/skills/merge-pr-workflow/`、`docs/git-merge-checklist.md`、`testing-audit-core-principles.md` 的关系。
- 裁决：该段当前保留在 `testing-audit.md`，不迁移。
- 理由：该段处理的是“用户指定某个 merge commit / PR 为测试断言基线时，如何在失败测试里裁决测试过时、实现回归或业务变更”的测试红测归因口径；merge workflow 负责合并过程和单边覆盖审计，`regression-closeout.md` 负责回归收口，二者都不是该红测裁决的完整主源。
- 本批不删除、不搬移；后续只有出现更完整的测试断言基线专项文档时，才把该段作为候选迁移。

### P2.8 根因分级与处置主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 中「根因分级与处置」长正文迁入 `.spec/knowledge/standards/testing-audit-core-principles.md`。
- `testing-audit-core-principles.md` 作为核心审计原则主源，承接数据/录入缺陷、单点实现缺陷、共享抽象缺陷、架构/时序/系统边界缺陷的分级，以及设计问题优先重构、同类语义分叉 finding、定义层与执行层双向自洽、临时方案约束和重构完成定义。
- `testing-audit.md` 对应位置已压缩为入口，只保留何时读取主源和不能只修当前 case 的摘要。
- 本批不删除语义；减少的是审计入口与核心原则之间的根因分级双写。

### P2.9 测试工具选型裁决（2026-08-08）

- 已复核 `.spec/knowledge/standards/testing-audit.md` 中「测试工具选型」「效果数据契约测试」「交互链完整性审计」「CI 质量门禁」与 `docs/automated-testing.md`、`docs/testing-best-practices.md`、`testing-audit-core-principles.md` 的关系。
- 裁决：当前保留在 `testing-audit.md`，不迁移。
- 理由：`automated-testing.md` 和 `testing-best-practices.md` 承载测试工具详细用法与测试实践；`testing-audit.md` 这里承载的是审计时如何选择工具的短路由表和审计辅助门禁。若迁走，审计入口会失去“GameTestRunner 优先、审计工具补充”的第一层决策。
- 本批不删除、不搬移；后续只有该段继续扩写成工具教程时，才下沉到 `automated-testing.md` 或 `testing-best-practices.md`。

### P2.10 E2E 选择器一致性主源收口（2026-08-08）

- 已将 `.spec/knowledge/standards/testing-audit.md` 中「E2E 测试选择器一致性检查」的检查清单和反模式迁入 `docs/automated-testing.md`。
- `docs/automated-testing.md` 作为 E2E 测试写法主源，承接选择器来源、交互路径、i18n 按钮文本、状态断言、旧弹窗选择器失效和内部 CSS 类硬编码反模式。
- `testing-audit.md` 对应位置已压缩为入口，只保留“UI 重构后要回 automated-testing 检查 E2E 断言同步”的路由。
- 本批不删除语义；减少的是审计入口与 E2E 测试主源之间的选择器检查双写。

### P2.11 E2E 截图验收主源收口（2026-08-08）

- 已复核 `docs/automated-testing.md` 中「截图人工核对」「E2E 截图核对补充规范」「外部资源缺失时的看图规则」与 `.spec/knowledge/standards/e2e-verification.md` 的关系。
- 裁决：截图验收、流程截图证据链、奖励骰 / 特写、状态切换、资源缺失、线上现状图、移动端主方向和对外结论口径统一归 `e2e-verification.md`；`automated-testing.md` 只保留测试运行、工具 API 和截图附件目录管理。
- 已将 `automated-testing.md` 中独有的“无有效业务截图”“线上或特定环境现状图”“移动端 preferredOrientation 主方向”“牌面美术未正常渲染”口径补入 `e2e-verification.md`。
- `automated-testing.md` 两处重复清单已压缩为主源入口；本批不删除语义，减少的是测试工具文档与 E2E 验收文档之间的双写。

### P2.12 审计总入口与证据主源再收口（2026-08-08）

- 双边范围：`.spec/knowledge/standards/testing-audit.md` 的“审计结论等级与证据分层”长段，与 `.spec/knowledge/standards/audit-evidence-template.md`、`.spec/knowledge/standards/testing-audit-core-principles.md` 的结论、证据和范围门禁；另检查其末尾“教训附录入口 / D 维度库入口”重复。
- 主源裁决：对外结论等级、四类缺口和 evidence 字段以 `audit-evidence-template.md` 为主源；L1-L4 定义、跨层通用能力、deferred/finalize、时序 UI 证据和范围升级以 `testing-audit-core-principles.md` 为主源；D 维度选择以 `testing-audit-dimensions.md` 为主源。
- 单边独有内容迁移：原入口独有的 L1-L4 具体定义、通用能力分层证明、deferred/finalize 证据要求和时序 UI 机器证据门禁已迁入核心原则；证据集中与目录级留档缺口边界已迁入 evidence 模板。
- 本轮动作：`testing-audit.md` 从 206 行压缩到 160 行，只保留审计入口、禁止假阳性、PR 基线红测归因、工具选型路由和专项文档入口；末尾两个重复入口合并为单一 D 维度入口。
- 保留裁决：测试工具选型、效果数据契约、交互链完整性和 CI 质量门禁仍保留在 `testing-audit.md`，因为它们是“审计时选什么工具”的短路由，不是 `automated-testing.md` 的工具教程正文。
- 验证口径：主源链接、D 维度入口和 workflow 读取关系已重新检索；后续新增审计结论字段先改 evidence 模板，新增审计原则先改核心原则。

### P2.13 审计维度 reference 降为速查（2026-08-08）

- 双边范围：`.spec/skills/game-audit-workflow/references/dimensions.md` 的 D1-D52 简表，与 `.spec/knowledge/standards/testing-audit-dimensions.md` 的完整 D1-D58 维度库。
- 裁决：完整维度名称、定义、选择指南和输出格式只有 `testing-audit-dimensions.md` 承担；skill reference 只保留高频漏审提醒和权威文档路由，不再维护第二份维度名称清单。
- 本轮动作：删除 reference 中重复的 D1-D52 列表，更新标题和路由说明；同步修正 `testing-audit.md` 的空 D1-D24 章节、D1-D57 过时文案，以及 reference 的旧主源路径。
- 保留内容：成功路径截图、特写交互闭环、UI 归因、代词消歧、旧结论回写和图片可判定合同六类高风险提醒继续保留在 workflow reference，作为执行提示而非规范正文。

## P3：资源 / 录入 / 图片 / 音频

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.spec/knowledge/standards/asset-pipeline.md` | canonical-source 候选 | 图片/素材链总规范 | 保留为资源总源；关键图片、音频已拆分则改引用。 |
| `.spec/knowledge/standards/critical-image-preload.md` | canonical-source 分卷 | 首屏关键图片专项 | 保留专项。 |
| `.spec/knowledge/standards/audio-assets.md` | canonical-source 分卷 | 音频运行时合同 | 保留专项；执行步骤归音频 skill。 |
| `.spec/knowledge/standards/data-entry.md` | canonical-source 候选 | 数据录入规范 | 保留；执行步骤归 workflow。 |
| `.spec/skills/data-entry-workflow/SKILL.md` | workflow | 录入执行流 | 保留 workflow；应引用 `data-entry.md`。 |
| `.spec/skills/atlas-crop/SKILL.md` | workflow | 图集裁切执行流 | 保留 workflow；只写步骤和工具。 |

待精读判断：`asset-pipeline.md` 是否还复制 `critical-image-preload.md` / `audio-assets.md` 正文。

### P3 精读裁决（2026-08-08）

- 行级查重结果：`asset-pipeline.md` 与 `critical-image-preload.md`、`audio-assets.md`、`data-entry.md` 没有可直接删除的逐行重复。
- `asset-pipeline.md` 仍是资源链总源；`critical-image-preload.md` 和 `audio-assets.md` 是专项分卷，当前不合并删除。
- `data-entry.md` 是录入标准主源；`.spec/skills/data-entry-workflow/SKILL.md` 是录入执行 workflow。当前 workflow 语义上复述了较多录入门禁，但不是逐行重复，先标主从关系，后续再做段落级压缩。
- `.spec/skills/atlas-crop/SKILL.md` 是图集裁切 workflow；正式资源链仍回 `asset-pipeline.md`，录入合同回 `data-entry.md`。
- 本轮已给 `data-entry-workflow` 和 `atlas-crop` 补“规范来源与职责边界”，防止它们继续演变成第二份资源/录入规范正文。

P3 本轮动作：不删除文件；先完成 workflow 降权。下一步若继续 P3，应精读 `data-entry-workflow` 的“强制门禁”，把只属于标准正文的内容迁回/对齐 `data-entry.md`，workflow 只留执行清单。

### P3.1 data-entry workflow 段落级合并（2026-08-08）

- 已将 `.spec/skills/data-entry-workflow/SKILL.md` 从长门禁正文压缩为 BoardGame 录入 workflow 骨架。
- `.spec/knowledge/standards/data-entry.md` 继续作为通用录入原则、来源优先级、核对契约和零猜测门禁的 `canonical-source`。
- `.spec/knowledge/standards/asset-pipeline.md` 承接图片/素材路径、manifest、正式资源链和服务器素材主源；`.spec/skills/safe-image-reading/SKILL.md` 承接读图 / OCR 执行纪律；`.spec/knowledge/standards/engine-systems.md` 承接机制实现前置审查。
- workflow 内只保留触发条件、先读清单、S0-S4 骨架、批量任务门禁、游戏路由和交付要求；语义不放宽，只减少多重真相源。
- 本批不删除文件；后续新增或修正录入规则时，先改对应主源，再同步 workflow 入口。

### P3.2 atlas-crop 裁决（2026-08-08）

- 已复核 `.spec/skills/atlas-crop/SKILL.md`：当前约 82 行，结构为职责边界、适用场景、脚本、快速流程、验收要点和少量项目内图集类型摘要。
- 该 skill 已明确降为 `workflow`，正式素材主源 / manifest / 运行时资源链回 `.spec/knowledge/standards/asset-pipeline.md`，录入核对合同回 `.spec/knowledge/standards/data-entry.md`。
- 当前不再拆分、不删除；继续压缩会损失脚本入口和裁切参数可读性，按裁决阶梯走“不做”。

### P3.3 资源总规范职责标识（2026-08-08）

- 复核结论：`asset-pipeline.md` 的关键图片预加载和音频部分已经是入口摘要，不再复制 `critical-image-preload.md`、`audio-assets.md` 的专项正文；`data-entry.md` 与 `data-entry-workflow/SKILL.md` 也已完成主源 / workflow 分层。
- 本轮动作：仅将 `asset-pipeline.md` 标题和导言改为“图片资源与发布总规范”，明确图片资源链、发布链是本文件职责，关键图片预加载与音频运行时合同分别回专项主源。
- 裁决：不迁移、不删除正文；这是职责标识修正，避免“总规范”标题继续制造音频规则重复入口。

### P3.4 音频规范与使用合同主从收口（2026-08-08）

- 双边范围：`.spec/knowledge/standards/audio-assets.md` 与 `docs/audio/audio-usage.md` 都曾承载三层架构、registry key 禁令和已安装包 / 共享音频路径合同；两者还分别承载运行时触发规则与项目级命令 / 查找 / BGM 接入细节。
- 主源裁决：跨游戏运行时架构、FeedbackPack / 音效触发时机和共享包四层路径合同归 `.spec/knowledge/standards/audio-assets.md`；资源目录、生成命令、候选查找、试听、BGM 和游戏接入归 `docs/audio/audio-usage.md`。
- 本轮动作：删除 `audio-usage.md` 中重复的架构与本地包路径正文，改成主源入口；删除 `audio-assets.md` 中重复的命令列表，改成使用合同 / workflow 路由。
- 额外修正：`audio-usage.md` 原先指向不存在的项目 `.spec/skills/audio-integration/`，已统一改为系统 skill `D:\codex-home\skills\audio-integration\SKILL.md`。
- 语义不变：音频运行时合同、资源生成链和项目级接入要求均保留；后续新增运行时规则先改 `audio-assets.md`，新增命令 / 查找 / BGM 接入细节再改 `audio-usage.md`。

### P3.5 新增音频命令主源收口（2026-08-08）

- 双边范围：`docs/audio/add-audio.md` §4 与 `docs/audio/audio-usage.md` §3 都承载压缩、registry、资源清单、AI registry 和语义目录命令；`add-audio.md` 另有三种可选压缩参数。
- 主源裁决：所有命令和可选参数归 `audio-usage.md` §3；`add-audio.md` 只描述新增素材的必需顺序、产物、中文名和浏览器验收。
- 本轮动作：将可选压缩参数补入 `audio-usage.md`，把 `add-audio.md` §4 压缩为顺序入口；不删除新增素材的产物和验收合同。
- 验证口径：新增音频时先按 `add-audio.md` 判断产物，再回 `audio-usage.md` 执行命令；后续命令变更只维护一处。

### P3.6 剩余图片资源规范职责裁决（2026-08-08）

- 范围：`.spec/knowledge/standards/asset-pipeline.md`、`.spec/knowledge/standards/critical-image-preload.md`、`.spec/skills/atlas-crop/SKILL.md`。
- 裁决：`asset-pipeline.md` 是图片资源链、压缩、manifest、服务器发布和移动包主规范；`critical-image-preload.md` 是关键图片预加载、教程阶段裁剪、warm 恢复和图集初始化专项；`atlas-crop` 是脚本 / 参数 / 抽样验收 workflow。
- 结论：三者当前是“总规范 + 专项规范 + 执行 workflow”的正常分层，没有发现应迁移或删除的重复正文；继续压缩会损失正式资源链、预加载门禁或裁切脚本入口，本批按“不做”处理。
- 范围修正：evidence 图片哈希重复属于历史证据仓整理，不属于资源规范三分卷；后续图片副本按 P6.7-P6.10 的证据组规则处理，不回写 `asset-pipeline`、`critical-image-preload` 或 `atlas-crop`。

## P4：新游戏 / 新派系 / 规则到实现

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.spec/skills/create-new-game/SKILL.md` | workflow | 新游戏总执行流 | 保留；长门禁继续拆到 references。 |
| `.spec/skills/add-new-faction/SKILL.md` | workflow | 新派系/新角色通用执行流 | 保留；检查是否和 create-new-game 重复前置门禁。 |
| `.spec/skills/smashup-faction-addition/SKILL.md` | workflow / adapter | 大杀四方专项派系流程 | 保留为单游戏 adapter；不得写通用新派系规则。 |
| `.spec/knowledge/standards/description-to-implementation-audit.md` | canonical-source | 规则描述到实现审查标准 | 保留标准；workflow 只引用。 |

待精读判断：`add-new-faction` 和 `create-new-game` 是否重复写“素材/规则/录入/审计/E2E”全流程；若重复，拆成“新游戏创建”和“已有游戏新增内容”。

### P4 精读裁决（2026-08-08）

- 行级查重结果：`create-new-game` 与 `add-new-faction`、`smashup-faction-addition` 没有可直接删除的逐行重复。
- 语义裁决：`create-new-game` 管“从零新增游戏”；`add-new-faction` 管“已有游戏新增派系/角色/英雄”；`smashup-faction-addition` 只做大杀四方专项 adapter。
- `description-to-implementation-audit.md` 是规则描述到实现审查标准；各 workflow 只能引用，不复制成自己的审计定义。
- 本轮已给三份项目 skill 补“规范来源与职责边界”，并明确 OpenSpec 在 `create-new-game` 中只承担产品/架构能力规格，不是 AI 规范重构主线。

P4 本轮动作：不删除文件；完成职责分线。下一步若继续 P4，应精读 `create-new-game` 顶部长红线与 references 的重复，优先把主 skill 压缩为阶段骨架。

### P4.1 段落级合并（2026-08-08）

- 已把 `.spec/skills/create-new-game/SKILL.md` 顶部 19 条块引用红线无损搬到 `references/intake-redlines.md`。
- 主 `SKILL.md` 只保留“新游戏第一门禁索引”和最小执行口径，并在必读索引中加入 `references/intake-redlines.md`。
- 这是移动职责落点，不改变规则语义；后续继续压缩 `create-new-game` 时，应优先处理阶段 0 / 阶段 5 与 `preflight-gates.md`、`ui-implementation-gates.md` 的重复。

### P4.2 段落级合并（2026-08-08）

- 已把 `.spec/skills/create-new-game/SKILL.md` 阶段 0 的最小闭环、最低产物和一票否决迁入 `references/intake-redlines.md`。
- 主 `SKILL.md` 阶段 0 现只保留入口骨架：说明阶段 0 是第一批实际工作、不得越过 S0、跳过后必须降回 `in_progress`、详细清单以 reference 为准。
- `references/preflight-gates.md` 继续承载来源确认、素材矩阵、PDF/图片 intake 细则；`references/intake-redlines.md` 承载阶段升级红线和完成口径。
- 阶段 5 已经基本是 `ui-implementation-gates.md` 的入口骨架，本轮未继续压缩；后续可精读阶段 5 的 7 条最小执行口径是否还能进一步减到 3-4 条。
- 已继续压缩阶段 5：主 `SKILL.md` 从 7 条最小执行口径收敛为 4 条入口骨架，详细设计稿、架构审查、需求对齐、截图链和高信息密度中局图要求统一回 `references/ui-implementation-gates.md`。

## P5：Git / 合并 / worktree

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.spec/skills/git-operations/SKILL.md` | workflow | Git 提交/推送执行流 | 保留 workflow。 |
| `.spec/skills/merge-pr-workflow/SKILL.md` | workflow | PR 合并执行流 | 保留；与 git skill 划清“提交/推送” vs “PR 合并”。 |
| `.spec/skills/merge-decision-package/SKILL.md` | workflow | 向用户要合并裁决的汇报包 | 保留；不写 git 命令细节。 |
| `.spec/knowledge/standards/worktree-branch-target-lock.md` | canonical-source | worktree/分支目标锁定标准 | 保留标准；workflow 引用。 |

待精读判断：`AGENTS.md` 中 Git/merge 长段落是否应该迁到这组文件，只在根保留红线。

### P5 精读裁决（2026-08-08）

- 行级查重结果：`git-operations` 与 `merge-pr-workflow`、`merge-decision-package`、`worktree-branch-target-lock` 没有可直接删除的逐行重复。
- 语义裁决：`git-operations` 管日常 status/diff/commit/push/pre-push；`merge-pr-workflow` 管 PR/分支合并执行；`merge-decision-package` 管给用户的合并/保留裁决包；`worktree-branch-target-lock.md` 管目标锁定标准。
- 本轮已给 `merge-pr-workflow` 与 `merge-decision-package` 补“规范来源与职责边界”，避免把决策汇报模板和合并执行流程混成一份规范。
- `AGENTS.md` 中 Git/merge 长段落后续应压缩为硬红线和入口，具体步骤迁到上述 skill / 标准文档。

P5 本轮动作：不删除文件；完成职责分层。下一步若继续 P5，应精读 `AGENTS.md` Git/merge 段落，迁移步骤到 skill，根文件只留红线。

### P5.1 段落级合并（2026-08-08）

- 已压缩 `AGENTS.md` §1.4 Git/分支/worktree 段落：从二十多条执行细则收敛为入口 + 硬红线。
- 日常 Git 操作、提交/推送、提交粒度和快速路径细节统一回 `.spec/skills/git-operations/SKILL.md`。
- 分支/worktree 锁定标准回 `.spec/knowledge/standards/worktree-branch-target-lock.md`；PR 合并执行回 `.spec/skills/merge-pr-workflow/SKILL.md`；用户合并裁决包回 `.spec/skills/merge-decision-package/SKILL.md`。
- 这是根规范压缩，不改变禁止无授权改 Git 状态、禁止擅自删边、高风险合并需语义验证等硬红线。

### P1/P3 根段落级合并（2026-08-08）

- 已压缩 `AGENTS.md` 资源段：根文件只保留图片/音频资源入口和硬红线，完整压缩、locale、图集、manifest、服务器素材主源、移动包与音频合同回 `.spec/knowledge/standards/asset-pipeline.md`、`.spec/knowledge/standards/critical-image-preload.md`、`.spec/knowledge/standards/audio-assets.md`。
- 已把根文件独有的图片 locale 口径对齐到 `asset-pipeline.md`：`OptimizedImage` / `CardPreview` 默认使用 `i18n.language`，正常业务组件不手动传 `locale`。
- 已把根文件独有的 `defineEvents()` / `createFeedbackResolver(EVENTS)` 音频策略口径迁入 `audio-assets.md`，根文件只保留“单一播放责任点”红线。
- 已把不存在的项目内 `.spec/skills/audio-integration/SKILL.md` 引用修正为系统 skill `D:\codex-home\skills\audio-integration\SKILL.md`；音频规范正文仍由 `audio-assets.md` 承载。
- 已压缩 `AGENTS.md` UI/UX 段：根文件只保留 UI 入口、双端默认视角、固定构图边界、语义不分叉和 UI 单一来源；完整规则回 `ui-ux.md`、`ui-change-gates.md`、`ui-responsive-layout.md`、`docs/mobile-adaptation.md`。
- 本批不删除文件；属于主源补齐 + 根入口压缩，避免 `AGENTS.md` 与专项规范继续双写正文。

### P2/P5 标准工作流段落级合并（2026-08-08）

- 已压缩 `AGENTS.md` “标准工作流 / 代码质量检查”段：保留代码改动最小验证、生产依赖验证两个硬入口。
- “检查/审查/看一下然后提交”、静态分析、hook 依赖、快速路径和 warning-only 口径回前文“执行优先级与归并口径”及 `.spec/skills/git-operations/SKILL.md`，根文件不再重复审查模板。
- 验证测试段已经是入口清单，继续保留：工具环境看 `docs/automated-testing.md`，E2E 看 `e2e-verification.md`，测试 seam 看 `testing-best-practices.md`，审计看 `testing-audit.md`，引擎测试看 `engine-systems.md`。

## P6：游戏资料镜像 / evidence 重复

### P6.1 小黑屋 legacy 中文规则镜像（2026-08-08）

- 双边范围：`src/games/betrayal/rule/legacy-zh/` 与 `docs/games/betrayal/sources/legacy-zh/` 各 29 个文件。
- 比对结论：除 `README.md` 外，28 个正文 / 图片文件哈希完全一致；`src` 侧 README 多出“src 是就近入口、docs 是归档镜像”的职责说明，因此 `src` 侧为信息更完整的保留侧。
- 引用裁决：仓内有效规则引用已经指向 `src/games/betrayal/rule/legacy-zh/`；引用 `docs/games/betrayal/sources/legacy-zh/` 的位置都是归档镜像说明，已改为唯一入口或删除候选说明。
- 本轮动作：删除 `docs/games/betrayal/sources/legacy-zh/` 归档镜像，不删除 `src/games/betrayal/rule/legacy-zh/`，并更新 `docs/README.md`、`docs/games/betrayal/README.md`、`docs/games/betrayal/intake-contract.md` 和本台账。
- 语义不变：旧版 / 基础版中文资料仍只作中文对照源，不覆盖当前 3e 官方规则真相。

### P6.2 docs 空文档清理（2026-08-08）

- 扫描结论：docs 内存在 14 份 0 字节 Markdown，哈希相同且正文为空。
- 引用验证：删除前逐项用完整路径和文件名检索，均无引用。
- 本轮动作：删除这些空文档：`docs/architecture/undo-framework-analysis.md`、`docs/bugs/dicethrone/dicethrone-shield-fix-plan.md`、`docs/bugs/dicethrone/dicethrone-shield-logging-architecture-analysis.md`、`docs/bugs/framework-design-analysis.md`、`docs/bugs/framework-design-review-industry-comparison.md`、`docs/bugs/framework-design-review.md`、`docs/bugs/framework-vs-game-debt-analysis.md`、`docs/bugs/smashup/smashup-alien-probe-full-audit.md`、`docs/bugs/smashup/smashup-ninja-hidden-ninja-interaction-bug.md`、`docs/bugs/smashup/smashup-robot-hoverbot-double-trigger-analysis.md`、`docs/bugs/smashup/smashup-robot-hoverbot-full-chain-audit.md`、`docs/framework-design-review-final.md`、`docs/framework-design-review.md`、`docs/pod-commit-recovery-plan.md`。
- 后续项：`docs/games/betrayal/sources/pdf-text/pdf-01.md` 到 `pdf-08.md` 虽内容为空，但表示 PDF 抽取空转证据；下一批已将其合并为单一 README。

### P6.3 DiceThrone 音频 AI registry 双份（2026-08-08）

- 双边范围：`docs/audio/registry.ai.dicethrone.json` 与 `docs/games/dicethrone/audio/registry.ai.dicethrone.json` 哈希完全一致。
- 生成源比对：`scripts/audio/generate_ai_audio_registry_dicethrone.js` 与 `scripts/games/dicethrone/audio/generate_ai_audio_registry_dicethrone.js` 只有默认输出路径不同；前者输出到 `docs/audio/`，后者输出到游戏目录副本。
- 引用裁决：`docs/audio/audio-usage.md` 是唯一引用旧游戏脚本的位置，已改为通用脚本；仓内无直接引用游戏目录 JSON。
- 本轮动作：保留 `docs/audio/registry.ai.dicethrone.json` 和 `scripts/audio/generate_ai_audio_registry_dicethrone.js`，删除游戏目录 JSON 副本与旧游戏脚本，防止重复生成回潮。

### P6.4 小黑屋 PDF 空抽取证据合并（2026-08-08）

- 范围：`docs/games/betrayal/sources/pdf-text/pdf-01.md` 到 `pdf-08.md`。
- 比对结论：8 个文件均为 2 字节 CRLF，无可读正文；`docs/games/betrayal/intake-contract.md` 已记录每个 PDF 的原始文件名、大小和“扫描型，待 OCR”结论。
- 本轮动作：新增 `docs/games/betrayal/sources/pdf-text/README.md` 作为唯一空抽取证据索引，逐项列出原 `pdf-01.md` 到 `pdf-08.md`；删除 8 个空文件，并把 `docs/games/betrayal/README.md` 与 `intake-contract.md` 指向该 README。
- 语义不变：这些 PDF 仍不能作为可读规则真相源；后续使用前必须重新 OCR、人工转写或由用户补充可读文本。

### P6.5 evidence 空文件清理（2026-08-08）

- 扫描结论：evidence 内存在一组 0 字节文件；空文件本身不承载审计正文或截图信息。
- 引用裁决：删除前逐项查完整路径和文件名。8 个文件无引用，已删除；`evidence/_shared/p0-audit-batch2.md` 被 `audit-priority-definition.md` 点名为历史审计项，已补“历史引用占位”说明；`evidence/_shared/rolldie-logs.txt` 是 `scripts/extract-rolldie-logs.ps1` 输出路径，暂不删除。
- 本轮删除：`evidence/_shared/code-review-verification.md`、`evidence/_shared/FINAL-AUDIT-REPORT-COMPLETE.md`、`evidence/_shared/monk-test-implementation.md`、`evidence/_shared/ninja-acolyte-implementation-audit.md`、`evidence/_shared/pod-commit-complete-file-list.md`、`evidence/_shared/pod-reaudit-board-tsx.md`、`evidence/smashup/smashup-afterscoring-timing-clarification.md`、`evidence/smashup/smashup-response-window-auto-advance-bug.md`。

### P6.6 evidence Markdown 同名副本收口（2026-08-08）

- 范围：5 组 Markdown 精确重复，均已哈希验证一致。
- 裁决：
  - `evidence/_shared/pod-commit-recovery-master-plan.md`、`evidence/_shared/FINAL-ACTION-PLAN.md` 被历史审计清单引用，保留 `_shared`，删除根级同名副本。
  - `evidence/_shared/bug-fixes-review.md`、`evidence/_shared/i18n-completion-report.md` 是跨项目报告，保留 `_shared`，删除根级同名副本。
  - `evidence/dicethrone/monk-test-coverage-summary.md` 是 DiceThrone 专项报告，保留游戏目录，删除根级同名副本。
- 本轮删除：`evidence/pod-commit-recovery-master-plan.md`、`evidence/bug-fixes-review.md`、`evidence/FINAL-ACTION-PLAN.md`、`evidence/i18n-completion-report.md`、`evidence/monk-test-coverage-summary.md`。

### P6.7 evidence 入口与图片重复边界（2026-08-08）

- 已新增 `evidence/README.md`，定义 `evidence/_shared/`、`evidence/<gameId>/`、专项截图链目录的职责。
- 关键裁决：截图 / 图片重复默认不能按哈希直接删除；必须证明现实含义相同、引用已迁移、保留侧仍能证明同一验收结论，并在本台账记录。
- 文本类重复仍按哈希 + 引用 + 职责保留侧处理；生成物重复必须先修生成入口，避免副本回潮。

### P6.8 石像小天使自然回合截图子集收口（2026-08-08）

- 双边范围：`evidence/山屋惊魂-石像小天使怪物定义真实入口/_labeled-for-pureref/` 与其子目录 `natural-turn-20260726-0715/`。
- 内容比对：子目录 3 张自然回合截图分别与父目录中的 `01-labeled-22`、`02-labeled-23`、`03-labeled-24` 同名截图 SHA256 完全一致；子目录的 `00-sequence-index.png` 只是这 3 张图的子集索引，父目录已有包含自然回合截图的完整索引，不承载独有验收事实。
- 引用验证：E2E 说明、覆盖矩阵和测试入口均指向父级证据目录；删除前没有业务报告、测试或脚本引用 `natural-turn-20260726-0715/` 子路径（本台账保留历史裁决记录除外）。父目录仍保留三张截图，可继续证明“自然进入石像小天使怪物回合、凝视收口后交给下一玩家”的同一结论。
- 本轮动作：删除 `natural-turn-20260726-0715/` 子集副本，保留父目录完整截图组；作祟探索两批截图因只有部分哈希重复且存在不同分支 / 标注语义，本批不删除。
- 根因回代：这组重复不是业务规范正文重复，而是截图导出批次没有唯一证据组入口、子集索引可独立复制造成的历史证据管理问题；后续应先复用现有证据组，再生成批次索引，避免同一验收截图多处落盘。

### P6.9 evidence 同目录别名图片收口（2026-08-08）

- `evidence/betrayal-tutorial/debug-second-chapter-after-use-click-latest.png` 与 `debug-second-chapter-after-use-click.png` SHA256 完全一致；两者均无业务报告、测试或脚本引用，保留不带 `latest` 的稳定名称，删除 `latest` 别名。
- `evidence/fantasyrealms/fantasyrealms-board-tabletop-implementation-http.png` 与 `fantasyrealms-board-tabletop-implementation.png` SHA256 完全一致；两者均无业务报告、测试或脚本引用，`-http` 只是历史命名噪声，保留不带协议后缀的规范名称，删除 `-http` 副本。
- 两组删除后，保留侧仍是同一张完整图片；没有迁移报告正文或测试入口，台账只保留历史裁决记录。
- 根因回代：这两组不是规范内容冲突，而是导出命名没有唯一化，导致别名文件被当成独立证据保存；规范层应要求生成 / 留档时使用稳定命名，避免把 `latest`、协议片段等临时信息写进证据文件名。

### P6.10 剩余图片重复保留裁决（2026-08-08）

- 保留 Fantasy Realms 的设计图 / 最终图、修复前 / 重做后 / 最终阶段命名：虽然部分像素相同，但对比 JSON 和文件名分别表达设计基线、最终验收及历史迭代阶段；删除会丢掉阶段语义。
- 保留山屋惊魂作祟后探索的两批用户图：两批只有部分截图一致，其他步骤图的哈希和“跳过 / 未选择跳过”标签不同，不能当整目录副本。
- 保留山屋惊魂木乃伊的两张同图：它们分别对应死亡保护分配和强制伤害分配两个步骤，图片相同不代表验收事实相同。
- 保留召唤师战争 `feedback-proposal-modal-desktop-clean/viewport`、The Gang 各批次索引、属性轨两步截图以及 `png-probe-card/after-fix`：当前没有足够证据证明这些命名角色可以合并；按“职责未锁定不删”处理。
- 结论：剩余精确重复组不再按哈希批量删除；后续只有出现明确唯一主图、等价迁移和无语义损失证据时才继续收口。

## P7：根入口压缩 / 游戏专项 SOP 下沉

### P7.1 Smash Up Wiki 流程下沉（2026-08-08）

- 双边范围：根 `AGENTS.md` 的“角色与背景”及“大杀四方 Wiki 爬虫规范”，以及 `docs/games/smashup/workflows/smashup-faction-intake.md` 的来源职责段。
- 职责裁决：项目背景不是执行规范，压缩为范围说明；Wiki 脚本、执行顺序、Firecrawl 例外、引号 / 编码差异和勘误重复处理属于 Smash Up intake workflow，不属于所有任务的根入口。
- 本轮动作：将 Wiki 流程正文迁入 `smashup-faction-intake.md`；根 `AGENTS.md` 只保留 Smash Up 触发条件、图片优先和专项 workflow 入口。
- 保留内容：交互高亮回归和查询 / 可见性反馈两段暂不迁移；当前没有已证明等价的唯一主源，不能把“未发现主源”当作删除依据。
- 验证口径：迁移后脚本路径、执行命令和专项来源优先级仍能从 Smash Up workflow 回查；根文件不再保存同一套 Wiki 执行 SOP。

### P7.2 Dice Throne intake 顶层入口收口（2026-08-08）

- 双边范围：`docs/workflows/dicethrone-hero-intake.md`（旧顶层 workflow，313 行）与 `docs/games/dicethrone/workflows/dicethrone-hero-intake.md`（当前游戏专项 workflow，469 行）。两者不是哈希精确重复，必须做内容级迁移判断。
- 内容比对：旧顶层文件的 FAQ 来源、裁图临时产物限制、复合牌门禁、资源发布检查、验证和交付要求均已存在于游戏目录主 workflow；游戏目录版本还额外承载批次矩阵、L0-L4、双面英雄、Token / 状态图标和更完整资源回查门禁。
- 单边独有内容：旧顶层引用的两个 `scripts/assets/` 历史裁图脚本已在主 workflow 的裁图入口中保留说明；旧版资源清单和“资源上传前”标题被主 workflow 的“资源发布前”清单覆盖并加强。
- 引用验证：`docs/README.md`、`.spec/knowledge/README.md`、根 `AGENTS.md` 和现有 evidence 均指向 `docs/games/dicethrone/workflows/dicethrone-hero-intake.md`；仓内没有有效引用旧顶层路径。
- 本轮动作：删除旧顶层 workflow，保留游戏目录主 workflow；删除前已完成内容迁移，删除后回主 workflow 入口、资源和验证章节复核。

### P7.3 Smash Up intake 顶层入口收口（2026-08-08）

- 双边范围：`docs/workflows/smashup-faction-intake.md`（旧顶层 workflow，279 行）与 `docs/games/smashup/workflows/smashup-faction-intake.md`（当前游戏专项 workflow，393 行）。两者不是哈希精确重复，已做内容级比对。
- 内容比对：旧顶层文件的 intake-only 边界、来源分工、资源发布、自动化验证和 Oops 案例均已在游戏目录主 workflow 保留；主 workflow 另有 Wiki 对照工具、字段级来源合同、大图读取门禁和 implementation handoff 条件。
- 单边独有内容裁决：旧版“图片 / Wiki / 中文翻译”口径已被主 workflow 更严格的图面优先与双 locale 逐词核对规则覆盖；旧版 `### 10` 验证标题和命令已在主 workflow 的 intake 验证章节保留并补充结构测试与图面人工门禁。
- 引用验证：根 `AGENTS.md`、`.spec/knowledge/standards/data-entry.md`、现有 evidence 和 OpenSpec 资料均指向 `docs/games/smashup/workflows/smashup-faction-intake.md`；未发现有效业务入口引用旧顶层路径。
- 本轮动作：删除旧顶层 workflow，保留游戏目录主 workflow；删除前已确认有效内容迁移，删除后回主 workflow 的来源、发布和验证章节复核。

### P7.4 Smash Up POD 文档职责归位（2026-08-08）

- 范围：`docs/refactor/pod-auto-mapping.md`、`pod-selective-override-example.md`、`pod-stub-cleanup.md`、`pod-system-architecture.md`、`pod-system-summary.md`。
- 裁决：这些文档都只服务大杀四方 POD 系统，不属于跨游戏 `docs/refactor/` 公共重构文档；`src/games/smashup/rule/POD-SYSTEM.md` 继续作为游戏规则 / 运行时合同主源，`pod-system-architecture.md` 作为架构说明主文档，其它 POD 文档为支持材料或历史修复记录。
- 本轮动作：整体迁入 `docs/games/smashup/refactor/pod/`，保留正文不删语义，并更新 `.spec/knowledge/README.md`、`src/games/smashup/rule/POD-SYSTEM.md` 与 POD 文档内部引用。
- 后续裁决已完成：选择性覆盖示例已合并进 `pod-system-architecture.md` 并删除独立副本；`pod-auto-mapping.md`、`pod-stub-cleanup.md`、`pod-system-summary.md` 保留为历史实现 / 修复 / 测试记录，不再承担当前规则正文。

### P7.4.1 Smash Up POD 重复入口收口（2026-08-08）

- 主源裁决：`src/games/smashup/rule/POD-SYSTEM.md` 继续承载当前运行时合同；`pod-system-architecture.md` 只承载架构理由、注册层特殊约束、数据审计和选择性覆盖示例。
- 内容迁移：独立 `pod-selective-override-example.md` 的自动映射、显式覆盖、部分能力覆盖、注册顺序和验证要点已合并到架构文档；没有删除这些规则语义。
- 历史文档裁决：`pod-auto-mapping.md` 标为自动映射历史实现记录；`pod-stub-cleanup.md` 保留占位注册覆盖 alias 的历史根因和修复；`pod-system-summary.md` 删除重复架构总结，只保留修复项、测试和教训，并指向当前主源。
- 本轮动作：删除 `docs/games/smashup/refactor/pod/pod-selective-override-example.md`；架构文档由 303 行压缩为 103 行，历史文档未单边删除。
- 验证口径：`.spec/knowledge/README.md`、`POD-SYSTEM.md`、bug 文档和 POD 文档内部引用均回到现存入口；仓内不再有对已删除选择性覆盖文档的业务引用。

### P7.5 公共 refactor 文档入口清空（2026-08-08）

- 双边内容：`docs/refactor/audio-architecture-improvement.md` 的音效双配置问题、FeedbackPack 方案、迁移阶段与风险清单；`docs/refactor/pixi-performance-findings.md` 的 PixiJS / Canvas 2D 压测、优化尝试、选型结论与重新评估条件。
- 保留侧：音频内容归并到 `.spec/knowledge/standards/audio-assets.md` 的“音效触发与迁移策略”；Pixi 内容归并到 `.spec/knowledge/standards/animation-effects.md` 的“PixiJS 选型结论”。
- 单边独有内容裁决：已完成阶段清单、实施步骤和风险表是历史计划信息，不再作为当前执行入口；代表性的性能数字、决策原因和未来重新评估条件已保留。
- 引用验证：旧路径在删除前已检索；主源中的旧路径引用已改为本地章节说明，仓内不再依赖 `docs/refactor/` 两份公共文档。
- 本轮动作：删除两份旧文档；`docs/refactor/` 不再作为公共规范目录。该动作不是按“未引用”删除，而是先完成内容级迁移后清理重复入口。

### P7.6 根部署入口压缩（2026-08-08）

- 双边范围：根 `AGENTS.md` 的生产部署 / Android OTA 细则，与 `.spec/skills/android-app-release/SKILL.md`、`docs/mobile-release.md`、`docs/android-app-build.md`、`docs/deploy.md` 的专项合同。
- 主源裁决：Android OTA / native / game package 的执行和验收归 `android-app-release` skill 与移动发布文档；服务器部署架构归 `docs/deploy.md`；根 `AGENTS.md` 只保留触发入口、默认统一入口、禁止直接 `docker compose up -d`、完整上线不得由局部成功冒充四条边界。
- 单边独有内容裁决：根段的 tag、20MB 包体、OTA 版本门禁、版本命名、TypeScript 命令和 Git 工作区细节均已在专项文档或根其他 Git 红线中有对应职责，不再在部署入口重复维护。
- 本轮动作：删除根部署段 9 条长细则，补齐 `android-app-release`、`docs/mobile-release`、`docs/android-app-build`、`docs/ios-testflight-build` 入口；详细内容不删除，只迁移职责说明。
- 验证口径：`doc-index.md` 已指向 Android skill + mobile-release + android-app-build；服务器问题仍回 `docs/deploy.md`，iOS 问题回 TestFlight 文档。后续发布规则先改专项主源，再同步根入口。

## 下一批执行顺序

1. P3 资源 / 录入 / 图片 / 音频已完成当前主源与 workflow 分层；新重叠出现前不再继续压缩这三份图片资源文档。
2. P6 evidence 图片精确重复已完成当前盘点：明确别名和子集副本已收口，其余 14 组因验收阶段、分支、批次或步骤语义保留。
3. 根 `AGENTS.md` 当前剩余段落已核对为入口 + 红线；高亮回归与可见性反馈因没有已证明等价主源，暂不迁移。
4. OpenSpec changes 归档和未归档提案属于独立产品规范批次，本轮 AI 规范重构暂不进入。
5. 后续只有发现新的职责重叠或用户指定新的文档组时，才新增下一批台账裁决。
