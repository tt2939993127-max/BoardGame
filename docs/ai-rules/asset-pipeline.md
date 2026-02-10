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
├── images/
│   ├── foo.png              # 原始图片（仅用于压缩源）
│   └── compressed/          # 压缩输出目录
│       ├── foo.avif         # AVIF 格式（首选）
│       └── foo.webp         # WebP 格式（回退）
```

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

## 🔊 音频资源规范

> 新增音频全链路流程详见：`docs/audio/add-audio.md`

### 现行规范（已启用）

音效/音乐仅允许使用 `public/assets/common/audio/registry.json` 中的**唯一 key**。

- **禁止**在游戏层定义音频资源（`src/games/<gameId>/audio.config.ts` 不得再声明 `basePath/sounds`）。
- **禁止**使用旧短 key（如 `click` / `dice_roll` / `card_draw`）。
- **必须**使用 registry 的完整 key（如 `ui.general....uiclick_dialog_choice_01_krst_none`）。
- **路径规则**：`getOptimizedAudioUrl()` 自动插入 `compressed/`，配置中**不得**手写 `compressed/`。

### ✅ 音效触发规范（统一标准）

- **游戏态事件音**：一律通过事件流触发（`eventSoundResolver` 或事件元数据）。
- **UI 点击音**：仅用于纯 UI 行为（打开面板/切换 Tab），通过 `GameButton` 播放。
- **操作拒绝音**：用户尝试不合法操作时，通过 `playDeniedSound()`（`src/lib/audio/useGameAudio.ts`）播放，key 为 `puzzle.18.negative_pop_01`。
- **单一来源原则**：同一动作只能由"事件音"、"按钮音"或"拒绝音"其中之一触发，禁止重复。
- **阶段推进**：统一使用 `SYS_PHASE_CHANGED` 事件音效；推进按钮需关闭点击音。

### ✅ 当前正确示例（音频）

```typescript
// 事件解析直接返回 registry key
eventSoundResolver: (event) => {
  if (event.type === 'CELL_OCCUPIED') {
    return 'system.general.casual_mobile_sound_fx_pack_vol.interactions.puzzles.heavy_object_move';
  }
  return undefined;
}

// 事件级元数据（优先级最高）
event.audioKey = 'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a';
event.audioCategory = { group: 'ui', sub: 'click' };
```

### 音频工具链

- **压缩脚本**：`npm run compress:audio -- public/assets/common/audio`
- **生成 registry**：`node scripts/audio/generate_common_audio_registry.js`
- **生成语义目录**：`npm run audio:catalog`（产出 `docs/audio/audio-catalog.md`，AI 查找音效首选）
- **资源清单**：`node scripts/audio/generate_audio_assets_md.js`
- **详见文档**：`docs/audio/audio-usage.md`

**相关提案**：`openspec/changes/refactor-audio-common-layer/specs/audio-path-auto-compression.md`
