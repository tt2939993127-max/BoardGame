# DiceThrone 自己响应窗口技能高亮 E2E 证据

## 范围

- 目标：DiceThrone 在“自己是当前响应者”的响应窗口中，不应提前高亮技能槽；响应结束后，应恢复正常技能高亮，避免用户在响应链中误以为需要再次选技能。
- 代码范围：
  - `src/games/dicethrone/Board.tsx`
  - `e2e/dicethrone-defense-selection.e2e.ts`

## 验证命令

```bash
npm run test:e2e:ci:file -- e2e/dicethrone-defense-selection.e2e.ts "自己处于响应窗口时不应提前高亮技能，结束响应后再恢复高亮"
```

## 截图证据

### 1. 响应窗口期间不提前高亮技能

![响应窗口期间不高亮技能](../test-results/evidence-screenshots/dicethrone-defense-selection.e2e/自己处于响应窗口时不应提前高亮技能，结束响应后再恢复高亮/self-response-window-no-ability-highlight.png)

人工观察结论：

- 画面停留在响应中的对手视角，右下角仍能看到 `可以响应 / 跳过` 弹层，说明当前确实还在响应链里。
- 中央 Barbarian 技能板没有出现红色脉冲高亮边框，技能槽只是普通面板展示，没有“可立即再选技能”的视觉暗示。
- 阶段仍是 `掷骰攻击阶段`，但此时没有提前给出技能高亮，符合“先完成响应，再回到技能选择”的预期。

### 2. 响应结束后恢复技能高亮

![响应结束后恢复高亮](../test-results/evidence-screenshots/dicethrone-defense-selection.e2e/自己处于响应窗口时不应提前高亮技能，结束响应后再恢复高亮/self-response-window-highlight-restored.png)

人工观察结论：

- 响应弹层已经消失，说明响应窗口已关闭，没有残留 `可以响应 / 跳过` 入口。
- 视角切回 Monk 自己的技能板后，左上技能槽重新出现高亮边框，表示可选技能提示已恢复。
- 高亮只在响应结束后出现，用户可以在此时进行正式技能选择，不会在响应进行中被诱导再次点技能。

## 结果

- 定向 E2E 已通过。
- 截图观察与需求一致：响应中无技能高亮，响应后恢复技能高亮。
