# 新增音频资产全链路流程

> 本文覆盖“新增音频 → 压缩 → 生成 registry → 中文友好名 → 生成清单 → 预览验证 → 代码接入”的完整流程。
> **适用范围**：所有音效/音乐统一放在 `public/assets/common/audio/`。

---

## 0. 前置准备（必读）

1. **安装 ffmpeg**（用于压缩）：命令行需能直接执行 `ffmpeg`。
2. **只使用公共目录**：禁止在 `src/games/<gameId>/` 下放音频。
3. **只放“原始素材”**：源文件保留在原路径，压缩产物会写入同级 `compressed/` 目录。

---

## 1. 素材整理与目录结构

### 1.1 目录结构约定

```
public/assets/common/audio/
├── bgm/                         # 背景音乐（BGM）
│   └── <合集/曲目>.wav
├── ui/                          # UI 类音效（示例）
│   └── <子分类>/<文件>.wav
├── card/                        # 卡牌类音效（示例）
│   └── <子分类>/<文件>.wav
└── ...                          # 其他类别（自定义）
```

- **BGM 必须在 `bgm/` 根目录下**，其余均视为音效（sfx）。
- **目录层级即语义**：后续会被转换成 `registry key`，请保持可读、稳定、语义清晰。

### 1.2 命名规则（强制）

- **推荐**：全英文 + 数字 + 下划线（如 `menu_click_01.wav`）
- **避免**：空格、中文、特殊符号（虽然会被归一化，但可读性变差）
- **变体命名**：同类音效用 `_01/_02/_03` 扩展，便于后续替换

### 1.3 registry key 的生成规则（非常重要）

生成脚本：`scripts/audio/generate_common_audio_registry.js`

**核心规则**：路径 → key
- 去除扩展名
- 全部小写
- 非字母数字字符转为 `_`
- 多段目录用 `.` 拼接
- `bgm/` 目录统一归类为 `bgm` 组
- 其他目录以**第一级目录**作为 `group`
- `cards` 会自动归一为 `card`

**示例**：
```
public/assets/common/audio/ui/general/Menu Click.wav
=> key: ui.general.menu_click

public/assets/common/audio/bgm/Fantasy Vol7.flac
=> key: bgm.fantasy_vol7
```

> **注意**：只要 key 冲突就会报错，除非“压缩版本/原始版本”的冲突会自动优先保留压缩版。

---

## 2. 压缩与格式转换（强制）

使用脚本：`scripts/audio/compress_audio.js`

```bash
# 压缩整个目录（会在每个目录生成 compressed/）
npm run compress:audio -- public/assets/common/audio

# 清理旧压缩后再压缩（等价于 AUDIO_CLEAN=1）
AUDIO_CLEAN=1 npm run compress:audio -- public/assets/common/audio

# 调整 ogg 码率（默认 96k）
AUDIO_OGG_BITRATE=96k npm run compress:audio -- public/assets/common/audio

# 指定 ffmpeg 路径（支持相对路径或完整路径）
FFMPEG_PATH=tools/ffmpeg/bin/ffmpeg.exe npm run compress:audio -- public/assets/common/audio
```

**脚本行为说明**：
- 输入格式支持：`.wav/.aiff/.aif/.flac/.m4a`
- 输出格式：`compressed/*.ogg`（编码器：`libopus`）
- 仅跳过 `compressed/` 目录，其他目录会递归扫描

> **强制要求**：无论新增多少文件，都必须运行压缩脚本。

---

## 3. 生成 registry.json（强制）

使用脚本：`scripts/audio/generate_common_audio_registry.js`

```bash
node scripts/audio/generate_common_audio_registry.js
```

可选参数：
```bash
node scripts/audio/generate_common_audio_registry.js \
  --source public/assets/common/audio \
  --output public/assets/common/audio/registry.json
```

**生成规则**：
- 同一个 key 出现“原始 + compressed”时，**自动保留压缩版**
- 若出现两个同级冲突（如两个不同原始文件生成同 key），会直接报错

产出：`public/assets/common/audio/registry.json`

### 3.1 同步前端全量 registry（强制）

