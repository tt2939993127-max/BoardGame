# SummonerWars FAB 展开锚点修复 E2E 证据

## 范围

- 目标问题：游戏内悬浮球展开后，`undo` / `action-log` 面板下坠到 `settings` 那一层，而不是跟随当前被点击的按钮。
- 验证链路：`SummonerWars` 现有用例 `移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮`。
- 代码范围：
  - `src/components/system/FabMenu.tsx`
  - `e2e/summonerwars.e2e.ts`

## 执行命令

```bash
npm run test -- src/components/__tests__/GameHUDChatPreview.test.ts
npm run test:e2e:ci:file -- e2e/summonerwars.e2e.ts "移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮"
```

## 截图证据

### 1. 顶部溢出时，行为日志面板跟随 action-log 按钮

绝对路径：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮\30-mobile-fab-expanded-top-overflow-recovered.png`

![30-mobile-fab-expanded-top-overflow-recovered](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮/30-mobile-fab-expanded-top-overflow-recovered.png)

肉眼观察：
- 右侧被点亮的是 `action-log` 图标，黑色“行为日志”面板贴在这颗按钮所在行，不再下坠到下方 `settings` 那一格。
- 面板整体完整留在视口内，顶部没有再被推出屏幕。
- 右侧阶段栏的“结束阶段”按钮仍可见，没有被展开面板挤走。

### 2. 顶部溢出时，undo 面板跟随 undo 按钮

绝对路径：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮\30a-mobile-fab-expanded-top-undo-anchor-recovered.png`

![30a-mobile-fab-expanded-top-undo-anchor-recovered](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮/30a-mobile-fab-expanded-top-undo-anchor-recovered.png)

肉眼观察：
- 被点亮的是 `undo` 图标，半透明“撤销操作 / 暂无可撤回操作”面板与 `undo` 按钮处在同一垂直层级。
- `settings` 按钮仍在 `undo` 按钮下方，说明“贴主球最近的是 settings”这个业务顺序还在，但 `undo` 面板没有再被它一起拖下去。
- 面板没有溢出到视口外，地图与手牌区仍保持可见。

### 3. 底部溢出时，undo 面板仍跟随 undo 按钮

绝对路径：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮\31a-mobile-fab-expanded-bottom-undo-anchor-recovered.png`

![31a-mobile-fab-expanded-bottom-undo-anchor-recovered](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：展开后的悬浮球上下拖拽时展开框仍会收回视口并让出结束阶段按钮/31a-mobile-fab-expanded-bottom-undo-anchor-recovered.png)

肉眼观察：
- 即使切到另一侧溢出回收场景，`undo` 面板仍贴着被点亮的 `undo` 按钮，没有重新掉回 `settings` 的层级。
- 右侧悬浮按钮列、地图区域、阶段栏都仍在屏幕内，没有出现新的遮挡或裁切。
- 展开后的 HUD 没有把主战场内容完全盖死，仍保留了对局上下文。

## 结论

- `FabMenu` 的垂直锚点已从“整列 referenceRect”改回“当前按钮自身 rect 优先”，同时保留越界时的视口内回收。
- 实际 E2E 截图证明：`action-log` 和 `undo` 面板都会跟随自己按钮展开，不再统一下坠到 `settings` 那一层。
