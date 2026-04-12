# DiceThrone 武士（Samurai）审计报告（2026-04-11）

## 审计范围
- 角色板能力/终极技：太刀斩、胁差、武士道、肃穆之仪、武道、叶隐之心、正宗、昂首无畏、征夷大将军！
- 提示板状态/骰面说明：耻辱、荣誉、反击、骰面说明
- 专属卡组：升级卡、行动卡、攻击修正卡
- 关键实现入口：
  - `src/games/dicethrone/heroes/samurai/abilities.ts`
  - `src/games/dicethrone/heroes/samurai/cards.ts`
  - `src/games/dicethrone/heroes/samurai/tokens.ts`
  - `src/games/dicethrone/heroes/samurai/diceConfig.ts`
  - `src/games/dicethrone/domain/customActions/samurai.ts`
  - `src/games/dicethrone/domain/attack.ts` / `reduceCombat.ts` / `reducer.ts`
- 相关测试：`src/games/dicethrone/__tests__/cross-hero.test.ts`（含 Masamune II 分支用例）
- 不含：UI/E2E 截图验收、资源清理与历史裁图治理

## 权威来源
- `src/games/dicethrone/rule/武士真相源表.md`
- `src/games/dicethrone/rule/武士录入核对.md`
- `src/games/dicethrone/rule/武士卡牌录入核对.md`
- 汉化原图路径（见真相源表中的 `player-board.webp` / `tip.webp` / `ability-cards.webp`）
- Wiki/英文图仅作对照，不覆盖汉化图结论

## 成熟旧对象对照（共享契约）
- 参照 `武士卡牌录入核对.md` 中“与老派系升级合同逐张对照”段落，
  以 Monk / Paladin / Barbarian 等成熟角色升级合同作为基线。
- 结论：武士升级卡遵守「升级卡 → 基础技能」合同，复合升级位不拆成独立手牌。

## 逐项结论

### 角色板能力 / 终极技
| 能力 | 权威描述要点（汉化图） | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- |
| 太刀斩（katana-slice） | 3/4/5 katana → 5/6/7 伤害 | `abilities.ts` KATANA_SLICE | D1/D3 | ✅ 一致 |
| 胁差（wakizashi） | +1 反击 +3 不可防御伤害 | `abilities.ts` WAKIZASHI | D1/D3 | ✅ 一致 |
| 武士道（bushido） | 开局 +1 荣誉；若本回合攻掷<3 次，回合末再 +1 荣誉 | `abilities.ts` BUSHIDO | D1/D8 | ✅ 一致 |
| 肃穆之仪（solemnity） | +1 耻辱 +7 伤害 | `abilities.ts` SOLEMNITY | D1/D3 | ✅ 一致 |
| 武道（budo） | 小顺；+1 荣誉 +6 伤害 | `abilities.ts` BUDO | D1/D3 | ✅ 一致 |
| 叶隐之心（hagakure） | +1 荣誉 +1 反击 +1 耻辱 +5 不可防御伤害 | `abilities.ts` SAMURAI_SLOT_06 | D1/D3 | ✅ 一致 |
| 正宗（masamune） | 固定 7 伤害 + 额外掷 5 骰按图标结算 | `abilities.ts` MASAMUNE | D1/D3 | ✅ 一致 |
| 昂首无畏（stand-tall） | 防御技：katana 反击 1 点**不可防御**伤害；helm 抵挡 1；rising_sun 抵挡 2；若无盾则自得耻辱 | `abilities.ts` + `customActions/samurai.ts` | D1/D5/D10 | ✅ 已在 `handleStandTall` 为 `DAMAGE_DEALT` 显式标记 `unblockable`，并补齐 `damage` 分类 |
| 征夷大将军！（ultimate） | +1 荣誉 +2 耻辱 +13 不可防御伤害 | `abilities.ts` ULTIMATE | D1/D3 | ✅ 一致 |

