# 音效架构改进方案

## 问题描述

当前音效配置需要两次配置：

1. **audio.config.ts 的 feedbackResolver**：返回 `null`（表示"不在这里播放"）
2. **useAnimationEffects.ts 的 onImpact**：实际播放音效

这导致：
- 重复配置：同一个音效需要配置两次
- 容易遗漏：如本次 Bug，厚皮治疗的 `HEAL_APPLIED` 事件在 `audio.config.ts` 中返回 `null`，但 `useAnimationEffects.ts` 忘记添加 `onImpact` 回调
- 语义不清：`return null` 无法表达"在动画冲击帧播放"的意图

## 根本原因

架构设计时为了解决"视听同步"问题：
- 引擎同步生成所有事件
- 动画有飞行时间
- 如果在事件生成时立即播放音效，会导致视听不同步

所以采用了两阶段设计：
1. `feedbackResolver` 判断"是否有动画"（返回 `null` = 有动画）
2. 动画层在 `onImpact` 时播放音效

## 解决方案：FeedbackPack 单一配置源

**核心思路**：让 FeedbackPack 携带音效配置，而不是在 `feedbackResolver` 和动画层分别配置。

### 当前架构分析

已有基础设施（✅ 无需新增）：

1. **FeedbackPack 类型**（`src/engine/fx/types.ts`）：
   ```typescript
   export interface FeedbackPack {
     sound?: FxSoundConfig;  // 已支持 timing: 'immediate' | 'on-impact'
     shake?: FxShakeConfig;
   }
   ```

2. **useFxBus 自动触发**（`src/engine/fx/useFxBus.ts`）：
   - `timing: 'immediate'` → push 时立即播放
   - `timing: 'on-impact'` → 延迟到 `fireImpact()` 时播放

3. **FxLayer 注入 onImpact**（`src/engine/fx/FxLayer.tsx`）：
   - 渲染器调用 `onImpact()` → FxLayer 调用 `fxBus.fireImpact(id)` → 自动播放音效

### 重构步骤

#### 1. 废弃 feedbackResolver 的音效职责

**目标**：`feedbackResolver` 只处理"无动画的即时音效"，有动画的音效全部走 FeedbackPack。

```typescript
// ✅ 重构后
feedbackResolver: (event) => {
  // 只处理无动画的即时音效
  if (event.type === 'DICE_ROLLED') return 'dice.roll';
  if (event.type === 'CP_CHANGED') return event.payload.delta > 0 ? 'cp.gain' : 'cp.loss';
  
  // 有动画的事件返回 null（音效由 FeedbackPack 声明）
  if (event.type === 'HEAL_APPLIED') return null;
  if (event.type === 'DAMAGE_DEALT') return null;
  
  return null;
}
```

#### 2. 在 fxSetup.ts 中声明音效

```typescript
// src/games/<gameId>/ui/fxSetup.ts
const HEAL_FEEDBACK: FeedbackPack = {
  sound: {
    key: 'combat.general.mini_games_sound_effects_and_music_pack.heal.sfx_heal_1',
    timing: 'on-impact',
  },
  shake: { intensity: 'normal', type: 'hit', timing: 'on-impact' },
};

registry.register(GAME_FX.HEAL, HealRenderer, { timeoutMs: 2000 }, HEAL_FEEDBACK);
```

#### 3. 删除动画层的硬编码音效

```typescript
// ❌ 当前
onImpact: () => {
  playSound(IMPACT_SFX.HEAL); // 硬编码
}

// ✅ 重构后（删除此回调，音效由 FeedbackPack 自动触发）
// 无需任何代码，FxLayer 会自动调用 fxBus.fireImpact(id)
```

#### 4. 处理动态音效 key

```typescript
// ✅ 方案 A：在 push 时注入 params.soundKey
fxBus.push(GAME_FX.COMBAT_SHOCKWAVE, { cell }, {
  attackType: 'ranged',
  soundKey: isRanged ? RANGED_ATTACK_KEY : MELEE_ATTACK_KEY, // 动态注入
});

// FeedbackPack 声明为 source: 'params'
const COMBAT_FEEDBACK: FeedbackPack = {
  sound: {
    source: 'params', // 从 event.params.soundKey 读取
    key: MELEE_ATTACK_KEY, // fallback
    timing: 'on-impact',
  },
};
```

### 重构范围

| 游戏 | 当前状态 | 重构工作量 |
|------|---------|-----------|
| **SummonerWars** | ✅ 已实现 FeedbackPack 音效 | 无需重构 |
| **DiceThrone** | ✅ 已完成迁移到 FX 引擎 | 已完成 |
| **SmashUp** | ⏸️ 无事件音效系统 | 暂不处理 |

### 迁移检查清单

对于每个有动画的事件：

- [x] 创建 `ui/fxSetup.ts` 并注册 FX 渲染器
- [x] 在 `fxSetup.ts` 中为对应 FX cue 添加 `FeedbackPack.sound` 配置
- [x] 更新 `useAnimationEffects.ts` 改为使用 `useFxBus.push()`
- [x] 更新 `Board.tsx` 集成 `FxLayer`
- [x] 删除旧的 `FlyingEffectsLayer` 和 `useFlyingEffects`
- [x] 在 `audio.config.ts` 中将该事件改为 `return null`，并添加注释指向 FX 系统
- [x] 测试音效播放时机是否正确

### 优势

- ✅ 单一配置源（只在 `fxSetup.ts` 配置一次）
- ✅ 类型安全（`FeedbackPack` 有完整类型定义）
- ✅ 语义清晰（`timing: 'on-impact'` 明确表达播放时机）
- ✅ 防止遗漏（注册 FX 时必须声明 FeedbackPack，编译期强制）
- ✅ 架构一致（SummonerWars 和 DiceThrone 已验证此模式可行）

### 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 迁移过程中音效丢失 | 逐个事件迁移，每次迁移后立即测试 |
| 动态音效 key 处理复杂 | 优先使用 `source: 'params'` 方案，保持灵活性 |

## 实施计划

### 阶段 1：DiceThrone 迁移到 FX 引擎（✅ 已完成）

1. ✅ 创建 `ui/fxSetup.ts` 并注册渲染器
2. ✅ 将 `useAnimationEffects` 改为使用 `useFxBus.push()`
3. ✅ 在 Board 中集成 `FxLayer`
4. ✅ 删除旧的 `FlyingEffectsLayer` 和 `useFlyingEffects`
5. ✅ E2E 测试验证音效播放时机

### 阶段 2：SmashUp 重构（按需）

1. 参考 DiceThrone 的迁移模式
2. 处理 SmashUp 特有的动态音效场景

### 阶段 3：文档更新（✅ 已完成）

1. ✅ 更新 `docs/ai-rules/asset-pipeline.md`，明确"音效单一配置源"规范
2. ✅ 更新 `AGENTS.md`，删除过渡方案说明
3. ✅ 更新 `docs/refactor/audio-architecture-improvement.md`，标注 DiceThrone 已完成

## 参考实现

**SummonerWars**：
- `src/games/summonerwars/ui/fxSetup.ts`：FeedbackPack 声明
- `src/games/summonerwars/audio.config.ts`：feedbackResolver 只处理即时音效
- `src/games/summonerwars/ui/useGameEvents.ts`：无硬编码音效调用

**DiceThrone**：
- `src/games/dicethrone/ui/fxSetup.ts`：FeedbackPack 声明 + 动态音效解析
- `src/games/dicethrone/audio.config.ts`：feedbackResolver 只处理即时音效
- `src/games/dicethrone/hooks/useAnimationEffects.ts`：基于 useFxBus 的事件驱动动画
