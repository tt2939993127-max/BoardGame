# DiceThrone 枪手（Gunslinger）审计报告（2026-04-11）

## 审计范围
- 角色板能力/终极技：左轮、赏金猎人、快枪手、掩护、枪战决斗、死亡之眼、左轮速射、对决、终极技
- 提示板状态/骰面说明：装填（Loaded）、赏金（Bounty）、骰面说明
- 专属卡组：升级卡、行动卡、攻击修正卡，以及 `slot-22 / 23 / 24` 复合升级牌的下半区技能变体（`pistol-whip / mark-the-target / the-law`）
- 关键实现入口：
  - `src/games/dicethrone/heroes/gunslinger/abilities.ts`
  - `src/games/dicethrone/heroes/gunslinger/cards.ts`
  - `src/games/dicethrone/heroes/gunslinger/diceConfig.ts`
  - `src/games/dicethrone/domain/customActions/gunslinger.ts`
  - `src/games/dicethrone/domain/reduceCombat.ts` / `rules.ts`
- 相关测试：
  - `src/games/dicethrone/__tests__/cross-hero.test.ts`
  - `src/games/dicethrone/__tests__/card-cross-audit.test.ts`
  - `src/games/dicethrone/__tests__/ability-customaction-audit.test.ts`
- E2E 证据：`evidence/dicethrone/dicethrone-wild-west-e2e-test.md`、`evidence/dicethrone/dicethrone-high-noon-branches-e2e-test.md`

## 权威来源
- `src/games/dicethrone/rule/枪手真相源表.md`
- `src/games/dicethrone/rule/枪手录入核对.md`
- `src/games/dicethrone/rule/枪手卡牌录入核对.md`
- 汉化原图路径（见真相源表中的 `player-board.webp` / `tip.webp` / `ability-cards.webp`）
- Wiki/英文图仅作对照，不覆盖汉化图结论

## 成熟旧对象对照（共享契约）
- 参照 Monk / Paladin 等成熟角色的“攻击修正卡 → bonusDamage + Spotlight”链路：
  - `card-wild-west` 走 bonus-die spotlight，不修改主骰盘。
  - `attackModifierBonusDamage` 统一汇总，UI 通过 `useActiveModifiers` 展示。
- 参照 Barbarian / Samurai 等成熟角色的“复合升级卡 → 基础技能 ID → variants”链路：
  - `slot-22 / 23 / 24` 对应 `upgrade-fan-the-hammer-2 / upgrade-take-cover-2 / upgrade-deadeye-2` 三张**整张物理升级牌**。
  - 下半区 `pistol-whip / mark-the-target / the-law` 只作为升级后技能变体存在，**不是独立手牌对象**。
- 结论：枪手攻击修正卡与复合升级卡现在都已回到既有共享合同；旧审计把下半区变体当成“已自动覆盖”的写法已失效。

## 逐项结论