### 提示板状态 / 骰面说明
| 状态 | 权威描述要点（汉化图） | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- |
| 耻辱（shame） | 计算攻击伤害时按层数递减 | `tokens.ts` + 战斗结算链路 + locale | D1/D3/D7 | ✅ 已支持多层消耗（`allowedConsumeAmounts: 1..10`），tooltip 同步“按层数递减”语义 |
| 荣誉（honor） | 1 层=+1；2 层=+3 | `tokens.ts` + 伤害结算 + locale | D1/D3/D7 | ✅ tooltip 已补齐“双档加伤”规则 |
| 反击（samurai_retribution） | 受攻击时消耗并掷 1 骰；结果/2 向上取整返还伤害 | `tokens.ts` + `customActions/samurai.ts` | D1/D3/D5 | ⚠️ 主逻辑一致，但**堆叠上限真相源未闭环**；代码已先裁定 `stackLimit: 0 => Infinity` |
| 骰面说明 | 1~3 katana / 4~5 helm / 6 rising_sun | `diceConfig.ts` | D1/D3 | ✅ 一致 |

### 专属卡牌 / 升级卡 / 攻击修正卡
| 卡牌ID | 汉化卡名 / 类别 | 权威描述要点 | 实现入口 | 维度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| upgrade-katana-slice-2 | 太刀斩 II / 升级 | 6/7/8 伤害；≥4 同点数→耻辱 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| upgrade-katana-slice-3 | 太刀斩 III / 升级 | 6/7/8 伤害；≥3 同点数→耻辱 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| upgrade-wakizashi-2 | 胁差 II / 升级 | +1 反击 +4 不可防御伤害 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| upgrade-wakizashi-3 | 胁差 III / 升级 | +1 反击 +1 耻辱 +4 不可防御伤害 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| upgrade-solemnity-2 | 肃穆之仪 II / 复合升级 | 升级肃穆之仪；下半区为变体 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 作为单张升级卡接线 |
| upgrade-budo-2 | 武道 II / 升级 | +1 荣誉 +8 伤害 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| upgrade-masamune-2 | 正宗 II / 复合升级 | 升级正宗；下半区为变体 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 作为单张升级卡接线 |
| upgrade-slot-06-2 | 叶隐之心 II / 复合升级 | 升级叶隐之心；下半区为变体 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 作为单张升级卡接线 |
| upgrade-stand-tall-2 | 昂首无畏 II / 升级 | 防御掷骰数由 `3` 提升到 `4`，且不再有“无盾自吃 shame”分支 | `cards.ts` + `abilities.ts` | D1/D3 | ✅ 一致 |
| card-samurai-honor | 武士荣耀！/ 行动 | 获得 2 荣誉 | `cards.ts` | D1/D7 | ✅ 一致 |
| card-you-should-be-ashamed | 你真可耻！/ 行动 | 施加 2 耻辱（多人局选敌） | `cards.ts` + `customActions/samurai.ts` | D1/D5 | ✅ 一致 |
| card-no-retreat | 不退缩！/ 行动 | 获得 1 反击 | `cards.ts` | D1/D7 | ✅ 一致 |
| card-righteousness | 舍生取义！/ 攻击修正 | 额外掷 1 骰：katana +2 伤害 / helm 2 耻辱 / rising_sun +1 反击 | `cards.ts` + `customActions/samurai.ts` | D1/D7 | ✅ 一致 |
| card-zanshin | 残心！/ 攻击修正 | 额外掷 5 骰按图标结算 | `cards.ts` + `customActions/samurai.ts` | D1/D7 | ✅ 一致 |

### 通用卡区（slot-00 ~ slot-17）
> 依据 `武士卡牌录入核对.md` 的结论，slot-00~17 与 COMMON_CARDS 顺序对齐。

