# DiceThrone 角色选择施工中标签 E2E 证据

## 背景

本轮目标是给 `dicethrone` 选角页中的 `枪手 / 武士` 加上“施工中”标签，并把能力做成通用角色选择标签机制，方便后续其他游戏复用。

## 验证命令

```bash
npm run typecheck
npm run test:e2e:ci:file -- character-selection.e2e.ts "应该为施工中的角色显示标签"
```

## 证据截图

截图路径：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\character-selection.e2e\应该为施工中的角色显示标签\under-construction-badges.png`

人工近景截图：
`D:\gongzuo\webgame\BoardGame\test-results\manual-screenshots\dicethrone-under-construction-badge-flat-v9-crop.png`

![DiceThrone 角色选择施工中标签](../test-results/evidence-screenshots/character-selection.e2e/应该为施工中的角色显示标签/under-construction-badges.png)

## 人工观察结论

1. `枪手` 卡片下半区域现在是一根完整横穿的扁平斜向警示带，中心信息区为深棕色而非纯黑，`施工中` 文案与背景对比清晰，没有再叠出额外的黄色横条。
2. `武士` 卡片使用同一套完整斜带结构，斜切角度、中央信息区宽度和文字位置与 `枪手` 一致，说明这套样式已经收敛到统一的通用 badge 组件。
3. 已实现角色如 `和尚` 没有出现同款覆盖层，说明当前样式只对目录里显式标记为 `施工中` 的角色生效，没有误伤其他可用角色。

## 自动断言覆盖

- `character-badge-gunslinger-under_construction` 可见，且包含文本 `施工中`
- `character-badge-samurai-under_construction` 可见，且包含文本 `施工中`
- `character-badge-monk-under_construction` 不存在
- `枪手` 的 `施工中` 警示带垂直中心接近角色卡中线，且宽度大于角色卡宽度的一半，证明它是中部覆盖层而不是角落角标

## 结论

`dicethrone` 选角页现在提供的是“扁平斜向施工警示带”的整卡禁用态，而不是角落提示角标；后续其他游戏或其他角色只需在角色编目里补 `badges` 配置，即可复用同一套中心警示带样式。
