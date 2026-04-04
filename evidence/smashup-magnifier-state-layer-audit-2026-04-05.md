# 大杀四方放大镜状态层审计 2026-04-05

## 审计范围

- `src/games/smashup/ui/HandArea.tsx`
- `src/games/smashup/ui/BaseZone.tsx`
- `src/games/smashup/ui/PromptOverlay.tsx`
- `src/games/smashup/ui/DeckDiscardZone.tsx`

## 权威来源

- 用户本轮反馈：“描边方式变了”“边框只是卡牌的边框，不要影响不相干的”“放大镜颜色跟随随从描边一起变了”
- Git 历史与 blame：
  - `1c469445` `feat: add browser compatibility gate and mobile inspect gesture`
  - `4f456df1` `feat: 提交当前已暂存改动`
  - `4b2b4fcc` `收口剩余游戏适配、E2E、文档与资源更新`
  - `aaf12e6a` `完善移动端运行时边界与对局交互适配`

## Findings

### F1. 放大镜按钮长期挂在卡牌状态层内部，不是独立悬浮层

- 命中文件：
  - `src/games/smashup/ui/HandArea.tsx`
  - `src/games/smashup/ui/BaseZone.tsx`
  - `src/games/smashup/ui/PromptOverlay.tsx`
  - `src/games/smashup/ui/DeckDiscardZone.tsx`
- 结论：
  - 放大镜按钮普遍作为卡牌或基地容器内部的绝对定位子节点存在，而不是状态层外的兄弟节点。
  - 只要父层承载 `ring / shadow / opacity / grayscale / hover` 等状态视觉，放大镜就会一起被“同层视觉”带着跑。
- 命中维度：
  - `D15 UI 状态同步`
  - `D23 架构假设一致性`
  - `D43 重构完整性检查`

### F2. 当前可见历史里，问题不是“最近第一次引入”，而是旧结构被后续视觉强化放大

- 版本线结论：
  - 至少从 `9c9dd78d` 可见历史起，手牌和基地/随从放大镜就已经在卡牌容器内部。
  - `1c469445` 把 inspect 手势和相关入口系统化。
  - `4f456df1` 进一步把手牌和 `PromptOverlay` 的放大镜样式固化在卡牌内部。
  - `4b2b4fcc` 又沿同一路径把泰坦/轨道放大镜继续扩散。
- 判定：
  - 用户感知到“描边方式变了”是成立的。
  - 但更准确的根因是：状态视觉层被持续增强，而放大镜仍留在这个层里，导致问题从“存在但不明显”变成“显著可见”。
- 命中维度：
  - `D8 时序正确`
  - `D23 架构假设一致性`
  - `D43 重构完整性检查`

### F3. 显式白边是附加噪音，但不是唯一根因

- 命中提交：
  - `4f456df1` 为手牌和 `PromptOverlay` 放大镜按钮加入 `border-2 border-white/30`
  - `4b2b4fcc` 为部分基地/泰坦相关放大镜加入 `border border-white/20`
- 判定：
  - 这些白边会让“按钮被描边”的错觉更重。
  - 但即使去掉白边，只要按钮仍在状态层内部，它仍可能跟随卡牌选择态或 hover 态一起变色/变透明/变得像被描边。
- 命中维度：
  - `D10 元数据一致`
  - `D15 UI 状态同步`

## 逐项结论

- `src/games/smashup/ui/HandArea.tsx`
  - 手牌卡牌外层容器承载 `ring`、`shadow`、`opacity` 等状态视觉；放大镜是其内部绝对定位子节点。
  - 这是“按钮跟手牌状态一起跑”的直接结构原因。
- `src/games/smashup/ui/PromptOverlay.tsx`
  - 交互卡牌项的外层 `group relative` 承载金色/白色 ring 与 hover 态；放大镜仍在同一 group 内。
  - 这是“PromptOverlay 里按钮也像属于描边对象”的原因。
- `src/games/smashup/ui/BaseZone.tsx`
  - 基地放大镜这轮已移到卡框外层，但随从放大镜仍在随从容器状态层内。
  - 随从的 selectable/expanded/activatable/used 等视觉态会影响用户对按钮颜色归属的感知。
- `src/games/smashup/ui/DeckDiscardZone.tsx`
  - 轨道/泰坦放大镜仍是实体容器内部绝对定位节点，属于同类风险点。

## 审计结论

- 用户反馈成立：描边/状态表现的变化确实把问题放大了。
- 根因不是单一颜色值，也不是单一白边，而是放大镜按钮与实体状态层耦合。
- 正确修复方向不是继续调按钮颜色，而是把放大镜统一迁移为状态层外的独立悬浮兄弟节点。

## 后续修复要求

- `inspect` / 放大镜按钮统一改成状态层外兄弟节点。
- 卡牌 `ring / shadow / opacity / grayscale / scale / rotate` 仅作用于卡框层。
- 放大镜仅保留固定底色、hover 态、可点击性，不消费实体选择态或高亮态。

## 残留风险

- 当前审计已覆盖 `smashup` 主要 inspect 入口，但未扩展到其他游戏。
- 若后续在别的组件中继续复制“absolute 放大镜按钮挂在 group 内部”的模式，问题会再次出现。