| slot | cardId | 汉化卡名 | 结论 |
| --- | --- | --- | --- |
| 00 | card-transfer-status | 移转！ | ✅ |
| 01 | card-what-status | 效果指示物是啥？ | ✅ |
| 02 | card-one-throw-fortune | 来赌一场吧！ | ✅ |
| 03 | card-get-away | 赶走它！ | ✅ |
| 04 | card-super-double | 三倍抽取！ | ✅ |
| 05 | card-double | 加倍抽取！ | ✅ |
| 06 | card-bye-bye | 拜啦！ | ✅ |
| 07 | card-flick | 乔一下！ | ✅ |
| 08 | card-boss-generous | 拿点报酬！ | ✅ |
| 09 | card-next-time | 这次不算！ | ✅ |
| 10 | card-unexpected | 两倍费用！ | ✅ |
| 11 | card-worthy-of-me | 来，再试一次！ | ✅ |
| 12 | card-surprise | 让它变万用！ | ✅ |
| 13 | card-me-too | 同调！ | ✅ |
| 14 | card-i-can-again | 再来一次！ | ✅ |
| 15 | card-give-hand | 帮一把！ | ✅ |
| 16 | card-just-this | 下次会更好！ | ✅ |
| 17 | card-play-six | 666！ | ✅ |

## 验证证据
- **本轮已复跑 DiceThrone 单测**（`npm run test:dicethrone`，2026-04-12），覆盖武士关键链路的回归验证；但**未新增武士专属 E2E 截图验收**（武士 UI 实景证据仍缺，见 D47）。
- 规则 / 真相源：
  - `src/games/dicethrone/rule/武士真相源表.md:73,77,83`
  - `src/games/dicethrone/rule/武士录入核对.md:35-50,74-83`
  - `src/games/dicethrone/rule/武士卡牌录入核对.md:36-49,59-63,125-132`
- 实现入口：
  - `src/games/dicethrone/heroes/samurai/tokens.ts:1-78`
  - `src/games/dicethrone/domain/customActions/samurai.ts:77-171,202-220,223-293,295-393,397-434`
  - `public/locales/zh-CN/game-dicethrone.json:244-259,1987-2051,2599-2627`
  - `public/locales/en/game-dicethrone.json:245-260,1971-2035,2583-2611`
- 已存在的行为测试（本轮已复跑并通过；此处列出关键覆盖点便于复查）：
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:1044-1107`（`You Should Be Ashamed` 四人队伍模式只可选敌方）
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:1848-1908`（`Bushido` 开局/回合末/恰好 3 掷否定路径）
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:1959-1994`（`Stand Tall` 反伤 + 减伤）
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:1997-2159`（`Righteousness` / `Zanshin`）
  - `src/games/dicethrone/__tests__/cross-hero.test.ts:2168-2283`（`Masamune II` 双分支）
- 元数据一致性回归（本轮已复跑并通过）：
  - `src/games/dicethrone/__tests__/customaction-category-consistency.test.ts`（`samurai-stand-tall*` 的 `categories` ↔ 实际事件类型一致性；避免依赖白名单跳过）

## 本轮补审 / 进度记录（2026-04-12）
1. **修正文档自相矛盾结论**
   - 旧版 D7 仍写“`Shame` 单层消费未收口”，与当前 `tokens.ts`/locale 已实现多层消耗的事实冲突。
   - 本轮改为：`Honor` / `Shame` 已收口，真正剩余风险只保留 `samurai_retribution` 堆叠上限真相源未闭环。
2. **把“已有测试但本轮未复跑”和“完全无证据”分开**
   - 旧版“本轮未新增/运行武士专属测试”容易误读成武士线没有行为测试。
   - 本轮补写 cross-hero 既有覆盖点，明确这些是**历史已存在的行为证据**，但**不是本轮动态复验**。
