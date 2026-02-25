# 需求文档：王权骰铸风格结算界面

## 简介

为王权骰铸（Dice Throne）游戏设计专属风格的结算界面（Game Over Screen），替代当前通用的 `EndgameOverlay` 默认内容区域。新结算界面应体现王权骰铸的视觉风格（街机立体 + 琥珀金主色调），展示对局双方英雄信息和战斗结果，提供沉浸式的胜负体验。

当前实现使用框架层通用的 `EndgameOverlay` 组件，仅显示简单的"胜利/失败/平局"文字和重赛按钮，缺乏游戏特色。新设计将利用 `EndgameOverlay` 的 `renderContent` 和 `renderActions` 插槽机制注入王权骰铸专属内容，保持框架层组件不变。

### 现有实现参考

大杀四方（SmashUp）已通过 `SmashUpEndgame.tsx` 实现了自定义结算界面，使用 `renderContent` / `renderActions` 插槽注入计分轨和自定义按钮。但其 `SmashUpEndgameActions` 组件重新实现了投票逻辑（与框架层 `RematchActions` 重复）。王权骰铸的实现应避免此问题，按钮区域应复用框架层 `RematchActions` 的完整逻辑，仅通过样式 props 或包装组件改变视觉表现。

### DRY 原则约束

- 投票状态管理、投票点渲染、多人/单人模式分支等逻辑已在框架层 `RematchActions` 中实现，禁止在游戏层重复实现
- `useEndgame` hook 已封装 rematch 状态 + reset 注册 + overlayProps 组装，必须复用
- 如需为按钮区域换肤，应通过扩展 `RematchActions` 的 className/样式 props 或在框架层新增样式插槽实现，而非重写组件
- 若框架层 `RematchActions` 当前不支持样式自定义，应先扩展框架层（如新增 `renderButton` 插槽或 `buttonClassName` props），再在游戏层消费

## 术语表

- **EndgameOverlay**：框架层通用结算遮罩组件，支持 `renderContent` / `renderActions` 插槽自定义
- **RematchActions**：框架层通用重赛操作组件，封装投票逻辑、多人/单人模式分支、投票点渲染
- **useEndgame**：通用 hook，封装 rematch 状态 + reset 注册 + EndgameOverlay props 组装
- **HeroState**：王权骰铸玩家状态对象，包含 `characterId`、`resources`（HP/CP）、`statusEffects`、`tokens`、`abilityLevels` 等
- **GameOverResult**：引擎层游戏结束结果，包含 `winner`（胜者 PlayerId）和 `draw`（是否平局）
- **Portrait_Atlas**：角色头像图集，包含所有可选英雄的肖像图片
- **Arcade_3D_Style**：街机立体风格，王权骰铸的基础视觉风格，特征为立体按钮、饱和渐变、粗体文字
- **VictoryParticles**：框架层胜利粒子特效组件（Canvas 2D），已集成在 EndgameOverlay 中
- **Result_Panel**：结算界面中展示对局双方英雄信息和战斗数据的面板区域
- **FX_Bus**：王权骰铸的特效总线，用于触发 Canvas 粒子和音效

## 需求

### 需求 1：英雄对决结果展示

**用户故事：** 作为玩家，我希望结算界面展示双方英雄的角色肖像和最终状态，以便直观感受对局结果。

#### 验收标准

1. WHEN 游戏结束，THE Result_Panel SHALL 展示胜者和败者双方的英雄角色肖像（使用 Portrait_Atlas）
2. WHEN 游戏结束，THE Result_Panel SHALL 展示双方英雄的最终 HP 数值
3. WHEN 游戏结束且存在胜者，THE Result_Panel SHALL 以视觉差异区分胜者和败者（胜者肖像更大或更亮，败者肖像灰暗或缩小）
4. WHEN 游戏结束且为平局，THE Result_Panel SHALL 以对等的视觉样式展示双方英雄肖像
5. THE Result_Panel SHALL 展示双方英雄的角色名称（从 i18n 获取本地化名称）

### 需求 2：王权骰铸视觉风格

**用户故事：** 作为玩家，我希望结算界面的视觉风格与王权骰铸游戏一致，以获得沉浸式的结算体验。

#### 验收标准

1. THE Result_Panel SHALL 使用 Arcade_3D_Style 的琥珀金主色调（`#fbbf24` 至 `#d97706` 渐变）作为高亮和装饰色
2. THE Result_Panel SHALL 使用粗体大写字母（font-bold/font-black + uppercase + tracking-wide）展示胜负标题
3. THE Result_Panel SHALL 使用深色半透明背景（`bg-black/80 backdrop-blur-sm`）作为面板底色，与游戏棋盘背景融合
4. WHEN 玩家获胜，THE Result_Panel SHALL 使用琥珀金色系展示"胜利"标题
5. WHEN 玩家失败，THE Result_Panel SHALL 使用红色系（`#ef4444` 至 `#b91c1c`）展示"失败"标题
6. WHEN 结果为平局，THE Result_Panel SHALL 使用白色/银色系展示"平局"标题

### 需求 3：入场动画

**用户故事：** 作为玩家，我希望结算界面有流畅的入场动画，以增强结算的仪式感。

#### 验收标准