运行时和 `/dev/audio` 读取的是 `src/assets/audio/` 下的打包 JSON，不会直接去读 `public/assets/common/audio/registry.json`。

因此生成全量表后，必须同步到：

```bash
Copy-Item public/assets/common/audio/registry.json src/assets/audio/registry.json -Force
```

> 若只更新了 `public` 下的全量 registry，没有同步到 `src/assets/audio/registry.json`，`/dev/audio` 和前端构建产物都会继续使用旧表。

### 3.2 生成运行时 slim registry（强制）

使用脚本：`scripts/audio/generate-slim-registry.mjs`

```bash
node scripts/audio/generate-slim-registry.mjs
```

- 产出：`src/assets/audio/registry-slim.json`
- 规则：扫描 `src/**/*.ts(x)` 中实际引用的音频 key，再从全量 registry 中筛出运行时需要的条目
- 何时必须执行：只要这次改动新增了代码中的音频 key 引用，就必须重新生成

### 3.3 校验 slim registry（推荐）

```bash
node scripts/audio/verify-slim-registry.mjs
```

用于确认：
- 代码里引用的 key 都在 slim registry 中
- slim registry 中的条目都来自全量 registry

---

## 4. 更新中文友好名（强制）

### 4.1 翻译文件位置

`public/assets/common/audio/phrase-mappings.zh-CN.json`

结构示例：
```json
{
  "version": 8,
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "phrases": {
    "Fantasy Vol7": "幻想·第七章",
    "Menu Click": "菜单点击"
  }
}
```

> **注意**：这里的 key 是“英文短语”而非完整 registry key，系统会把 key 中的“词干”映射为中文并保留尾部变体（如 `_01`）。

### 4.2 合并翻译（推荐流程）

1. 新建翻译批次文件（示例）：
```json
{
  "translations": {
    "Menu Click": "菜单点击",
    "Fantasy Vol7": "幻想·第七章"
  }
}
```

2. 合并到主文件：
```bash
node scripts/audio/merge_audio_translations.js .tmp/translation_batch_xxx.json
```

**脚本行为**：
- 自动更新 `version` 与 `generatedAt`
- 支持 `translations` 或 `phrases` 字段

### 4.3 校验翻译覆盖

- 打开 `/dev/audio`，若展示名称仍为英文，说明翻译缺失
- 必要时补齐 `phrases` 后重新刷新

---

## 5. 生成音频资源清单（强制）

生成 markdown 清单：
```bash
node scripts/audio/generate_audio_assets_md.js
```

产出：`docs/audio/common-audio-assets.md`

> 清单用于人工检索与审核，必须与 registry 同步更新。

---

## 6. 语义目录（推荐）

生成语义目录（AI/人工检索首选）：
```bash
node scripts/audio/generate_audio_catalog.js
```

产出：`docs/audio/audio-catalog.md`

---

## 7. 浏览器验证（强制）

入口：`/dev/audio`

验证点：
- 新增音效是否出现
- 分类/子分类是否正确
- 中文友好名是否命中
- 点击播放是否正常

> 若缺失，优先检查：是否压缩、是否生成 registry、是否补翻译。

### 7.1 远端资源验证（生产/R2 必做）

如果当前环境音频二进制资源走 `VITE_ASSETS_BASE_URL` 指向的对象存储/CDN（默认官方资源域名）：

- 必须确认新增音频对应的 `compressed/*.ogg` 已上传到 R2/CDN
- 必须确认上传路径与 registry 中记录的相对路径一致
- 必须确认不是只有本地 `public/assets/common/audio/.../compressed/` 存在，而远端桶里缺文件

> 运行时会自动把 registry 中的相对路径改写为 `compressed/` 版本 URL。  
> 所以“key 已进 registry”只说明注册成功，不代表远端实际可播。

---

## 8. 代码接入（强制）

**原则**：只使用 registry 中的 key，禁止手写路径与 `compressed/`。

