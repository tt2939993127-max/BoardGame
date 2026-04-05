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

- 卡牌 atlas 配置：`src/assets/atlas-configs/dicethrone/ability-cards-common.atlas.json`
- 当前实现是“所有英雄共享同一份能力卡 atlas 网格配置，不同英雄只换图片”。
- 如果未来新英雄的能力卡版式真的和现有模板不同，先拿真相源和旧英雄逐格对照，再决定是更新公共配置还是引入新配置；禁止没证据就新建一份 per-hero atlas json。

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

### 4.1 复合展示位允许一图多卡

Dice Throne 允许运行时出现“一张正式卡图对应多个运行时对象”的情况。

当前已确认的枪手复合位：

- `slot-22`: `upgrade-fan-the-hammer-2` / `card-pistol-whip`
- `slot-23`: `upgrade-take-cover-2` / `card-mark-the-target`
- `slot-24`: `upgrade-deadeye-2` / `card-the-law`

处理规则：

- `cards.ts` 里两张卡可以共用同一个 `previewRef.index`
- 可以为人工核对额外导出单卡裁图
- 这些单卡裁图不能进入正式运行时资源合同
- 不能因为看到复合排版，就把它强拆成单独 runtime atlas

### 4.2 调试 / 作弊入口不能把 atlasIndex 当唯一 ID

- 共享 atlas 位不等于共享卡对象。
- 调试发牌、索引速查、测试注入这类入口，如果只传 `atlasIndex`，会把复合位发错牌。
- 当前实现已经修正为：
  - 共享索引命中多张牌时，`dealCardByAtlasIndex` 拒绝模糊发牌
  - 调试面板改为按精确 `deckIndex` 发牌

后续如果再做调试工具，继续沿用这个约束，不要回退。

## 5. 运行时加载链路

### 5.1 卡牌 atlas 注册

- 文件：`src/games/dicethrone/ui/cardAtlas.ts`
- 当前是模块加载时同步注册，不再走 `Board.tsx` 内的异步 `loadAtlas()`。
- 注册逻辑：
  - 遍历 `DICETHRONE_CARD_ATLAS_IDS`
  - 用 `ASSETS.CARDS_ATLAS(charId)` 作为图片路径
  - 统一绑定 `ability-cards-common.atlas.json`

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
- 如遇复合位：
  - 先确认这是不是“同一正式图服务多张运行时卡”
  - 写进对应英雄的 `rule/*卡牌录入核对.md`
  - 补审计文档，不要只在代码里默许

## 7. 审计与验证

### 7.1 必审项

- `previewRef` 是否都指向 `atlas`
- 通用卡是否走统一注入，而不是手写散落
- 新英雄是否错误复用了别的英雄通用牌索引
- 是否残留 `hand-cards-atlas`、单卡运行时裁图或过期路径
- 若存在复合位，调试/测试入口是否仍可精确区分到具体卡

### 7.2 建议验证命令

```powershell
npx vitest run --config vitest.config.audit.ts --configLoader native src/games/dicethrone/__tests__/card-cross-audit.test.ts
npx vitest run src/games/dicethrone/__tests__/criticalImageResolver.test.ts
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native --maxWorkers 1 -t "作弊发牌共享 atlas 索引保护"
```

如果本轮只改了某个英雄，也至少要补一条该英雄自己的索引/预览回归，不要只靠肉眼扫图。

## 8. 禁止事项

- 禁止把 `hand-cards-atlas` 当成回退方案重新接回来
- 禁止把人工核对裁图直接当运行时素材
- 禁止按代码顺序猜 atlas 索引
- 禁止给通用卡逐张手写 `previewRef`
- 禁止在新 UI 里只按 `cardId` 反查通用卡预览，却不传 `characterId`
- 禁止把共享 atlas 位当成“唯一卡 ID”

## 9. 文档落点要求

- 英雄专项卡图/索引核对：写到 `src/games/dicethrone/rule/<英雄>卡牌录入核对.md`
- 真相源与裁图来源：写到 `src/games/dicethrone/rule/<英雄>真相源表.md`
- 对外宣称“审计完成”时，必须在 `evidence/` 下留审计文档
- 如果后续发现旧审计漏了复合位、调试入口或预加载链路，必须回写原审计文档，不能保留旧结论继续充当收口证据

---

最后更新：`2026-04-05`
