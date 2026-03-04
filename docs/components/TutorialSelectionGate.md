# TutorialSelectionGate 教程模式选角遮罩

## 概述

`TutorialSelectionGate` 用于在教程模式下**屏蔽选角/选阵营 UI**，避免进入教程时闪屏。组件会在检测到教程模式或教程激活时显示全屏加载文案，否则渲染传入的子内容。

## 适用场景

- 教程模式需要自动完成选角/选阵营
- 进入教程时，选角界面会短暂闪现
- 希望将遮罩逻辑统一复用到多款游戏

## 使用方法

### 1. 导入组件

```tsx
import { TutorialSelectionGate } from '../../components/game/framework';
```

### 2. 包裹选角/选阵营界面

```tsx
<TutorialSelectionGate
  isTutorialMode={gameMode?.mode === 'tutorial'}
  isTutorialActive={isTutorialActive}
  loadingText={t('ui.loading', { defaultValue: '加载中...' })}
  containerClassName="bg-neutral-900"
  textClassName="text-lg"
>
  <FactionSelection /* 你的选角/选阵营组件 */ />
</TutorialSelectionGate>
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `isTutorialMode` | `boolean` | ❌ | 路由级教程模式标记（推荐传入 `gameMode?.mode === 'tutorial'`） |
| `isTutorialActive` | `boolean` | ❌ | 教程系统是否已激活（来自 `useTutorial()`） |
| `loadingText` | `string` | ✅ | 加载提示文案 |
| `containerClassName` | `string` | ❌ | 覆盖遮罩容器样式（背景/层级） |
| `textClassName` | `string` | ❌ | 覆盖文案样式 |
| `children` | `React.ReactNode` | ✅ | 选角/选阵营界面内容 |

## 组件行为

- 当 `isTutorialMode` 或 `isTutorialActive` 为 `true` 时：
  - 显示全屏加载遮罩
  - 不渲染 `children`
- 否则：直接渲染 `children`

## 依赖

- `react`
- `clsx`

## 示例引用

- DiceThrone：`src/games/dicethrone/Board.tsx`
- SmashUp：`src/games/smashup/Board.tsx`
- SummonerWars：`src/games/summonerwars/Board.tsx`
