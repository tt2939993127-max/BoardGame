# 冲突解决汇报：main-2026-03-28

## 1. 背景
- base: `main` @ `b13d436b`
- head: `chore/mobile-adaptive-spec-split` @ `6df64da0`
- 触发命令: `git merge main --no-commit --no-ff`

## 2. 冲突文件
- `src/games/cardia/Board.tsx`

## 3. 解决策略
### `src/games/cardia/Board.tsx`
- 策略：以当前分支的 `cardia` 放大交互与紧凑横屏布局调整为主，吸收 `main` 新增的 `useRuntimeViewport` 公共 hook 和横屏尺寸计算。
- 合并要点：
  - 保留当前分支的手动聚焦、弃牌堆侧栏宽度、手牌左对齐与点击命中区调整。
  - 吸收 `main` 的 `useRuntimeViewport`，替换本地重复的 viewport 监听状态。
  - 吸收 `main` 的紧凑横屏/手机横屏卡牌尺寸计算，避免丢失主分支移动端收敛。
- 原因：当前分支的 `cardia` 改动是本轮业务目标；`main` 的公共 viewport hook 与横屏尺寸逻辑属于通用基础修复，合并后更完整。

## 4. 风险与验证
- 风险点：
  - `cardia` 紧凑横屏战场区与手牌区在极小高度设备上的布局可能仍需人工回归。
  - 手牌聚焦与悬停放大在移动/桌面输入设备间切换时，可能受 `useRuntimeViewport` 刷新时机影响。
- 验证命令：
  - `npx eslint src/games/cardia/Board.tsx`
  - `npm run merge:audit:strict -- HEAD`
- 验证结果：
  - `eslint`：✅ 通过（0 error，warnings 未阻塞）
  - `merge audit`：✅ 通过，`npm run merge:audit:strict -- HEAD` 显示 10 个冲突文件均为“混合结果”，无单边覆盖

## 5. 结果
- 提交：`294c77e4` (`merge: update main into chore/mobile-adaptive-spec-split`)
- 推送：未执行
