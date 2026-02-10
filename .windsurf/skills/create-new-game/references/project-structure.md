# 项目结构速览（新游戏相关）

## 关键入口
- `src/games/<gameId>/`：每个游戏的独立目录
- `src/games/<gameId>/manifest.ts`：游戏清单条目（id 必须与目录名一致）
- `src/games/<gameId>/game.ts`：使用引擎适配器创建 Boardgame.io Game
- `src/games/<gameId>/Board.tsx`：渲染与交互 UI
- `src/games/<gameId>/tutorial.ts`：教程配置
- `src/games/<gameId>/audio.config.ts`：游戏音频配置
- `src/games/<gameId>/thumbnail.tsx`：缩略图组件
- `src/games/<gameId>/domain/`：领域内核（types/ids/commands/execute/reducer/flowHooks）
- `src/games/<gameId>/ui/`：游戏 UI 子模块（Board.tsx 拆分）
- `src/games/<gameId>/config/` 或 `data/`：静态数据配置
- `src/games/<gameId>/rule/`：规则文档
- `src/games/<gameId>/__tests__/`：测试文件

## 引擎与系统
- `src/engine/adapter.ts`：`createGameAdapter`（Boardgame.io 适配器）
- `src/engine/systems/`：引擎系统（Flow/Undo/Prompt/Log/Rematch/Tutorial/ResponseWindow/EventStream/Cheat）
- `src/engine/systems/index.ts`：`createDefaultSystems` 入口
- `src/systems/`：通用系统（Dice/Resource/Card/Ability/StatusEffect/Token）

## 清单生成
- `scripts/game/generate_game_manifests.js`：扫描 `src/games/*/manifest.ts` 自动生成清单
- `src/games/manifest*.generated.ts(x)`：自动生成，禁止手改
- `npm run generate:manifests`：生成命令

## 参考游戏（按复杂度排序）
- `src/games/dicethrone/`：最复杂（角色/骰子/攻防/状态效果/Token响应）
- `src/games/summonerwars/`：中等复杂（网格棋盘/单位管理/阵营牌组/技能系统）
- `src/games/smashup/`：中等复杂（多人支持/基地记分/派系混搭/持续效果）
- `src/games/tictactoe/`：最小实现（仅供理解骨架）

## 框架复用层
- `src/core/ui/`：UI 类型契约层
- `src/components/game/framework/`：骨架组件层（跨游戏复用）
- `src/components/common/animations/`：通用动效组件
