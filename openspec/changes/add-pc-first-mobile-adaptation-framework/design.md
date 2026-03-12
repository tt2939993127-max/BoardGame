## Context

当前项目已经有移动端适配基础，但主要仍是“桌面布局 + 缩放兜底”：

- 游戏页在手机竖屏下给出横屏建议。
- 页面允许浏览器缩放与手势平移。
- 某些页面通过 CSS 自动缩放适应手机横屏。

这个方向适合短期可用，但不适合很多游戏长期复用。尤其在王权骰铸这类桌游 UI 中，存在大量 hover、常驻侧栏、固定信息密度和精细拖拽交互，单靠 WebView 或浏览器容器不能解决问题。

## Goals / Non-Goals

- Goals:
  - 保持 **PC 为主**，桌面布局继续是权威版本。
  - 把移动端支持做成框架能力，而不是每个游戏各写一套手机 UI。
  - 把游戏层接入步骤沉淀成标准开发流程，作为后续 skill 供其他开发者复用。
  - 默认以 **手机横屏完整支持** 为目标，而不是强求所有游戏都做手机竖屏完整版。
  - 先用王权骰铸验证方案，再复用到更多游戏。
  - 让 WebView/App 壳成为后续分发放大器，而不是移动适配前提。

- Non-Goals:
  - 不把项目改成“移动端优先”产品。
  - 不为所有游戏同时提供完整竖屏版。
  - 不引入 React Native、Flutter 或第二套前端运行时。
  - 不在本次变更中实现原生小程序重写。
  - 不在本次变更中直接上架 iOS / Android 包。

## Decisions

### 1. 继续使用现有 React + Vite + UI Engine Framework 作为唯一前端运行时

这是最正确方案。

原因：

- 当前项目已经是成熟 Web 架构，已有大量游戏 UI、传输层和框架层代码。
- 用户要求 PC 为主，说明桌面版仍是产品主体验，不需要为移动端单独维护第二套技术栈。
- WebView/App 壳需要的不是第二套 UI，而是对现有 H5 运行时做容器封装。

因此，本提案不引入 React Native、Flutter 或小程序原生重写，而是在现有框架层内部新增移动适配壳。

### 2. 引入显式移动支持声明，而不是隐式猜测

为了支持很多游戏，manifest 必须显式描述移动端能力，而不是靠目录名、布局特征或人工记忆推断。

建议新增的 manifest 字段如下：

```ts
mobileProfile: 'none' | 'landscape-adapted' | 'portrait-adapted' | 'tablet-only';
preferredOrientation?: 'landscape' | 'portrait';
mobileLayoutPreset?: 'board-shell' | 'portrait-simple';
shellTargets?: Array<'pwa' | 'app-webview' | 'mini-program-webview'>;
```

其中：

- `mobileProfile` 说明手机支持级别。
- `preferredOrientation` 说明推荐方向。
- `mobileLayoutPreset` 让框架层知道该使用哪种移动适配壳。
- `shellTargets` 显式声明允许投放到哪些容器。

### 3. 采用“桌面主棋盘不重写，外围 UI 进入移动壳”的适配模式

这是本提案的核心。

对大多数复杂桌游而言，不应新写一份独立移动 Board，而应保持桌面主棋盘/牌桌为核心画布，再由框架层统一接管外围区域：

- 顶部阶段/状态 HUD 压缩
- 左右侧栏折叠为抽屉或切换面板
- 卡牌说明、日志、额外信息进入模态层或底部抽屉
- hover 行为由点击或长按替代
- 关键触控区域统一放大

这样能把大部分“移动适配成本”收敛到框架，而不是复制每个游戏的主体 UI。

### 4. 缩放与平移仍然保留，但只能作为兜底

当前项目已有缩放和平移逻辑，但它不能作为主方案。

规范上应要求：

- 关键操作不允许依赖用户先手动双指缩放才能触达。
- 缩放和平移只作为极端小屏或复杂布局的最后一道兜底。
- 新游戏不得把“可缩放”当成移动适配完成。

### 5. App WebView 选择 Capacitor 路线，但放在移动适配之后

后续如果要出 App 壳，优先选 `Capacitor`。

理由：

