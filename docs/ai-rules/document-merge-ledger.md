# AI 规范文档合并台账

> 目标：逐批判断 AI 规范文档哪些要保留、合并、下沉、改成索引，哪些只是历史证据或任务状态。本文是合并裁决台账，不直接承载新规范正文。

## 裁决口径

每一组文档先判职责，再决定动作。

| 角色 | 含义 | 允许动作 |
| --- | --- | --- |
| canonical-source | 唯一规范正文 | 保留、拆分、压缩、改正文；其它文件只能引用它。 |
| index | 导航入口 | 只写“什么时候读哪份”，不复制规则正文。 |
| workflow | 可执行步骤 | 放 `.codex/skill/`，写命令、阶段、检查清单和项目路径。 |
| adapter | 对上位规范的项目补充 | 只写 BoardGame 增量约束，不复制系统/通用正文。 |
| evidence | 历史证据/审计记录 | 不作为规范来源；只能记录执行结果。 |
| task-state | 当前或历史任务状态 | 不自动接管目标；需要标当前/历史/完成。 |
| duplicate-copy | 已证明等价副本 | 保留侧明确、旧路径无引用后删除。 |
| review-needed | 疑似重叠但未读完 | 只进候选，不删除。 |

## 总体扫描（2026-08-08）

- 范围：`docs/ai-rules/` 与 `.codex/skill/`。
- 文件数：约 94 份。
- 结论：AI 规范层未发现哈希完全相同的文件；主要问题是同一主题拆分后缺少主从关系说明，导致后续 agent 不知道该先读哪份、哪份只是 workflow。
- 第一批不删除文件，先做主从裁决；只有后续精读证明“等价副本 + 无引用旧路径”才删。

## P0：AI 规范入口

| 文件 | 当前角色 | 裁决 | 动作 |
| --- | --- | --- | --- |
| `AGENTS.md` | canonical-source / rules | 项目硬红线入口 | 后续批次压缩为“触发条件 + 读哪份 + 不得做什么”。 |
| `docs/ai-rules/README.md` | index | AI 规范重构主入口 | 已新增；只管分层和重构路线，不写长 SOP。 |
| `docs/ai-rules/doc-index.md` | index | 场景触发索引 | 保留；后续检查是否复制了太多规则正文。 |
| `docs/ai-rules/document-consolidation.md` | decisions | 整理迁移台账 | 保留；记录迁移、删除、语义变化和待处理批次。 |
| `docs/ai-rules/document-merge-ledger.md` | decisions | 本轮逐批合并裁决台账 | 新增；后续每批精读后更新。 |

## P1：UI 规范 / 视觉 / 截图

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `docs/ai-rules/ui-ux.md` | canonical-source 候选 | UI 审美和通用设计原则主文档 | 压缩成 UI 总原则；具体门禁下沉/引用其它文件。 |
| `docs/ai-rules/ui-change-gates.md` | canonical-source 候选 | UI 改动前置门禁与验收主文档 | 保留为 UI gate 主源；避免与 `ui-ux.md` 双写验收。 |
| `docs/ai-rules/ui-responsive-layout.md` | canonical-source 候选 | 响应式/双端布局专项 | 保留为专项分卷，由 `ui-change-gates.md` 或 `ui-ux.md` 引用。 |
| `docs/ai-rules/ui-animation-patterns.md` | canonical-source 候选 | UI 动画专项 | 保留为专项分卷；与 `animation-effects.md` 区分 UI 动画 vs 引擎 FX。 |
| `.codex/skill/boardgame-ui-imagegen/SKILL.md` | workflow | 生图/设计稿执行流 | 保留 workflow；只引用 UI 标准，不复制标准正文。 |
| `.codex/skill/screenshot-delivery/SKILL.md` | workflow | 给用户看图/交付截图执行流 | 保留 workflow；截图验收规则应引用 E2E/UI gate。 |

待精读判断：`ui-ux.md`、`ui-change-gates.md` 和 `e2e-verification.md` 是否重复写了“截图验收必须真实入口/AI 审图/PureRef 展示”。

### P1 精读裁决（2026-08-08）

- `ui-ux.md` 顶部已经声明详细门禁拆到 `ui-change-gates.md`，当前不删；后续重点是继续压缩 §0 的最小执行口径，避免和 `ui-change-gates.md` 双写。
- `ui-change-gates.md` 是 UI 改动和玩家视角审计主源；`ui-ux.md` 不应复制它的截图闭环细则。
- `e2e-verification.md` 的“看图验收 / 截图来源与证据文档”是截图证据主源；它可以和 UI gate 互相引用，但不应承载“如何打开给用户”的执行步骤。
- `.codex/skill/screenshot-delivery/SKILL.md` 是截图交付 workflow。本轮已补“规范来源与职责边界”，明确它引用 `e2e-verification.md` 与 `ui-change-gates.md`，不作为第二份截图验收规范。
- `.codex/skill/boardgame-ui-imagegen/SKILL.md` 是生图 workflow。本轮已补“规范来源与职责边界”，明确 UI 标准、UI gate、资源链分别由 `ui-ux.md`、`ui-change-gates.md`、`asset-pipeline.md` 承担。

