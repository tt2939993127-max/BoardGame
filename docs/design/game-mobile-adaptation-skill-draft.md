# 游戏层移动适配 Skill 结构草案

## 目标

把“游戏层如何接入 PC 主导、移动端横屏适配框架”的重复工作沉淀成独立 skill，供后续开发者复用。

这个 skill 只负责 **游戏层接入流程**，不替代框架层实现，不定义 runtime 真相。  
框架层权威来源仍然是 OpenSpec 提案：

- [proposal.md](../../openspec/changes/add-pc-first-mobile-adaptation-framework/proposal.md)
- [design.md](../../openspec/changes/add-pc-first-mobile-adaptation-framework/design.md)
- [tasks.md](../../openspec/changes/add-pc-first-mobile-adaptation-framework/tasks.md)

## 推荐命名

**最正确方案**：`adapt-game-mobile`

理由：

- 动作导向明确，表示“把某个游戏接入移动适配框架”
- 不和框架层本身混淆
- 触发语义清楚，适合后续在 skill 列表中被准确命中

备选：

- `game-mobile-adapter`
- `game-landscape-adaptation`

## 触发场景

建议在 skill frontmatter 的 `description` 中覆盖这些触发条件：

- 用户要求“给某个游戏做移动端适配”
- 用户要求“把某个游戏接入横屏适配框架”
- 用户要求“评估某个游戏能否进 WebView / PWA / 小程序 web-view”
- 用户要求“审查某个游戏里哪些点阻碍移动端适配”
- 用户明确提到“王权骰铸移动适配”“游戏层适配”“移动端接入清单”“横屏接入”

## 边界

### Skill 负责

- 识别游戏属于哪种移动支持 profile
- 审查游戏层现有交互与布局问题
- 指导填写 manifest 移动字段
- 指导接入通用移动壳
- 标注游戏层必须处理的例外点
- 输出最小改造步骤与验收项

### Skill 不负责

- 设计新的框架层 runtime 能力
- 决定框架层真相
- 新增通用组件的最终架构裁决
- 直接把 WebView 当成移动适配方案

## 目录结构草案

```text
adapt-game-mobile/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── manifest-fields.md
│   ├── checklist.md
│   └── dicethrone-pilot.md
```

## 各文件职责

### `SKILL.md`

只保留高层工作流和导航，不塞大量细节。

建议包含：

- skill 的用途和触发条件
- 4 步标准流程
- 什么时候去读哪个 reference
- 输出要求

### `references/manifest-fields.md`

来源：本次 OpenSpec 提案

内容建议：

- `mobileProfile` 的定义
- `preferredOrientation` 的定义
- `mobileLayoutPreset` 的定义
- `shellTargets` 的定义
- PC 主导、横屏优先、缩放仅兜底等原则

### `references/checklist.md`

内容建议：

- 检查 hover 依赖
- 检查拖拽是否可被点击/长按替代
- 检查固定宽高与溢出
- 检查常驻侧栏与日志
- 检查关键操作是否默认可达
- 检查是否适合进 `app-webview` / `mini-program-webview`

### `references/dicethrone-pilot.md`

内容建议：

- 王权骰铸试点中遇到的真实问题
- 哪些点适合框架层解决
- 哪些点必须游戏层修正
- 推荐改造手法和反模式

## `SKILL.md` 建议骨架

```md
---
name: adapt-game-mobile
description: 为单个游戏接入项目现有的 PC 主导、移动端横屏适配框架。用于审查游戏层 hover/拖拽/固定布局问题、填写 manifest 移动字段、接入通用移动壳、评估是否适合进入 PWA/App WebView/小程序 web-view。
---

# 适配游戏移动端

## 快速流程

1. 先读取字段与命名契约：`references/manifest-fields.md`
2. 审查目标游戏：读 manifest、Board、关键交互组件
3. 按检查清单识别游戏层例外：`references/checklist.md`
4. 产出接入方案、改造项和验收结论

## 王权骰铸样板

当目标游戏和王权骰铸同类复杂度时，优先参考：
`references/dicethrone-pilot.md`

## 输出要求

- 明确 `mobileProfile`
- 明确是否需要游戏层例外处理
- 明确是否适合 `pwa` / `app-webview` / `mini-program-webview`
- 给出最小改造步骤
```

## 标准工作流草案

### 1. 读取契约

- 读取移动适配 OpenSpec 提案摘要
- 读取游戏 manifest
- 确认目标是 PC 主导还是移动优先

### 2. 审查游戏层

至少检查：

- `Board.tsx`
- 关键交互组件
- 手牌区
- 状态说明
- 阶段/日志/侧栏
- 角色选择或特殊 UI

### 3. 分类问题

把问题拆成三类：

- 框架层应解决
- 游戏层必须接入
- 当前不建议支持

### 4. 输出结论

必须输出：

- 推荐的 `mobileProfile`
- 推荐的 `shellTargets`
- 游戏层例外处理点
- 验收方式

## 这个 skill 的第一版验收标准

- 能稳定审查单个游戏目录
- 能输出 manifest 建议字段
- 能列出游戏层必须修改的最小点位
- 能说明该游戏是否适合进 `app-webview` / `mini-program-webview`
- 能把王权骰铸作为首个样板案例引用