3. **把规则文档质量问题从功能结论中剥离**
   - ✅ 已清理 `src/games/dicethrone/rule/武士卡牌录入核对.md` 的 merge conflict 标记；
   - ✅ 已同步 `src/games/dicethrone/rule/武士录入核对.md:48` 的旧口径（更新为“按层数消耗、逐层减伤”语义）。
   - 这两项应记为审计证据源卫生问题，不能再误写成运行时代码仍错误。

## 旧结论失效与修复回写
1. **`Stand Tall` 不可防御语义**（旧结论失效，运行时已修复）
   - 当前事实：`handleStandTall` 生成的 `DAMAGE_DEALT` 事件已显式写入 `payload.unblockable = true`。
   - 证据：`src/games/dicethrone/domain/customActions/samurai.ts:123-145`。
2. **`samurai-stand-tall*` metadata 漏 `damage`**（旧结论失效，运行时已修复）
   - 当前事实：`samurai-stand-tall` / `samurai-stand-tall-2` categories 已包含 `damage`。
   - 证据：`src/games/dicethrone/domain/customActions/samurai.ts:406-413`。
3. **`Honor` tooltip 不完整 / `Shame` 仅单层消费**（旧结论失效，运行时已修复）
   - 当前事实：`Honor` 已支持 `1 -> +1 / 2 -> +3`；`Shame` 已支持按层数消耗并逐层减伤。
   - 证据：`src/games/dicethrone/heroes/samurai/tokens.ts:5-54`、`public/locales/zh-CN/game-dicethrone.json:244-259`、`public/locales/en/game-dicethrone.json:245-260`。
4. **`samurai_retribution` 堆叠上限未闭环**（仍待确认）
   - 当前事实：代码把 `stackLimit: 0` 解释为无限叠加；但 `tip.webp` 上对应数字仍未 OCR 闭环。
   - 证据：`src/games/dicethrone/heroes/samurai/tokens.ts:56-73`、`src/games/dicethrone/rule/武士真相源表.md:83`。

## 未覆盖风险 / 待确认
1. **`samurai_retribution` 堆叠上限仍未拿到足够清晰的权威图片证据**。
2. **武士线仍缺少关键交互的 E2E 与截图验收**：仓库中已有武士相关 E2E（如 token 响应窗口真实流程），但本轮未复跑/未看图不能当作收口证据；同时仍缺 `Stand Tall` 等关键交互的“连续截图证据链”覆盖。
3. **规则文档卫生问题仍在**：
   - ✅ 已清理 `src/games/dicethrone/rule/武士卡牌录入核对.md` 的 merge conflict 标记；
   - ✅ 已同步 `src/games/dicethrone/rule/武士录入核对.md:48` 的旧口径；
   - ⚠️ 仍待闭环：`samurai_retribution` 的提示板上限数字需要更清晰的权威图或 OCR 证据（见本节第 1 条）。
4. **组合场景回归不足**：`Honor + Shame + Back Strike` 同回合叠加、多人局与防御时序叠加，本轮未复验。

