# BoardGame 文档总入口

> 这里是仓库文档的导航页。目标是先判断“该看哪一类真相源”，再进入具体文档，避免在根目录、docs、openspec、evidence 和游戏目录之间来回翻。

## 先看哪里

| 你要做的事 | 优先入口 | 说明 |
| --- | --- | --- |
| AI 协作规则、改代码前该读什么 | AGENTS.md + docs/ai-rules/doc-index.md | 根规范只放触发入口和红线；专项流程从索引继续跳转。 |
| AI 规范重构、规范去重、规范落点裁决 | docs/ai-rules/README.md + docs/ai-rules/document-consolidation.md | 这是 AI 规范层的主入口；不走 OpenSpec。 |
| 新功能、架构变化、规格变更 | openspec/AGENTS.md + openspec/project.md + openspec/specs/ | openspec/specs/ 是当前能力真相源；openspec/changes/ 是提案/进行中变更。 |
| 前后端/API/通用框架 | docs/framework/ + docs/api/README.md + docs/architecture/ | 项目级公共技术文档放这里，不写单个游戏的临时结论。 |
| 单个游戏的规则、设计、流程、用户故事 | docs/games/<gameId>/ | 只服务单个游戏的文档默认落在这里；不要在 docs 顶层为单游戏长期扩第二套入口。 |
| 游戏原始规则或录入真相源 | src/games/<gameId>/rule/ 或 docs/games/<gameId>/sources/ | 改规则/机制前必须先锁定对应真相源；同一来源若有双份，先比对再决定迁移。 |
| 项目专用 workflow / AI 技能 | .spec/skills/README.md | BoardGame 项目 skill 的唯一目录是 .spec/skills/。 |
| 审计证据、截图证据、修复记录 | `evidence/README.md` | 这是历史证据和审计账本，不是默认开发入口；需要按游戏/日期/主题定位。 |
| 临时计划、临时探针、测试输出 | temp/、tmp/、test-results/、根目录 task_plan.md / progress.md / findings.md | 这些默认只能作为候选线索；接续前必须重新锁定当前目标。 |

## 目录职责

| 目录 | 职责边界 |
| --- | --- |
| docs/ai-rules/ | 项目通用流程、门禁、验证、文档整理规则；具体 SOP 由 doc-index.md 路由。 |
| docs/framework/ | 前端、后端、框架级公共约定。 |
| docs/api/ | REST / WebSocket / 管理接口说明。 |
| docs/architecture/ | 架构分析、迁移审计和技术边界说明。 |
| docs/games/ | 单游戏长期文档、专项流程、用户故事、规则补充、设计与改进记录。 |
| docs/bugs/、docs/reviews/、docs/audit/ | 有保留价值的问题分析、审查报告和审计文档。 |
| openspec/specs/ | 已建成能力的规格真相源。 |
| openspec/changes/ | 尚未归档的变更提案；已完成提案应按 OpenSpec 流程归档。 |
| evidence/ | 可复查证据、截图记录、审计账本、反馈修复记录；入口见 `evidence/README.md`。 |
| src/games/<gameId>/rule/ | 游戏运行或录入直接依赖的规则文本。 |

## 整理原则

1. 先确定唯一职责落点，再迁移或归并；不得因为“看起来重复”直接删一边。
2. 精确重复也要先查引用：如果旧路径仍被代码、脚本、文档或流程引用，先改入口或保留重定向说明。
3. 通用文档只能写跨游戏判断方法；单游戏答案下沉到 docs/games/<gameId>/ 或该游戏规则目录。
4. evidence 默认是历史证据仓，不和 docs 的正式说明文档混用。
5. 根目录只保留仓库入口文档和受规范约束的长期计划文件；临时日志、Wiki 对比、探针输出应按 docs/temp-files-management.md 收口。

## 当前整理候选（2026-08-08 盘点）

本轮先做只读扫描和入口补齐；随后删除了 8 份已证明为精确重复、且仓内无引用旧路径的顶层单游戏副本，额外收口 2 份内容级迁移完成的旧 Dice Throne / Smash Up workflow，并将 5 份只服务大杀四方的 POD 文档整体迁入 docs/games/<gameId>/。本批又将音效架构方案和 PixiJS 压测结论归并到各自主规范，清空 `docs/refactor/` 的公共重构文档入口。

| 类别 | 现象 | 建议动作 |
| --- | --- | --- |
| 根目录临时/历史文档 | task_plan.md、progress.md、findings.md 体量很大；另有 lint-output.txt、e2e-ai-test-*.txt、WIKI-*.md 等历史输出 | 长期计划文件先补状态说明；临时日志和 Wiki 报告需先确认是否仍被引用，再迁到 temp/ / evidence/ 或删除。 |
| 单游戏文档双入口 | 已删除 8 份顶层精确重复副本，收口 2 份内容级迁移完成的旧 workflow，并迁移 5 份大杀四方 POD 文档；保留 docs/games/<gameId>/ 下的主入口 | 后续继续处理前仍必须先查哈希、内容和引用；不能凭路径相似删除。 |
| 规则真相源双份 | 小黑屋 legacy 中文规则曾在 `src/games/betrayal/rule/legacy-zh/` 与 `docs/games/betrayal/sources/legacy-zh/` 双份存在 | 已判定 `src/games/betrayal/rule/legacy-zh/` 为唯一就近入口；归档镜像在哈希和引用验证后删除。 |
| OpenSpec 未归档变更 | openspec/changes/ 中有多项任务清单已全勾选但仍停留在 active changes | 单独跑 OpenSpec 归档批次；归档前必须按 openspec/AGENTS.md 验证。 |
| evidence 体量膨胀 | evidence/ 约 1,900+ 个文档，其中有 _shared 与根级 evidence 精确重复 | 已补 `evidence/README.md`；截图 / 图片重复不得按哈希直接删，需逐项证明现实含义与引用关系。 |

## 本轮盘点数字

- 文档总数：约 3,748 个 Markdown / 文本文档。
- 主要分布：evidence/ 约 1,916 个，openspec/ 约 1,000 个，docs/ 约 478 个，.spec/skills/ 约 54 个。
- 本轮已清理的精确重复顶层副本：docs/features/smashup-base-restrictions-ui.md、docs/features/cardia-card-magnify.md、docs/refactor/dicethrone-hand-area-refactor.md、docs/refactor/dicethrone-auto-advance-upkeep-income.md、docs/improvements/smashup-actionlog-reason-display.md、docs/plans/2026-02-20-smashup-cursor-design.md、docs/dicethrone-new-heroes-progress.md、docs/dicethrone-audio-plan.md。
- 最大剩余风险点：根目录历史计划/日志过大、规则真相源仍有双份、OpenSpec 已完成提案未归档；evidence 图片重复已识别为独立历史证据仓候选，本轮不处理。