P1 本轮动作：先做主从标注，不删除文件；下一步若继续 P1，应精读 `ui-ux.md` §0 与 `ui-change-gates.md` 的重复段，做段落级迁移/压缩。

## P2：测试 / 审计 / E2E

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `docs/ai-rules/testing-audit.md` | index / canonical-source 候选 | 测试审计总入口 | 倾向压缩为入口；核心原则和维度分卷已存在。 |
| `docs/ai-rules/testing-audit-core-principles.md` | canonical-source 候选 | 审计核心原则 | 保留为核心原则主源。 |
| `docs/ai-rules/testing-audit-dimensions.md` | index | D 维度库索引 | 保留；分卷承载细则。 |
| `docs/ai-rules/testing-audit-dimensions-*.md` | canonical-source 分卷 | 维度细则 | 保留；后续检查是否仍被总入口重复。 |
| `docs/ai-rules/e2e-verification.md` | canonical-source 候选 | E2E 与截图验收主源 | 保留但需拆；截图交付、UI gate、E2E 可能重复。 |
| `.codex/skill/game-audit-workflow/SKILL.md` | workflow | 全游戏审计执行流 | 保留 workflow；应引用审计标准和维度库。 |

待精读判断：`testing-audit.md` 是否已经只是入口；若仍复制核心原则或 D 维度正文，迁到核心/分卷后删除重复段。

### P2 精读裁决（2026-08-08）

- 行级查重结果：`testing-audit.md` 与 `testing-audit-core-principles.md`、`testing-audit-dimensions*.md` 没有可直接删除的逐行重复。
- 语义关系：`testing-audit.md` 仍承载审计结论等级、证据分层、深度审计流程、假阳性收口、回归处理、审计文档模板和自检门禁；这些不是分卷的完整重复，暂不删除。
- `testing-audit-core-principles.md` 是 fail-close、全面审计完成定义、交互入口语义矩阵和技能完整流程矩阵主源。
- `testing-audit-dimensions.md` 是 D 维度索引和输出格式主源；分卷承载细则。
- `.codex/skill/game-audit-workflow/SKILL.md` 是审计执行 workflow。本轮已补“规范来源与职责边界”，明确它只引用审计标准，不作为第二份规范正文。

P2 本轮动作：不删除文档；先完成 workflow 降权和主从标注。下一步若继续 P2，应段落级精读 `testing-audit.md` 的 Step 0-5 与核心原则文档，判断哪些可迁入核心原则后把总入口压缩。

## P3：资源 / 录入 / 图片 / 音频

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `docs/ai-rules/asset-pipeline.md` | canonical-source 候选 | 图片/素材链总规范 | 保留为资源总源；关键图片、音频已拆分则改引用。 |
| `docs/ai-rules/critical-image-preload.md` | canonical-source 分卷 | 首屏关键图片专项 | 保留专项。 |
| `docs/ai-rules/audio-assets.md` | canonical-source 分卷 | 音频运行时合同 | 保留专项；执行步骤归音频 skill。 |
| `docs/ai-rules/data-entry.md` | canonical-source 候选 | 数据录入规范 | 保留；执行步骤归 workflow。 |
| `.codex/skill/data-entry-workflow/SKILL.md` | workflow | 录入执行流 | 保留 workflow；应引用 `data-entry.md`。 |
| `.codex/skill/atlas-crop/SKILL.md` | workflow | 图集裁切执行流 | 保留 workflow；只写步骤和工具。 |

待精读判断：`asset-pipeline.md` 是否还复制 `critical-image-preload.md` / `audio-assets.md` 正文。

### P3 精读裁决（2026-08-08）

- 行级查重结果：`asset-pipeline.md` 与 `critical-image-preload.md`、`audio-assets.md`、`data-entry.md` 没有可直接删除的逐行重复。
- `asset-pipeline.md` 仍是资源链总源；`critical-image-preload.md` 和 `audio-assets.md` 是专项分卷，当前不合并删除。
- `data-entry.md` 是录入标准主源；`.codex/skill/data-entry-workflow/SKILL.md` 是录入执行 workflow。当前 workflow 语义上复述了较多录入门禁，但不是逐行重复，先标主从关系，后续再做段落级压缩。
- `.codex/skill/atlas-crop/SKILL.md` 是图集裁切 workflow；正式资源链仍回 `asset-pipeline.md`，录入合同回 `data-entry.md`。
- 本轮已给 `data-entry-workflow` 和 `atlas-crop` 补“规范来源与职责边界”，防止它们继续演变成第二份资源/录入规范正文。