- 官方定位就是把现有 web app 放入原生运行时。
- 与当前 React/Vite 项目天然兼容。
- 后续可以按需补通知、分享、深链、系统能力，而不是一开始就重写。

但 WebView 只是分发壳，不是适配方案，所以必须建立在移动适配框架完成之后。

### 6. 微信小程序 `web-view` 只作为未来入口容器

微信官方文档当前明确写明：

- `web-view` 是承载网页的容器。
- 个人类型小程序暂不支持。
- 需要配置业务域名。
- 每页只能有一个 `web-view`，并自动铺满页面。
- 网页与小程序之间仅支持 JSSDK 提供的通信能力。

因此它不适合作为本次复杂桌游主运行时。

最正确定位是：

- 未来可以作为入口、分享、房间拉起容器。
- 不作为首个落地方向。
- 不要求为它设计独立 UI 体系。

### 7. 游戏层适配流程沉淀为独立 skill，而不是混入运行时 spec

这次 change 的 runtime 部分只负责两件事：

- 框架层提供真实可运行的移动适配能力。
- 游戏层通过 manifest 与少量例外处理接入这些能力。

但“游戏层怎么接入”会长期重复发生，而且会交给不同开发者执行，因此应该把这部分沉淀成独立 skill。

这个 skill 的定位应是：

- 输入：某个游戏现有 Board、manifest、交互组件。
- 输出：该游戏的移动接入步骤、检查清单、例外处理点和验收结果。
- 边界：skill 负责指导游戏层接入，不替代框架层代码，不定义运行时真相。

因此，本提案把“游戏层适配流程”视为后续 skill 的权威来源，但不把 skill 本身写成 runtime capability 或 spec requirement。

## Proposed Architecture

### Manifest Contract

游戏通过 manifest 显式声明自己的移动能力和分发容器目标。

### Runtime Consumption

运行时根据 manifest 选择行为：

- `mobileProfile = none`
  - 手机仅桌面降级或不暴露到壳容器
- `mobileProfile = landscape-adapted`
  - 启用横屏适配壳
- `mobileProfile = portrait-adapted`
  - 启用竖屏预设
- `mobileProfile = tablet-only`
  - 手机降级，平板完整

### Framework Layer

建议新增以下通用层能力：

- `MobileBoardShell`
  - 统一处理安全区、横屏视口和外围结构
- `ResponsivePanelDock`
  - 桌面常驻侧栏在手机横屏下变为抽屉/切换面板
- `TouchPreviewSurface`
  - 长按查看卡牌、状态、能力详情
- `MobileActionRail`
  - 在狭窄横屏下承载核心操作入口
- `MobileEffectPolicy`
  - 移动端统一调低高开销特效

### Pilot Strategy

首个落地点选择王权骰铸，因为它足够复杂，能覆盖：

- 主棋盘 + 手牌 + 阶段 HUD
- 左右侧栏
- hover 与预览
- 模态和交互链
- 手机上横屏信息密度控制

如果这套方案对王权骰铸成立，后续扩展到其他复杂游戏会更稳。

同时，王权骰铸试点还要产出一份“游戏层如何接入移动壳”的标准化流程，作为后续 skill 的首个样板。

## Risks / Trade-offs

- 王权骰铸当前存在不少 hover 和精细 pointer 交互，改造量不会为零。
- manifest 增加字段后，需要同步更新开发文档与新增游戏模板。
- 只做横屏适配意味着部分轻量游戏未来可能还需要单独追加竖屏预设。
- App WebView 未来仍受 App Store 审核约束，不能把简单网页外壳直接当成上架保证。

## Migration Plan

1. 先完成 spec、manifest 契约和框架层设计。
2. 用王权骰铸完成第一套 `landscape-adapted` 落地。
3. 验证完成后，再决定哪些游戏进入 `app-webview` 或 `mini-program-webview` 壳目标。
4. 后续新游戏接入时，先选 mobile profile，再决定是否需要额外适配。

## Open Questions

- 是否需要在大厅/详情页直接展示“手机横屏支持 / 仅平板 / 不推荐手机”等能力标签？
- `shellTargets` 是立即暴露给前端 UI，还是先作为内部控制字段？