## D1–D49 全量审计表（2026-04-12 重审）
- **D1 语义保真**：⚠️ 角色板能力、升级卡、攻击修正卡主语义已对齐；唯一未闭环的是 `samurai_retribution` 堆叠上限权威来源（`武士真相源表.md:83`）。
- **D2 边界完整**：⚠️ `Back Strike` 的上限边界仍欠真相源闭环；其余如 `Bushido <3 次攻掷`、`Stand Tall II` 去掉自吃 `shame`、`You Should Be Ashamed` 只选敌方，静态与既有测试均一致。
- **D3 数据流闭环**：✅ 真相源 → abilities/cards/tokens/customActions → locales → cross-hero tests 已形成闭环。
- **D4 查询一致性**：✅ 未发现应走统一查询入口的动态数值被直接绕过读取。
- **D5 交互完整**：✅ `Stand Tall`、`You Should Be Ashamed`、`Masamune`、`Righteousness`、`Zanshin` 均有对应 handler/交互或结算链；多人局选敌已有测试覆盖。
- **D6 副作用传播**：✅ `Honor` / `Shame` / `Back Strike` 均能进入既有伤害与 token 结算链。
- **D7 资源守恒**：⚠️ `Honor` / `Shame` 已与现实现状对齐；仍剩 `Back Strike` 堆叠上限是否应为无限的规则确认风险。
- **D8 时序正确**：✅ `Bushido` 的开局与回合末时序、`Stand Tall` 的防御反伤/减伤时序、`Masamune` 的先基础伤害后奖励骰结算语义均已对齐。
- **D9 幂等与重入**：⚠️ 未做“重复进入防御交互/重复消费 Back Strike”的专项回归，本轮只看到单次链路正确。
- **D10 元数据一致**：✅ `samurai-stand-tall*` 已声明 `damage`；未发现“输出 DAMAGE_DEALT 但 categories 不含 damage”的现存问题。
- **D11 Reducer 消耗路径**：✅ `Honor` / `Shame` / `Back Strike` 均通过 token activeUse 进入正确的消耗路径。
- **D12 写入-消耗对称**：✅ 授予 `Honor` / `Shame` / `Back Strike` 的路径都能被后续消费链读取。
- **D13 多来源竞争**：⚠️ 多来源同时授予 `Honor` / `Shame` / `Back Strike` 的组合场景未做专项复验。
- **D14 回合清理完整**：✅ 未发现武士专属临时字段跨回合泄漏；`Bushido` 依赖的 `offensiveRollAttemptsThisTurn` 也已有否定路径测试。
- **D15 UI 状态同步**：⚠️ locale/tooltip 与运行时 token 规则已对齐，但武士派系仍无专属 E2E 证明 UI 展示与交互表现完全一致。
- **D16 条件优先级**：✅ `Stand Tall` 中“先反伤、再减伤、最后按条件自加 Shame”的分支顺序与描述一致。
- **D17 隐式依赖**：⚠️ `Stand Tall` / `Back Strike` 依赖 defensiveRoll 上下文中的 attacker/defender 角色约定；静态看已处理，缺少组合回归进一步压实。
- **D18 否定路径**：⚠️ 已有 `Bushido`“恰好 3 次攻掷不再加 Honor”、`You Should Be Ashamed` 不选队友等否定路径；但 `Stand Tall II`“无盾也不自加 Shame”仍缺独立回归。
- **D19 组合场景**：⚠️ `Honor + Shame` 对冲、`Back Strike + 防御减伤` 等组合场景本轮未复跑。
- **D20 状态可观测性**：⚠️ icon/atlas/tooltip 已接线，但没有武士专属 UI 截图证据。
- **D21 触发频率门控**：✅ `Bushido` 起手与回合末触发都有明确门控；`Back Strike` 以单个 token 主动消费，不存在一枚多次触发的静态迹象。
- **D22 伤害计算管线配置**：✅ `Stand Tall` / `Back Strike` 都通过 `createDamageCalculation` 生成伤害事件，`Stand Tall` 额外显式标记 `unblockable`。
- **D23 架构假设一致性**：✅ 武士的“防御反伤 + token 反弹”没有继续用旁路硬编码，仍落在 customAction + damage pipeline 合同内。
- **D24 Handler 共返状态一致性**：N/A（未发现同时返回 `events + interaction` 且依赖 reduce 后新状态的武士 handler）。
- **D25 MatchState 传播完整性**：N/A（武士 custom action 未依赖 `matchState`）。
- **D26 事件设计完整性**：✅ `Masamune`/`Righteousness`/`Back Strike` 的事件都携带了结算所需的 face/target/source 信息。
- **D27 可选参数语义**：✅ `samurai-masamune` 的 `diceCount` 可选参数有默认值 `5`，升级变体再显式覆盖为 `6`。
- **D28 白名单/黑名单完整性**：N/A（本轮未命中相关白名单/黑名单机制）。
- **D29 PPSE 事件替换完整性**：N/A。
- **D30 消灭流程时序与白名单**：N/A。
- **D31 效果拦截路径完整性**：N/A。
- **D32 替代路径后处理对齐**：N/A。
- **D33 跨实体同类能力一致性**：✅ 武士复合升级卡继续遵守“升级卡 → 基础技能”的成熟旧对象合同，没有把下半区变体拆成独立手牌。
- **D34 交互选项 UI 渲染模式正确性**：✅ `You Should Be Ashamed` 使用 `selectPlayer` 交互，四人队伍模式敌我过滤已有状态级测试证据。
- **D35 交互上下文快照完整性**：N/A。
- **D35.1 多系统命令门控职责清晰**：N/A。
- **D36 延迟事件补发健壮性**：N/A。
- **D37 交互选项动态刷新完整性**：N/A（未命中动态刷新型多步交互）。
- **D38 UI 门控系统优先级冲突**：⚠️ 缺少武士专属 UI 门控/浮层冲突复核。
- **D39 流程控制标志清除完整性**：N/A。
- **D40 后处理循环事件去重完整性**：N/A。
- **D41 系统职责重叠检测**：N/A（未发现武士实现继续走旧旁路特判）。
- **D42 事件流全链路审计**：⚠️ 有行为测试与静态核对，但没有从 UI 到 eventStream 的全链路新证据。
- **D43 重构完整性检查**：⚠️ 运行时代码侧本轮未见新的结构残缺；但规则文档仍存在“证据未闭环项”（如 `samurai_retribution` 上限 OCR），说明证据材料侧还没完全收口。
- **D44 测试设计反模式检测**：⚠️ 当前主要依赖状态级/引擎级测试，尚未把武士关键交互补成 E2E。
- **D45 Pipeline 多阶段调用去重**：N/A。
- **D46 交互选项 UI 渲染模式声明完整性**：N/A。
- **D47 E2E 覆盖完整性**：⚠️ 仓库中已存在武士相关 E2E（如 token 响应窗口的真实流程），但本轮未复跑/未看图，不能作为本轮收口证据；同时仍缺 `Stand Tall` 等关键交互的“连续截图证据链”覆盖。
- **D48 UI 交互渲染模式完整性**：N/A。
- **D49 abilityTags 与触发机制一致性**：N/A（DiceThrone 此处不依赖 abilityTags 作为核心合同）。

