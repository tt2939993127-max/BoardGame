# 冲突解决补记：PR #91 分支合并主线更新

## 1. 背景

- 日期：2026-07-14
- PR：#91「实装大杀四方迷你萌宠与时间旅行者 POD 版」
- 目标分支：deathcats4/codex/smashup-itty-time-pod-pr
- 合并提交：e2856773de3379932021f0b3e4bbfe065bf90cf1
- 父 1：8e7cd689d0d068c3ccb8c15ab275ca6fd8244804（PR #91 原分支，含“更新时间旅行者 POD ongoing 测试契约”）
- 父 2：e6140bf89db295379045267e4ab5b787f14e6e6e（当前主线合并结果，含 Android 包名、音频循环、DiceBox、山屋惊魂和 The Gang 工具牌更新）
- 补记原因：合并提交本身未新增 `evidence/merge-conflict-*.md`，仓库合并冲突审计允许在紧跟 merge commit 的后续提交中补充说明。

## 2. 审计结果

已执行：

```bash
node scripts/verify/merge-conflict-audit.mjs e2856773de3379932021f0b3e4bbfe065bf90cf1 --fail-on-single-side
```

审计范围共 29 个文件：

- 28 个文件结果与两侧相同，包括 PR #91 的 Smash Up POD 资源、OpenSpec、派系注册、variant binding、atlas 映射、卡牌数据、faction meta、i18n 与 ongoing 测试契约。
- 1 个文件结果完全等于父 2：`src/games/qidahen/Board.tsx`。

## 3. 单边结果说明

### `src/games/qidahen/Board.tsx`

- 父 1（PR #91 原分支）不承载本轮最新《七大恨》主线 UI 与 i18n 修复；该 PR 的业务目标是 Smash Up 迷你萌宠 POD 与时间旅行者 POD。
- 父 2（当前主线）承载最新《七大恨》剧本选择书页式双栏、焦点预览、席位状态展示，以及设置流程文案 i18n 修复。
- 最终结果选择父 2，是为了保留主线最新《七大恨》实现；这不是对 PR #91 内容的覆盖或丢弃。
- PR #91 的有效内容不在 `src/games/qidahen/Board.tsx`，而在 Smash Up POD 资源、数据、注册、测试与 OpenSpec 文件中；这些文件在审计中均显示“与两侧相同”，说明合并结果未删除 PR #91 条目。

## 4. 双边保留结论

- PR #91 侧：迷你萌宠 POD、时间旅行者 POD 的资源、卡牌数据、派系注册、variant binding、英文基地映射、i18n、OpenSpec 与测试契约均保留。
- 主线侧：Android 正式包名、音频单曲循环、DiceBox 物理骰盘稳定性、山屋惊魂非 P0 证据链、The Gang 工具牌交互、《七大恨》主线界面与 i18n 修复均保留。
- 本次没有对 Smash Up PR #91 内容使用单边覆盖；唯一单边结果是与 PR #91 业务无关的《七大恨》主线文件。

## 5. 验证

- `git merge-tree --write-tree HEAD deathcats4/codex/smashup-itty-time-pod-pr` 生成合并树，无冲突输出。
- `git grep -n -E "^(<{7} .+|>{7} .+|={7}$)" e2856773de3379932021f0b3e4bbfe065bf90cf1` 无命中。
- `git merge-base --is-ancestor deathcats4/codex/smashup-itty-time-pod-pr e2856773de3379932021f0b3e4bbfe065bf90cf1` 通过。
- `git merge-base --is-ancestor e6140bf89db295379045267e4ab5b787f14e6e6e e2856773de3379932021f0b3e4bbfe065bf90cf1` 通过。

## 6. 结果

- `e2856773` 的唯一单边审计项已有人工解释。
- PR #91 与主线有效内容都在最终合并树中。
- 本文件作为紧跟 merge commit 的补记提交，补齐仓库合并冲突审计证据。