示例：
```ts
// feedbackResolver 直接返回 registry key（SoundKey 类型）
feedbackResolver: (event): SoundKey | null => {
  if (event.type === 'DICE_ROLLED') return 'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_002';
  // 有动画的事件返回 null，音效由动画层 onImpact 播放
  if (event.type === 'DAMAGE_DEALT') return null;
  return null;
}

// 飞行动画 onImpact 回调中直接播放
playSound('combat.impact.hit_heavy_001');
```

> `getOptimizedAudioUrl()` 会自动优先使用压缩音频路径，无需自行处理。
> **已废弃**：`DeferredSoundMap`、`AudioTiming`、`EventSoundResult` 已移除，`feedbackResolver` 不再返回 `{ key, timing }` 对象。

### 8.1 语义优先级（强制）
- **强机制语义优先**：埋藏、翻开隐藏牌、封印、解除封印、召回、传送、变形、吞噬、献祭、召唤、秘密区检视等事件，必须优先选择表达机制语义的音效。
- **纯卡牌 handling 仅用于通用移牌**：抽牌、弃牌、洗切、公开区域中的普通转移、置顶/置底等没有更强机制语义的动作，才使用 `card.handling.*` / `card.fx.*`。
- **复合事件按主语义选音**：当事件同时包含“特殊机制 + 卡牌位移”时，优先映射玩家首先感知到的机制语义，而不是位移结果。
- **明确禁止**：不能因为对象是“卡牌”，就把隐藏区放置、翻开隐藏牌、解封、出土、秘密显现等事件默认映射成 `cards_scrolling_001`、`card_take_001` 之类的抽象卡牌音。

### 8.2 预加载策略（新增）
- **criticalSounds**：进入游戏后立即预加载（适合首回合高频音效）。
- **contextualPreloadKeys**：基于上下文增量预热（如选派系/卡组后加载对应音效）。
- **UI 层预热**：按钮/教程步骤等可在显示前手动调用 `AudioManager.preloadKeys()`。

示例：
```ts
// 游戏配置：上下文预加载
contextualPreloadKeys: (context) => {
  return context.G?.selectedFactions ? ['ui.general.menu_click_01'] : [];
}

// UI 层：进入教程后预热按钮音效
AudioManager.preloadKeys(['ui.general.menu_click_01']);
```

---

## 9. 全链路检查清单（提交前必过）

- [ ] 原始音频已放入 `public/assets/common/audio/`
- [ ] 已运行 `npm run compress:audio -- public/assets/common/audio`
- [ ] 已生成 `public/assets/common/audio/registry.json`
- [ ] 已同步 `src/assets/audio/registry.json`
- [ ] 已生成 `src/assets/audio/registry-slim.json`
- [ ] 已更新 `phrase-mappings.zh-CN.json`
- [ ] 已生成 `docs/audio/common-audio-assets.md`
- [ ] 已生成 `docs/audio/audio-catalog.md`
- [ ] `/dev/audio` 可预览且显示中文
- [ ] 若生产走 R2/CDN，已确认远端 `compressed/` 音频已上传
- [ ] 代码中不出现 `compressed/`
- [ ] 隐藏区/封印/翻开/召回等强语义事件没有被偷换成抽象卡牌 handling 音

---

## 10. 常见问题

### 10.1 出现重复 key 报错
- 检查目录/文件名是否会归一为同一个 key
- 保证同一个 key 只对应一条“语义明确”的音效

### 10.2 registry 没更新
- 是否忘记执行 `generate_common_audio_registry.js`
- 是否指向了错误的 `--source` 路径
- 是否忘记把 `public/assets/common/audio/registry.json` 同步到 `src/assets/audio/registry.json`
- 是否忘记重新生成 `src/assets/audio/registry-slim.json`

### 10.3 中文名不生效
- 是否遗漏 `phrase-mappings.zh-CN.json`
- 是否没有刷新 `/dev/audio`
- 是否在翻译中使用了错误的“英文词干”

### 10.4 `/dev/audio` 能看到，但游戏里没声音
- 先确认代码运行时引用的 key 是否已进入 `src/assets/audio/registry-slim.json`
- 再确认远端 R2/CDN 是否已有对应 `compressed/*.ogg`
- 最后再看浏览器网络请求是否命中了错误的 `VITE_ASSETS_BASE_URL`
