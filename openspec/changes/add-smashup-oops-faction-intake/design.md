## Context
本次任务不是单纯替换图片，而是一次完整的 Smash Up 派系 intake：图片压缩、atlas 分配、preview/preload 接入、数据录入、规则来源审计、Vitest、E2E 与证据留档都在范围内。现有仓库中并未实现 `Ancient Egyptians / Cowboys / Samurai / Vikings` 四个派系；同时，用户指定的 cards 原图与目标派系不匹配，存在把错误图集写入运行时的高风险。

## Goals / Non-Goals
- Goals:
  - 为 Smash Up 新派系 intake 建立“先校验来源、再接入运行时”的标准流程。
  - 在来源正确时，为 Oops 四派系接入新的 atlas 槽位、预览映射与预加载链路。
  - 强制把 Smash Up Wiki 抓取纳入录入和审计流程，不允许只凭图片或记忆写规则文本。
  - 沉淀可复刻工作流，让后续同类图片 intake 可以按同一模板执行。
- Non-Goals:
  - 不在 proposal 阶段实现四派系的完整 gameplay ability 逻辑。
  - 不在来源不一致时强行生成“近似可用”的正式 atlas 或 def 数据。
  - 不改动无关派系的现有 atlas 槽位和图片资源。

## Decisions
- 采用“来源校验门”作为第一阶段：
  - 输入图片必须与目标派系列表一致。
  - Smash Up 规则与名称必须通过 Wiki 抓取核对。
  - TTS JSON 仅作为 deck identity / atlas provenance / 英文名参考，不替代用户确认过的正式中文 cards 原图。
- 新增 Oops 专用 atlas 槽位，而不是覆盖 `cards5` / `base4`：
  - 这样可以保证现有已上线派系不回归。
  - 也便于 criticalImageResolver 按派系选择精确预加载。
- 文档化输出至少包含四部分：
  - 来源记录与核对契约
  - 运行时接入说明（atlas/preview/preload）
  - 测试与 evidence 要求
  - blocker 处理规则（素材错配时停在哪一步）
- 验证采用“审计优先，测试补充”：
  - 先做来源/路径/映射审计
  - 再做 Vitest
  - 最后做 E2E 与截图证据

## Alternatives Considered
- 直接把 `aiji.png` 当作新 cards atlas 压缩并录入：
  - 拒绝。已确认视觉内容属于 Pretty Pretty 四派系，会把错误资源写进运行时。
- 不加新 atlas 槽位，覆盖旧 `cards5` / `base4`：
  - 拒绝。会破坏 Monster Smash / 现有 base4 资源，属于高风险回归。
- 完全依赖 TTS 英文 deck 作为正式录入源：
  - 拒绝。与用户提供中文图片的诉求不一致，也不满足“图片录入”工作流的目标。

## Risks / Trade-offs
- 最大风险是图片来源错配，如果没有显式门禁，后续压缩、切片、previewRef 和测试都会围绕错误素材展开。
- 若用户暂时无法提供正确 cards 原图，apply 阶段只能先落来源校验、工作流、spec 与可复用脚本/文档，完整运行时接入需要等待补图。
- 四派系后续若要求完整 gameplay ability 逻辑，范围会显著扩大；本 change 优先聚焦 intake 基础设施与资源/数据接入。

## Migration Plan
- proposal 通过后，apply 阶段先完成来源契约与 blocker 处理。
- 若 cards 原图补齐，则继续资源压缩、atlas 注册、数据录入、测试与 evidence。
- 若 cards 原图未补齐，则保留 workflow/spec/evidence 中的 blocker 记录，不落错误运行时资源。

## Open Questions
- 用户是否还有另一张真正对应 `Ancient Egyptians / Cowboys / Samurai / Vikings` 的中文 cards 原图？
- 若短期内拿不到正确中文 cards 原图，是否允许先用 TTS / Wiki 完成英文数据骨架与 base 资源接入，再等待中文 cards 补齐？