### 角色板能力 / 终极技
| 能力 | 权威描述要点（汉化图） | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- |
| 左轮（revolver） | 3/4/5 个子弹分别造成 3/4/5 伤害 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D3 | ✅ 一致 |
| 左轮 II（revolver-2） | 3/4/5 个子弹分别造成 4/5/6 伤害；若至少 4 颗同点数，再施加击倒 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 已对齐 |
| 赏金猎人（bounty-hunter） | 施加赏金并造成不可防御伤害 | `abilities.ts` | D1/D3 | ✅ 一致 |
| 快枪手（quick-draw） | 维持阶段获得装填；升级后每次花费装填可重掷该奖励骰一次 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |
| 掩护射击（take-cover） | 获得闪避并造成伤害；升级后下半区解锁 `mark-the-target` | `abilities.ts` | D1/D3 | ✅ 一致 |
| 枪战决斗（showdown） | 双方比点；赢/平时提升总伤害 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D8 | ✅ 一致 |
| 死亡之眼（deadeye） | 施加击倒并造成不可防御伤害；升级后下半区解锁 `the-law` | `abilities.ts` + `customActions/gunslinger.ts` | D1/D3 | ✅ 一致 |
| 左轮速射（fan-the-hammer） | 获得 2 闪避并造成伤害；升级后下半区解锁 `pistol-whip` | `abilities.ts` | D1/D3 | ✅ 一致 |
| 对决（duel） | 防御阶段双方投骰比较；赢时二选一，输时造成 1 点不可防御伤害 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D5 | ✅ 一致 |
| 终极技（fill-em-with-lead） | 获得闪避、对手获得赏金与击倒，再造成 10 点不可防御伤害；花费装填时可重掷奖励骰 | `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |

### 提示板状态 / 骰面说明
| 状态 | 权威描述要点（汉化图） | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- |
| 装填（loaded） | 消耗 1 装填掷 1 骰，额外伤害=半值向上取整；`Wild West / Quick Draw` 等文本可显式重掷该奖励骰 | `tokens.ts` + `customActions/gunslinger.ts` | D1/D3/D7/D8 | ✅ 一致 |
| 赏金（bounty） | 受伤+1，攻击者额外获得 1CP | `tokens.ts` + `reduceCombat.ts` | D1/D3 | ✅ 一致 |
| 骰面说明 | 1-3 子弹 / 4-5 冲刺 / 6 准星 | `diceConfig.ts` | D1/D3 | ✅ 一致 |

### 升级卡（专属手牌对象）
| 卡牌ID | 汉化卡名 / 类别 | 权威描述要点 | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `upgrade-revolver-2` | 左轮手枪 II / 升级 | 3/4/5 子弹→4/5/6 伤害；若 ≥4 颗同点数，再施加击倒 | `cards.ts` + `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |
| `upgrade-bounty-hunter-2` | 赏金猎人 II / 升级 | 赏金 + 2 点不可防御伤害 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| `upgrade-showdown-2` | 枪战决斗 II / 升级 | 小顺；赢/平→8 伤害，否则 6 伤害 | `cards.ts` + `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |
| `upgrade-showdown-3` | 枪战决斗 III / 升级 | 小顺；赢/平→9 伤害，否则 6 伤害 | `cards.ts` + `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |
| `upgrade-fan-the-hammer-2` | 左轮速射 II / 复合升级 | 整张物理升级牌；上半区升级本体，下半区为 `pistol-whip` 变体 | `cards.ts` + `abilities.ts` + `card-cross-audit.test.ts` | D1/D3/D33 | ✅ 已按复合升级合同接线 |
| `upgrade-take-cover-2` | 掩护射击 II / 复合升级 | 整张物理升级牌；下半区为 `mark-the-target` 变体 | `cards.ts` + `abilities.ts` + `card-cross-audit.test.ts` | D1/D3/D33 | ✅ 已按复合升级合同接线 |
| `upgrade-deadeye-2` | 死亡之眼 II / 复合升级 | 整张物理升级牌；下半区为 `the-law` 变体 | `cards.ts` + `abilities.ts` + `card-cross-audit.test.ts` | D1/D3/D33 | ✅ 已按复合升级合同接线 |
| `upgrade-duel-2` | 对决 II / 升级 | 平手也算赢；赢时可选 3 点不可防御伤害或抵挡一半进攻伤害 | `cards.ts` + `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D5 | ✅ 一致 |
| `upgrade-quick-draw` | 快速拔枪 / 升级 | 维持阶段获得装填；此后每次花费装填都可重掷该奖励骰一次 | `cards.ts` + `abilities.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |

### 复合升级下半区技能变体（非独立手牌）
| 变体ID | 所属升级牌 | 权威描述要点 | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `pistol-whip` | `upgrade-fan-the-hammer-2` | 获得 1 闪避、施加击倒、造成 1 点不可防御伤害；不应生成独立手牌/弃牌对象 | `abilities.ts` + `customActions/gunslinger.ts` + `cross-hero.test.ts` | D1/D3/D22/D33 | ✅ 一致 |
| `mark-the-target` | `upgrade-take-cover-2` | 获得 2 闪避，并选择 1 名目标施加赏金；不应生成独立手牌/弃牌对象 | `abilities.ts` + `customActions/gunslinger.ts` + `cross-hero.test.ts` | D1/D3/D5/D33 | ✅ 一致 |
| `the-law` | `upgrade-deadeye-2` | 获得 1 闪避；对**至多 2 名**目标玩家施加赏金 + 击倒；1v1 自动退化为唯一对手 | `abilities.ts` + `customActions/gunslinger.ts` + `cross-hero.test.ts` | D1/D3/D5/D33 | ✅ 一致 |

