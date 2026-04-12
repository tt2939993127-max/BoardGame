# Dice Throne 枪手 The Law 多目标交互 E2E 证据

## 范围

- 目标：验证 `card-the-law` 对应的 `selectPlayer + selectCount = 2` 新交互链路已经从 UI 到领域结算闭环。
- 重点：
  - 只选 1 名目标时允许确认；
  - 选择 2 名目标时单次确认即可原子结算两名玩家的 `bounty + knockdown`；
  - 交互完成后 `sys.interaction.current` 被清空。

## 执行命令

```bash
npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online 4-player The Law variant: upgraded Deadeye offers all target players in 2v2 and resolves on two selected targets"
```

## Addendum（2026-04-12）：补齐“真实触发入口 + 多模式目标集合”证据（已修订旧结论）

> **修订原因**：早期证据曾把 `The Law` 的目标集合简化成“敌方 only”。但权威卡面用的是“目标玩家 / up to 2 target players”的表述，本轮已统一裁决为：
> - `1v1`：自动退化为唯一对手（无交互弹窗）；
> - `3+` 人：进入多目标交互（最多选择 2 名目标玩家；当前实现的目标集合覆盖 **全部座次玩家**，即包含 self / ally / enemies）；
> - `4 人 2v2`：同样进入多目标交互，目标集合覆盖 **全部座次玩家**（含 self / ally / enemies），并可一次确认原子化结算两名被选目标的 `bounty + knockdown`。

### 1) 1v1：选择升级变体后应直接结算（无多目标弹窗）
> 待补证据：需要复跑 `e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts` 中对应 1v1 用例并回填截图路径（避免引用已不存在的旧产物）。

### 2) 3 人：多目标弹窗可选至多 2 名目标玩家并完成结算
> 待补证据：需要复跑 `e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts` 中对应 3 人用例并回填截图路径（避免引用已不存在的旧产物）。

### 3) 4 人 2v2：目标集合覆盖全部座次玩家（含 self / ally / enemies）
- `10` 选目标弹窗：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-The-Law-variant-upgraded-Deadeye-offers-all-target-players-in-2v2-and-resolves-on-two-selected-targets\10-four-player-the-law-all-target-selection.png`
- `11` 结算后：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-The-Law-variant-upgraded-Deadeye-offers-all-target-players-in-2v2-and-resolves-on-two-selected-targets\11-four-player-the-law-resolved-on-selected-targets.png`
