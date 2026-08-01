# Mage Wars Foundation Design

## Context

法师战争的首要难点是规则状态机，而不是实时渲染：法术书计划、隐藏结界、快速施法时机、攻击八步、区域/墙体、状态特性叠加、法术绑定和 FAQ 勘误都会影响合法命令与结算顺序。用户明确要求释放法术必须有特效，因此首轮设计必须同时约束规则事件和 FX 展示。

## Goals

- 以 `mage-wars` 为单一主 spec，建立新游戏 foundation 的正式范围。
- 完成阶段 0 规则对象与素材 intake，避免先写程序化 Board。
- 将首轮范围锁到 2 人基础/学徒闭环，保留后续扩展路径。
- 让法术释放特效成为规则事件驱动的交付合同，而不是后续美术优化。

## Non-Goals

- 不在本 change 中实现全 322 张法术、完整自由构筑、四人模式或豪华竞技场。
- 不让 Phaser 接管主 Board/UI。
- 不把 Workshop/TTS 桌面风格直接复制为前端 UI 风格。
- 不在 proposal 未批准前创建 `src/games/mage-wars/**` runtime 实现。

## Decisions

### 主架构

- 使用现有 DomainCore + Pipeline + Systems。
- 回合与阶段走 FlowSystem：起始、重置、聚魔、维持、计划、部署、优先快速施法、生物行动、最终快速施法。
- 玩家选择全部走 InteractionSystem / ResponseWindowSystem；不在 `core` 上放 UI pending 状态。
- 隐藏信息由 `playerView` 和对象可见性描述承接：法术书、计划法术、隐性结界、陷阱不能向对手泄露。

### UI 与渲染

- React 负责主 Board、棋盘区、法师状态板、法术书、已计划法术、弃牌堆、装备/结界附件、状态标记和交互提示。
- `engine/fx` / Canvas 2D / ShaderCanvas / framer-motion 负责首轮法术特效。
- Phaser 只作为后续复杂特效层候选：连锁闪电、多目标跳转、召唤风暴、镜头震动、大量粒子或复杂时间线触发时再建单独 change 评估。
- UI 设计路线采用 Open Design HTML artifact + 项目内实现合同；本轮不生成位图设计稿，因为主视觉依赖既有素材。
- 游戏专属 UI 合同落在 `design-system/games/mage-wars.md`；实现骨架落在 `docs/games/mage-wars/design/implementable/board-layout-contract.md`。

### 法术特效合同

每个可见施法事件至少产出以下 FX 语义：

| FX 语义 | 说明 |
| --- | --- |
| `cast-source` | 施法者、魔宠或再生点起手反馈 |
| `target-lock` | 目标区域、目标生物、墙体或装备/结界宿主高亮 |
| `travel-or-spread` | 远程攻击、治疗、传送、推斥、召唤或结界展示的路径/扩散 |
| `impact` | 伤害、治疗、状态、召唤、装备、结界展示或陷阱触发的命中反馈 |
| `settlement-sync` | FX 从已验证命令产生的规则事件驱动；命令失败不能播放正式成功态 |

### GameConfigPackage 裁定（2026-07-31 合 main 后复查）

- **当前裁定**：配置属于数据驱动录入的一部分；本 `add-mage-wars-foundation` change 本轮只复查并登记现有配置面，暂不把已录入的静态事实迁移到 `GameConfigPackage`。当前 foundation 分支在合 main 前已经用 TypeScript 数据源承载学徒法师初始属性、四名学徒法术书组成、91 张学徒法术牌字段合同、atlas/frame 引用、游戏 manifest / 移动端配置和代表性运行时逻辑；本轮目标是合入 main 并按新规范补裁定，不扩大为数据源迁移。
- **跳过原因**：立即迁移会改变运行时加载、校验、测试和表格物化边界，影响范围超过本轮合并与数据录入复查；而现有 S0 录入合同已经能追溯到规则、Workshop deck、临时核读图和正式 atlas 配置。
- **影响范围**：当前没有严格 JSON 官方配置包、schema 校验、由配置包物化的玩家审查表，也没有字段级玩家修正提案入口；现有 TypeScript 数据、atlas JSON、manifest、i18n 和事件 / FX 映射仍是 foundation runtime 的临时运行真相源，因此不能把本 change 称为配置包化完成。
- **后续补齐任务**：单独建立 `add-mage-wars-config-package` 或等价 change，把法师、学徒法术书、91 张学徒法术牌、atlas 引用、token / 骰子 / 区域配置迁入严格 JSON；表格审查视图必须从配置包物化，不能另维护展示副本。
- **能力边界**：配置包只能声明 `abilityId + params`；完整结界、装备、连锁闪电、推斥、隐藏结界揭示、反制响应等尚未由通用能力覆盖的效果必须标为 `requires-code-support` 或拆后续能力实现，不能把正文字符串当成已执行能力。
- **玩家修正**：本 change 不开放配置表字段级修正。后续启用时，玩家建议必须走结构化反馈提案，AI 只做首轮建议，不直接写官方 JSON。

### 领域对象草案

| 规则对象 | 工程对象方向 |
| --- | --- |
| 法师 | `MageEntity`，包含生命、伤害、法力、聚魔、行动/快速施法标记、装备/结界附件 |
| 法术牌 | `SpellCardDef` + runtime `SpellCardInstance`，区分拥有者、控制者、区域和隐藏/展示状态 |
| 竞技场区域 | `ArenaZone`，含相邻、学徒半场、墙体边界 |
| 墙体 | `WallObject`，绑定边界，影响移动、视线和通行伤害 |
| 生物/魔物 | `CreatureObject` / `ConjurationObject`，有区域、控制者、生命、护甲、特性、状态 |
| 装备/结界 | attachment，包含宿主、控制者、拥有者、可见性、展示费用和时间戳 |
| 状态/特性 | 优先映射到 `tags.ts`、`modifier.ts`、`attribute.ts` 和 `damageCalculation.ts` |

## Risks

- 卡牌数量大：先锁学徒预设，不把全 322 张卡作为首轮完成标准。
- 隐藏信息复杂：必须在领域模型第一天区分拥有者、控制者、宿主、可见性和 delayed snapshot。
- 素材随机文件名：正式资源不得沿用 URL 哈希名，必须通过 Workshop deckKey 与图面语义命名。
- 法术 FX 与规则不同步：FX 必须消费事件流，不从按钮点击直接播放成功态。

## Candidate Shared Extraction

- 区域/墙体/边界模型可能未来服务其它地图/棋盘游戏，但本轮不改总框架。
- 施法 FX descriptor 可能服务其它法术类游戏，但本轮先在 `mage-wars` 内定义事件映射，稳定后再评估共享。
- 隐藏 attachment / deferred snapshot 可能需要复用，但先用现有 InteractionSystem、ResponseWindowSystem 和 entity reference 合同约束。