### 专属行动卡 / 攻击修正卡
| 卡牌ID | 汉化卡名 / 类别 | 权威描述要点 | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `card-wanted` | 通缉逮捕！/ 行动 | 选择 1 名玩家，给予赏金；4 人组队局可选任意目标玩家 | `cards.ts` + `customActions/gunslinger.ts` | D1/D5/D34 | ✅ 一致 |
| `card-spin-the-chamber` | 转动弹槽！/ 行动 | 获得 1 个装填 | `cards.ts` | D1/D7 | ✅ 一致 |
| `card-high-noon` | 赌命轮盘！/ 行动 | 选择 1 名目标玩家，掷 1 颗奖励骰并按结果触发 2 不可防御伤害 / 击倒 / 赏金；1v1 自动退化为唯一对手 | `cards.ts` + `customActions/gunslinger.ts` | D1/D5/D10/D15 | ✅ 一致（E2E 已验证） |
| `card-wild-west` | 荒野西部！/ 攻击修正 | 花费 1 装填 → 奖励骰可重掷一次，总伤害 +1，不改主骰盘 | `cards.ts` + `customActions/gunslinger.ts` | D1/D5/D7/D15 | ✅ 一致（E2E 已验证） |
| `card-eat-my-lead` | 吃我的铅弹！/ 攻击修正 | 额外掷 5 骰；每个子弹令本次攻击 +1；若加伤 >4，再施加击倒 | `cards.ts` + `customActions/gunslinger.ts` | D1/D3/D8 | ✅ 一致 |

## 验证证据
- Wild West E2E：`evidence/dicethrone/dicethrone-wild-west-e2e-test.md`
- High Noon E2E：`evidence/dicethrone/dicethrone-high-noon-branches-e2e-test.md`
- 静态实现核对：
  - `src/games/dicethrone/domain/customActions/gunslinger.ts:200-260,471-641,747-766`
  - `src/games/dicethrone/heroes/gunslinger/cards.ts:60-235`
  - `src/games/dicethrone/heroes/gunslinger/abilities.ts:46-409`
  - `src/games/dicethrone/heroes/gunslinger/diceConfig.ts:12-30`
