# Change: UGC Builder - 完全动态的代码驱动原型制作器

## Why
当前实现偏离了原始设计意图：
- 错误地做成了"拖拽组件 + 配置属性"的低代码编辑器
- 把"代码模板"理解成了"JSON 配置模板"
- 预设了固定的数据结构（Player/Card），限制了自由度

用户期望的是**完全动态**的原型制作器：
- 数据模型（玩家属性、卡牌结构）由 AI 生成，不预设
- 效果是可执行代码，不是预定义配置
- Tag 可自定义，效果通过 Tag 筛选而非绑定具体卡牌
- AI 生成的不只是执行代码，还有数据结构、配置表

## 参考的游戏引擎

| 引擎 | 借鉴点 |
|---|---|
| **TTS** | 每个组件可绑定脚本，`self` 引用 |
| **Boardgame.io** | Moves 是纯函数，状态不可变，声明式配置 |
| **RFTG** | 配置文件定义卡牌属性和触发条件 |

## What Changes

### 1. 最小约束的 GameBundle 结构

引擎不预设任何游戏结构，只定义代码容器：

```typescript
interface GameBundle {
  id: string;
  name: string;
  
  // AI 生成的数据模型定义代码
  // 执行后得到 Player/Card/Zone 等 schema
  dataModelCode: string;
  
  // AI 生成的游戏逻辑代码
  // 包含 moves、phases、胜负判定
  logicCode: string;
  
  // AI 生成的卡牌/配置表
  // 可以是 JSON 或生成代码
  configCode: string;
  
  // AI 生成的渲染代码
  viewCode: string;
  
  // 用户绘制的资源（画笔数据）
  assets: { id: string; type: 'canvas' | 'image'; data: string }[];
}
```

### 2. 引擎只负责

1. **执行 dataModelCode** → 得到数据 schema
2. **执行 logicCode** → 注册 moves 和 phases
3. **解析 configCode** → 创建游戏实例
4. **执行 viewCode** → 渲染 UI

### 3. Tag 系统

- 用户可创建任意 Tag（武器、锦囊、♠♥♣♦、1-13...）
- Tag 定义包含名称、描述、颜色
- 效果代码通过 `ctx.getByTag('weapon')` 筛选
- 生成提示词时包含 Tag 列表和作用说明

### 4. AI 生成内容（提示词驱动，用户自用 AI）

平台仅生成**提示词**与**导入入口**，不内置 AI：
- 用户在 UI 中填写需求 → 系统生成提示词 → 用户用自有 AI 生成结果 → 粘贴导入
- 覆盖所有层级：Schema/Effect/Instance/Rules/View/渲染组件/批量生成
- 移除“直接手写代码”入口，仅保留“粘贴 AI 结果”的导入方式
- 字段类型中移除 `code`，保留 `effects` 与 `condition`（均需 AI 生成）

### 5. 画笔功能

提供简单画笔绘制牌面/牌背，输出 Canvas 数据存入 assets。

### 6. 沙箱 SDK

提供受限 API 注入到用户代码执行环境：
- 状态读写：`ctx.get()`, `ctx.set()`
- 游戏操作：`ctx.move()`, `ctx.endTurn()`
- 目标选择：`ctx.selectTarget()`, `ctx.selectCards()`
- Tag 筛选：`ctx.getByTag()`
- UI 交互：`ctx.showMessage()`, `ctx.confirm()`

## Impact
- 规则/交互/效果/批量/渲染全部统一为“需求 → 提示词 → AI 生成 → 粘贴导入”流程
- 移除 `code` 字段类型与相关 UI/测试/提示词
- 保留 `effects` 与 `condition` 类型，但只允许通过 AI 生成导入
- 扩展沙箱支持完整 SDK

## Migration
- 对已有数据进行字段迁移：`code` 字段将被移除或映射为 `effects`
- 旧手动编辑入口关闭，仅保留导入入口
