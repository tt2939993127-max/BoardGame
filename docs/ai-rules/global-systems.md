# 全局系统与服务规范

> 本文档是 `AGENTS.md` 的补充，包含全局 Context 系统和实时服务层的详细规范。
> **触发条件**：使用/修改全局 Context、Toast、Modal、音频、教学、认证系统时阅读。

---

## 1. 通用 Context 系统 (`src/contexts/`)

所有全局系统均通过 Context 提供 API，**禁止**在业务组件内直接操作底层的全局 Variable。

- **Toast 通知系统 (`useToast`)**：
    - `show/success/warning/error(content, options)`。
    - 支持 `dedupeKey` 防抖，`error` 类型默认更长驻留。
- **弹窗栈系统 (`useModalStack`)**：
    - 采用类似路由的栈管理：`openModal`, `closeTop`, `replaceTop`, `closeAll`。
    - **规范**：所有业务弹窗必须通过 `openModal` 唤起，禁止自行在组件内维护独立的 `isVisible` 状态。
- **音频系统 (`useAudio` & `AudioManager`)**：
    - 统一管理 BGM 与 SFX。
    - **规范**：切换游戏时，必须通过 `stopBgm` 及 `playBgm` 重置音乐流。声音资源需经过 `compress_audio.js` 压缩。
- **教学系统 (`useTutorial`)**：
    - 基于 Manifest 的分步引导。支持 `highlightTarget` (通过 `data-tutorial-id`) 与 `aiMove` 模拟。
- **认证系统 (`useAuth`)**：
    - 管理 JWT 及 `localStorage` 同步。提供 `user` 状态与 `login/logout` 接口。
- **调试系统 (`useDebug`)**：
    - 运行时的 Player ID 模拟（0/1/Spectator）及 `testMode` 开关。

---

## 2. 实时服务层 (`src/lib/` & `src/services/`)

- **LobbySocket (`LobbySocketService`)**：
    - 独立于 boardgame.io 的 WebSocket 通道，用于：
        1. 大厅房间列表实时更新。
        2. 房间内成员状态（在线/离线）同步。
        3. 关键连接错误（`connect_error`）的上报。
    - **规范**：组件销毁时必须取消订阅或在 Context 层面统一维护。
- **服务系统 (`src/systems/`)**：
    - **状态效果系统 (`StatusEffectSystem`)**：提供标准的 Buff/Debuff 生命周期管理、叠加逻辑及 UI 提示。
    - **技能系统 (`AbilitySystem`)**：管理游戏技能的触发逻辑、前置条件校验及消耗结算。

---

## 3. 通用 UI 系统

- **GameHUD (`src/components/game/GameHUD.tsx`)**：
    - 游戏的"浮动控制中心"。整合了：
        1. 退出房间、撤销、设置。
        2. 多人在线状态显示。
        3. 音效控制入口。
    - **规范**：新游戏接入必须包含 GameHUD 或其变体。
