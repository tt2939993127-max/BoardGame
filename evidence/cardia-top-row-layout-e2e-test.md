# Cardia 顶部对手卡布局 E2E 证据

## 测试目标

验证 Cardia 在窄高视口下，顶部对手卡不会被战场容器裁切，上下两张遭遇卡都完整落在战场区域内。

## 执行方式

测试文件：
- `e2e/cardia-test-scenario-api.e2e.ts`

测试用例：
- `窄高视口下顶部对手卡应完整显示在战场内`

实际执行命令：

```powershell
$env:PW_PORT='5173'
node scripts/infra/run-e2e-command.mjs dev e2e/cardia-test-scenario-api.e2e.ts --grep "窄高视口下顶部对手卡应完整显示在战场内"
```

执行结果：
- `1 passed (26.1s)`

## 断言点

- 战场容器 `data-testid="cardia-battlefield"` 可见。
- 己方与对手的已打出卡牌都可见。
- 顶部卡牌的顶部和底部都位于战场容器边界内。
- 底部卡牌的顶部和底部都位于战场容器边界内。
- 顶部卡牌没有超出浏览器视口。

## 证据截图

截图绝对路径：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\cardia-test-scenario-api.e2e\窄高视口下顶部对手卡应完整显示在战场内\窄高视口下顶部对手卡应完整显示在战场内-cardia-top-row-layout-1280x640.png`

截图预览：

![Cardia 顶部布局 E2E 证据](../test-results/evidence-screenshots/cardia-test-scenario-api.e2e/%E7%AA%84%E9%AB%98%E8%A7%86%E5%8F%A3%E4%B8%8B%E9%A1%B6%E9%83%A8%E5%AF%B9%E6%89%8B%E5%8D%A1%E5%BA%94%E5%AE%8C%E6%95%B4%E6%98%BE%E7%A4%BA%E5%9C%A8%E6%88%98%E5%9C%BA%E5%86%85/%E7%AA%84%E9%AB%98%E8%A7%86%E5%8F%A3%E4%B8%8B%E9%A1%B6%E9%83%A8%E5%AF%B9%E6%89%8B%E5%8D%A1%E5%BA%94%E5%AE%8C%E6%95%B4%E6%98%BE%E7%A4%BA%E5%9C%A8%E6%88%98%E5%9C%BA%E5%86%85-cardia-top-row-layout-1280x640.png)

## 截图分析

- 顶部对手卡完整显示在战场上半区，没有被页面顶部或战场边界切掉。
- 底部己方卡完整显示在战场下半区，底边仍在容器内。
- 顶部信息条、底部手牌区、左侧弃牌堆和右侧调试面板同时存在时，中央战场仍保留足够高度。
- 这说明本次对 Cardia 主布局、战场滚动容器、卡牌尺寸和弃牌堆尺寸的响应式调整，已经覆盖了矮屏场景下的裁切问题。
