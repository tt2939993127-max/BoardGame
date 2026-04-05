# DiceThrone v2 布局编辑器升级卡铺满验证

## 范围

- 目标：验证 `dicethronev2`（枪手/武士布局版本）在布局编辑器中，技能升级卡是否会铺满用户划定的槽位尺寸。
- 代码范围：
  - `src/games/dicethrone/ui/AbilityOverlays.tsx`
  - `src/games/dicethrone/ui/BoardOverlays.tsx`
  - `e2e/dicethrone-debug-panel-test.e2e.ts`

## 验证方式

- 先尝试执行 `npm run test:e2e:ci:file -- e2e/dicethrone-debug-panel-test.e2e.ts "布局编辑器里 v2 技能升级卡应铺满槽位"`。
- 仓库门禁拦截原因：
  - 先遇到另一条 `smashup` 重任务占用锁。
  - 放开并发后又被全局重任务预算拦截：可用内存仅 `0.52GB`，低于项目要求的 `2.5GB`。
- 因此改用轻量浏览器验证：
  - 复用当前开发环境 `http://127.0.0.1:4173`
  - 用 Playwright + `__BG_TEST_HARNESS__` 注入枪手 `v2` 面板场景
  - 将 `revolver` 升到 2 级
  - 打开布局编辑器并量测 `[data-upgrade-preview-slot="fist"]` 与其首个子节点尺寸

## 自动量测结果

- 容器宽度：`98.14064025878906`
- 容器高度：`116.390625`
- 预览宽度：`98.14064025878906`
- 预览高度：`116.390625`
- 宽度差：`0`
- 高度差：`0`

结论：升级卡实际渲染节点已经和槽位容器同宽同高，不再维持旧的“按固定卡牌比例居中，左右或上下留白”的行为。

## 截图证据

### 1. 全局布局编辑截图

![全局布局编辑截图](../test-results/evidence-screenshots/manual-dicethrone-v2-layout-editor-upgrade-fill.png)

人工观察：

- 枪手 `v2` 面板的 8 个技能槽都显示了编辑框，说明验证场景确实进入了布局编辑模式。
- `fist` 槽位左上角的升级卡区域没有再出现“内容宽度明显小于编辑框”的收缩现象。
- 本次开发环境里升级卡 atlas 未完成像素加载，画面显示的是 `atlas-shimmer` 占位层，因此本轮截图重点验收的是边界、留白和尺寸，不是卡面内容。

### 2. `fist` 槽位近景截图

![fist 槽位近景](../test-results/evidence-screenshots/manual-dicethrone-v2-layout-editor-upgrade-fill-slot-fist.png)

人工观察：

- 灰色占位层已经贴到槽位的四条边，没有左右留白。
- 占位层高度也与槽位一致，没有上下缩进。
- 右下角黄色 resize 手柄仍在槽位角上，说明“铺满预览”和编辑手柄没有互相遮挡错位。

## 风险与未覆盖项

- 本轮没有在重任务门禁允许的前提下跑通仓库标准 `test:e2e:ci:file`，因此新增的 E2E 用例只做了代码落地，未在该链路下完成正式回归。
- 当前开发环境中升级卡 atlas 仍显示 shimmer，占位层尺寸已验证正确，但“真实卡图像素加载后是否同样完全铺满”依赖同一 DOM 尺寸约束，理论上应一致。
