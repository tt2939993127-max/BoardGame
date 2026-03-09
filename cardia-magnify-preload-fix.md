# Cardia 卡牌放大镜加载延迟修复

## 问题描述
点击卡牌放大镜查看大图时有明显延迟（200-500ms），影响用户体验。

## 根本原因
1. Cardia 已在 `assets.ts` 中注册资源，但缺少 `CriticalImageResolver`
2. `CriticalImageGate` 需要 resolver 才能触发预加载机制
3. 没有 resolver 时，图片只在首次使用时才从网络加载

## 解决方案

### 1. 创建关键图片解析器
创建 `src/games/cardia/criticalImageResolver.ts`：
- 将所有卡牌图片（Deck I/II + 地点卡）标记为关键图片
- 游戏开始时预加载到浏览器缓存
- 确保放大镜即时显示，无延迟

### 2. 注册解析器
在 `src/games/cardia/game.ts` 中注册：
```typescript
import { registerCriticalImageResolver } from '../../core';
import { cardiaCriticalImageResolver } from './criticalImageResolver';

registerCriticalImageResolver('cardia', cardiaCriticalImageResolver);
```

## 技术细节

### 预加载流程
1. `MatchRoom.tsx` 自动用 `CriticalImageGate` 包裹所有游戏 Board
2. `CriticalImageGate` 调用 `resolveCriticalImages(gameId, gameState)`
3. 查找注册的 resolver，获取需要预加载的图片列表
4. 预加载完成后才渲染 Board 组件
5. `CardPreview` 组件从缓存中读取图片，即时显示

### 与其他游戏的一致性
- SmashUp: `smashUpCriticalImageResolver` - 根据派系动态加载图集
- DiceThrone: `diceThroneCriticalImageResolver` - 预加载角色卡和骰子图集
- SummonerWars: `summonerWarsCriticalImageResolver` - 预加载单位和地图图集
- Cardia: `cardiaCriticalImageResolver` - 预加载所有卡牌图片（游戏简单，全量加载）

## 修复历史

### 第一次尝试（f1e3acd）
- 将 `CardMagnifyOverlay.tsx` 中的 `OptimizedImage` 替换为 `CardPreview`
- `CardPreview` 会检查预加载缓存，命中时即时显示
- **问题**：预加载机制未启用，缓存为空，仍有延迟

### 最终修复（6cfae32）
- 创建 `cardiaCriticalImageResolver.ts`
- 在 `game.ts` 中注册 resolver
- 预加载机制正常工作，图片即时显示

## 测试验证
1. 启动游戏，观察浏览器控制台预加载日志
2. 点击任意卡牌的放大镜按钮
3. 大图应即时显示，无延迟

## 参考文档
- `docs/ai-rules/asset-pipeline.md` - 资源管线规范
- `src/components/game/framework/CriticalImageGate.tsx` - 预加载门禁实现
- `src/core/CriticalImageResolverRegistry.ts` - 解析器注册表

## Commits
- f1e3acd: fix(cardia): 替换 CardMagnifyOverlay 为 CardPreview（未完全解决）
- 6cfae32: fix(cardia): 添加关键图片解析器，修复卡牌放大镜加载延迟（最终修复）
