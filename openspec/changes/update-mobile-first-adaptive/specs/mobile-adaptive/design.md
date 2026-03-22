# Mobile-Adaptive 设计约定（项目级）

本设计文档描述如何在本项目中落地 `mobile-adaptive` 能力。

## 1. 断点与方向（唯一裁决）

### 1.1 方向判定

- `portrait`: `height >= width`
- `landscape`: `width > height`

### 1.2 关键断点（对局页优先）

- `mobile`: `width < 768`
- `tablet`: `768 <= width < 1024`
- `desktop`: `width >= 1024`

### 1.3 “紧凑横屏”特例

iOS Safari 横屏可视高度常常很低（地址栏/工具栏影响），对局页允许采用更宽松的 bottom 约束。

- `tightLandscape`: `width >= 800 && height <= 420`

## 2. 布局策略（对局页）

### 2.1 禁止整页缩放

- 禁止通过 `#root { transform: scale(...) }` 或类似策略塞入内容。
- 若需要缩放，仅允许对“非关键装饰层”使用，并需确保交互 hit-area 仍达标。

### 2.2 容器约束 + 内部滚动（推荐模式）

对局页整体采用：

- 页面本体尽量不滚动（或仅允许极小误差）
- 在内部区域使用滚动容器承载可溢出的内容

实现要点：

- 使用 `dvh`/`svh`（若已在项目内封装则使用封装）保证 iOS 地址栏变化的稳定性
- 使用 `env(safe-area-inset-*)` 处理安全区
- flex 容器中出现 `overflow-y-auto` 时，子元素必须满足 `min-h-0`（遵守 `docs/ai-rules/ui-ux.md`）

### 2.3 横屏布局

横屏优先“左右分栏”以提升战场高度：

- 左：战场/公共信息
- 右：手牌/行动区（或可折叠面板）

竖屏优先“上下分区”：

- 上：信息条 + 战场
- 下：手牌/行动区

## 3. 触控热区

### 3.1 最小热区

- 触控元素 hit-area 最小 44x44 CSS px
- 推荐 48x48

### 3.2 扩大热区的允许方式

- 给可点击元素增加 padding
- 增加不可见 click target（伪元素或 wrapper），但需要保证 `aria`/可访问性与 `data-testid` 仍然准确

## 4. Hover 替代策略

- PC 可继续保留 hover（提示/高亮）
- 移动端必须提供替代触发：点击弹层/长按/信息按钮
- 禁止“只有 hover 才能看到关键信息”的交互

## 5. 资源分级加载

### 5.1 分级

- P0（首屏关键）：对局核心 UI、必要字体（如有）、关键卡牌的首屏图片
- P1（短延迟）：非首屏卡牌图、音效、轻量动效
- P2（按需）：教程资源、复杂粒子/特效、重资产

### 5.2 策略

- `P0` 在进入对局页后立即加载
- `P1` 在首屏稳定后（例如下一帧/空闲时段）加载
- `P2` 在用户触发时加载（打开教程/查看大图/进入设置）

### 5.3 WebView 优先策略（首屏速度 + 交互流畅）

当运行在 WebView（WKWebView/Android WebView）或性能较弱设备时：

- P1/P2 的 warm preload 必须分批、限并发，并且可暂停/可恢复。
- 当检测到用户正在进行滑动/拖拽时，应延后启动批量加载或进一步降低并发。

推荐默认值（可根据数据调整）：

- `maxConcurrentImagePreload`: 2~4
- `batchSize`: 8~16
- `pauseOnHidden`: true（`visibilitychange` hidden 时暂停）
- `resumeOnVisible`: true

## 6. 可测试性约定（E2E）

对局页建议提供稳定的 `data-testid`：

- `[data-testid="<gameId>-board"]` 根容器
- `[data-testid="<gameId>-battlefield"]` 核心战场区
- `[data-testid="<gameId>-hand-area"]` 手牌区
- `[data-testid="<gameId>-phase-indicator"]` / `[data-testid="<gameId>-turn-number"]` 等关键状态

测试断言优先检查：

- 核心区可见、无明显横向溢出
- board 与关键区 bottom 不超过 viewport（tightLandscape 允许更松）
- root 无 scale
