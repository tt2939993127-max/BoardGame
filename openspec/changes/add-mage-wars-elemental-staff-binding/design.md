## Context

`3716 元素魔杖` 是已录入字段和素材的装备牌，但现有装备对象没有绑定法术字段。当前施法事件会把施放的计划牌移入弃牌堆，不能复用于“绑定但未施放”的卡牌关系。

## Goals / Non-Goals

- Goals: 表达元素魔杖的当前绑定法术；支持装备施放时首次绑定；支持快速施法支付 3 点法力更换绑定；保留法术书 / 计划 / 弃牌堆边界。
- Non-Goals: 建立完整卡牌实例系统；实现四张需要响应窗口的结界；为所有装备建立泛化绑定 DSL。

## Decisions

### Decision: 绑定状态归装备对象所有

在 `MageWarsArenaObjectState` 增加可选 `boundSpellCardId`。绑定关系属于具体元素魔杖实例，不写入玩家的 `preparedSpellCardIds`，也不把绑定牌写入 `discardSpellCardIds`。

### Decision: 复用竞技场对象能力命令

元素魔杖替换绑定复用 `USE_ARENA_OBJECT_ABILITY`，使用稳定能力 ID `mw.equipment.3716.elemental-staff-bind` 和 `boundSpellCardId` 参数。能力校验负责来源、阶段、法力和牌面资格；执行产生现有竞技场对象能力事件，事件携带新的绑定牌 ID，reducer 只更新装备状态。

### Decision: 首次绑定在装备施放命令中表达

`CAST_SPELL` 的可选 `boundSpellCardId` 只对 `3716` 生效。未提供时装备仍可合法进入场上，表示暂不绑定；提供时在同一施放结算中写入绑定状态。替换绑定必须通过快速施法能力支付 3 点法力，不重放装备施放事件。

### Decision: 资格从结构化字段查询

绑定资格使用配置中的 `spellType === 攻击`、法师法术书成员关系，以及卡牌不存在“史诗”标签/规则属性的结构化数据判断。不会解析中文规则正文，也不会把计划区状态当作法术书所有权。

## Event Shape

复用 `ARENA_OBJECT_ABILITY_RESOLVED`，新增可选 `boundSpellCardId`。当事件来源为元素魔杖能力时，reducer 更新对应装备的 `boundSpellCardId`；事件仍记录法力消耗和能力 ID，便于行动日志与 FX 读取。

## Risks / Trade-offs

- 当前法术书使用卡牌定义 ID 而非实例 ID，绑定关系无法表达同名多张实体的独立实例；本 change 明确沿用 foundation 的定义 ID，完整实例化另立 change。
- 四张反制结界仍不能只靠静态配置标记为已实现；本 change 不降低它们的 `needsCode` 状态。

## Migration Plan

1. 先让 `3716` 的配置能力统计和状态字段通过测试。
2. 增加首次绑定、替换绑定、非法牌、非法阶段、法力不足和绑定牌不进入弃牌堆的领域测试。
3. 运行 Mage Wars 定向测试、TypeScript、ESLint 和 OpenSpec 严格校验。

## Open Questions

- 完整卡牌实例化时，需要把 `boundSpellCardId` 迁移为稳定的卡牌实例引用；在此之前不扩大本 change 的数据模型。
