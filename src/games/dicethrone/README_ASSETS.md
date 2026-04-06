# Dice Throne 素材使用规范

本文档只描述 `dicethrone` 当前真实生效的素材链路，用于新增英雄、重录卡图、审计 atlas 索引和排查预览问题。

## 1. 当前结论

- Dice Throne 手牌预览统一走 `previewRef.type = 'atlas'`。
- 基础技能不再渲染 `base-ability-cards`；玩家面板 `player-board` 自带基础技能图，覆盖层只负责点击区域和升级卡叠加。
- 运行时不再使用 `hand-cards-atlas`。
- 枪手 / 武士这类新派系也要回到和老派系一致的 atlas 契约，不能私自新开一套单卡运行时资源。

## 2. 单一真实来源

### 2.1 图片资源

- 角色资源目录：`public/assets/i18n/zh-CN/dicethrone/images/<hero>/`
- 通用资源目录：`public/assets/i18n/zh-CN/dicethrone/images/Common/`
- 常见文件：
  - `ability-cards.webp|png`
  - `player-board.webp|png`
  - `tip.webp|png`
  - `dice.webp|png`
  - `status-icons-atlas.webp|png`

### 2.2 图集配置

- 默认卡牌 atlas 配置：`src/assets/atlas-configs/dicethrone/ability-cards-common.atlas.json`
- 当前例外配置：`src/assets/atlas-configs/dicethrone/ability-cards-gunslinger.atlas.json`
- 当前实现不是“所有英雄永远共享同一份配置”，而是：
  - 大多数老派系与武士继续复用公共网格配置
  - 枪手因 `slot-22 / 23 / 24` 原图是复合展示位，改为使用逐 frame 精确配置
- 裁决规则：
  - 默认优先复用公共 atlas 配置
  - 只有在真相源明确证明公共网格无法正确表达正式运行时卡面时，才允许引入 per-hero atlas json
  - 引入后也仍然属于 atlas 合同，不得回退成单卡 `image` 运行时方案

### 2.3 路径帮助函数

- `src/games/dicethrone/ui/assets.ts`
- 运行时图片路径统一从 `ASSETS` 取：
  - `ASSETS.CARDS_ATLAS(charId)`
  - `ASSETS.PLAYER_BOARD(charId)`
  - `ASSETS.TIP_BOARD(charId)`
  - `ASSETS.DICE_SPRITE(charId)`
  - `ASSETS.EFFECT_ICONS(charId)`
- 当前仍保留一个历史例外：`barbarian` 资源路径会追加 `.png`。改动前先确认是否真的要消除此兼容分支。

## 3. 老派系真实做法

### 3.1 专属卡

- 老派系 `monk / barbarian / pyromancer / shadow_thief / moon_elf / paladin` 的专属卡，都是直接在各自 `heroes/<hero>/cards.ts` 里写死 `previewRef: { type: 'atlas', atlasId, index }`。
- 这条规则同样适用于枪手和武士的专属卡。
- 不能靠“代码里的卡顺序”推断 atlas 顺序，必须逐格看图确认。

### 3.2 通用卡

- 通用卡定义集中在 `src/games/dicethrone/domain/commonCards.ts` 的 `COMMON_CARDS`。
- 各英雄不能手写 18 张通用卡的 `previewRef`，必须统一走 `injectCommonCardPreviewRefs(...)` 注入。

当前通用卡 atlas 映射分两类：

- 老派系默认映射：`DEFAULT_COMMON_ATLAS_INDEX`
  - 适用于 `barbarian / monk / pyromancer / shadow_thief / moon_elf / paladin`
- 新派系反向映射：`GUNSLINGER_COMMON_ATLAS_INDEX`、`SAMURAI_COMMON_ATLAS_INDEX`
  - 枪手和武士的通用牌区顺序与老派系不同，经逐格看图确认后需要单独映射

### 3.3 预览查询

