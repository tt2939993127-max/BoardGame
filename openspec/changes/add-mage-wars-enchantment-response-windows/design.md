## Context

规则书将法术流程拆为法术施放、法术反制、法术结算；攻击流程将回避攻击放在投掷骰子之前。`1825`、`1901` 和 `1904` 都必须在这些时点中断原本的施法或攻击，且展示结界后才能继续或结束原流程。

当前引擎已经提供：

- `ResponseWindowSystem`：响应者队列、`RESPONSE_PASS`、响应窗口开关和当前响应者；
- `InteractionSystem`：阻塞式交互和 `SYS_INTERACTION_*` 命令；
- resolution frame：跨事件批、交互和响应窗口的连续结算 owner；
- Mage Wars 现有 `DEFENSE_AVAILABLE` / 防御交互：普通防御牌和装备防御已经复用这一入口。

当前缺口不是缺一个单卡 `if`，而是施法 / 攻击上下文没有被响应窗口 owner 持有。直接把上下文塞入 `sys.interaction`、新增 Mage Wars 私有 pending flag 或在响应结束时按最近事件猜测，都会重新制造第二条续链。

## Goals / Non-Goals

- Goals: 让三张卡在正确的规则时点强制展示；暂停原施法 / 攻击；响应后从同一 resolution frame 恢复、取消或反转；所有触发依据来自结构化卡牌和攻击配置。
- Non-Goals: 把所有结界做成同一种响应 UI；实现 1804 的生物施法者；把隐藏结界全部公开；扩展完整多人响应优先级。

## Decisions

### Decision 1: 以 resolution frame 作为唯一续链 owner

触发响应时创建或更新一个 `mage-wars` resolution frame，`metadata` 只保存经过类型校验的施法 / 攻击上下文。响应窗口和交互只持有 frame 引用与阻塞状态；它们不得保存另一份主续链或在窗口关闭时自行拼接后续动作。

上下文至少包含：原命令来源、施法 / 攻击来源、目标、原法力支付、快速 / 标准时机、攻击 profile、是否可回避和被触发的结界对象 ID。上下文必须能在无响应、强制展示、非法旧响应和重复事件下稳定判断。

### Decision 2: 强制展示不能由 pass 绕过

三张卡的规则都是“必须展示”，不是可选响应。响应窗口需要表达 `requiredInteractionId` 或等价的强制 owner 状态：在强制展示交互完成前，`RESPONSE_PASS` 和其他无关游戏命令必须被拒绝。只有完成合法展示后，frame 才能执行取消、返还、摧毁或逆转。

`ResponseWindowSystem` 的通用能力只增加最小的强制阻塞语义，并通过 `createBaseSystems` 注入游戏配置；默认游戏行为保持不变，不给所有响应窗口强加同一种 UI。

### Decision 3: 结界类型使用结构化时机语义

配置为每张卡声明稳定的触发语义：

- `1825`：`spell-counter / quick-spell / cancel-and-refund`；
- `1901`：`spell-counter / opponent-incantation-or-enchantment / cancel`；
- `1904`：`attack-evasion / reverse-if-avoidable`。

执行器只消费这些语义、目标锚点、来源控制权和攻击 profile；不读取 `rulesText` 或中文展示文案决定触发。

### Decision 4: 1904 复用防御 profile，但单独表达反转结算

`1904` 仍属于目标生物的防御来源，因此复用现有防御来源查询和攻击防御入口；它不能伪装成普通 `automatic-evade`。新增 Mage Wars 专属的 `reverse-attack` 结算分支，明确区分：

- 可回避：攻击被回避，来源和目标交换，原攻击在后续投掷 / 伤害步骤按反转上下文继续；
- 无法回避：摧毁攻击逆转，原攻击继续，不能产生交换或额外攻击。

### Decision 5: 只把真实可验证的牌标为 implemented

在响应 frame、强制展示和恢复测试全部通过后，`1825`、`1901`、`1904` 已改为 `requiresCodeSupport=false`。`1804` 继续保留该标记，但原因记录为“当前范围没有非玩家生物施法者来源”，不再归类为响应窗口缺口。

### Decision 6: 响应提交按当前 frame 实时校验

结界展示交互的初始选项只作为 UI 快照；真正提交时必须重新读取当前 active resolution frame，并同时匹配 frame ID、响应上下文中的响应对象 ID 和响应卡牌 ID。frame 被替换、删除或指向其它响应来源时，展示选项保持在当前交互中但标记为不可用，拒绝响应，不清除旧交互、响应窗口或隐藏结界。

这样可以覆盖网络重放、旧窗口和状态竞争，而不会把“动态选项为空”误当成可安全结束交互；SimpleChoice 的空选项安全回退不会因此重新接受旧快照。

## Risks / Trade-offs

- 引擎响应窗口增加强制阻塞配置后，必须补通用回归测试，确保已有 Smash Up / DiceThrone 的可选响应仍可 pass。
- `1904` 的反转涉及攻击八步和攻击来源 / 目标交换，首轮实现必须限制在现有对象攻击 profile 能表达的范围；超出范围的墙体、完整视线和复杂多段攻击继续延期。
- 当前法术牌仍按定义 ID 而非完整实例 ID 运行；返还法术书沿用 foundation 定义级字段，完整实例化另立 change。

## Migration Plan

1. 先扩展通用响应窗口的强制阻塞配置和引擎回归测试。
2. 增加 Mage Wars typed resolution context 与三张卡的结构化配置校验。
3. 先实现 `1825` / `1901` 的法术取消链，再实现 `1904` 的可回避 / 不可回避分支。
4. 运行 Mage Wars 定向测试、引擎响应窗口测试、TypeScript、ESLint 和 OpenSpec 严格校验。
5. 全部通过后才把三张卡从 `needsCode` 改为 `implemented`，并更新领域建模统计。

## Open Questions

- 当前基础版是否需要把强制展示做成可见的临时卡面层，还是由事件 FX 直接展示后继续；本 change 只锁定领域事实和交互阻塞，不锁定完整 UI 布局。
