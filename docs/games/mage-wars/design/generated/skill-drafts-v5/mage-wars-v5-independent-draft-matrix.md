# 法师战争 v5 多设计稿差异与机器门禁

> 状态：`generated / ai-review-required-before-human-review`。v5 是对 v4 的结构重写，不覆盖 v21 基线和 v4 失败候选。机器门禁只证明硬性规则未明显违规，人工验收前仍必须逐张看原图。

## 共同状态

- 邪术师用已计划 `火球术` 指向女祭司侧 `西锁骑士`。
- 学徒 `2x3` 半场为主棋盘。
- 对手隐藏信息只显示卡背。
- 攻击骰、效果骰和确认动作锚定当前目标 / 施法链。

## 机器门禁

| 候选 | HTML | PNG | 禁止词 | 六区域 | 场上卡中心入所属区域 | 骰子贴近目标 | 确认贴近目标 | 棋盘占屏 |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 半场竞技场优先 | `mage-wars-v5-arena-first-command.html` | `mage-wars-v5-arena-first-command.png` | PASS | PASS | PASS | PASS | PASS | 49.6% |
| 法术书命令台 | `mage-wars-v5-spellbook-command-dock.html` | `mage-wars-v5-spellbook-command-dock.png` | PASS | PASS | PASS | PASS | PASS | 40.7% |
| 开放桌面施法链 | `mage-wars-v5-tabletop-casting-chain.html` | `mage-wars-v5-tabletop-casting-chain.png` | PASS | PASS | PASS | PASS | PASS | 59.7% |

## AI 肉眼审查项

- 三套是否真的形成不同主焦点，而不是同一母版调权重。
- 规则对象是否都靠正式素材承担主体。
- 法术书、已计划法术和弃牌堆是否符合交互权重。
- 当前玩家第一眼是否知道目标、结果和确认 / 取消入口。
- 是否仍有大面板、大边框或后台仪表盘抢走棋盘主体。
