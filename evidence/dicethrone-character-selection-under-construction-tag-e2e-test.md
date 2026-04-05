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

![DiceThrone 角色选择施工中标签](../test-results/evidence-screenshots/character-selection.e2e/应该为施工中的角色显示标签/under-construction-badges.png)

## 人工观察结论

1. `枪手` 卡片左上角出现琥珀色胶囊标签，文案为 `施工中`，没有挤压角色名或玩家占用角标。
2. `武士` 卡片左上角同样出现 `施工中` 标签，位置与 `枪手` 一致，说明标签渲染走的是统一卡片层而不是单角色特判。
3. 已实现角色如 `和尚` 没有出现同款标签，说明当前标签是按角色目录配置生效，而不是全量角色统一渲染。

## 自动断言覆盖

- `character-badge-gunslinger-under_construction` 可见，且包含文本 `施工中`
- `character-badge-samurai-under_construction` 可见，且包含文本 `施工中`
- `character-badge-monk-under_construction` 不存在

## 结论

`dicethrone` 选角页已经支持通用角色标签能力，当前由 `枪手` 与 `武士` 首先接入“施工中”状态；后续其他游戏或其他角色只需在角色编目里补 `badges` 配置即可复用同一套 UI。
