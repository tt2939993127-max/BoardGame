## Context

这条 change 的目标不是宣称枪手 / 武士已经“零残余完成”，而是把 DiceThrone 新角色的角色级审计与验收口径正式化。

当前仓库事实分成两层：

- 规范层已经形成：
  - 已有角色级审计范围定义
  - 已有“领域回归 + 真实入口 E2E + 残余范围显式保留”的三层门槛
  - 已有对应 evidence 支撑这套口径不是空文档
- 内容层当前未再保留这两项历史 residual：
  - 枪手专属手牌数据现已接入正式卡组链路，旧“通用牌组兜底”说明属于过期阶段结论
  - 武士 `Masamune II` 已由代码、locale、规则文档与定向回归闭环，旧 blocker 说明属于过期阶段结论
- 内容层当前不再保留此前两条角色级 residual：
  - 枪手 `Loaded / 装填弹药` 的最终使用时机，已按角色 leaflet / 角色板 / 具体卡文收口
  - 武士线此前的 `Budo / 武道` 数字复核，已由本地裁图 OCR 收口

因此，必须明确区分：

- “这套 release readiness 规范是否成立”
- “枪手 / 武士是否已经零残余完成”

前者当前已经成立；后者仍然不能被机械表述为“穷尽式全量完成”，但原因不再是上述两个历史 blocker。

## Goals / Non-Goals

- Goals:
  - 明确这条 change 是“规范成立”还是“英雄全量完成”。
  - 给出当前残余范围的最小闭环条件，避免后续汇报再次模糊。
  - 明确是否允许未来把该 change 升为 current truth。
- Non-Goals:
  - 不把单个 blocker 的关闭误表述为整角色穷尽式完成。

## Decisions

- Decision: 这条 change 代表“DiceThrone 新角色 release readiness 规范”。
  - Why:
    - spec delta 的要求本身是流程性/验收性要求，不是某一张卡的实现细则。
    - 该 spec 明确要求在部分关闭时继续保留残余范围，因此它天然允许“规范已成立，但英雄仍有残余”。

- Decision: 当前不应把枪手 / 武士表述为“全部完成”。
  - Why:
    - 角色级 release readiness 依赖 audited scope，而不是“找到两个 blocker 修完就自动等于穷尽式完成”。
    - 即便历史 blocker 已关闭，仍然需要继续按交互家族声明覆盖范围，不能把代表性证据外推成全量穷尽。

- Decision: 当前可以把这条 change 视为“补现有规范”，而不是“新开变更”。
  - Why:
    - 活跃 change 已存在且已完整覆盖角色级审计、真实入口 E2E、残余范围显式化三件事。
    - 现有工作应继续收敛到这条 change，而不是重复创建并行 proposal。

## Residual Closure Map

### 枪手

- 当前已覆盖：
  - 最小开局真实入口
  - `The Law` 单目标 / 多目标 / 4 人 `2v2` 敌我过滤
  - `Wanted / Pistol Whip / High Noon` 四人真实选敌与结算
- 当前状态：
  - 旧“专属手牌仍是通用牌组兜底”结论已失效
  - 正式卡组链路已接入，相关真相源以 `枪手卡牌录入核对.md` 为准
  - `Loaded / 装填弹药` 的通用时机已定为“攻击掷骰阶段结束后加伤”
  - `Fill'Em With Lead` / 升级 `Quick Draw` / `Wild West` 等显式文本继续走重掷例外
  - 当前未再保留枪手角色级 residual

### 武士

- 当前已覆盖：
  - `Honor / Back Strike` 真实整局入口
  - `Righteousness / Zanshin` 跨角色攻击修正 E2E
  - 四人 `2v2` 目标牌 `You Should Be Ashamed`
- 当前状态：
  - `Masamune II` 已不再是主 blocker
  - 其升级差异已由代码、locale、规则文档和定向回归共同闭环
  - `Budo / 武道` 的基础 `6 damage` 与升级 `8 damage` 已由本地裁图 OCR 再次支撑
  - 当前未再保留武士角色级 residual

## Archive Gate

- 归档这条 change 的门槛，不等于“枪手 / 武士零残余”。
- 如果项目要把“新角色 release readiness 必须按角色级审计范围、代表性领域回归、真实入口 E2E、残余范围显式化执行”提升为 current truth，那么这条 change 可以进入归档流程。
- 如果项目当前只是把它当作“这一次枪手 / 武士收口的临时提案”，则可以暂时保持 active change，不同步到 `openspec/specs/`。

## Practical Recommendation

- 当前最合理的短期动作：
  - 继续把枪手 / 武士相关收口、blocker、evidence 汇总到这条现有 change
  - 禁止新开重复 change
- 当前最合理的中期动作：
  - 若团队认可这套口径会复用于后续 DiceThrone 新角色，下一步应将其同步为 current truth spec
  - 若只想先收完当前两个角色的残余，再正式沉淀为通用规则，则继续保留 active 状态即可
