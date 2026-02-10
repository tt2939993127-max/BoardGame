# 音频资源使用规范

> 本文用于补齐“音频文件如何接入/压缩/注册”的完整流程，与图片资源规范保持一致。
> 新增音频的全链路流程详见：`docs/audio/add-audio.md`

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
- **注意**：生成脚本会优先使用 `compressed/` 变体；若同 key 同时存在原始与压缩版本，将自动保留压缩版本并跳过原始文件。

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

## 4. BGM 选曲与分配规范（强制）

### 4.1 核心原则
- **游戏间 BGM 零重叠**：每首 BGM 只能分配给一个游戏，禁止跨游戏共用。测试会自动检查。
- **语义匹配优先**：曲目名称/风格必须与游戏主题契合，不能为了凑数随意分配。
- **混响时间（RT）参考**：RT 值越小节奏越紧凑（适合战斗），RT 值越大越空灵舒缓（适合策略/探索）。

### 4.2 分组规则
每个游戏的 BGM 分为 `normal`（普通阶段）和 `battle`（战斗阶段）两组：
- **normal 组**：main 版本为主，可包含少量 intense 版本增加变化
- **battle 组**：intense 版本为主，也可包含 main 版本（节奏本身够快的曲目）
- 每组必须指定一个**默认曲目**（`bgmRules` 中的 `key` 字段）

### 4.3 各游戏风格定位

| 游戏 | 风格关键词 | 适合的曲目特征 | 不适合的曲目特征 |
|------|-----------|---------------|----------------|
| Summoner Wars | 军事策略、召唤魔法、棋盘战争 | 史诗/军事/魔法/吟游诗人、中等混响 | 纯休闲、过于空灵冥想、英雄冒险 |
| DiceThrone | 英雄对决、骰子战斗、快节奏 | 英雄/冒险/战斗/命运、短混响高能量 | 渔村休闲、空灵冥想、缓慢沉思 |
| SmashUp | 派对卡牌、轻松搞怪、多阵营混战 | 休闲/放克/派对/欢快 | 严肃史诗、黑暗沉重 |

### 4.4 当前分配总览（需随配置同步更新）

**SW（16 首）**：To The Wall(默认普通), Stone Chant(默认战斗), Corsair, Lonely Bard, Luminesce, Wind Chime, Elder Awakening, Feysong Fields + 各自 intense 版本

**DT（16 首）**：Stormborn Destiny(默认普通), Dragon Dance(默认战斗), Hang Them, My Kingdom, Shields and Spears, Ogres, Nock!, Fireborn + 各自 intense 版本

**SmashUp（17 首）**：Nobody Knows(默认普通), Move Your Feet(默认战斗), Tiki Party, Bubblegum, Field Day, Lizards, Sunset, Sunny Days, Big Shot + 各自 intense 版本

### 4.5 新增/调整 BGM 检查清单
1. 确认曲目语义与目标游戏风格匹配（参考 §4.3）
2. 确认不与其他游戏重复（grep 全部 `audio.config.ts` 的 BGM key）
3. 确认 registry 中存在该 key（`registry.json`）
4. 更新 `bgm` 数组、`bgmGroups`、`bgmRules`（如改默认）
5. 更新对应测试（BGM 数量断言、no-overlap 断言）
6. 更新本文档 §4.4 的分配总览

## 5. 质量检查清单
- [ ] 音频文件仅存在于 `public/assets/common/audio/`
- [ ] 已执行 `compress:audio`
- [ ] 已重新生成 `registry.json`
- [ ] 已更新 `common-audio-assets.md`
- [ ] 代码中不出现 `compressed/`
- [ ] 游戏层 `audio.config.ts` 不含 `basePath/sounds`
