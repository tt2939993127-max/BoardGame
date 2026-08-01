# 法师战争领域建模前置审查

> 状态：`foundation-model-ready / foundation-implementation-reviewed`。本文件完成 `add-mage-wars-foundation` 的 3.3 门禁：领域对象模型、术语到事件映射、决策点清单和引擎能力缺口清单。2026-07-29 已补当前 foundation 实现复核；完整完成证据见 `docs/games/mage-wars/foundation-completion-self-audit.md`。

## 2026-07-29 实现复核层

| 项 | 当前结论 |
| --- | --- |
| 回合 / 计划 / 移动 / 守卫 / 攻击 / 胜负主链 | 已在 `domain-flow.test.ts` 和 `npx vitest run src/games/mage-wars` 中覆盖 foundation 层。 |
| 法术书 / 学徒卡牌 | 四名学徒法术书组成、91 张 S0 字段、正式 atlas/frame 和 Board 卡牌预览接线已完成。 |
| FX | `eventFxMapper.ts`、`fxSetup.ts`、`useGameEvents.ts` 已接入；`event-fx-mapper.test.ts` 和 `Board.fx.test.tsx` 覆盖基础映射。 |
| 隐藏信息 | foundation 层已证明对手已计划法术、未公开法术书内容和隐性结界使用卡背或数量表达，不公开私有牌名；完整隐藏结界展示 / 反制流程仍是后续玩法深水区。 |
| 不在本轮 | 全 322 张法术、自由构筑、四人模式、完整 AI、教程、行动日志 UI、撤回 UI 和完整隐藏结界执行器。 |

## 领域对象模型

| 规则对象 | 工程对象 | 单对象 / 资源 | 稳定身份 | 真相层 | 当前范围 |
| --- | --- | --- | --- | --- | --- |
| 法师 | `MageEntity` / `MageWarsPlayerState` | 单对象 | `playerId + mageId` | `core.players` | 学徒法师状态已占位；完整能力后续 |
| 法师状态板 | `MageBoardState` | 单对象面板 | `playerId` | `core.players` + 后续派生读模型 | 生命、伤害、法力、聚魔已占位 |
| 竞技场区域 | `ArenaZone` | 单对象格区 | `zoneId` | `core.arena` | 学徒 2x3 已占位；标准 12 区后续 |
| 法术书 | `SpellbookZone` | 私有卡组 | `playerId` | `core.players` + `APPRENTICE_SPELLBOOKS` | 四名学徒法术书组成已录入并在 Board 预览；完整卡牌执行器后续 |
| 计划法术 | `PreparedSpellRef` | 单卡实例 | `cardInstanceId` | 私有 `playerView` 过滤 | foundation 层已有准备槽 / 对手卡背 UI；完整多步骤计划交互后续 |
| 法术牌 | `SpellCardDef` + `SpellCardInstance` | 单卡 | `defId` + `instanceId` | 静态数据 + runtime 区域 | 91 张学徒 S0 字段和 atlas/frame 已完成；逐张执行器后续 |
| 生物 / 魔物 | `ArenaObject` | 单对象 | `objectId` | `core.objects` 后续扩展 | 学徒生物 / 魔物字段和视觉素材已完成；完整对象执行器后续 |
| 墙体 | `WallObject` | 单对象边界 | `wallId` | `core.walls` 后续扩展 | 标准空间数据待录 |
| 装备 / 结界 | `AttachmentObject` | 单对象附着 | `attachmentId` | `core.attachments` 后续扩展 | 隐藏结界必须有可见性模型 |
| 状态标记 | `TagContainer` + token view | 可堆叠状态 | `statusId` | `tags.ts` / 派生 UI | 守卫 / 伤害 / 基础状态 token 资源已接线；完整状态执行器后续 |
| 伤害 / 护甲 / 攻击修正 | `DamageCalculation` + `Attribute` | 数值管线 | 来源事件 ID | `damageCalculation.ts` | foundation 攻击 / 伤害主链已测试；完整卡牌修正后续 |
| 法术特效 | `SpellFxDescriptor` | 事件派生表现 | `eventId + spellId` | EventStream / FX 层 | 必须由合法事件驱动 |

## 真相层分离

