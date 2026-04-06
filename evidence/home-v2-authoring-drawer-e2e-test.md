# Home V2 作者态真实画布流程 E2E 证据

## 范围

- 页面入口：`/?homeV2Draft=1&author=1`
- 目标：
  - 默认态左右栏和底部源码抽屉收起，不再常驻挡住书页
  - 点击画布节点后，右侧属性抽屉自动打开并聚焦当前节点
  - `图层 / 组件 / 资源` 共用同一个左抽屉，而不是三栏工作台
  - 图层树支持拖拽重排，并支持拖入容器
  - 画布支持框选、多选和群组移动，而不是只能单节点裸拖
  - 画布内支持把节点直接拖进容器，并在释放后真正修改父子关系
  - 右下角 / 边缘控制柄支持 `Shift` 锁比例与 `Alt` 中心缩放
  - 缩放中的辅助提示直接用中文显示，而不是英文开发态文案
  - 左右抽屉与底部源码抽屉支持拖拽改尺寸
  - `高级源码` 抽屉可以展开与收起

## 正式 E2E

- 测试文件：`e2e/lobby.e2e.ts`
- 用例名：`Home v2 作者态按真实画布流程工作：选中即开属性、同抽屉切换与尺寸拖拽`
- 执行命令：

```bash
npm run test:e2e:ci:file -- lobby.e2e.ts "Home v2 作者态按真实画布流程工作：选中即开属性、同抽屉切换与尺寸拖拽"
```

- 结果：`1 passed`

## 断言链路

- 进入作者态后，校验 `home-v2-left-drawer / home-v2-right-drawer / home-v2-source-drawer` 初始 `data-state=closed`
- 点击画布上的 `tab_button_changelog`
- 校验右侧 `home-v2-inspector-panel` 自动打开，并且 `data-selected-node=tab_button_changelog`
- 点击顶部 `图层`，校验左抽屉打开，且 `home-v2-hierarchy-item-tab_button_changelog` 处于选中态
- 在左侧图层树中，把 `关于页签按钮` 拖到 `房间页签按钮` 前面，校验层级树里的 DOM 顺序真的发生变化
- 在画布上框选 `房间 / 榜单` 两个页签按钮，校验 `home-v2-overlay-selection-summary` 出现，且右侧 `home-v2-inspector-panel` 的 `data-selected-count` 进入多选态
- 在多选态下拖动 `房间页签按钮`，校验 `房间 / 榜单` 两个节点都按近似相同位移一起移动，证明群组移动真正生效
- 点击顶部 `组件`，校验左抽屉切换到 `home-v2-component-panel`
- 通过 `home-v2-component-insert-panel` 插入一个新的 `panel_*` 容器节点，并校验画布里出现对应 overlay 节点
- 对新面板执行 `Shift + 右下角控制柄` 缩放，校验宽高同时增长且宽高比维持稳定
- 对新面板执行 `Alt + 右侧控制柄` 缩放，校验宽度增长且 `X` 向左移动，满足从中心对称扩张
- 在画布里把 `关于页签按钮` 直接拖到新容器上，校验 `home-v2-overlay-drop-target-panel_*` 出现
- 释放后切回 `图层`，校验右侧 `home-v2-inspector-panel` 明确显示 `父容器：panel_*`
- 点击顶部 `资源`，校验左抽屉切换到 `home-v2-asset-panel`
- 通过浏览器 DOM 事件链拖拽 `home-v2-left-drawer-resize / home-v2-right-drawer-resize / home-v2-source-drawer-resize`
- 校验左抽屉宽度、右抽屉宽度、源码抽屉高度均发生增长
- 点击顶部 `高级源码` 再次收起底部抽屉，校验 `data-state=closed`

## 截图证据

- 正式 E2E 截图：
  - [lobby-home-v2-authoring-figma-flow.png](D:/gongzuo/webgame/BoardGame-wt-home-v2/test-results/evidence-screenshots/lobby.e2e/Home-v2-作者态按真实画布流程工作：选中即开属性、同抽屉切换与尺寸拖拽/lobby-home-v2-authoring-figma-flow.png)
  - 观察：
    - 左侧显示 `资源` 抽屉，右侧显示 `属性` 抽屉，底部显示 `高级源码` 抽屉，三者都以抽屉覆盖方式附着在真实书页上，没有把页面切成固定工作台。
    - 画布左上方出现新插入的 `panel_*` 标签，说明测试中新增的容器节点已经真实进入画布，不是只在树里有一行文本。
    - 右侧属性面板标题明确显示 `关于页签按钮`，并且正文里能看到 `父容器：panel_*`，说明画布拖入容器后父子关系已经改写，不是只有高亮提示。
    - 底部源码抽屉顶部出现居中的拖拽条，左侧抽屉边缘也保留了窄把手，说明尺寸调节入口已经在编辑器内可见。

## 结论

- 这轮不再是“临时脚本点一遍”，而是仓库内正式 Playwright 用例跑通。
- 当前作者态流程已经满足“真实画布优先”的这一层要求：默认不挡页面、选中即开属性、左侧单抽屉切换、源码抽屉可开合。
- 抽屉尺寸调节、节点 8 向缩放控制柄、`Shift` 锁比例、`Alt` 中心缩放、层级树拖拽重排、画布内拖入容器、框选、多选、群组移动都已纳入正式 E2E 链路，说明这部分不是只改一个偏移属性，而是可实际操作的编辑器交互。
- 当前“容器支持”不再只停留在左侧图层树，画布里已经可以直接把节点拖进容器，并在释放后真正写回新的父容器关系。
- 当前多选还没有做到 Figma 那种群组边界框、批量属性编辑和容器内插入线，但核心的“框出一组节点并整体移动”已经跑通到正式 E2E。