## 维度复核（本轮明确补到的遗漏）
- `Stand Tall` 不可防御反伤：D1 / D10 / D22
- `Honor` / `Shame` token + locale 对齐：D3 / D7 / D15
- 复合升级牌仍走基础技能替换合同：D3 / D23 / D33
- `You Should Be Ashamed` 多人局敌我过滤：D5 / D18 / D34
- `Back Strike` 堆叠上限未闭环：D1 / D2 / D7
- 规则文档仍有证据未闭环项：D3 / D43

## 修订记录
- 2026-04-11：初版审计文档归档，把多项对象误记为“✅ 一致”。
- 2026-04-11（晚）：补审后确认旧结论失效，并补入先前未覆盖维度项：`Stand Tall` 不可防御语义未实现、`Stand Tall` metadata 漏 `damage`、`Honor/Shame` tooltip 与规则不一致、`Shame` 单层消费未收口、`反击` 堆叠上限未闭环等问题。
- 2026-04-12（早些时候）：代码侧已补齐 `Stand Tall` 的 `unblockable` 与 categories、`Honor/Shame` locale 与 token 规则。
- 2026-04-12（本轮重审）：清理文档中的旧结论残留，把“运行时已修复的问题”和“仍待闭环的问题”重新拆开；显式补写 D1-D49 全表、已有 cross-hero 证据入口；同步清理/更新规则文档口径（已去除 merge conflict 标记，仍保留“证据未闭环项”作为风险）。
