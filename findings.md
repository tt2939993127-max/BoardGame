# Findings & Resources

<!-- 
WHAT: This file is your "Hard Drive". 
WHY: Your context window is small and volatile. Files are large and persistent.
WHEN: Update this file every 2 browser steps or 2 file reads (The 2-Action Rule).
-->

## Requirements Checklist
- [ ] 完整接入狂战士角色（多角色共存）
- [ ] 允许多人选择同一角色
- [ ] 所有玩家完成选角后才进入对局
- [ ] 逻辑先行，UI 后续

## Research Findings

### 当前实现与缺口
- DiceThrone 仍固定 monk：HeroState.characterId 只允许 'monk'，setup 固定 monk（@src/games/dicethrone/domain/types.ts，@src/games/dicethrone/domain/index.ts）。
- UI 头像映射仅 monk（@src/games/dicethrone/ui/assets.ts）。
- 狂战士模块已存在：abilities/cards/tokens/dice/resource（@src/games/dicethrone/barbarian/*）。
- 资源图片已存在：public/assets/dicethrone/images/barbarian/*。
- 规则文档：@src/games/dicethrone/rule/王权骰铸规则.md（已阅读）。

### OpenSpec 工作流
- 已阅读 .windsurf/workflows/openspec-proposal.md：提案阶段仅写 proposal/tasks/spec delta（必要时 design.md），实现需等批准后再做。

### OpenSpec 现状
- openspec list：存在 add-dicethrone-monk-mvp 等 active changes（未看到狂战士接入相关 change）。
- openspec list --specs：当前没有 dicethrone 相关 spec，需新增能力 spec。

### Project Context
- 已读取 openspec/project.md：技术栈 React 19 + Boardgame.io 0.50；约定中文 UI/注释、Vitest/Playwright 测试。

### Specs 参考
- flow-system spec：阶段推进由 FlowHooks 驱动，ADVANCE_PHASE 校验/阻止由 canAdvance 控制。
- game-registry spec：游戏清单从 manifest 自动发现（与本次选角逻辑无直接冲突）。

### DiceThrone 领域现状
- TurnPhase 已包含 'setup'，但 FlowHooks 初始阶段目前为 'upkeep'（需调整以支持选角阶段）。
- canAdvancePhase 目前仅在 pendingInteraction/bonusDice 或弃牌超限时阻止阶段推进（可扩展为“未选齐”门禁）。
- commands.ts：ADVANCE_PHASE 使用 canAdvancePhase 校验；新选角/房主开始需新增命令与验证。
- reducer.ts：通过事件更新 core（含骰子符号、阶段切换等）；新增选角/开始事件需在 reducer 中落地。
- FlowSystem：SYS_PHASE_CHANGED 事件驱动 core.turnPhase，同步 activePlayerId；ADVANCE_PHASE 由 FlowHooks 控制。
- rules.ts：PHASE_ORDER 不含 setup；getNextPhase 需单独处理 setup→upkeep。
- getDieFace 在多处被用于骰面映射（reducer/execute/effects），需支持角色骰子定义。
- adapter/setup：domain.setup 仅接收 playerIds/random，无法直接拿到 setupData。

## Visual / Browser Data
- 暂无

## Technical notes
```
OpenSpec: 新能力需先创建 change proposal 再实现。
```

---

## UGC Builder V2 - "组件承载规则"理解

### 核心概念
**组件承载规则** = 每个组件（卡牌/技能/武将）直接携带其规则定义，而不是在外部代码中定义。

### 从三国杀示例理解
```typescript
// 卡牌组件直接携带效果
const shaCard = {
  id: 'sha',
  name: '杀',
  tags: ['attack', 'damage'],
  // 效果直接定义在组件上（可视化编辑 + AI 生成）
  effects: [
    { type: 'TARGET_ONE', filter: { inAttackRange: true } },
    { type: 'REQUIRE_RESPONSE', cardType: 'shan' },
    { type: 'DEAL_DAMAGE', amount: 1, onNoResponse: true },
  ],
  playCondition: { phase: 'play', maxPerTurn: 1 },
};
```

### 正确的实现方向
1. **可视化编辑**：通用字段（名称/花色/点数/标签）用表单编辑
2. **AI 生成复杂字段**：effects/playCondition 点击按钮让 AI 生成
3. **组件定义即规则**：卡牌/技能的定义本身就是规则，不需要额外写代码
4. **效果执行器预置**：DEAL_DAMAGE/HEAL/DRAW 等效果类型由引擎预置

### 错误的方向（我之前做的）
- ❌ 纯代码编辑器（用户写 setup/moves 代码）
- ❌ 5 层 Tab 切换编辑代码

### 正确的 UI 结构
- 左侧：Tag 管理 + Schema 列表
- 中间：**数据表格**（展示所有卡牌/技能）
- 右侧：**属性编辑器**（选中一条数据时显示，复杂字段有"AI 生成"按钮）

### 实现进度（错误方向，已废弃）
- [x] ComponentBuilder 组件 - ❌ 错误理解

---

## 正确理解："组件承载规则"

### 用户反馈
> "布局也是要有的，你完全错误理解了组件承载规则的意思，我是说给卡牌出牌钩子加限制等等，你可以参考之前错误实现的界面，那个界面基本是预期的界面了，组件有预定义好的规则，也就是每个机制对应的系统是已经实现好了的"

### 正确理解
1. **保留 UnifiedBuilder 的布局**：组件库（手牌区/牌堆/出牌区）+ UI 画布
2. **组件有预定义系统**：手牌区、牌堆、资源栏等组件背后有预实现的机制
3. **用户配置钩子/限制**：给卡牌出牌加条件、给技能加触发时机等
4. **不是让用户写代码**：而是通过可视化配置 + AI 生成效果

### 需要做的
1. 保留 UnifiedBuilder 的布局（组件库 + 画布）
2. 增强组件的规则配置能力（钩子、条件、限制）
3. Schema/数据编辑保留可视化
4. 复杂效果用 AI 生成

### 已完成（废弃方案）
~~以下是错误理解的实现，已废弃~~

---

## 最终正确理解：四层分模块架构

### 四层架构
```
┌─────────────────────────────────────────────────────────┐
│  Systems 层（预置，不可修改）                            │
│  ├ CardSystem   - playCard/drawCard/discard            │
│  ├ DiceSystem   - rollDice/checkCondition              │
│  ├ TokenSystem  - addToken/removeToken                 │
│  ├ AbilitySystem- activateSkill/checkTrigger           │
│  └ ResourceSystem- gainResource/spendResource          │
├─────────────────────────────────────────────────────────┤
│  Definition 层（用户配置 + AI 辅助生成复杂字段）         │
│  ├ 通用字段：可视化编辑（名称/花色/点数/标签）          │
│  └ 复杂字段：AI 生成 effects 数组配置（不是代码）       │
│     例：[{ type: 'DEAL_DAMAGE', amount: 1 }]           │
├─────────────────────────────────────────────────────────┤
│  Rules 层（AI 分模块生成）                              │
│  ├ setup        - 初始化代码                           │
│  ├ commands     - 玩家操作（USE_SHA, RESPOND_SHAN）    │
│  ├ phaseLogic   - 每阶段逻辑                           │
│  └ endIf        - 胜负判定                             │
├─────────────────────────────────────────────────────────┤
│  UI 模板层（预置，用户可选）                            │
│  ├ 阶段流程模板：DiceThrone / 三国杀风格               │
│  └ 卡牌/布局模板                                       │
└─────────────────────────────────────────────────────────┘
```

### 关键认知
1. **不是一句话生成整个游戏**
2. 而是**分层、分模块**生成，确保结果稳定
3. **Systems 层提供钩子**（如 CardSystem.playCard）
4. **Definition 层的 effects 是预置效果类型的配置**（AI 生成配置，不是代码）
5. **Rules 层分模块 AI 生成**（setup/commands/phaseLogic/endIf 分别生成）

### 预置效果类型（Definition 层）
- TARGET_ONE / TARGET_MULTIPLE - 选择目标
- DEAL_DAMAGE / HEAL - 伤害/治疗
- DRAW_CARD / DISCARD - 抽牌/弃牌
- REQUIRE_RESPONSE - 要求响应
- GAIN_RESOURCE / SPEND_RESOURCE - 资源增减
- ADD_TOKEN / REMOVE_TOKEN - 标记增减
- PEEK_DECK / REARRANGE - 观看/排列牌堆

### 待实现
- [ ] Systems 层基础服务（CardSystem/DiceSystem 等）
- [ ] Definition 层可视化编辑器 + AI 辅助生成 effects
- [ ] Rules 层分模块 AI 生成界面
- [ ] UI 模板选择
