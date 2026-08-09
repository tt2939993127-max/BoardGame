## Context
法师战争 foundation 已经能运行，但当前静态事实有多处 owner：法师与法术书在 TypeScript，法术字段在 Markdown 合同，法术 / 法师素材在 atlas JSON，运行配置在 manifest，FX 在 UI 映射里。下一阶段若直接继续写玩法，会让规则字段、素材引用和玩家修正入口继续分叉。

## Goals
- 建立法师战争游戏级 `GameConfigPackage`，第一批只使用严格 JSON。
- 让配置包覆盖基础学徒版继续扩展所需的静态事实：法师、法术书、91 张学徒牌、区域、骰子、token、素材引用和能力绑定。
- 让配置包能被 `src/game-config` 现有 loader 校验并物化为审查表。
- 在迁移期继续保持现有 foundation runtime 可用，先做并行校验，再替换运行时读取。

## Non-Goals
- 不在本 change 中迁移全 322 张法术。
- 不在本 change 中实现自由构筑、四人模式、豪华竞技场或扩展法师。
- 不把特殊效果写进 JSON 可执行代码。
- 不新增 Mage Wars 专属配置审查系统；表格视图必须来自共享 `GameConfigPackage` materializer。

## Decisions

### Decision: 先落游戏级严格 JSON，再逐步替换 TypeScript
第一批文件落在 `src/games/mage-wars/data/mage-wars.config.json`。它是官方仓库真相源，必须能被共享 `loadGameConfigPackageFromText` 解析、校验和物化。当前 `domain/data/apprenticeSpellbooks.ts` 在迁移期作为对照源保留，测试必须证明两边法师与法术书数量一致。

### Decision: 卡牌字段先按通用对象模型承载
每张学徒法术牌作为 `objects[]` 中的 `card` 或等价对象，通用字段保存名称、费用、规则文本、素材引用；游戏特有字段放在 `data` 内，例如 `cardId`、`spellType`、`spellActionSpeed`、`school`、`level`、`range`、`targetRule`、`attackOrTraitLine`、`printCode`、`contractStatus`、`requiresCodeSupport`。`spellActionSpeed` 只记录卡面行动图标事实（`quick` / `standard`），由校验层消费；未核读的卡不得靠类型或名称猜测速度。

### Decision: atlas / frame 是素材引用，不再只靠 UI 注册器
每张卡引用稳定资产 ID，例如 `spell-card-1700-frame`；资产对象回指 `public/assets/atlas-configs/mage-wars/apprentice-spell-atlases.json` 中的 atlas / frame 信息。运行时仍可由现有 `cardAtlas.ts` 消费，但配置包必须能独立表达“这张牌应使用哪一个正式 frame”。

### Decision: 能力绑定先分层标记
配置包只声明 `abilityId + params` 或 `requires-code-support`。基础运行时已经支持的代表链可以标 `implemented`，完整隐藏结界、反制、装备销毁、连锁闪电、推斥、治疗结算等若尚未由通用能力覆盖，必须留在 `data.requiresCodeSupport` 或能力目录中，不得误称配置已能执行。

## Risks / Trade-offs
- Risk: 机械转换 Markdown 字段时误拆中文表格。
  - Mitigation: 自动生成后用测试对齐 91 个 CardID、四名法师法术书展开数量和 atlas frame 数量。
- Risk: 配置包先于运行时迁移导致双真相。
  - Mitigation: 迁移期只允许 TypeScript 与 JSON 并行校验；表格审查从 JSON 出，运行时替换必须在后续任务中逐项完成。
- Risk: 通用配置模型不够表达 Mage Wars。
  - Mitigation: 不扩通用 schema；先用 `data` 承载游戏特有字段，只有多个游戏复用时再提炼。

## Migration Plan
1. 新增 `mage-wars.config.json`，物化现有法师、法术书、学徒牌、atlas、区域、骰子和 token。
2. 新增配置包加载模块和测试，校验严格 JSON、对象数量、法术书展开数量、CardID / atlas frame 完整性。
3. 将审查表从配置包物化结果生成，禁止另维护展示数据。
4. 逐步把 setup 和 UI 查询切到配置包 loader；每切一块补对照测试。

## Open Questions
- 91 张学徒法术的能力 ID 命名是否先采用粗粒度 `mw.requires-code-support`，还是按攻击、治疗、召唤、装备、结界等拆第一版目录；本 change 会优先使用可校验但保守的能力缺口标记。
