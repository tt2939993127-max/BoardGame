# Change: AI 仓库工作台

## Why
- 当前项目的 `create-new-game` skill、数据录入规范、资源上传、审计、E2E、PR 自动化已经具备流程知识，但仍依赖用户逐轮催促 AI 执行，缺少生产级自动编排与可视化回传。
- 用户希望把“新建游戏 / 导入游戏 / 数据录入 / 功能开发 / Bug 修复 / 审计 / 提 PR / 合并”统一收敛到网页工作台，用户尽量只输入需求与素材，系统自动推进，并把端到端截图作为最终交付证据回传到网页。

## What Changes
- 新增 `ai-repo-workbench` capability，定义仓库级 AI 工作台的入口模式、工作流模板、决策节点、执行可视化、产物回传与交付门禁。
- 明确工作台不是自由聊天入口，而是以仓库与工作流为中心的执行系统；现有 skill 作为后台流程知识来源，而不是最终产品形态。
- 定义“最终输出必须包含 E2E 截图与证据摘要”的交付契约，避免只返回文本结论。
- 定义“用户输入最小化 + 决策点汇总暂停”的交互模式，减少来回追问。

## Impact
- Affected specs:
  - `ai-repo-workbench`（新增）
- Affected code:
  - 未来会影响工作台前端、仓库执行器、工作流状态管理、E2E 产物上传与 PR/merge 自动化链路
  - 设计上与现有 `ugc-prototype-builder`、`ugc-runtime`、`e2e-runtime-management`、`add-ai-pr-review-merge-automation` 相邻，但本 proposal 先定义新的主能力边界
