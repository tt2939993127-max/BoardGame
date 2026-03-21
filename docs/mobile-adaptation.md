# 移动端适配说明

## 当前结论

- 前端运行时仍然只有一套：`React + Vite + 现有 UI / 引擎框架`。
- 产品策略是 `PC 为主，移动端做适配`。
- 移动端以 `手机横屏尽量适配` 为主，不承诺所有游戏都完整支持。
- `WebView / App 壳 / 小程序 web-view` 只是分发容器，不是第二套 UI。
- 移动端适配的真实验收对象，是同一套 H5 / PWA 在手机与平板视口下的真实交互。

## PC 优先硬规则

### 1. PC 是唯一权威布局

- PC 的视觉层级、尺寸基线、布局流和主交互路径默认不可动。
- 任何移动端适配都必须证明“不会影响 PC”。
- 一旦出现“为了适配手机而把桌面一起缩小”的方案，默认视为错误实现。

### 2. 移动端改动只能条件化生效

- 允许的移动端改动包括：窄屏压缩、触控替代入口、抽屉化次要信息、底部操作轨道、安全区适配。
- 这些改动必须只在移动条件下生效，不能全局覆盖。
- 推荐门控顺序：
1. [mobileSupport.ts](/F:/gongzuo/webgame/BoardGame/src/games/mobileSupport.ts) 的 `1023px` 视口断点。
2. manifest 驱动的 `mobileProfile / mobileLayoutPreset`。
3. `(pointer: coarse)` 仅用于 hover 替代入口显隐，不可单独用来压缩 PC 尺寸。

### 3. 不接受的做法

- 不接受全局调小 `clamp(...)` 来“顺带适配”移动端。
- 不接受把桌面常驻侧栏改成所有视口都生效的抽屉。
- 不接受要求用户双指缩放之后再完成主操作。
- 不接受为了移动端复制一套完整桌面 UI。

## manifest 契约

每个启用中的 `manifest.ts` 必须显式声明移动能力：

```ts
mobileProfile: 'none' | 'landscape-adapted' | 'portrait-adapted' | 'tablet-only';
preferredOrientation?: 'landscape' | 'portrait';
mobileLayoutPreset?: 'board-shell' | 'portrait-simple' | 'map-shell';
shellTargets?: Array<'pwa' | 'app-webview' | 'mini-program-webview'>;
```

字段含义：

- `mobileProfile`
  - `none`：暂不承诺手机可用。
  - `landscape-adapted`：手机横屏适配。
  - `portrait-adapted`：手机竖屏适配。
  - `tablet-only`：手机降级，平板 / PC 优先。
- `preferredOrientation`
  - 用于横竖屏提示策略。
- `mobileLayoutPreset`
  - `board-shell`：复杂桌游的横屏外壳方案。
  - `portrait-simple`：轻量游戏的竖屏方案。
  - `map-shell`：地图区自己缩放拖拽，HUD 保持原始尺寸，不做整页缩放；移动端应支持触摸拖拽/双指缩放。
- `shellTargets`
  - 标记允许进入哪些分发容器。

## 当前实现

### 1. manifest 驱动

- [mobileSupport.ts](/F:/gongzuo/webgame/BoardGame/src/games/mobileSupport.ts) 负责归一化默认值和运行时判断。
- [games.config.tsx](/F:/gongzuo/webgame/BoardGame/src/config/games.config.tsx) 在注册表阶段把 manifest 补成显式字段。
- `scripts/game/generate_game_manifests.js` 会校验启用中的 manifest 是否显式声明必需字段。

### 2. 页面根节点数据属性

对局页会输出：

- `data-game-page`
- `data-game-id`
- `data-mobile-profile`
- `data-preferred-orientation`
- `data-mobile-layout-preset`
- `data-shell-targets`

这些属性是移动壳、横竖屏提示和 CSS fallback 的统一消费入口。

### 3. 通用移动壳

- `src/components/game/framework/MobileBoardShell.tsx`

职责：

- 承接安全区 `padding`
- 作为顶部 rail、侧边 dock、底部 action rail 的统一壳层
- 不重写游戏 `Board` 本体

### 4. 横竖屏提示

- `src/components/common/MobileOrientationGuard.tsx`

按 manifest 判断：

- 横屏游戏在手机竖屏时提示旋转
- 竖屏游戏在手机横屏时提示切回竖屏
- `tablet-only` 游戏提示使用平板或 PC
- `none` 游戏提示当前不推荐手机端

### 5. CSS fallback

- `src/index.css`

当前仍保留横屏缩放兜底，但只对同时满足以下条件的页面生效：

- `mobileProfile="landscape-adapted"`
- `mobileLayoutPreset="board-shell"`

它只是兜底，不是适配完成的标准。

## 已声明的首批 profile

- `dicethrone`
  - `landscape-adapted`
  - `board-shell`
  - `shellTargets = ['pwa', 'app-webview', 'mini-program-webview']`
