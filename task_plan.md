# Task Plan - DiceThrone 狂战士完整接入（先逻辑后UI）

<!-- 
WHAT: This file is your "Map". It tells you where you are going. 
WHY: To prevent "drift" and ensure you finish what you started.
WHEN: Update this file at the end of every "Phase".
-->

## Goal
<!-- A single, clear sentence defining what "Done" looks like. -->
> 完成 DiceThrone 多角色（monk/barbarian）逻辑接入与选角门禁，并在同一变更内分阶段实现选角 UI（房主开始后进入游戏）。

## Phases
<!-- 
Break the work into 3-5 logical phases. 
Mark status as: [ ] Pending, [/] In Progress, [x] Complete 
-->

- [/] **Phase 1: 需求梳理 & OpenSpec 变更**
    - [x] 读取规则文档（dicethrone/rule/）
    - [ ] 创建 OpenSpec change（proposal/tasks/必要的 spec delta）
    - [ ] 明确逻辑接入范围与角色选择门禁

- [ ] **Phase 2: 逻辑接入实现**
    - [ ] 支持 HeroState.characterId 为 monk|barbarian
    - [ ] 角色选择状态与命令（可重复选择）
    - [ ] 仅当所有玩家已选择角色时允许进入对局阶段
    - [ ] 根据角色初始化：牌库/技能/Token/资源/骰子
    - [ ] 补充/调整测试覆盖

- [ ] **Phase 3: UI 接入（同一变更内分阶段）**
    - [ ] 角色选择界面与提示文案
    - [ ] 显示玩家面板/提示板与头像精灵图映射
    - [ ] 房主“开始”按钮与选角完成提示

## Technical Decisions
<!-- Record major architectural choices here so you don't flip-flop. -->
| Decision | Rationale | Status |
| :--- | :--- | :--- |
| 角色选择数据写入 core（非仅 UI） | 需要联机一致性与回放确定性 | Pending |
| 通过 setupData 传入初始角色配置 | 与现有房间创建流程一致 | Pending |
| 角色未选齐时阻止阶段推进 | 满足“选完才开局”的规则 | Pending |

## Critical Errors / Blockers
<!-- Log anything that stopped you (3-Strike Rule). -->
| Error | Impact | Resolution |
| :--- | :--- | :--- |
| | | |
