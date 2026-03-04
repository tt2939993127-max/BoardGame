# DiceThrone 技能音效修复

## 问题描述

用户反馈：DiceThrone 技能激活时不播放音效，应该在播放动画时就播放。

## 根因分析

### 回归历史

**引入时间**：2026-03-03 23:54:03（提交 `56b88b7`）

**提交信息**：`fix: 修复代码审查发现的 6 个 bug + 更新 --no-verify 使用规范`

**变更内容**：
```diff
-  ABILITY_ACTIVATED: 'fx',       // 技能激活（技能自带音效）
+  ABILITY_ACTIVATED: 'immediate', // 技能激活（技能自带音效，立即播放）
```

**变更意图**：将技能激活音效从 `'fx'`（动画驱动）改为 `'immediate'`（立即播放），希望技能激活时立即播放音效，而不是等待动画。

**问题**：使用了简洁形式 `'immediate'`，违反了规范要求（所有 'immediate' 事件必须使用完整形式 `{ audio: 'immediate', sound: KEY }`），导致 `sound` 为 `null`，音效无法播放。

**教训**：
1. **修改音频配置时必须遵守规范**：不能为了简洁而使用简洁形式，必须使用完整形式并指定 `sound` key
2. **修改后必须测试**：音频配置修改后应该测试音效是否正常播放
3. **提交信息应该记录所有变更**：`56b88b7` 提交修复了 6 个 bug，但没有记录 `ABILITY_ACTIVATED` 的修改，导致回归时难以追溯

### 调用链检查

1. **事件定义层**（`src/games/dicethrone/domain/events.ts`）
   - [❌] 契约：`ABILITY_ACTIVATED` 使用简洁形式 `'immediate'`，没有指定 `sound` key
   - 结果：`sound` 为 `null`，导致没有默认音效

2. **音频配置层**（`src/games/dicethrone/audio.config.ts`）
   - [✅] 存在性：`feedbackResolver` 正确检查技能的 `sfxKey`
   - [✅] 契约：如果技能有 `sfxKey`，返回该音效；否则回退到 `baseDtFeedbackResolver`
   - [❌] 返回值：`baseDtFeedbackResolver` 从 `DT_EVENTS` 查找默认音效，但 `ABILITY_ACTIVATED` 的 `sound` 为 `null`

3. **技能定义层**（`src/games/dicethrone/domain/combat/types.ts`）
   - [✅] 存在性：`AbilityDef.sfxKey` 字段存在
   - [⚠️] 契约：部分技能有 `sfxKey`，部分没有（如和尚拳法有独立音效，普通技能没有）

### 问题汇总

1. **`ABILITY_ACTIVATED` 事件使用简洁形式**，违反了 AGENTS.md 规范：
   > **完整形式强制（强制）**：所有 'immediate' 事件必须使用完整形式 `{ audio: 'immediate', sound: KEY }`，禁止简洁形式 `'immediate'`（会导致 sound 为 null）

2. **没有默认技能激活音效**：当技能没有 `sfxKey` 时，应该播放默认的技能激活音效，而不是静默

## 修复方案

### 修改内容

1. **添加默认技能激活音效常量**（`src/games/dicethrone/domain/events.ts`）
   ```typescript
   const ABILITY_ACTIVATE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_arcane_ripple_001';
   ```

2. **修改 `ABILITY_ACTIVATED` 事件定义**（`src/games/dicethrone/domain/events.ts`）
   ```typescript
   // 修改前
   ABILITY_ACTIVATED: 'immediate', // 技能激活（技能自带音效，立即播放）
   
   // 修改后
   ABILITY_ACTIVATED: { audio: 'immediate', sound: ABILITY_ACTIVATE_KEY }, // 技能激活（技能自带音效优先，无则用默认）
   ```

### 工作原理

1. **技能有 `sfxKey`**：`feedbackResolver` 返回技能的 `sfxKey`，播放技能专属音效（如和尚拳法）
2. **技能没有 `sfxKey`**：`feedbackResolver` 回退到 `baseDtFeedbackResolver`，播放默认的 `ABILITY_ACTIVATE_KEY` 音效
3. **音效播放时机**：技能激活时立即播放（`'immediate'` 策略），不等待动画

### 音效选择理由

选择 `arcane_spells_arcane_ripple_001` 作为默认技能激活音效：
- 通用性：适合各种技能类型（攻击/防御/辅助）
- 反馈性：清晰的"激活"感，不会与伤害/治疗音效混淆
- 一致性：与骰子修改音效（`DIE_MODIFY_KEY`）使用同一音效包，保持风格统一

## 验证

### ESLint 检查

```bash
npx eslint src/games/dicethrone/domain/events.ts
```

结果：✅ 通过（0 errors）

### 预期行为

1. **有 `sfxKey` 的技能**（如和尚拳法）：播放技能专属音效
2. **没有 `sfxKey` 的技能**（如普通攻击）：播放默认的 `arcane_ripple_001` 音效
3. **音效播放时机**：技能激活时立即播放，不等待伤害动画

## 百游戏自检

- ✅ 配置显式声明：`ABILITY_ACTIVATED` 使用完整形式，`sound` key 显式指定
- ✅ 智能默认值：提供默认音效，90% 场景无需配置 `sfxKey`
- ✅ 可覆盖：技能可通过 `sfxKey` 覆盖默认音效
- ✅ 类型安全：编译期检查，防止配置错误
- ✅ 通用处理：修复方案适用于所有技能，不只是当前 bug

## 教训

1. **严格遵守规范**：所有 'immediate' 事件必须使用完整形式，不能偷懒用简洁形式
2. **提供默认值**：即使有覆盖机制（`sfxKey`），也要提供合理的默认值
3. **全链路检查**：音效不播放时，必须检查事件定义→音频配置→技能定义的完整链路
4. **规范文档的价值**：AGENTS.md 中的规范明确指出了这个问题，应该在编码时就遵守

## 相关文件

- `src/games/dicethrone/domain/events.ts` - 事件定义（已修复）
- `src/games/dicethrone/audio.config.ts` - 音频配置（无需修改）
- `src/games/dicethrone/domain/combat/types.ts` - 技能定义（无需修改）
- `docs/ai-rules/engine-systems.md` - 音频架构规范
- `AGENTS.md` - 音频事件定义规范
