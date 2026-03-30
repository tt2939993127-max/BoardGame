# Dice Throne 角色图片录入工作流

## 适用范围

适用于 Dice Throne 单个角色或新英雄的 intake 流程，覆盖：

- 真相源锁定
- 角色板 / 提示板 / 卡图裁图
- 骰面、Token、能力、卡牌静态数据录入
- i18n 与规则文档同步
- 资源 manifest 重建
- R2 上传与 CDN 回查
- Vitest / E2E / evidence 收口

本工作流面向“已有图片与规则材料，先完成正确录入”的场景，不替代复杂机制设计本身。

## 输入物

至少需要以下素材：

- `player-board` 原图
- `tip` 原图
- `ability-cards` 原图
- `dice` 原图或等价骰面来源
- 角色英文 canonical 名称来源
- 角色对照源：官方规则书、官方 PDF、Wiki 或用户指定来源

## 权威来源分工

默认口径如下：

- 汉化图 / 当前任务约定图片：中文名称、中文描述、图内顺序、裁图定位
- 官方规则书 / 官方 PDF / 官方图：高优先级英文对照源
- Wiki：辅助英文名、补充裁定、发现冲突，不反向覆盖中文主真相源
- 当前任务 worktree：本轮资源、裁图、manifest、上传结果的唯一工作现场

## 资源完成判据

Dice Throne 的资源交付不能只看 `git status`，因为图片目录常被忽略。

这套流程里“资源已完成”至少要同时满足：

- 本地 `public/assets/i18n/zh-CN/dicethrone/images/<hero>/compressed/*.webp` 存在
- `public/assets/i18n/zh-CN/dicethrone/assets-manifest.json` 已重建
- 运行时代码已接入引用
- 远端 R2 / CDN 对代表性 URL 返回 `200`

补充口径：

- `crops/...` 默认只算录入核对中间产物，不计入“正式资源已完成”。
- 如果该角色需要额外的正式手牌 atlas，完成判据应看 `compressed/hand-cards-atlas.webp` 或等价正式资源，而不是看 `crops/hand-preview/`。

## 执行步骤

### 1. 锁定 worktree 与本轮范围

先确认：

- 当前处理的是哪个 `heroId`
- 对应任务 worktree 是哪个
- 本轮只做录入，还是包含后续机制实现

禁止在根工作树或错误分支下看完素材后，直接对当前任务下结论。

### 2. 锁定主真相源与对照源

先在 `src/games/dicethrone/rule/` 下建立或更新：

- `<角色>真相源表.md`
- `<角色>录入核对.md`
- 必要时的 `<角色>卡牌录入核对.md`

至少写清：

- 主真相源路径
- 对照源链接或路径
- 获取日期
- 当前工作树
- 这轮 scope
- 是否已有冲突项

### 3. 先裁图，再录入

必须先把整图切到单对象可读粒度：

- 角色板：每个技能 / 被动 / 防御技 / 终极技
- 提示板：每个 Token / 关键词 / 骰面说明
- 卡图：逐卡或逐 slot

当前项目里 Dice Throne 已有角色专用裁图脚本时，优先复用或仿照：

- `scripts/assets/extract-dicethrone-gunslinger-crops.mjs`
- `scripts/assets/extract-dicethrone-samurai-crops.mjs`

强制补充：

- `crops/ability-cards/` 默认只是真相源裁图，不自动等于运行时素材。
- 只要某个角色的正式 `ability-cards.webp` 不能直接满足手牌展示，就必须单独设计正式运行时方案，例如新的正式手牌 atlas。
- 正式手牌 atlas 的默认要求：
  - 正式图片落到 `public/assets/i18n/zh-CN/dicethrone/images/<hero>/compressed/`
  - atlas 配置落到 `public/assets/atlas-configs/dicethrone/`，或显式声明为均匀网格
  - `previewRef` 只允许指向正式 atlas，不允许指向 `crops/` 下的核对裁图
- 真相源裁图与正式运行时 atlas 必须分开登记；前者服务核对合同，后者服务手牌 UI。
- 禁止因为“已有 slot 裁图”就直接把复合裁图、临时 hand preview 或 `crops/` 目录接到 `cards.ts` 的手牌图引用上。
- 手牌 atlas 的使用方式必须先对照旧角色的 `cards.ts`、`previewRef`、图集配置和现有手牌渲染逻辑；禁止只凭新角色原图外观判断“一格是不是两张”“角落那格是不是牌”“需不需要额外 split/topCrop”。
- 如果新角色素材看起来和旧角色不同，但旧实现与专项文档都不能唯一说明接线方式，必须先问用户；不得擅自发明新的图集语义。

### 4. 建立 Markdown 核对契约

至少维护三类文档：

- 真相源表：素材、路径、用途、状态
- 录入核对表：对象、触发条件、原文、结构化结论、对照结果
- 卡牌录入表：slot、类别、费用、名称、正文、当前状态