| 层级 | 内容 | 法师战争落点 |
| --- | --- | --- |
| 正式真相层 | 法师、区域、对象位置、卡牌实例、法力、伤害、准备/行动标记、隐藏信息可见性 | `core` 与后续 `playerView` |
| 系统层 | 阶段推进、响应窗口、选择目标、计划/展示确认、撤回快照 | `sys.phase`、`sys.interaction`、`sys.responseWindow` |
| 派生读模型 | 区域可点状态、法术可施放状态、可见卡面、FX 锚点、状态徽章 | `ui/` hooks 后续生成 |
| 纯 UI 状态 | hover、展开、缩放、当前检视卡、动效局部播放进度 | React state / FX runtime |

## 术语到事件映射

| 规则术语 | 语义边界 | 状态 / 事件方向 | UI / FX 承接 |
| --- | --- | --- | --- |
| 聚魔 | 法师及有聚魔的对象获得法力 | `MANA_CHANNELED`，写入法力池 | 法力数值脉冲，不进入法术成功 FX |
| 计划法术 | 从私有法术书选择准备法术，通常最多 2 张 | `SPELL_PREPARED`，私有卡引用 | 自己可见，对手只见背面或数量 |
| 快速施法 | 消耗快速施法标记施放合法快速法术 | `QUICKCAST_USED` + `SPELL_CAST_STARTED` | 起手反馈必须绑定法师/来源 |
| 施法 | 支付费用、检查范围/目标/视线并产生法术结算 | `SPELL_CAST_STARTED` → `SPELL_RESOLVED` / `SPELL_CANCELLED` | source、target、travel/spread、impact |
| 目标移动取消 | 施法者、来源或目标在结算前移动导致取消/落空 | `SPELL_CANCELLED` / `ATTACK_MISSED` | 只播取消/失效反馈，不播成功命中 |
| 近战攻击 | 选择攻击、声明目标、守卫/防御/反击/伤害流程 | `ATTACK_DECLARED` → `DAMAGE_DEALT` | 攻击路径、骰面、命中对象反馈 |
| 守卫 | 生物进入守卫状态，可影响攻击目标选择并在近战失手后移除 | `GUARD_GAINED` / `GUARD_REMOVED` | 状态标记贴在对象本体 |
| 结界隐藏 / 展示 | 面朝下附着，拥有者可付展示费揭示 | `ENCHANTMENT_ATTACHED_HIDDEN` / `ENCHANTMENT_REVEALED` | 对手不可见身份；揭示时短促 reveal FX |
| 装备 | 附着到法师，改变属性或提供能力 | `EQUIPMENT_ATTACHED` | 法师板装备槽 + 属性变化提示 |
| 维持 | 支付或放弃维持费用，结算燃烧/腐化等 | `UPKEEP_PAID` / `UPKEEP_DECLINED` / `STATUS_TICKED` | 短状态，不写长规则正文 |
| 法师死亡 | 法师累积伤害达到生命导致游戏结束 | `MAGE_DEFEATED` / `GAME_OVER` | 结束态读 `G.sys.gameover` |

## 玩家决策点清单

| 决策点 | 类型 | 规则阶段 | 系统承接 | 当前状态 |
| --- | --- | --- | --- | --- |
| 选择法师 / 学徒法术书 | 强制 | setup | setupOptions 或角色选择系统 | foundation 后续 |
| 计划最多 2 张法术 | 强制 / 可少选 | planning | `createSimpleChoice` / 多选 Interaction | 待实现 |
| 部署再生点准备法术 | 可选/强制按对象 | deployment | Interaction + response window | 待实现 |
| 是否使用优先快速施法 | 可选 | initiativeQuickcast | 可跳过 Interaction | 待实现 |
| 激活哪个生物行动 | 强制直到无活动生物 | creatureAction | 区域/对象直选 | 待实现 |
| 移动到哪个区域 | 可选 | creatureAction | 竞技场区域直选 | 待实现 |
| 选择并施放哪张法术 | 可选 | quickcast / action | 私有已计划法术槽直选；计划阶段从法术书选择最多 2 张 | 待实现 |
| 选择目标区域/对象/墙体 | 强制，依赖法术 | 施法结算 | 目标 descriptor，不靠 payload 形状猜 UI | 待实现 |
| 是否展示结界 | 可选/触发式 | 多阶段 | ResponseWindow / Interaction | 待实现 |
| 是否支付维持 | 可选 | upkeep | SimpleChoice | 待实现 |
| 攻击目标与攻击方式 | 强制/可选 | creatureAction | 对象直选 + 攻击 descriptor | 待实现 |
| 防御/反击/守卫响应 | 条件式 | 攻击流程 | ResponseWindow | 待实现 |

## 引擎能力映射与缺口

