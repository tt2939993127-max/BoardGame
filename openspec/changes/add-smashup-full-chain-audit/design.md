## Context

`.kiro/specs/audit-smashup-cards/requirements.md` 定义了 SmashUp 全卡牌与基地的审查目标：以 i18n 文本为描述输入，逐条核对能力实现、交互处理、持续效果、验证拦截与测试覆盖。当前项目已有分散的审计能力（如 `interactionCompletenessAudit.test.ts`、`abilityBehaviorAudit.test.ts`），但缺少覆盖全部派系/基地并统一交付格式的“全链路审查规范”。

本变更不直接实现业务逻辑修复，而是先建立可执行的审查契约，确保后续 apply 阶段能以一致方法产出可复核结果。

## Goals / Non-Goals

- Goals
  - 定义 16 个派系 + 全部基地卡的审查范围与必查要点。
  - 统一“独立交互链 × 六层”矩阵输出格式，保证每个结论可追溯到文件与函数。
  - 定义汇总报告结构（严重度、通过率、优先级），支持修复排期。
- Non-Goals
  - 本次 proposal 阶段不修复卡牌实现缺陷。
  - 不新增运行时功能，不改现有规则执行逻辑。
  - 不扩展到 SmashUp 之外的其他游戏。

## Decisions

- Decision 1：拆分两个 capability
  - `smashup-audit`：覆盖派系与基地卡审查流程及证据要求。
  - `smashup-audit-report`：覆盖最终汇总报告格式与排序规则。
  - 理由：将“审查执行”与“结果汇总”解耦，便于后续独立迭代报告模板。

- Decision 2：逐派系 requirement 显式建模
  - 对每个派系保留独立 Requirement，而非合并为“统一派系审查”。
  - 理由：不同派系存在不同高风险机制（如 Madness、Microbot、special 时机、强制移动），显式建模能避免遗漏。

- Decision 3：证据强约束
  - 每个矩阵交叉点要求“✅/❌ + 文件名 + 函数名 + 备注”，并对 ❌ 项强制输出修复建议。
  - 理由：避免“看起来正确”的主观结论，提高后续修复可执行性。

## Risks / Trade-offs

- 风险：审查成本高，短期产出速度下降。
  - 缓解：按派系并行推进，先做高风险派系（含多步交互、特殊时机、Madness）。
- 风险：审查标准与现有测试口径不一致。
  - 缓解：在 tasks 中明确补充回归测试，并以现有 SmashUp 审计测试为基线对齐。
- 风险：i18n 文本与规则文档存在历史差异。
  - 缓解：本提案先按需求文档规定以 i18n 为对照源，发现冲突时在报告中单列“描述源冲突”。

## Validation Plan

- 使用 `openspec validate add-smashup-full-chain-audit --strict --no-interactive` 校验提案结构。
- apply 阶段执行时，要求以下验证闭环：
  - 审查矩阵覆盖 16 派系 + 基地卡。
  - ❌/⚠️/📝 分类完整。
  - SmashUp 相关测试通过（交互完整性、能力行为、i18n 完整性等）。