- `src/games/dicethrone/ui/cardPreviewHelper.ts` 会遍历每个英雄的 `getStartingDeck()` 建立预览映射。
- 通用卡在不同英雄图集里的索引可能不同，所以只知道 `cardId` 不够，优先传 `characterId` 给 `getDiceThroneCardPreviewRef(cardId, characterId)`。
- 任何新 UI 如果直接按 `cardId` 反查预览，都要先确认是否会误用到别的英雄的通用卡索引。

## 4. 枪手 / 武士新增规则

### 4.1 先区分三层对象，再谈索引

Dice Throne 新英雄录入时，至少要区分下面三层，禁止混写：

- `物理卡 / 手牌卡`：玩家真正抽到、打出、弃掉的卡对象；`card.id` 与 `previewRef` 都服务这一层。
- `技能槽 / 基础技能`：玩家面板上的基础能力槽位；升级卡的 `targetAbilityId` 只允许指向这一层的基础技能 ID。
- `技能变体 / 技能子集`：同一基础技能下的 `variants`、分支触发、阈值档位；它们属于能力执行合同，不会生成新的手牌卡图索引。

强制约束：

- 一张升级卡可以替换一个基础技能定义，并且该技能定义内部可以包含多个 `variants`。
- 但这不代表“一张升级卡存在多个手牌对象”或“一个技能变体要占一个新 card index”。
- `targetAbilityId` 必须始终是基础技能 ID；`newAbilityDef.id` 也必须与该基础技能 ID 一致。

老派系基线，必须按这个口径对新角色逐张比：

- `monk/card-thrust-punch-2`、`barbarian/upgrade-slap-3`：升级后虽然内部按档位拆 `variants`，但升级目标仍是基础技能。
- `paladin/upgrade-righteous-combat-2/3`：II / III 两张升级卡都指向同一个基础技能 ID。
- `paladin/upgrade-holy-defense-2`、`paladin/upgrade-tithes-2`：防御/偏被动技能升级也不例外，仍只替换基础技能。

### 4.2 武士：标准 full-card atlas

- 武士的 `ability-cards.webp` 继续沿用标准 full-card atlas 语义。
- `slot-18 ~ slot-31` 一张正式卡对应一个运行时 `previewRef.index`。
- `slot-00 ~ slot-17` 是反向排列的通用卡区，不得回退到老角色默认顺序。

### 4.3 枪手：原图 slot 与运行时 frame 不是同一概念

- 枪手的 `ability-cards.webp` 里，`slot-22 / slot-23 / slot-24` 是原图上的复合展示区。
- 这些原图 slot 不能再被解释成“一个 runtime index 对两张牌”。
- 正式运行时合同应写成：
  - 原图 slot：真相源定位与人工核对单位
  - atlas frame：运行时预览单位
- 因此枪手运行时改为使用独立 atlas frame 配置：
  - `upgrade-fan-the-hammer-2` → `index 22`
  - `card-pistol-whip` → `index 23`
  - `upgrade-take-cover-2` → `index 24`
  - `card-mark-the-target` → `index 25`
  - `upgrade-deadeye-2` → `index 26`
  - `card-the-law` → `index 27`
- 其余枪手专属卡顺延到 `index 34`，不再存在共享 runtime index。

### 4.4 调试 / 作弊入口仍不能把原图 slot 当成唯一事实

- 调试发牌、索引速查、测试注入只认运行时 `previewRef.index`。
- 不要再拿原图 `slot-22 / 23 / 24` 这种人工核对定位去推断 card identity。
- 只要 atlas 合同正确，`dealCardByAtlasIndex` 就必须能精确发出唯一卡牌；不需要再保留“共享索引命中多张时拒绝发牌”的特殊口径。

## 5. 运行时加载链路

### 5.1 卡牌 atlas 注册

- 文件：`src/games/dicethrone/ui/cardAtlas.ts`
- 当前是模块加载时同步注册，不再走 `Board.tsx` 内的异步 `loadAtlas()`。
- 注册逻辑：
  - 遍历 `DICETHRONE_CARD_ATLAS_IDS`
  - 用 `ASSETS.CARDS_ATLAS(charId)` 作为图片路径
  - 大多数英雄绑定 `ability-cards-common.atlas.json`
  - `gunslinger` 绑定 `ability-cards-gunslinger.atlas.json`