每个条目都必须保留：

- 原图或裁图定位
- 原始文本
- 结构化结论
- 不确定项 / 冲突项

### 5. 录入静态数据与资源索引

按角色实际情况更新：

- `src/games/dicethrone/heroes/<hero>/diceConfig.ts`
- `src/games/dicethrone/heroes/<hero>/tokens.ts`
- `src/games/dicethrone/heroes/<hero>/abilities.ts`
- `src/games/dicethrone/heroes/<hero>/cards.ts`
- `src/games/dicethrone/heroes/<hero>/index.ts`
- `src/games/dicethrone/domain/ids.ts`
- `src/games/dicethrone/domain/characters.ts`
- `src/games/dicethrone/domain/index.ts`
- `public/locales/zh-CN/game-dicethrone.json`
- `public/locales/en/game-dicethrone.json`

强制要求：

- 卡图顺序必须以 `ability-cards` 裁图和合同表为唯一来源
- 不得沿用旧角色的 slot 顺序假设
- 不得伪造未确认的 `abilityTags`、费用、数值或时机
- 如果正式 `ability-cards.webp` 不能直接支撑手牌显示，`previewRef` 必须改接正式 hand atlas，而不是引用合同裁图
- 允许“一张正式卡图对应多个运行时技能卡/可选卡”；是否采用这种复用关系，必须以旧实现或用户裁决为准，禁止凭 atlas 外观猜
- 对“上下叠放拆卡”或“源图布局与通用 atlas 不一致”的角色，合同表里必须显式写出：
  - 哪些文件是主真相源裁图
  - 哪些文件是正式运行时 atlas
  - 哪些只是生成正式 atlas 过程中的临时中间产物
  - 三者的生成规则与目录

### 6. 同步规则文档

录入影响规则、文案或资源映射时，至少同步：

- `src/games/dicethrone/rule/<角色>真相源表.md`
- `src/games/dicethrone/rule/<角色>录入核对.md`
- `src/games/dicethrone/rule/<角色>卡牌录入核对.md`（如适用）

如已进入机制实现，再补读并同步：

- `src/games/dicethrone/rule/王权骰铸规则.md`

### 7. 资源上传前的固定检查

先执行：

```bash
node scripts/assets/generate_asset_manifests.js --root public/assets/i18n/zh-CN --id dicethrone
```

再检查：

- 运行时最终 URL 是否会自动补 `i18n/<locale>/` 与 `compressed/`
- 正式 atlas / 正式单图是否已经落到 `compressed/`
- 本轮临时裁图、核对图、临时 atlas 是否留在 `temp/` / `test-results/` / 忽略目录，而不是 `public/assets/`
- `CardPreview` / `OptimizedImage` / `getOptimizedImageUrls()` 最终请求的路径是否真实存在

### 8. 上传 R2 并回查

本步骤的“是否必须上传、失败后如何汇报”按通用规则执行：

- `docs/ai-rules/data-entry.md` § 资源上传收口
- `docs/ai-rules/asset-pipeline.md` § R2 / CDN 上传收口规则（强制）

建议顺序：

```bash
npm run assets:check
npm run assets:upload
```

上传后必须至少回查这些代表性 URL：

- 主 atlas 1 个
- 正式 hand atlas 1 个（如果本轮新增）
- `crops/player-board/compressed/` 1 个
- `crops/tip/compressed/` 1 个

如果任一代表性 URL 仍是 `404`，本轮资源 intake 不算完成。

### 9. 进入机制实现前的建模门禁

如果本轮不只是录入，还要补技能或 Token 机制实现，必须再读：

- `docs/ai-rules/engine-systems.md`

并先完成：

- 术语到事件的映射
- 决策点识别
- 冲突项裁定

禁止跳过建模，直接凭图片正文硬写 handler。

### 10. 验证

至少按改动面选择验证：

- 静态数据 / 机制实现：相关 Vitest
- 资源引用 / 预加载：相关资源或 resolver 测试
- UI 卡图展示 / 手牌预览：相关 E2E 与截图证据

如果这轮改动触及 UI 展示，必须人工看图，不得只看断言通过。

## 推荐交付物

- `src/games/dicethrone/rule/<角色>真相源表.md`
- `src/games/dicethrone/rule/<角色>录入核对.md`
- `src/games/dicethrone/rule/<角色>卡牌录入核对.md`
- `evidence/<task>-e2e-test.md`

## 当前可参考的现成样本

- `src/games/dicethrone/rule/枪手真相源表.md`
- `src/games/dicethrone/rule/枪手录入核对.md`
- `src/games/dicethrone/rule/枪手卡牌录入核对.md`
- `src/games/dicethrone/rule/武士真相源表.md`

这些文件适合作为 Dice Throne 角色 intake 的现成模板，不需要每次从零发明格式。
