# 规则与游戏逻辑

本路由处理“现实规则结果不对、时机不对、状态或结算不对”的任务。先读规则 workflow，再读对应的通用合同和游戏真相源。

## 通用规则修复与机制审查

- 修复卡牌、技能、Token、状态、阶段、伤害、资源、等级效果或剧本流程：读 [`rule-bug-fix-workflow`](../../skills/rule-bug-fix-workflow/SKILL.md)、[`rule-contract-audit`](../standards/rule-contract-audit.md) 和 [`regression-closeout`](../standards/regression-closeout.md)。
- 新增或全面审查技能、被动、主动、事件卡和游戏机制：读 [`description-to-implementation-audit`](../standards/description-to-implementation-audit.md)、[`engine-systems`](../standards/engine-systems.md)；需要审计流程时转 [`测试与审计`](testing.md)。
- 从 TTS、外部脚本、旧平台或解包资源还原规则/UI：读 [`rule-contract-audit`](../standards/rule-contract-audit.md) 中的零猜测门禁，再按表现层转 [`UI 与截图交付`](ui.md)。
- 用户明确要求偏离规则书或既有实现：先读 [`用户故事入口`](../../../docs/user-stories/README.md)，把裁定作为本次业务真相源，不擅自改写通用规则。

## DiceThrone

- 修改共享攻击结算、攻击目标掷骰、伤害结算、攻击后事件：读 [`攻击结算不变量`](../../../docs/games/dicethrone/attack-settlement-invariants.md) 和 [`Token 主动使用合同`](../../../docs/games/dicethrone/token-active-use-custom-action.md)。
- 修改进攻/防御掷骰、红色即时牌、黄色防御阶段牌、响应窗口、修改自己或对方骰子、奖励骰、战术优势或主动 Token：读 [`卡牌时机术语`](../../../docs/games/dicethrone/card-timing-terms.md)（含 Token 直接使用与响应收口）和 [`rule-contract-audit`](../standards/rule-contract-audit.md)，再按截图回归转 [`测试与审计`](testing.md)。
- 新增 DiceThrone 英雄或录入角色素材：转 [`资源与数据录入`](data-assets.md) 的 DiceThrone 录入入口，不在本路由重复 intake 流程。
- 只改 DiceThrone 文案或资源路径：读 [`DiceThrone 国际化`](../../../docs/games/dicethrone/dicethrone-i18n.md)，资源处理转 [`资源与数据录入`](data-assets.md)。

## 其他游戏规则入口

- Smash Up POD、自动映射和卡牌配置一致性：读 [`POD 规则系统`](../../../src/games/smashup/rule/POD-SYSTEM.md) 与 [`POD 架构说明`](../../../docs/games/smashup/refactor/pod/pod-system-architecture.md)。
- Smash Up 消灭触发、`pendingSave` 和防止消灭交互：读 [`消灭与 pendingSave`](../../../docs/games/smashup/destroy-pending-save.md) 与 [`Smash Up 引擎指南`](../../../src/games/smashup/rule/ENGINE_GUIDE.md)。
- 山屋惊魂规则/UI 结果回归：读 [`山屋惊魂牌桌合同`](../../../docs/games/betrayal/user-stories/board-ui-trait-haunt-status-contract-2026-07-31.md) 和 [`山屋惊魂规则书`](../../../docs/games/betrayal/sources/official/betrayal-3e-rulebook-en.md)，表现验收转 [`UI 与截图交付`](ui.md)。
- Mage Wars 规则到法术书、骰子、Token、地图层级或 UI：读项目 [`Mage Wars 设计记忆 skill`](../../skills/mage-wars-ui-design-memory/SKILL.md)、用户纠正台账和 `docs/games/mage-wars/rule/`。
- 七大恨区域 mask、拓扑或正式区/运行时区分层：读 [`区域 mask 真相源`](../../../docs/games/qidahen/workflows/qidahen-region-mask-truth-sources.md) 和 [`区域拓扑真相源`](../../../docs/games/qidahen/workflows/qidahen-region-topology-truth-sources.md)。
- 新游戏领域建模、决策点和引擎缺口：读 [`engine-systems`](../standards/engine-systems.md) 的领域建模入口及 [`engine-ability-framework`](../standards/engine-ability-framework.md)。