### 5.2 状态图标 atlas

- 每个英雄在 `src/games/dicethrone/domain/characters.ts` 里声明：
  - `statusAtlasId`
  - `statusAtlasPath`
- `statusAtlasPath` 必须是 JSON 路径，不是图片路径。

### 5.3 关键图片预加载

- Dice Throne 的关键图预加载走 `criticalImageResolver`。
- 回归要求：
  - 不能重新把 `hand-cards-atlas` 放回 `critical` 或 `warm`
  - 新英雄接入后，`player-board / tip / ability-cards / dice / status-icons-atlas` 这些真正运行时会看到的素材要进入正确的预加载集合

## 6. 新增英雄 / 重录素材的标准步骤

### 6.1 素材准备

- 准备角色目录下的 `ability-cards / player-board / tip / dice / status-icons-atlas`
- 先确认图片进入 `public/assets/i18n/zh-CN/dicethrone/images/<hero>/`
- 如有原图，按项目统一规范压缩到 `compressed/`

### 6.2 代码接线

1. 在 `domain/ids.ts` 注册：
   - `DICETHRONE_CARD_ATLAS_IDS.<HERO>`
   - `DICETHRONE_STATUS_ATLAS_IDS.<HERO>`
2. 在 `domain/characters.ts` 注册：
   - `getStartingDeck`
   - `statusAtlasId`
   - `statusAtlasPath`
3. 在 `heroes/<hero>/cards.ts`：
   - 专属卡逐张写 `previewRef`
   - 通用卡统一 `...injectCommonCardPreviewRefs(COMMON_CARDS, atlasId, indexMap?)`
4. 如涉及升级叠加显示或槽位高亮，更新对应的 UI 槽位映射文件，而不是在卡牌数据里偷塞布局状态

### 6.3 索引核对

- 先按整图逐格编号
- 再把 `cards.ts` 的 `previewRef.index` 与逐格图一一对应
- 如遇复合排版：
  - 先区分“原图 slot”与“运行时 frame”
  - 判断是否需要精确 frame 配置，而不是默认让多张卡共享一个 `previewRef.index`
  - 把结论写进对应英雄的 `rule/*卡牌录入核对.md`
  - 补审计文档，不要只在代码里默许

## 7. 审计与验证

### 7.1 必审项

- `previewRef` 是否都指向 `atlas`
- 通用卡是否走统一注入，而不是手写散落
- 新英雄是否错误复用了别的英雄通用牌索引
- 是否残留 `hand-cards-atlas`、单卡运行时裁图或过期路径
- 若存在复合排版，是否已经拆成精确 runtime frame，而不是继续共享索引

### 7.2 建议验证命令

```powershell
npx vitest run --config vitest.config.audit.ts --configLoader native src/games/dicethrone/__tests__/card-cross-audit.test.ts
npx vitest run src/games/dicethrone/__tests__/criticalImageResolver.test.ts
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native --maxWorkers 1 -t "作弊发牌按枪手精确 atlas 索引发牌"
```

如果本轮只改了某个英雄，也至少要补一条该英雄自己的索引/预览回归，不要只靠肉眼扫图。

## 8. 禁止事项

- 禁止把 `hand-cards-atlas` 当成回退方案重新接回来
- 禁止把人工核对裁图直接当运行时素材
- 禁止按代码顺序猜 atlas 索引
- 禁止给通用卡逐张手写 `previewRef`
- 禁止在新 UI 里只按 `cardId` 反查通用卡预览，却不传 `characterId`
- 禁止把原图 slot、技能子集或技能变体误当成手牌卡图索引

## 9. 文档落点要求

- 英雄专项卡图/索引核对：写到 `src/games/dicethrone/rule/<英雄>卡牌录入核对.md`
- 真相源与裁图来源：写到 `src/games/dicethrone/rule/<英雄>真相源表.md`
- 对外宣称“审计完成”时，必须在 `evidence/` 下留审计文档
- 如果后续发现旧审计漏了复合位、调试入口或预加载链路，必须回写原审计文档，不能保留旧结论继续充当收口证据

---

最后更新：`2026-04-05`
