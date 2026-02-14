# 图片/音频资源完整规范

> 本文档是 `AGENTS.md` 的补充，包含图片/音频的完整路径规则、压缩流程与示例。
> **触发条件**：新增/修改图片或音频资源引用时阅读。

---

## 🖼️ 图片资源规范

### ⚠️ 强制规则：禁止直接使用未压缩图片

**所有图片必须经过压缩后使用，禁止在代码中直接引用原始 `.png/.jpg` 文件。**

### 资源目录结构

```
public/assets/<gameId>/
├── <资源分类>/                  # 按业务语义分类（如 hero/、cards/、common/）
│   ├── foo.png              # 原始图片（仅用于压缩源）
│   └── compressed/          # 压缩输出目录
│       ├── foo.avif         # AVIF 格式（首选）
│       └── foo.webp         # WebP 格式（回退）
```

> **禁止**使用无语义的 `images/` 中间目录。直接按业务含义组织：`hero/`、`cards/`、`base/`、`common/` 等。

### 压缩流程

1. **压缩命令**：`npm run compress:images -- public/assets/<gameId>`
2. **压缩脚本**：`scripts/assets/compress_images.js`（启动器）+ `scripts/assets/compress_images.py`（实现）
3. **输出位置**：同级 `compressed/` 子目录，生成 `.avif` 和 `.webp`

### 前端引用方式

| 场景 | 组件/函数 | 示例 |
|------|-----------|------|
| `<img>` 标签 | `OptimizedImage` | `<OptimizedImage src="dicethrone/images/foo.png" />` |
| CSS 背景 | `buildOptimizedImageSet` | `background: ${buildOptimizedImageSet('dicethrone/images/foo.png')}` |
| 精灵图裁切 | `getOptimizedImageUrls` | `const { avif, webp } = getOptimizedImageUrls('dicethrone/images/foo.png')` |

### 路径规则（强制）

- `src` 传相对路径（如 `dicethrone/images/foo.png`），**不带** `/assets/` 前缀
- 内部自动补全 `/assets/` 并转换为 `compressed/foo.avif` / `compressed/foo.webp`
- **禁止在路径中硬编码 `compressed/` 子目录**（如 `'dicethrone/images/compressed/foo.png'`）
- **原因**：`getOptimizedImageUrls()` 会自动插入 `compressed/`，硬编码会导致路径重复（`compressed/compressed/`）

### ✅ 正确示例

```typescript
// manifest 配置
thumbnailPath: 'dicethrone/thumbnails/fengm'

// ASSETS 常量
CARD_BG: 'dicethrone/images/Common/card-background'
AVATAR: 'dicethrone/images/Common/character-portraits'

// 组件使用
<OptimizedImage src="dicethrone/images/Common/background" />
<OptimizedImage 
    src={getLocalizedAssetPath('dicethrone/images/monk/player-board', locale)}
/>
```

### ❌ 错误示例

```typescript
// ❌ 硬编码 compressed/
thumbnailPath: 'dicethrone/thumbnails/compressed/fengm'
CARD_BG: 'dicethrone/images/Common/compressed/card-background'
<OptimizedImage src="dicethrone/images/Common/compressed/background" />

// ❌ 直接使用原始图片
<img src="/assets/dicethrone/images/foo.png" />

// ❌ 手动拼接 avif/webp
<img src="/assets/dicethrone/images/compressed/foo.avif" />
```

### 新增游戏资源检查清单

1. ✅ 原始图片放入 `public/assets/<gameId>/` 对应目录
2. ✅ 运行 `npm run compress:images -- public/assets/<gameId>`
3. ✅ 确认 `compressed/` 子目录生成 `.avif/.webp` 文件
4. ✅ 代码中使用 `OptimizedImage` 或 `getOptimizedImageUrls`
5. ✅ **确认路径中不含 `compressed/` 子目录**
6. ❌ **禁止**直接写 `<img src="/assets/xxx.png" />`
7. ❌ **禁止**硬编码 `compressed/` 路径

---

## 🚀 关键图片预加载规范（criticalImageResolver）

> **触发条件**：新增游戏、新增角色/派系、修改游戏 Board 中使用的图片资源时必读。

### 机制概述

项目采用**两阶段预加载**策略，防止进入对局时出现白屏/闪烁：

- **关键图片（critical）**：阻塞渲染，加载完成前显示 LoadingScreen，10 秒超时后放行
- **暖图片（warm）**：后台异步加载，不阻塞对局渲染

