# 审计报告 7.1：城塞之力（fortress_power）

## 权威描述

来源：`public/locales/zh-CN/game-summonerwars.json`

> 在本单位攻击一个敌方单位之后，如果战场上有一个或更多友方城塞单位，则你**可以**从你的弃牌堆中拿取一张城塞单位，展示并且加入你的手牌。

## 原子步骤拆解

### 独立交互链 A：攻击后从弃牌堆拿取城塞单位（可选）

| # | 动词短语 | 原子操作 |
|---|----------|----------|
| A1 | 本单位攻击一个敌方单位之后 | 触发时机：afterAttack，攻击目标必须是敌方单位 |
| A2 | 如果战场上有一个或更多友方城塞单位 | 前置条件：遍历棋盘检查友方城塞单位存在 |
| A3 | 你**可以** | 可选效果：玩家可以选择不执行（按钮式触发，不点击即跳过） |
| A4 | 从你的弃牌堆中拿取一张城塞单位 | 从弃牌堆筛选城塞单位，玩家选择一张 |
| A5 | 展示并且加入你的手牌 | 将选中的卡牌从弃牌堆移到手牌 |

### 自检

原文逐句覆盖：
- "在本单位攻击一个敌方单位之后" → A1 ✅
- "如果战场上有一个或更多友方城塞单位" → A2 ✅
- "则你可以" → A3 ✅
- "从你的弃牌堆中拿取一张城塞单位" → A4 ✅
- "展示并且加入你的手牌" → A5 ✅

覆盖完整，无遗漏。

## 八层链路检查

### 链 A：攻击后从弃牌堆拿取城塞单位

| 层级 | 状态 | 检查内容 |
|------|------|----------|
| 定义层 | ✅ | `abilities-paladin.ts`: `id: 'fortress_power'`, `trigger: 'afterAttack'`, `effects: [{ type: 'custom', actionId: 'fortress_power_retrieve' }]`, `requiresTargetSelection: true`, `ui.requiresButton: true`, `ui.buttonPhase: 'attack'`, `ui.activationStep: 'selectCard'` |
| 注册层 | ✅ | `executors/paladin.ts`: `abilityExecutorRegistry.register('fortress_power', ...)` 已注册。`entity-chain-integrity.test.ts` 中 `fortress_power_retrieve` 在 `HANDLED_BY_EXECUTORS` 白名单中 |
| 执行层 | ✅（修复后） | 执行器验证 targetCardId 存在、卡牌在弃牌堆中、是单位卡、是城塞单位，然后发射 `CARD_RETRIEVED` 事件。**修复**：城塞单位判定从 `id.includes('fortress')` 改为 `isFortressUnit(card)`（基于名称匹配），修复了起始城塞弓箭手（id=`paladin-start-archer`）不被识别的 bug |
| 状态层 | ✅ | `reduce.ts` `CARD_RETRIEVED` case：从弃牌堆移除卡牌，添加到手牌。使用结构共享（spread） |
| 验证层 | ✅（修复后） | `abilities-paladin.ts` customValidator：检查 targetCardId 存在、战场上有友方城塞单位、弃牌堆中有该卡牌、是单位卡、是城塞单位。**修复**：同执行层，城塞判定改为 `isFortressUnit()` |
| UI层 | ✅（修复后） | `AbilityButtonsPanel` 渲染按钮（攻击阶段、弃牌堆有城塞单位时显示）→ 点击设置 `abilityMode({ step: 'selectCard' })` → `CardSelectorOverlay` 显示弃牌堆中的城塞单位 → 选择后发送 `ACTIVATE_ABILITY` 命令。**"可以"语义**：按钮式触发，不点击即跳过 ✅。**修复**：Board.tsx 中弃牌堆过滤从 `c.id.includes('fortress')` 改为 `isFortressUnit(c)` |
| i18n层 | ✅ | zh-CN 和 en 均有完整条目：`abilities.fortress_power.name/description`、`cardSelector.fortressPower`、`abilityButtons.fortressPower` |
| 测试层 | ✅ | `abilities-paladin.test.ts` 覆盖三个场景：① 正常拿取（命令→CARD_RETRIEVED事件→手牌+1/弃牌堆-1/手牌含目标卡）✅ ② 战场无城塞单位时验证拒绝 ✅ ③ 弃牌堆非城塞单位验证拒绝 ✅。全链路覆盖（事件+状态变更） |

## 发现的问题

### 问题 1：城塞单位判定使用 `id.includes('fortress')` 导致起始单位不被识别（严重度：high）

**类别**：logic_error
**位置**：`abilities-paladin.ts`、`executors/paladin.ts`、`execute.ts`、`abilityResolver.ts`、`Board.tsx`
**描述**：所有城塞单位判定使用 `card.id.includes('fortress')` 进行字符串匹配。但起始城塞弓箭手的 `card.id` 被覆盖为 `paladin-start-archer`（在 `createPaladinDeck` 中 `{ ...fortressArcher, id: 'paladin-start-archer' }`），不包含 'fortress' 字符串。这导致：
1. 起始城塞弓箭手在战场上不被计为"友方城塞单位"（fortress_power 前置条件检查失败）
2. 起始城塞弓箭手被消灭后进入弃牌堆，不可被 fortress_power 选取
3. 城塞精锐（fortress_elite）不计算起始城塞弓箭手的战力加成
4. 神圣护盾（divine_shield）不保护起始城塞弓箭手

**规则引用**：权威描述"友方城塞单位"应包含所有名称含"城塞"的单位，不应因实例 ID 不同而排除。
**修复方案**：创建 `isFortressUnit(card)` 工具函数（基于 `card.name.includes('城塞')` 判定），替换所有 `id.includes('fortress')` 引用。
**修复状态**：✅ 已修复

### 修复详情

1. `domain/ids.ts`：新增 `isFortressUnit()` 函数
2. `domain/abilities-paladin.ts`：3 处 `id.includes('fortress')` → `isFortressUnit()`
3. `domain/executors/paladin.ts`：1 处 `id.includes('fortress')` → `isFortressUnit()`
4. `domain/execute.ts`：1 处 `id.includes('fortress')` → `isFortressUnit()`（divine_shield）
5. `domain/abilityResolver.ts`：1 处 `id.includes('fortress')` → `isFortressUnit()`（fortress_elite）
6. `Board.tsx`：1 处 `c.id.includes('fortress')` → `isFortressUnit(c)`

## 交叉影响检查

| 检查项 | 结果 |
|--------|------|
| fortress_elite 城塞精锐战力加成 | ✅ 已同步修复，使用 `isFortressUnit()` |
| divine_shield 神圣护盾保护范围 | ✅ 已同步修复，使用 `isFortressUnit()` |
| 交缠颂歌共享 fortress_power | 不适用（fortress_power 是召唤师技能，交缠颂歌只影响士兵） |
| 心灵捕获/心灵操控后的 fortress_power | 不适用（fortress_power 是召唤师技能，控制权转移不影响召唤师） |

## 数据查询一致性

fortress_power 不涉及 `card.abilities`、`card.strength`、`card.life` 的直接访问。验证层通过 `getUnitAbilities()` 检查单位是否拥有技能 ✅。

## 测试验证

修复后运行全量测试：**861 tests, 42 files, 全部通过**。

## 总结

城塞之力（fortress_power）整体实现正确，交互流程完整（按钮→卡牌选择器→命令→事件→状态变更）。发现并修复了一个 high 严重度的城塞单位判定 bug：`id.includes('fortress')` 无法识别起始城塞弓箭手。该 bug 同时影响 fortress_elite 和 divine_shield，已一并修复。