1. WHEN 游戏结束，THE Result_Panel SHALL 以 framer-motion 弹簧动画（stiffness: 300, damping: 25）从缩放 0.8 + 透明度 0 过渡到正常尺寸
2. WHEN 游戏结束，THE Result_Panel 中的英雄肖像 SHALL 以交错延迟（stagger 150ms）依次入场
3. WHEN 游戏结束，THE Result_Panel 中的胜负标题 SHALL 在肖像入场完成后以缩放弹簧动画出现（delay 300ms）
4. WHEN 游戏结束且当前玩家获胜，THE EndgameOverlay SHALL 继续使用已有的 VictoryParticles 粒子特效

### 需求 4：战斗数据摘要

**用户故事：** 作为玩家，我希望结算界面展示关键战斗数据，以便回顾对局表现。

#### 验收标准

1. WHEN 游戏结束，THE Result_Panel SHALL 展示双方英雄的最终 CP（战斗点数）数值
2. WHEN 游戏结束，THE Result_Panel SHALL 展示双方英雄的剩余 Token 数量摘要（太极/闪避/净化等非零 Token）
3. THE Result_Panel 中的数据展示 SHALL 使用与游戏内资源条一致的视觉样式（琥珀金高亮 + 图标）

### 需求 5：操作按钮区域（DRY 复用）

**用户故事：** 作为玩家，我希望结算界面的操作按钮符合王权骰铸的视觉风格，同时保持与框架层一致的功能行为。

#### 验收标准

1. THE 操作按钮区域 SHALL 通过 EndgameOverlay 的 `renderActions` 插槽注入
2. THE 操作按钮区域 SHALL 复用框架层 `RematchActions` 的完整投票逻辑（投票状态管理、多人/单人模式分支、投票点渲染），禁止在游戏层重新实现
3. THE 操作按钮区域 SHALL 通过扩展 `RematchActions` 的样式能力（如 `renderButton` 插槽或 `buttonClassName` props）实现王权骰铸风格按钮，而非重写组件
4. IF 框架层 `RematchActions` 当前不支持样式自定义，THEN SHALL 先扩展框架层组件（新增样式插槽），再在游戏层消费
5. THE 王权骰铸风格按钮 SHALL 使用 Arcade_3D_Style 的立体按钮样式（渐变背景 + 底部阴影 + 点击下沉）
6. THE "再来一局"按钮 SHALL 使用琥珀金主色调渐变
7. THE "返回大厅"按钮 SHALL 使用次要色（slate-700）样式

#### 正确性属性

- **P1（逻辑零重复）**：游戏层的 `renderActions` 实现中不得包含任何投票状态判断逻辑（`myVote`/`ready`/`rematchState` 的 if-else 分支），这些逻辑必须全部在框架层 `RematchActions` 中
- **P2（功能等价）**：通过 `renderActions` 注入的自定义按钮在所有模式（单人/多人/旁观）下的行为必须与默认 `RematchActions` 完全一致

### 需求 6：框架层兼容性

**用户故事：** 作为开发者，我希望王权骰铸专属结算界面通过插槽机制实现，不修改框架层组件的行为逻辑，以保持架构整洁。

#### 验收标准

1. THE 王权骰铸结算界面 SHALL 通过 EndgameOverlay 的 `renderContent` 插槽注入自定义内容
2. THE 王权骰铸结算界面 SHALL 通过 EndgameOverlay 的 `renderActions` 插槽注入自定义按钮
3. THE 实现 SHALL 将自定义结算组件放置在 `src/games/dicethrone/ui/` 目录下
4. THE 实现 SHALL 复用现有的 `getPortraitStyle` 函数获取角色肖像样式
5. THE 实现 SHALL 从 `HeroState` 读取所有展示数据（characterId、resources、tokens），不引入新的 core 状态字段
6. THE 实现 SHALL 复用 `useEndgame` hook 组装 EndgameOverlay props，不自行管理 rematch 状态
7. IF EndgameOverlay 的 `renderContent` 或 `renderActions` 插槽未提供，THEN THE EndgameOverlay SHALL 回退到默认的通用内容和按钮
8. IF 框架层需要扩展（如 `RematchActions` 新增样式插槽），THE 扩展 SHALL 保持向后兼容，不影响其他游戏的现有行为

#### 正确性属性

- **P3（框架层零破坏）**：对框架层的任何修改（如 `RematchActions` 新增 props）不得改变现有游戏（SmashUp、TicTacToe）的结算界面行为
- **P4（百游戏可扩展）**：新增的框架层样式插槽机制必须是通用的，第 N 个游戏使用时代码量与第 1 个相同

### 需求 7：响应式与无障碍

**用户故事：** 作为玩家，我希望结算界面在不同屏幕尺寸下正常显示，且满足基本无障碍要求。

#### 验收标准

1. THE Result_Panel SHALL 使用 vw 单位和 max-width 约束，在 1280px 至 1920px 宽度范围内正常显示
2. THE Result_Panel 中的文字 SHALL 保持最小 4.5:1 的颜色对比度
3. THE Result_Panel 中的可交互按钮 SHALL 具有最小 44x44px 的点击区域
4. THE Result_Panel SHALL 使用 `aria-label` 标注胜负结果，支持屏幕阅读器