- `tictactoe`
  - `portrait-adapted`
  - `portrait-simple`
- `summonerwars`
  - `landscape-adapted`
  - `map-shell`
- `smashup`
  - `landscape-adapted`
  - `board-shell`

说明：

- `dicethrone` 当前已经声明更多容器目标，这是仓库现状记录，不代表后续新游戏首轮接入也应照抄。
- 对新的复杂桌游或新的首轮接入，仍默认从 `shellTargets = ['pwa']` 起步。

## 新游戏接入要求

新增游戏时必须做三件事：

1. 在 `manifest.ts` 里显式声明 `mobileProfile`。
2. 选择匹配的 `mobileLayoutPreset`。
3. 再决定是否允许投放到 `app-webview` / `mini-program-webview`。

不能再依赖：

- “响应式会自动适配”
- “先让浏览器缩放顶住”
- “后面再猜这个游戏算不算支持手机”

## 验证要求

- 桌面端仍是主要覆盖面；移动端适配不是把所有桌面测试重跑一遍。
- 只要本次改动涉及移动布局、触控替代入口、侧栏折叠、移动轨道或桌面防回归，就必须做 PC 对比验收。
- 只要本次改动涉及移动端 UI / 交互，就必须补 H5 移动视口 E2E。
- 优先复用同一条测试流程，通过参数化或切换 viewport 运行，而不是复制两份测试文件。
- 每个支持移动的游戏通常补 1 到 3 条关键移动验收路径即可。
- 至少覆盖 1 个手机横屏视口和 1 个平板横屏视口。
- 需要快速构造局面时，优先使用 TestHarness。
- 运行 `npm run test:e2e:ci -- <测试文件名>`，保留截图并写入 `evidence/`。

## Android first 落地

当前仓库采用 `Capacitor + Android WebView` 作为第一阶段原生壳方案：

- Web 运行时保持不变，仍然是同一套 `React + Vite` 构建产物。
- Android 壳只负责把 `dist/` 打包进原生容器，不单独维护第二套前端。
- Android 构建使用 `vite build --mode android`，因此 App 专用后端地址必须放在 `.env.android` 或 `.env.android.local`。

当前自动化脚本：

- `npm run mobile:android:doctor`
- `npm run mobile:android:init`
- `npm run mobile:android:sync`
- `npm run mobile:android:open`
- `npm run mobile:android:build:debug`

服务端若要放行原生壳请求，需在生产 `.env` 里增加：

```env
APP_WEB_ORIGINS=http://localhost,https://localhost,capacitor://localhost
```

这不会影响现有 Docker / Pages 主链路，只是在已有 `WEB_ORIGINS` 之外追加原生容器 origin。

## 后续实施顺序

1. 继续把 `board-shell` 框架能力补齐。
2. 以 `dicethrone` 作为首个完整 pilot。
3. 再把游戏层接入流程沉淀成独立 skill，供其他开发者复用。


## 2026-03 横向溢出防回归补充

### 1) 缩放表达式规范（强制）
- 禁止：`transform: scale(calc(100vw / 1280))`。
- 原因：`scale()` 需要无单位数字；上式会退化为无效值，浏览器可能按 `transform: none` 处理。
- 正确：`transform: scale(calc(100vw / 1280px))`，或先定义变量再 `scale(var(--mobile-board-shell-scale))`。

### 2) board-shell 选择器命中规范（强制）
- 默认使用后代选择器：`[data-game-page... ] .mobile-board-shell`。
- 不要默认写直系子：`> .mobile-board-shell`。
- 原因：不同页面层级（MatchRoom / LocalMatchRoom / TestMatchRoom）可能不一致，直系子容易漏命中。

### 3) 缩放壳层内高度规范（强制）
- 在被缩放的壳层内，内部主容器优先使用 `h-full` 跟随外层 shell。
- 禁止“外层 scale + 内层 `h-dvh` / `100dvh` 锁高”的组合。
- 原因：会放大底部空白或导致交互区视觉错位。

### 4) 允许按 gameId 覆盖设计宽度
- 通用默认设计宽度可为 `1280px`。
- 对复杂游戏允许按 `data-game-id` 局部覆盖（例如 DiceThrone 使用 `940px`）。
- 覆盖只能在移动条件下生效，不得改动 PC 设计基线。

### 5) 移动端 E2E 布局断言（强制）
除功能断言外，至少补 3 条布局断言：
1. `documentElement/body/#root` 满足 `scrollWidth <= innerWidth + 1`。
2. `.mobile-board-shell` 的 left/right 边界落在视口内。
3. 关键入口（如 Roll / Confirm / 放大入口）位于视口内可点击。

### 6) 结论证据要求
- E2E 结论必须附“已人工核对”的截图绝对路径。
- 仅有日志或断言通过，不足以判定“移动端布局正常”。
