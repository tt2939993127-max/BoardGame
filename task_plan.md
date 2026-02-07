# 召唤师战争粒子特效重构计划

## 目标
将 DestroyEffect 和 BoardEffects 中手写的粒子散射（>8 个 `<motion.div>` 循环生成）替换为 `BurstParticles` 组件（tsParticles），保留 framer-motion 做形状动画的部分。

## 重构范围

### 1. DestroyEffect.tsx — 摧毁爆炸
**替换部分**：
- `{/* 爆炸粒子 */}` — 12-18 个 `<motion.div>` 循环生成的碎片 → `BurstParticles preset="explosion"`
- `{/* 烟尘扩散 */}` — 3-4 个 `<motion.div>` 烟雾 → `BurstParticles preset="smoke"`

**保留部分**（framer-motion 形状动画）：
- 中心闪光（单个 div 缩放）
- 冲击波环（单个 div 缩放）
- 摧毁文字提示（单个文字飞出）

**颜色配置**：
- 单位摧毁：`['#fb923c', '#f87171', '#fbbf24', '#fff']`（橙红）
- 建筑摧毁：`['#a78bfa', '#c084fc', '#e9d5ff', '#fff']`（紫色）

### 2. BoardEffects.tsx — 召唤碎片
**替换部分**：
- `SummonEffect` 中的 `<DebrisLayer>` — 12-20 个碎片 → `BurstParticles preset="summonDebris"`
- 整个 `DebrisLayer` 组件和 `generateDebris` 函数可以删除

**保留部分**（framer-motion 形状动画）：
- 光柱坠落（单个 div 位移）
- 落地白闪（单个 div 缩放）
- 冲击波环 x2（2 个 div 缩放）
- 地裂纹（4-8 条线条缩放）
- 冠军金色光晕（单个 div 缩放）

**颜色配置**：
- 普通召唤：`['#93c5fd', '#60a5fa', '#3b82f6', '#bfdbfe', '#fff']`（蓝色）
- 强力召唤：`['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fff']`（金色）

### 3. 不动的部分
- `ShockwaveEffect`（攻击气浪）— 方向性锥形，framer-motion 正确
- `DamageEffect`（受伤反馈）— SlashEffect + 红闪 + 数字，framer-motion 正确
- `useScreenShake`（全屏震动）— rAF 直操 transform，最优方案
- `DiceResultOverlay`（3D骰子）— CSS 3D transform，无关粒子
- 所有 UI 过渡动画 — framer-motion/CSS 正确

## 执行步骤

1. ✅ 创建 `BurstParticles` 通用组件
2. ✅ 更新 AGENTS.md 动效选型规范
3. ✅ 重构 `DestroyEffect.tsx`：删除手写粒子循环，接入 BurstParticles
4. ✅ 重构 `BoardEffects.tsx`：删除 DebrisLayer，SummonEffect 接入 BurstParticles
5. ✅ 验证：Board.tsx 导入链路无报错
6. ✅ 类型检查通过

## 预期收益
- 删除 ~80 行手写粒子代码（generateDebris + DebrisLayer + 两处粒子循环）
- 粒子效果更丰富（重力、旋转、透明度衰减、大小衰减）
- 性能更好（tsParticles canvas 渲染 vs 多个 DOM 节点 + framer-motion 实例）
- 配置化：游戏层可通过 preset/config 覆盖粒子参数
