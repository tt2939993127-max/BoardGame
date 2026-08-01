# 法师战争数据与配置录入按 GameConfigPackage 新规范复查

> 状态：`post-main-merge-recheck / config-included-in-data-recheck / config-package-deferred / no-runtime-migration-this-round`。本文件记录 2026-07-31 合入 main 后，按 `docs/ai-rules/game-config-package.md` 与 `.codex/skill/create-new-game/references/mechanics-data-design.md` 对法师战争现有数据与配置录入做的复查。本次只补裁定与缺口，不重录图片、不迁移运行时数据源。

## 复查真相源

| 来源 | 本轮结论 |
| --- | --- |
| `docs/ai-rules/game-config-package.md` | 配置包是数据驱动录入的正式真相层之一；新游戏静态事实默认使用 `GameConfigPackage`；若暂不使用，OpenSpec proposal 或 design 必须写明跳过原因、影响范围和后续补齐项。 |
| `.codex/skill/create-new-game/references/mechanics-data-design.md` | 数据录入必须覆盖规则判定、状态区分、UI 渲染、引用关系、数量分布、运行配置和能力边界；特殊效果只应由配置声明 `abilityId + params`，代码能力负责执行。 |
| `openspec/changes/add-mage-wars-foundation/design.md` | 已新增 `GameConfigPackage 裁定（2026-07-31 合 main 后复查）`，明确配置属于数据驱动录入复查范围，但本 change 暂不迁移配置包。 |
| `docs/games/mage-wars/rule/apprentice-card-field-contract.md` | 91 张学徒法术牌 S0 字段合同已完成，覆盖费用、类型、学派、等级、射程、目标、攻击条、正文、底部编号和锁定状态。 |
| `docs/games/mage-wars/rule/apprentice-card-atlas-contract.md` | 91 张学徒法术牌正式 atlas/frame 已锁定并接入运行时；临时完整单卡裁图只作为核对证据。 |
| `src/games/mage-wars/domain/data/apprenticeSpellbooks.ts` | 当前运行时静态事实仍是 TypeScript 数据：四名学徒法师初始属性、法术书数量、卡牌 CardID / deck ID 和候选裁定。 |
| `public/assets/atlas-configs/mage-wars/*.json` + `src/games/mage-wars/ui/cardAtlas.ts` | 当前素材配置面是 JSON atlas config + runtime 注册器：10 个学徒法术 atlas、91 个法术 frame、法师牌 / 头像 frame。 |
| `src/games/mage-wars/manifest.ts` + generated manifest / orientation map | 当前运行配置面包含玩家数、移动端能力、方向、资源包和实施中状态；这些配置仍未进入 `GameConfigPackage`。 |

## 新规范逐项复查

| 新规范项 | 当前证据 | 裁决 |
| --- | --- | --- |
| 配置是否纳入数据录入复查 | 新规范已明确配置包是数据驱动录入的正式真相层之一；本文件已补配置面复查 | 已补口径 |
| 是否说明使用 `GameConfigPackage` | 合 main 前未命中 `GameConfigPackage`；已在 OpenSpec design 补裁定 | 已补裁定 |
| 严格 JSON 官方真相源 | 当前无 `GameConfigPackage` 严格 JSON；静态事实在 TypeScript、规则合同和 atlas config 中 | deferred |
| schema 范围和表格审查范围 | 当前没有配置包 schema 或表格物化范围 | deferred |
| 暂不使用时的原因、影响范围、后续任务 | 已在 OpenSpec design 写明：不在本轮迁移，影响是缺少 JSON/schema/表格/字段级修正，后续建独立配置包 change | 已补 |
| `abilityId + params` 边界 | 当前代表性能力仍在游戏层代码和事件/FX 映射中，未形成逐卡配置能力绑定 | deferred；后续配置包必须把未实现能力标 `requires-code-support` |
| 玩家字段级修正提案 | 当前未开放配置审查表和修正入口 | deferred；后续走结构化反馈提案 |
| 法师战争真实牌区命名 | 运行时字段使用 `spellbookCount`、`preparedSpellSlots`、`preparedSpellCardIds`；OpenSpec design 已把旧“手牌/法术书”改为法术书、已计划法术、弃牌堆 | 已补当前正式口径 |

## 配置面复查

| 配置面 | 当前真相源 | 当前裁决 |
| --- | --- | --- |
| 法师与法术书配置 | `src/games/mage-wars/domain/data/apprenticeSpellbooks.ts` | 已登记四名学徒法师初始属性、102 个法术书唯一条目、按数量展开 123 张牌；仍是 TypeScript 临时真相源 |
| 稳定 ID 与区域配置 | `src/games/mage-wars/domain/ids.ts` | 已登记四名学徒法师 ID 与 6 个学徒竞技场区域 ID；区域拓扑、墙体和完整地图仍待配置包化 |
| 法术 atlas / frame 配置 | `public/assets/atlas-configs/mage-wars/apprentice-spell-atlases.json` | 已登记 10 个法术 atlas 和 91 个法术 frame，并由 `src/games/mage-wars/ui/cardAtlas.ts` 注册消费；这是 JSON 配置面，但还不是统一配置包 schema |
| 法师牌 / 头像 atlas 配置 | `public/assets/atlas-configs/mage-wars/mages-core-atlas.json` | 已登记法师牌和头像 frame，并由 `cardAtlas.ts` 消费；仍未进入 `GameConfigPackage` |
| 游戏运行 manifest | `src/games/mage-wars/manifest.ts`、`src/games/manifest*.generated.ts*`、`android/app/src/main/assets/game-orientation-map.json` | 已登记玩家数、分类、实施中状态、移动端方向、资源包等运行配置；仍是 manifest 配置面，不是配置包官方真相源 |
| 文案配置 | `public/locales/zh-CN/game-mage-wars.json`、`public/locales/en/game-mage-wars.json` | 已有游戏文案配置；不替代规则字段或配置包字段 |
| 能力 / FX 绑定 | `src/games/mage-wars/ui/eventFxMapper.ts`、`src/games/mage-wars/ui/fxCues.ts`、`src/games/mage-wars/domain/events.ts` | 已有代表性事件到特效的运行时映射；逐卡能力仍未形成 `abilityId + params` 配置 |
| token / 骰子 / 墙体 / 完整区域 | 当前无统一配置包条目 | deferred；后续配置包 change 必须补齐或明确基础版范围外 |

## 录入结论

- 当前 91 张学徒法术牌的字段录入、正式 atlas/frame 接线和已存在运行配置面，仍可作为 foundation 的 S0 数据与配置录入证据。
- 当前缺口不是“只差文档措辞”，而是新规范要求的新游戏静态事实默认配置包化；法师战争 foundation 因合 main 后才出现该规范，本轮只补裁定、配置面复查和后续任务，不把运行时迁移混入合并。
- 因配置也属于数据驱动录入，本 change 不能宣称“数据驱动录入完整闭合”；准确状态是“字段 / 素材 / 当前运行配置可追溯，`GameConfigPackage` 官方真相源、schema、表格审查和字段级修正入口 deferred”。
- 本轮后续若继续推进数据源，应先建独立 `GameConfigPackage` change，再迁移法师、学徒法术书、学徒法术牌、atlas 引用、token、骰子和区域配置；迁移前不得让玩家审查表和运行时 TypeScript 数据各自维护一份事实。
