# 王权骰铸试点

`dicethrone` 是这个方向的首个试点样板，因为它足够复杂，能覆盖大部分真实问题。

## 已知高风险文件

- `src/games/dicethrone/Board.tsx`
  - 主界面信息密度高，桌面结构重，侧栏和主区域关系紧。
- `src/games/dicethrone/ui/HandArea.tsx`
  - 手牌交互明显偏向桌面拖拽。
- `src/games/dicethrone/ui/PhaseIndicator.tsx`
  - 阶段信息和辅助说明偏向 hover 体验。
- `src/games/dicethrone/ui/statusEffects.tsx`
  - 状态说明偏向 hover 查看。

## 试点目标

- 不重写第二套移动端 Board。
- 保留桌面主画布，用通用 `board-shell` 承接外围移动壳。
- 把 hover、侧栏、说明面板、预览入口改成触屏可用模型。
- 把王权骰铸沉淀成后续其他游戏可复用的接入模板。

## 推荐 manifest

首轮推荐直接使用：

```ts
mobileProfile: 'landscape-adapted'
preferredOrientation: 'landscape'
mobileLayoutPreset: 'board-shell'
shellTargets: ['pwa']
```

不要在第一轮就加 `app-webview` 或 `mini-program-webview`。

## 推荐游戏层例外

- 手牌：提供点击选中、点击确认或面板内确认路径，不把拖拽当成唯一主路径。
- 状态说明：提供点击或长按后的详情面板。
- 阶段说明：把 hover 辅助说明转成固定入口或底部抽屉。
- 侧栏：把桌面常驻面板折叠成切换面板、抽屉或标签页。

## 成功标准

当下面都成立时，说明试点成立：

- 玩家能在手机横屏完成一个完整回合。
- 玩家能查看手牌、状态、阶段、日志，不依赖桌面 hover。
- 玩家不需要先双指缩放，才能完成核心操作。
- 保留原有桌面布局权威性，没有复制一套移动端专用 Board。

## 对后续游戏的启发

如果王权骰铸都能用 `landscape-adapted + board-shell` 成立，那么：

- 更轻的卡牌游戏通常也能成立。
- 未来 App WebView 只需要做容器封装，不需要再发明第二套 UI 体系。
- 小程序 `web-view` 也可以作为入口壳，但前提仍然是 H5 自身已经适配完成。
