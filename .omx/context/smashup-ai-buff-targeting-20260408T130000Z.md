# Context Snapshot: smashup-ai-buff-targeting

## task statement
优化大杀四方游戏 AI，重点解决 AI 错误地给玩家施加增益 buff 的问题，并产出可执行的重构方案。

## desired outcome
形成一个基于当前代码证据的共识方案，明确 AI 评估、目标选择、友军/敌军语义、重构边界、验证策略与落地顺序。

## known facts/evidence
- 用户明确指出：当前大杀四方 AI 会把增益 buff 给到玩家。
- 当前任务是规划/重构方案，不是立即编码。
- 需要遵守 ralplan 共识规划流程。

## constraints
- 先基于代码证据，不得凭记忆设计。
- 规划前需阅读 OpenSpec 指令与相关项目规范。
- 若使用子 agent，必须使用 gpt-5.4 + high。

## unknowns/open questions
- AI 逻辑当前位于哪些文件与调用链。
- 错误的 buff 目标选择是数据建模、评分函数、目标过滤还是执行层问题。
- 是否存在跨游戏共享 AI 抽象需要同步修正。

## likely codebase touchpoints
- src/games/smashup/**
- 可能的 AI / bot / evaluator / action selector 相关目录
- 共享引擎 target / effect / action primitives