| 能力 | 当前引擎映射 | 优先级 | 结论 |
| --- | --- | --- | --- |
| 回合阶段 | `FlowSystem` | P0 | 可直接复用；阶段顺序已占位 |
| 玩家选择 | `InteractionSystem` / `SimpleChoiceSystem` / `ResponseWindowSystem` | P0 | 可复用；必须用 descriptor 明确展示模式 |
| 隐藏信息 | `DomainCore.playerView` | P0 | 需要游戏层实现私有法术书、计划法术、隐藏结界过滤 |
| 状态 / 特性 | `tags.ts` | P0 | 可复用；状态标记不要散落布尔字段 |
| 法力 / 聚魔 | `resources.ts` 或游戏内资源字段 | P0 | 首轮可游戏内字段；若对象法力池扩展再统一资源容器 |
| 属性修正 | `attribute.ts` + `modifier.ts` | P0 | 护甲、近战/远程修正、状态加减必须走原语 |
| 伤害计算 | `damageCalculation.ts` | P0 | 攻击实现必须接入，禁止手写 `DAMAGE_DEALT` |
| 法术能力 | `ability.ts` + 游戏内执行器 | P1 | 学徒卡表录入时建立，不改总框架 |
| 空间区域 / 墙体 | `zones.ts` + 游戏层 `ArenaZone/WallObject` | P1 | 2x3 可先游戏层；标准 12 区和墙体边界需结构化数据 |
| FX 播放 | `engine/fx` + EventStream | P0 | 需要 `SpellFxDescriptor` 映射表；命令失败只播失败/取消反馈 |
| Phaser | 后续专门 FX 层候选 | P2 | 本 foundation 不引入 |

## 基础规则语义覆盖矩阵

| 规则语义 | 基础版必要性 | 状态真相 | 命令 / 事件 / 结算路径 | UI 承接对象 | 验证证据 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 人学徒对局 setup | 基础版必需 | `MageWarsCore.players`、`arenaMode`、`arena` | `setup()` | Board 骨架显示法师状态与 2x3 区域 | `smoke.test.ts` | done-foundation |
| 回合阶段顺序 | 基础版必需 | `sys.phase` + `MAGE_WARS_PHASE_ORDER` | FlowSystem `ADVANCE_PHASE` | phase chip | `domain-flow.test.ts`、`smoke.test.ts` | done-foundation |
| 法术书与计划法术 | 基础版必需 | `APPRENTICE_SPELLBOOKS`、准备槽、私有视角 UI | foundation 准备槽 / 计划显示；完整计划交互后续 | 私有法术书/计划区 | `smoke.test.ts`、真实 Board E2E | done-foundation-visual |
| 可见施法必须有 FX | 基础版必需 | EventStream + FX descriptor | `MW_SPELL_CAST_RESOLVED` 等事件映射 | 竞技场/对象锚点 | `event-fx-mapper.test.ts`、`Board.fx.test.tsx` | done-foundation |
| 攻击与伤害 | 基础版必需 | foundation 攻击命令和伤害事件 | `DECLARE_ATTACK` / `DAMAGE_DEALT` | 攻击目标、骰盘、受击对象 | `domain-flow.test.ts`、E2E 截图骰盘 | done-foundation |
| 守卫和常见状态 | 基础版必需 | 守卫命令、token 资源和对象标记 | `GUARD` / 守卫状态 | 对象本体标记 | `domain-flow.test.ts`、真实 Board E2E | done-foundation |
| 隐藏结界 / 隐藏信息边界 | 基础版必需 | playerView / 卡背边界 | 对手已计划法术、未公开法术书内容和隐性结界以卡背 / 数量呈现；完整隐藏结界执行器后续 | 附着区 + 卡背 / reveal FX | 真实 Board E2E、v6 历史审计 | done-foundation-boundary |
| 素材正式接线 | 基础版必需 | `public/assets/i18n/zh-CN/mage-wars/**` + atlas configs | 压缩 / manifest / `OptimizedImage` / `CardPreview` / server + Android 回查 | 正式 Board / Open Design artifact | `runtime-resource-chain-audit.md`、E2E | done-foundation |

## 暂不抽共享层

- 区域/墙体模型、法术 FX descriptor、隐藏 attachment 都像候选共享能力，但本轮没有用户授权“百游戏模式”。
- 本轮只在 `mage-wars` 内记录对象模型和缺口；后续若两个以上游戏需要同类能力，再拆共享 change。
