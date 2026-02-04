# UGC Builder 文档

> UGC (User Generated Content) Builder 是一个通用的桌游原型构建工具，支持从 Schema 定义到 AI 规则生成的完整工作流。

## 访问路由

- `/dev/ugc/unified` - 统一 Builder（推荐）
- `/dev/ugc/schema` - Schema 定义演示
- `/dev/ugc/scene` - 场景画布演示
- `/dev/ugc/rules` - 规则生成演示

## 核心功能

### 1. Schema 定义

定义游戏中的数据结构（如卡牌、武将、技能等）。

**支持的字段类型：**
- `string` - 文本
- `number` - 数字
- `boolean` - 布尔
- `array` (tags) - 标签列表
- `effects` - 效果代码（AI 生成）
- `code` - 自定义代码

**操作：**
- 添加/删除 Schema
- 添加/删除/编辑字段
- 修改字段名称和类型

### 2. 数据管理

管理 Schema 对应的数据实例。

**功能：**
- 表格展示（暗色主题）
- 搜索/排序
- 添加/编辑/删除数据行
- 双击编辑弹窗

### 3. UI 布局画布

拖拽配置游戏界面。

**组件类型：**

| 分类 | 组件 | 说明 |
|------|------|------|
| 卡牌机制 | 手牌区、牌堆、出牌区 | 可绑定 Schema |
| 玩家信息 | 玩家信息、资源栏 | 显示玩家状态 |
| UI 元素 | 操作栏、消息日志 | 界面辅助 |

**操作：**
- 从左侧组件库拖拽到画布
- 移动组件位置（拖拽）
- 调整组件尺寸（右下角手柄）
- 删除组件（红色按钮 / Delete 键）
- 点击选中查看属性

### 4. AI 规则生成

根据 Schema 和数据生成 boardgame.io 规则代码的提示词。

**模板：**
- `setup` - 游戏初始化
- `moves` - 玩家操作
- `phases` - 阶段流程
- `effects` - 效果系统
- `endgame` - 胜负判定

**使用方式：**
1. 点击工具栏"生成规则"按钮
2. 选择模板或生成完整提示词
3. 复制到 AI 对话框生成代码

### 5. 保存/加载

**功能：**
- **保存** - 保存到 localStorage
- **导出** - 下载 JSON 文件
- **导入** - 上传 JSON 文件
- 页面加载自动恢复

## 技术架构

```
src/ugc/builder/
├── ai/                     # AI 提示词生成
│   ├── PromptGenerator.ts  # 核心生成器
│   └── index.ts
├── pages/                  # 页面组件
│   ├── UnifiedBuilder.tsx  # 统一 Builder（主入口）
│   ├── SchemaBuilderDemo.tsx
│   ├── SceneBuilderDemo.tsx
│   └── RulesGeneratorDemo.tsx
├── schema/                 # Schema 定义
│   └── types.ts            # 类型和工具函数
├── ui/                     # UI 组件
│   ├── DataTable.tsx       # 数据表格
│   └── SceneCanvas.tsx     # 场景画布
└── __tests__/              # 测试用例
    └── UnifiedBuilder.test.ts
```

## 数据结构

### GameContext

```typescript
interface GameContext {
  name: string;           // 游戏名称
  description: string;    // 描述
  tags: string[];         // 标签
  schemas: SchemaDefinition[];  // Schema 列表
  instances: Record<string, Record<string, unknown>[]>;  // 数据实例
  layout: SceneComponent[];  // UI 布局
}
```

### SchemaDefinition

```typescript
interface SchemaDefinition {
  id: string;
  name: string;
  description: string;
  fields: Record<string, FieldDefinition>;
  primaryKey?: string;
}
```

### SceneComponent

```typescript
interface SceneComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  data: Record<string, unknown>;
}
```

## 测试

运行测试：
```bash
npx vitest run src/ugc/builder/__tests__/UnifiedBuilder.test.ts
```

测试覆盖：
- PromptGenerator（4 个测试）
- Schema 工具函数（3 个测试）
- createEmptyContext（1 个测试）

## 后续规划

- [ ] 预览功能（生成可运行游戏）
- [ ] 组件属性编辑增强
- [ ] 撤销/重做
- [ ] 画布缩放/平移
- [ ] 更多组件类型
- [ ] 组件复制/粘贴