- 静态/行为测试证据：
  - `src/games/dicethrone/__tests__/card-cross-audit.test.ts:279-330`（复合升级卡 atlas 接线；确认不存在 `card-pistol-whip / card-mark-the-target / card-the-law` 假手牌对象）
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:663-831,912-1019,1136-1453,1598,1656`（`the-law / wanted / pistol-whip / mark-the-target / spin-the-chamber / high-noon / wild-west / eat-my-lead` 行为链）
  - `src/games/dicethrone/__tests__/ability-customaction-audit.test.ts:239-242`（枪手 resolve handler 已接线）

## 旧结论失效与本轮补审回写（2026-04-12）
1. **旧审计把枪手专属卡区简化成 4 个行动/攻击修正对象，遗漏了 `spin-the-chamber` 与三张复合升级卡的下半区变体。**
   - 失效原因：之前只围绕用户指出的 `Wild West / High Noon` 问题回写，没有按 `枪手卡牌录入核对.md` 的整张物理牌合同重新枚举全部专属对象。
   - 修正：本轮已补入 `upgrade-fan-the-hammer-2 / upgrade-take-cover-2 / upgrade-deadeye-2` 及其 `pistol-whip / mark-the-target / the-law` 变体，另补录 `card-spin-the-chamber`。
2. **旧审计默认把 `the-law / pistol-whip / mark-the-target` 当成“已被 cards.ts 覆盖”的对象，这一表述失效。**
   - 正确口径：三者只存在于升级后基础技能的 `variants` 内，不是独立手牌；对应证据见 `card-cross-audit.test.ts:279-330` 与 `cross-hero.test.ts:1598,1656`。
3. **旧审计把 `card-high-noon` 的目标范围误写成“敌方 only”，这一结论失效。**
   - 失效原因：卡面写的是“对目标玩家”，但旧实现沿用 `resolveSingleOpponentCard` 的敌方过滤；旧审计只验证了 1v1 分支结算与奖励骰特写，没有按 D5 对“多人目标集合”做反查与 E2E 证据闭环。
   - 修正：本轮已将 `High Noon` 目标选择改为 `createSinglePlayerInteraction + getSeatingOrder()`（多人局可选全部座次玩家，1v1 自动退化为唯一对手），并同步更新 4 人 E2E 覆盖与证据链。
4. **权威来源文档仍有 merge conflict 残留。**
   - `src/games/dicethrone/rule/枪手卡牌录入核对.md` 当前仍存在 `<<<<<<< HEAD` 残留；本轮审计已按其中“整张复合升级牌”口径裁定，但源文档仍需后续清理。

## D1–D49 全量审计表（2026-04-12 补审）
- **D1 语义保真**：✅ 主要能力、专属手牌、复合升级下半区变体语义均与汉化图一致；`Revolver II` 四同点触发、`Wanted / The Law / High Noon` 目标范围、`spin-the-chamber` 装填写入均已对齐。
- **D2 边界完整**：✅ 装填/赏金/最多 2 目标等限定条件在 handler 与规则中一致。
- **D3 数据流闭环**：✅ 定义→注册→执行→状态→UI→i18n 路径闭环；`slot-22/23/24` 已明确回到“升级卡 -> 基础技能 -> variants”合同，不再伪装为独立 runtime 手牌。
- **D4 查询一致性**：✅ 未发现可变属性直读绕过统一入口。
- **D5 交互完整**：✅ `Wanted / The Law / High Noon / mark-the-target` 均有对应交互入口；`The Law` 支持最多 2 人选择，1v1 可自动退化。
- **D6 副作用传播**：✅ 赏金与装填的额外收益可触发既有资源机制。
- **D7 资源守恒**：✅ `Wild West` 消耗装填并固定 +1 伤害；`spin-the-chamber` 正确授予装填；装填消耗不越界。
- **D8 时序正确**：✅ 奖励骰结算在攻击修正阶段，不影响主骰盘；`showdown / duel` 的比点结算顺序正确。
- **D9 幂等与重入**：⚠️ 已覆盖 Wild West/High Noon 特写链路，但未新增专项重入回归。
- **D10 元数据一致**：✅ `High Noon / duel / pistol-whip / the-law` 等 handler categories 与实际事件类型一致；`Wild West` 只产生 bonusDamage，不误报为直接伤害 handler。
- **D11 Reducer 消耗路径**：✅ 攻击修正伤害走 `attackModifierBonusDamage`。
- **D12 写入-消耗对称**：✅ 赏金/装填写入与消耗对称。
- **D13 多来源竞争**：⚠️ 装填与其他攻击修正叠加未做组合回归。
- **D14 回合清理完整**：✅ 攻击修正结算后自动清理。
- **D15 UI 状态同步**：✅ Wild West 与 High Noon 特写链路已覆盖，主骰盘不改动已验证；攻击修正加伤通过统一 attack-modifier 区域可观测。
- **D16 条件优先级**：✅ Revolver/升级变体判定顺序正确。
- **D17 隐式依赖**：⚠️ 代码侧未见新的隐式依赖缺陷；本轮已确认枪手相关 `rule/*.md` 不再残留 merge conflict 标记（避免后续被旧口径误导）。
- **D18 否定路径**：✅ Wild West 奖励骰重掷后进入“达到重掷上限不可再次重掷”的否定路径，已由 E2E 截图链路覆盖（见 `dicethrone-wild-west-e2e-test.md` 第 2 张截图）。
- **D19 组合场景**：⚠️ 赏金+装填叠加未做组合回归。
- **D20 状态可观测性**：✅ UI 证据已覆盖 Wild West / High Noon 特写链路。
- **D21 触发频率门控**：✅ 装填消耗与奖励骰仅触发一次。
- **D22 伤害计算管线配置**：✅ 伤害事件由统一管线输出；`pistol-whip` 不可防御伤害与保护类减伤分离正确。
- **D23 架构假设一致性**：✅ 特写与攻击修正合同一致；复合升级卡也与成熟角色合同一致。
- **D24 Handler 共返状态一致性**：N/A。
- **D25 MatchState 传播完整性**：N/A。
- **D26 事件设计完整性**：✅ `High Noon / Wild West / Eat My Lead` 的 bonus die 事件均保留 attacker/target/face 等展示所需上下文。
- **D27 可选参数语义**：✅ 交互参数均显式传入。
- **D28 白名单/黑名单完整性**：N/A。
- **D29 PPSE 事件替换完整性**：N/A。
- **D30 消灭流程时序与白名单**：N/A。
- **D31 效果拦截路径完整性**：N/A。
- **D32 替代路径后处理对齐**：N/A。
- **D33 跨实体同类能力一致性**：✅ 与其他攻击修正卡、其他成熟角色的复合升级卡合同一致；下半区技能变体已不再与“独立手牌对象”混用。
- **D34 交互选项 UI 渲染模式正确性**：✅ 选择玩家交互渲染正常。
- **D35 交互上下文快照完整性**：N/A。
- **D35.1 多系统命令门控职责清晰**：N/A。
- **D36 延迟事件补发健壮性**：N/A。
- **D37 交互选项动态刷新完整性**：N/A。
- **D38 UI 门控系统优先级冲突**：⚠️ 未做 UI 门控冲突专项复核。
- **D39 流程控制标志清除完整性**：N/A。
- **D40 后处理循环事件去重完整性**：N/A。
- **D41 系统职责重叠检测**：N/A。
- **D42 事件流全链路审计**：N/A。
- **D43 重构完整性检查**：N/A。
- **D44 测试设计反模式检测**：⚠️ 旧审计曾遗漏 `spin-the-chamber` 与三张复合升级下半区变体；本轮已补静态/行为证据，但 UI/E2E 仍主要集中在 `Wild West / High Noon`。
- **D45 Pipeline 多阶段调用去重**：N/A。
- **D46 交互选项 UI 渲染模式声明完整性**：N/A。
- **D47 E2E 覆盖完整性**：⚠️ High Noon / Wild West 特写链路已补，但 `spin-the-chamber / pistol-whip / mark-the-target / the-law / eat-my-lead` 仍缺真实 UI/E2E 截图链。
- **D48 UI 交互渲染模式完整性**：N/A。
- **D49 abilityTags 与触发机制一致性**：N/A。

## 未覆盖风险 / 待确认
1. **（已修订）枪手规则文档 merge conflict 风险**：此前风险描述已失效；本轮已清理并确认 `src/games/dicethrone/rule/枪手*.md` 无冲突标记。
2. **复合升级下半区变体尚无真实 UI/E2E 截图链**：`pistol-whip / mark-the-target / the-law` 目前只有静态与 GameTestRunner 证据。
3. **否定路径仍缺动态验证**：例如 `Wild West` 在无装填时不能进入奖励骰重掷、`The Law` 多人局“只选 1 人/跳过第 2 人”的 UI 链路尚未做 E2E。

## 修订记录
- 2026-04-11：补审枪手派系并记录已修复项（Revolver II 四同点、Wanted/The Law 目标范围、High Noon 骰面归属）。
- 2026-04-12：补齐 High Noon 特写 E2E 证据链，并回写审计结论为“✅ 一致”。
- 2026-04-12（补审回写）：补录 `spin-the-chamber` 与三张复合升级卡下半区变体（`pistol-whip / mark-the-target / the-law`），修正“专属卡区已全覆盖”的失效结论，并把复合升级合同与静态证据补回审计文档。