门禁落在 `MatchRoom`/`LocalMatchRoom` 入口层，各游戏通过 `criticalImageResolver.ts` 提供动态解析。

### 强制规则

1. **Board 中使用的所有图片必须出现在 criticalImageResolver 中**：要么在 `critical` 列表（首屏必需），要么在 `warm` 列表（后台预取）。
2. **首屏可见的图片必须放 critical**：背景图、玩家面板、提示板、地图等进入对局立即可见的资源。
3. **按需加载的图片放 warm**：未选角色/派系的资源、非首屏展示的图集。
4. **路径格式与图片引用一致**：相对于 `/assets/`，不含 `compressed/`（预加载 API 内部自动处理）。
5. **解析器必须按游戏阶段动态返回**：选角/选派系阶段 vs 游戏进行阶段，关键资源不同。
6. **phaseKey 必须稳定**：`CriticalImageGate` 依据 `phaseKey` 判断是否重新预加载，未变化时不会重复触发。

### 解析器模板

```typescript
import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';

export const <gameId>CriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    // 1. 无状态时：预加载选择界面所需资源
    // 2. 选择阶段：所有可选项的预览图为 critical
    // 3. 游戏进行中：已选项的完整资源为 critical，未选项放 warm
    return {
        critical: [...],
        warm: [...],
        phaseKey: 'setup',
    };
};
```

### 注册方式

在游戏入口 `index.ts` 中注册：

```typescript
import { registerCriticalImageResolver } from '../../core';
import { <gameId>CriticalImageResolver } from './criticalImageResolver';

registerCriticalImageResolver('<gameId>', <gameId>CriticalImageResolver);
```

### 各游戏 critical 资源清单参考

| 游戏 | 选择阶段 critical | 游戏阶段 critical |
|------|-------------------|-------------------|
| DiceThrone | 背景图、卡背、头像图集、所有角色 player-board + tip | 背景图、卡背、头像图集、已选角色 player-board + tip + ability-cards + dice + status-icons-atlas |
| SummonerWars | 地图、卡背、所有阵营 hero 图集 | 地图、卡背、传送门、骰子、已选阵营 hero + cards 图集 |
| SmashUp | 所有基地图集 | 所有基地图集 + 已选派系卡牌图集 |

### 新增角色/派系检查清单

- [ ] 新资源路径已加入 `criticalImageResolver.ts` 的对应阶段
- [ ] 选择阶段：预览图（player-board/hero/tip）在 critical 中
- [ ] 游戏阶段：完整资源（卡牌图集/骰子/状态图标）在 critical 中
- [ ] 运行相关单测：`npm test -- criticalImageResolver`

### 参考实现

- `src/games/dicethrone/criticalImageResolver.ts` — 按角色 + 游戏阶段动态解析
- `src/games/summonerwars/criticalImageResolver.ts` — 按阵营 + 游戏阶段动态解析
- `src/games/smashup/criticalImageResolver.ts` — 按派系图集分组

---

## 🔊 音频资源规范

> 新增音频全链路流程详见：`docs/audio/add-audio.md`

### 音频资源架构（强制）

**三层架构**：
1. **通用注册表**（`public/assets/common/audio/registry.json`）：所有音效资源的唯一来源，包含 key 和物理路径映射。
2. **游戏配置**（`src/games/<gameId>/audio.config.ts`）：定义事件→音效的映射规则（`feedbackResolver`），使用通用注册表中的 key。
3. **FX 系统**（`src/games/<gameId>/ui/fxSetup.ts`）：直接使用通用注册表中的 key 定义 `FeedbackPack`，不依赖游戏配置常量。

**核心原则**：
- **禁止重复定义**：音效 key 只在通用注册表中定义一次，游戏层和 FX 层直接引用 key 字符串，不再定义常量。
- **禁止**在游戏层定义音频资源（`audio.config.ts` 不得声明 `basePath/sounds`）。
- **禁止**使用旧短 key（如 `click` / `dice_roll` / `card_draw`）。
- **必须**使用 registry 的完整 key（如 `ui.general....uiclick_dialog_choice_01_krst_none`）。
- **路径规则**：`getOptimizedAudioUrl()` 自动插入 `compressed/`，配置中**不得**手写 `compressed/`。

### ✅ 音效触发规范（当前 + 长期规划）

#### 当前架构（过渡期）

