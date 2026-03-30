# Change: 创建房间内统一 AI 配置与偏好持久化

## Why
当前 AI 相关配置被拆成了“创建房间”和“本地 AI 独立弹窗”两套入口，人数、模组和 AI 座位的设置会分散在不同弹窗里。用户希望把 AI 配置直接并入创建房间，让“多人和 AI 对战”走主流程，同时继续记住最近一次的 AI 偏好。

## What Changes
- 扩展“创建房间”弹窗，使其成为唯一的 AI 开局配置入口，直接承载 AI 座位配置。
- 创建房间弹窗继续复用通用字段能力，至少支持：
  - `playerOptions` 声明的人数选择
  - `setupOptions` 声明的单选 / 多选字段
- 创建房间时，系统必须把 AI 座位配置和 setup 选项写入房间 `setupData`，并让房主客户端负责托管这些 AI 座位。
- 游戏详情弹窗不再提供单独的“对战 AI”按钮，AI 相关入口统一收敛到“创建房间”。
- 增加“AI 开局偏好”持久化：
  - 游客：仅保存在浏览器本地
  - 登录用户：保存在账号级用户设置数据库
- 首个试点是大杀四方，要求可配置人数与已启用模组（当前为 Titans）。

## Impact
- Affected specs:
  - `local-ai-match-settings`
  - `manage-user-settings`
- Affected code:
  - `src/components/lobby/GameDetailsModal.tsx`
  - `src/components/lobby/CreateRoomModal.tsx`
  - `src/pages/MatchRoom.tsx`
  - `src/engine/ai/seatControllers.ts`
  - `src/pages/LocalMatchRoom.tsx`
  - `src/api/user-settings.ts`
  - `apps/api/src/modules/user-settings/`
  - `src/server/claimSeat.ts`
