# Change: add-pc-first-mobile-adaptation-framework

## Why

项目已经有基础的移动端兜底能力，但当前方案主要依赖横屏提示、CSS 缩放、双指缩放和平移，适合少量页面救急，不适合作为“很多游戏都要从一开始就适配好”的长期方案。

当前还存在三个结构性问题：

- 项目目标仍然是 **PC 为主**，但缺少“PC 主导、移动端适配”的统一框架契约。
- 现有移动端策略是路由级和页面级兜底，不能规模化复用到很多游戏。
- WebView / App 壳可以帮助分发，但它只是容器，不会自动把桌面桌游 UI 变成好用的手机横屏 UI。

用户希望先从王权骰铸落地，同时评估 WebView 是否有助于后续支持更多轻量/小游戏式体验。因此需要先把移动适配和壳策略明确为一套正式提案。

## What Changes

- 新增“PC 主导、移动端横屏适配”的统一框架能力，要求游戏通过显式 profile 声明自己的移动支持级别，而不是各自隐式处理。
- 在 `GameManifestEntry` 中新增移动端与壳目标元数据，用于声明：
  - 手机支持级别
  - 推荐方向
  - 适配预设
  - 可投放容器目标（PWA / App WebView / 小程序 web-view）
- 在 UI 框架层新增 `landscape-adapted` 适配壳思路：保留桌面主棋盘/牌桌为核心画布，只把外围 HUD、侧栏、日志、预览、hover 交互统一改造成移动端可用形式。
- 以王权骰铸作为第一款落地样板，验证“桌面 UI 为主、不重写整套 Board、仅通过通用适配壳完成横屏支持”的可行性。
- 将“游戏层如何接入移动适配框架”的流程显式沉淀为开发者工作流来源，作为后续独立 skill 的权威输入，而不是让每个开发者自行摸索。
- 明确容器策略：H5 / PWA 继续作为唯一真实运行时；App WebView 作为后续分发壳；微信小程序 `web-view` 仅作为未来入口容器，不作为本次主运行时目标。

## Impact

- Affected specs:
  - `game-registry`（新增 manifest 显式移动端声明要求）
  - `mobile-support-framework`（新 capability）
- Affected code:
  - `src/games/manifest.types.ts`
  - `src/components/game/framework/`
  - `src/components/common/`
  - `src/pages/MatchRoom.tsx`
  - `src/pages/LocalMatchRoom.tsx`
  - `src/games/dicethrone/`
  - `docs/mobile-adaptation.md`
  - 后续独立 skill 的输入材料（不作为本 change 的 runtime spec）