P3 本轮动作：不删除文件；先完成 workflow 降权。下一步若继续 P3，应精读 `data-entry-workflow` 的“强制门禁”，把只属于标准正文的内容迁回/对齐 `data-entry.md`，workflow 只留执行清单。

## P4：新游戏 / 新派系 / 规则到实现

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.codex/skill/create-new-game/SKILL.md` | workflow | 新游戏总执行流 | 保留；长门禁继续拆到 references。 |
| `.codex/skill/add-new-faction/SKILL.md` | workflow | 新派系/新角色通用执行流 | 保留；检查是否和 create-new-game 重复前置门禁。 |
| `.codex/skill/smashup-faction-addition/SKILL.md` | workflow / adapter | 大杀四方专项派系流程 | 保留为单游戏 adapter；不得写通用新派系规则。 |
| `docs/ai-rules/description-to-implementation-audit.md` | canonical-source | 规则描述到实现审查标准 | 保留标准；workflow 只引用。 |

待精读判断：`add-new-faction` 和 `create-new-game` 是否重复写“素材/规则/录入/审计/E2E”全流程；若重复，拆成“新游戏创建”和“已有游戏新增内容”。

### P4 精读裁决（2026-08-08）

- 行级查重结果：`create-new-game` 与 `add-new-faction`、`smashup-faction-addition` 没有可直接删除的逐行重复。
- 语义裁决：`create-new-game` 管“从零新增游戏”；`add-new-faction` 管“已有游戏新增派系/角色/英雄”；`smashup-faction-addition` 只做大杀四方专项 adapter。
- `description-to-implementation-audit.md` 是规则描述到实现审查标准；各 workflow 只能引用，不复制成自己的审计定义。
- 本轮已给三份项目 skill 补“规范来源与职责边界”，并明确 OpenSpec 在 `create-new-game` 中只承担产品/架构能力规格，不是 AI 规范重构主线。

P4 本轮动作：不删除文件；完成职责分线。下一步若继续 P4，应精读 `create-new-game` 顶部长红线与 references 的重复，优先把主 skill 压缩为阶段骨架。

## P5：Git / 合并 / worktree

| 文件 | 当前角色 | 初步裁决 | 合并方向 |
| --- | --- | --- | --- |
| `.codex/skill/git-operations/SKILL.md` | workflow | Git 提交/推送执行流 | 保留 workflow。 |
| `.codex/skill/merge-pr-workflow/SKILL.md` | workflow | PR 合并执行流 | 保留；与 git skill 划清“提交/推送” vs “PR 合并”。 |
| `.codex/skill/merge-decision-package/SKILL.md` | workflow | 向用户要合并裁决的汇报包 | 保留；不写 git 命令细节。 |
| `docs/ai-rules/worktree-branch-target-lock.md` | canonical-source | worktree/分支目标锁定标准 | 保留标准；workflow 引用。 |

待精读判断：`AGENTS.md` 中 Git/merge 长段落是否应该迁到这组文件，只在根保留红线。

### P5 精读裁决（2026-08-08）

- 行级查重结果：`git-operations` 与 `merge-pr-workflow`、`merge-decision-package`、`worktree-branch-target-lock` 没有可直接删除的逐行重复。
- 语义裁决：`git-operations` 管日常 status/diff/commit/push/pre-push；`merge-pr-workflow` 管 PR/分支合并执行；`merge-decision-package` 管给用户的合并/保留裁决包；`worktree-branch-target-lock.md` 管目标锁定标准。
- 本轮已给 `merge-pr-workflow` 与 `merge-decision-package` 补“规范来源与职责边界”，避免把决策汇报模板和合并执行流程混成一份规范。
- `AGENTS.md` 中 Git/merge 长段落后续应压缩为硬红线和入口，具体步骤迁到上述 skill / 标准文档。

P5 本轮动作：不删除文件；完成职责分层。下一步若继续 P5，应精读 `AGENTS.md` Git/merge 段落，迁移步骤到 skill，根文件只留红线。

## 下一批执行顺序

1. 精读 P1 UI 组，先处理截图验收和 UI gate 的重复。
2. 精读 P2 测试审计组，压缩总入口，保留核心/维度分卷。
3. 精读 P3 资源录入组，把总规范改成引用专项分卷。
4. 精读 P5 Git/合并组，准备后续压缩 `AGENTS.md`。
5. 每批完成后更新本台账和 `document-consolidation.md`。