**音效两条路径 + UI 交互音**：
1. **路径① 即时播放（feedbackResolver）**：无动画的事件音（投骰子/出牌/阶段切换/魔法值变化）走 EventStream，`feedbackResolver` 返回 `SoundKey`（纯字符串）即时播放。有动画的事件（伤害/状态/Token）`feedbackResolver` 返回 `null`，由动画层在 `onImpact` 回调中直接 `playSound(key)` 播放。
2. **路径② 动画驱动（params.soundKey / onImpact）**：有 FX 特效的事件音（召唤光柱/攻击气浪/充能旋涡）通过 `FeedbackPack` 在 `fxSetup.ts` 注册时声明，`useFxBus` 在 push 时从 `event.params.soundKey` 读取 key。飞行动画（伤害数字/状态增减/Token 获得消耗）在 `onImpact` 回调中直接 `playSound(resolvedKey)` 播放。
3. **UI 交互音**：UI 点击音走 `GameButton`，拒绝音走 `playDeniedSound()`，key 来自通用注册表。

**选择原则**：有 FX 特效 → 路径②（FeedbackPack）；有飞行动画无特效 → 路径②（onImpact 回调）；无动画 → 路径①；UI 交互 → UI 交互音。

**避免重复**：同一事件只能选择一条路径，有动画的事件 `feedbackResolver` 必须返回 `null`。

**已废弃**：`DeferredSoundMap` 已删除，`AudioTiming`/`EventSoundResult` 已移除，`feedbackResolver` 不再返回 `{ key, timing }` 对象。

**过渡方案（未迁移到 FX 引擎的游戏）**：
- 创建 `domain/animationSoundConfig.ts` 集中管理所有 `onImpact` 音效配置
- 提供音效解析函数（如 `resolveDamageImpactKey`）
- 在 `useAnimationEffects.ts` 中从配置读取音效 key，而不是硬编码
- 详见 `docs/refactor/audio-architecture-improvement.md`

#### 长期目标架构（FeedbackPack 单一配置源）

> **详见**：`docs/refactor/audio-architecture-improvement.md`

**核心变化**：
- `feedbackResolver` 只处理"无动画的即时音效"（如投骰子、阶段切换）
- 所有有动画的事件音效统一在 `fxSetup.ts` 的 `FeedbackPack` 中声明
- 删除动画层的硬编码 `playSound()` 调用，由 FxLayer 自动触发

**迁移状态**：
- ✅ SummonerWars：已完成迁移，参考实现
- ✅ DiceThrone：已完成迁移到 FX 引擎
- ⏸️ SmashUp：无事件音效系统，暂不处理

**新游戏规范**：新增游戏必须直接采用长期架构，禁止使用过渡期的"两条路径"模式。

### ✅ 当前正确示例（音频）

```typescript
// ===== 路径① 示例：feedbackResolver 返回 SoundKey =====
feedbackResolver: (event): SoundKey | null => {
  if (event.type === 'CELL_OCCUPIED') {
    return 'system.general.casual_mobile_sound_fx_pack_vol.interactions.puzzles.heavy_object_move';
  }
  // 有动画的事件返回 null，音效由动画层 onImpact 播放
  if (event.type === 'DAMAGE_DEALT') return null;
  return null;
}

// ===== 路径② 示例：FX 系统 FeedbackPack（source: 'params'）=====
// src/games/summonerwars/ui/fxSetup.ts
const COMBAT_DAMAGE_FEEDBACK: FeedbackPack = {
  sound: {
    source: 'params',   // 从 event.params.soundKey 读取
  },
  shake: { intensity: 'normal', type: 'impact', timing: 'on-impact' },
};

// ===== 路径② 示例：飞行动画 onImpact 直接播放 =====
const impactKey = resolveDamageImpactKey(damage, targetId, currentPlayerId);
pushFlyingEffect({
  type: 'damage',
  content: `-${damage}`,
  onImpact: () => { playSound(impactKey); },
});
```

### 音频工具链

- **压缩脚本**：`npm run compress:audio -- public/assets/common/audio`
- **生成 registry**：`node scripts/audio/generate_common_audio_registry.js`
- **生成语义目录**：`npm run audio:catalog`（产出 `docs/audio/audio-catalog.md`，AI 查找音效首选）
- **资源清单**：`node scripts/audio/generate_audio_assets_md.js`
- **详见文档**：`docs/audio/audio-usage.md`

**相关提案**：`openspec/changes/refactor-audio-common-layer/specs/audio-path-auto-compression.md`
