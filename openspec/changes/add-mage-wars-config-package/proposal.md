# Change: 为法师战争接入严格 JSON 配置包

## Why
`add-mage-wars-foundation` 已完成学徒基础版运行闭环，但静态事实仍分散在 TypeScript、atlas JSON、manifest、i18n 和规则合同中。按照 `GameConfigPackage` 新规范，继续扩展玩法前需要把法师、学徒法术书、学徒法术牌、素材引用、区域、骰子和 token 收口到可校验的严格 JSON 配置包。

## What Changes
- 新增法师战争官方严格 JSON 配置包，作为后续静态事实迁移和配置审查表的同源输入。
- 复用现有 `src/game-config` 共享 loader、validator、materializer 和 review table，不为 Mage Wars 自造第二套 schema。
- 配置包第一批覆盖四名学徒法师、学徒 2x3 竞技场、91 张学徒法术牌、四套预设学徒法术书、正式 atlas / frame 引用、基础骰子和 token。
- 将当前运行时 TypeScript 数据与配置包并行校验；通过后再逐步替换运行时硬编码，避免一次性迁移打断 foundation。
- 把未实现或需规则代码支持的特殊效果标记为能力缺口，不把卡面正文当作可执行逻辑。

## Impact
- Affected specs: `mage-wars`
- Affected code:
  - `src/games/mage-wars/data/`
  - `src/games/mage-wars/domain/data/`
  - `src/games/mage-wars/__tests__/`
  - `docs/games/mage-wars/intake/`
  - 复用 `src/game-config/`，不修改通用配置系统边界
