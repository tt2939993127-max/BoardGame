# 音频资源使用规范

> 本文用于补齐“音频文件如何接入/压缩/注册”的完整流程，与图片资源规范保持一致。

## 1. 目录与来源（强制）
- **唯一音频资源目录**：`public/assets/common/audio/`
- **禁止**在 `src/games/<gameId>/` 下放音频文件或自建音频目录。
- **禁止**在游戏层 `audio.config.ts` 中声明 `basePath/sounds` 或手写音频路径。

## 2. 压缩与生成（强制）
### 2.1 压缩音频
使用脚本：`scripts/audio/compress_audio.js`

示例：
```bash
# 压缩指定目录（会在每个目录生成 compressed/）
npm run compress:audio -- public/assets/common/audio

# 清理旧压缩后再压缩
AUDIO_CLEAN=1 npm run compress:audio -- public/assets/common/audio

# 可选：调整压缩码率（默认 96k）
AUDIO_OGG_BITRATE=96k npm run compress:audio -- public/assets/common/audio
```

### 2.2 生成 registry.json
使用脚本：`scripts/audio/generate_common_audio_registry.js`

```bash
node scripts/audio/generate_common_audio_registry.js
```

- 产出：`public/assets/common/audio/registry.json`
- **注意**：生成脚本会自动忽略 `compressed/` 目录，并基于路径生成 key。

### 2.3 生成音频清单文档
使用脚本：`scripts/audio/generate_audio_assets_md.js`

```bash
node scripts/audio/generate_audio_assets_md.js
```

- 产出：`docs/audio/common-audio-assets.md`

### 2.4 生成 AI 精简 registry（可选）
用于减少 AI 查找音效时的 token 消耗（不影响运行时）。

**全量精简版（全仓库通用）**
```bash
node scripts/audio/generate_ai_audio_registry.js
```
- 产出：`docs/audio/registry.ai.json`
- 内容：仅保留 `key/type/category`，去掉 `src`

**DiceThrone 专用精简版（仅扫描该游戏源码）**
```bash
node scripts/audio/generate_ai_audio_registry_dicethrone.js
```
- 产出：`docs/audio/registry.ai.dicethrone.json`
- 内容：仅包含 `src/games/dicethrone` 中实际使用的 key

### 2.5 AI 查找/筛选音效（推荐流程）
**目标**：在挑选音效时，用最小 token 成本定位合适 key。

**首选方法：语义目录**

1. 打开 `docs/audio/audio-catalog.md`（42 KB，531 个语义组，AI 可一次性读取）
2. 搜索场景关键词（如 `negative`、`click`、`sword`、`heal`、`alert`）
3. 找到组后，复制 grep 模式列的值（如 `puzzle.*negative_pop`）
4. 在 `registry.json` 中 grep 该模式获取完整 key
5. 变体替换末尾数字/字母（`_01` → `_02`）

**生成/更新目录：**
```bash
node scripts/audio/generate_audio_catalog.js
```

**备选方法（精简 registry）：**
- `docs/audio/registry.ai.json`（全量精简，仅保留 key/type/category）
- `docs/audio/registry.ai.dicethrone.json`（DiceThrone 专用，最小）

**AI 查询示例（grep_search）：**
```json
{
  "SearchPath": "docs/audio/audio-catalog.md",
  "Query": "negative|denied|fail|error",
  "CaseSensitive": false
}
```

**如果目录中未找到合适的，再搜全量 registry：**
```json
{
  "SearchPath": "public/assets/common/audio/registry.json",
  "Query": "negative_pop",
  "CaseSensitive": false
}
```

### 2.6 音效预览（/dev/audio）
用于在浏览器内快速试听、复制 key、检查分类与翻译。

**入口**：访问 `/dev/audio`。

**功能**：
- 左侧分类树（group/sub）筛选
- 关键词搜索（key / src / 友好名称）
- 类型过滤（音效/音乐）
- 点击名称复制 key，点击播放按钮试听

**注意事项**：
- 预览依赖 `public/assets/common/audio/registry.json`，新增音效后需先重新生成 registry。
- 友好中文名来自 `public/assets/common/audio/phrase-mappings.zh-CN.json`，如翻译更新需同步生成并刷新页面。

## 3. 代码使用规范（强制）
### 3.1 使用 registry key
- **必须**使用 `registry.json` 中的唯一 key。
- **禁止**写 `compressed/` 路径，`getOptimizedAudioUrl()` 会自动处理。

示例：
```ts
// 事件解析直接返回 registry key
return 'ui.general.khron_studio_rpg_interface_essentials_inventory_dialog_ucs_system_192khz.dialog.dialog_choice.uiclick_dialog_choice_01_krst_none';
```

### 3.2 事件音 vs UI 音 vs 拒绝音（统一标准）
- **游戏态事件音**：通过事件流触发（`eventSoundResolver` / `audioKey` / `audioCategory`）。
- **UI 点击音**：仅用于纯 UI 操作（面板/Tab 切换），通过 `GameButton`。
- **操作拒绝音**：用户尝试不合法操作时（非自己回合、条件不满足等），通过 `playDeniedSound()` 播放（key: `puzzle.18.negative_pop_01`）。
- **单一来源原则**：同一动作只能由"事件音"、"按钮音"或"拒绝音"其中之一触发，禁止重复。

示例：
```ts
// 事件元数据（优先级最高）
event.audioKey = 'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a';
event.audioCategory = { group: 'ui', sub: 'click' };
```

## 4. 质量检查清单
- [ ] 音频文件仅存在于 `public/assets/common/audio/`
- [ ] 已执行 `compress:audio`
- [ ] 已重新生成 `registry.json`
- [ ] 已更新 `common-audio-assets.md`
- [ ] 代码中不出现 `compressed/`
- [ ] 游戏层 `audio.config.ts` 不含 `basePath/sounds`
