# Change: DiceThrone 多角色选角门禁与狂战士接入（分阶段）

## Why
当前 DiceThrone 仅支持 monk，无法在对局中选择狂战士；且缺少“独立选角界面 + 房主开始”的完整选角流程。需要提供多角色选择与选角门禁的完整能力，并按“先逻辑后 UI”的方式分阶段交付。

## What Changes
- 新增 DiceThrone 角色编目（monk、barbarian）与可选角色列表。
- 增加选角状态与指令：每位玩家选择一个角色，允许重复选择。
- 新增选角门禁：未全部选角 + 房主未点击开始前禁止进入正式回合阶段。
- 根据所选角色初始化：牌库/技能/Token/资源/骰子配置。
- 补充测试覆盖（选角门禁、角色初始化）。
- UI 选角界面与视觉表现纳入本次变更，但按“逻辑→UI”阶段执行（独立选角界面，房主点击开始进入游戏）。

## Impact
- Affected specs: `dicethrone-hero-selection`（新增）
- Affected code: `src/games/dicethrone/domain/*`, `src/games/dicethrone/barbarian/*`, `src/games/dicethrone/monk/*`, 相关测试
