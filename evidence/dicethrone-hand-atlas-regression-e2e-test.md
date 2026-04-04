# DiceThrone 枪手 / 武士手牌卡图接线回归验证

## 验证目标

- 确认 `samurai` / `gunslinger` 的手牌接线不再依赖 `hand-cards-atlas.webp`
- 确认需要拆分/单独裁切的牌使用单卡图，正常整格牌继续使用原 `ability-cards.webp`
- 确认手牌区不再出现 shimmer / 空白占位
- 确认枪手拆分位、武士特殊裁切位对应的手牌在 UI 中能正常显示

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/temp-dicethrone-ability-atlas-regression.e2e.ts "samurai and gunslinger hand cards should use ability atlas or single-card crops without shimmer"
```

## 自动化结果

- 结果：通过
- 用例：`DiceThrone hand card preview regression > samurai and gunslinger hand cards should use ability atlas or single-card crops without shimmer`
- 关键日志：
  - `samurai-hand-preview-diag` 中：
    - `upgrade-solemnity-2` 指向 `/assets/i18n/zh-CN/dicethrone/images/samurai/crops/ability-cards/compressed/upgrade-solemnity-2.webp`
    - `upgrade-budo-2` 指向 `samurai/compressed/ability-cards.webp`
    - `upgrade-masamune-2` 指向 `/assets/i18n/zh-CN/dicethrone/images/samurai/crops/ability-cards/compressed/upgrade-masamune-2.webp`
  - `gunslinger-hand-preview-diag` 中：
    - `upgrade-fan-the-hammer-2` 指向 `/assets/i18n/zh-CN/dicethrone/images/gunslinger/crops/ability-cards/compressed/fan-the-hammer-2.webp`
    - `card-pistol-whip` 指向 `/assets/i18n/zh-CN/dicethrone/images/gunslinger/crops/ability-cards/compressed/pistol-whip.webp`
    - `upgrade-duel-2` 指向 `gunslinger/compressed/ability-cards.webp`
  - 两边 `shimmerCount` 都为 `0`

## 截图证据

- 武士：[samurai-hand-preview.png](D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-hand-preview-regression\samurai-hand-preview.png)
- 枪手：[gunslinger-hand-preview.png](D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-hand-preview-regression\gunslinger-hand-preview.png)

## 肉眼观察结论

### 武士

- 底部手牌区显示的是武士专属升级卡真实卡面，不是黑块、灰块或 shimmer 骨架。
- `肃穆之仪 II` 与 `正宗 II` 是独立单卡图，`武道 II` 仍走原 `ability-cards` atlas，三张牌在同一手牌区内都能正常显示。
- 右侧日志、按钮和手牌区之间没有因为 atlas 取图错误出现异常拉伸、空白块或拼接错位。

### 枪手

- 底部手牌区显示的是枪手专属手牌真实卡面，包含黑白系枪手牌面，不是共享大图的错误裁切块。
- `左轮速射 II` / `枪托击打` 这组原本来自分裂位的牌在手牌区已作为两张独立卡面显示，`对决 II` 仍走原 atlas，三者没有索引串位。
- 整个手牌区无 shimmer、无空白占位，说明当前是“整格牌走原 atlas，特殊牌走单卡图”的正确接线。

## 结论

- `hand-cards-atlas.webp` 不是这两个派系的正式运行时方案。
- 当前正确口径是：
  - 正常整格牌继续使用原 `ability-cards` atlas 索引
  - 枪手 6 张分裂牌与武士 3 张特殊裁切牌改用稳定的单卡图资源
  - 运行时和预加载都不再依赖 `hand-cards-atlas`
