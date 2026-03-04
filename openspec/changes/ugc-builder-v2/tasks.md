# UGC Builder - 分层模块化架构任务清单

## Phase 1: 核心架构
- [ ] 1.1 定义 `GameBundle` 分层结构类型
  - [ ] 1.1.1 `TagDefinition` 类型
  - [ ] 1.1.2 `AssetDefinition` 类型
  - [ ] 1.1.3 `SchemaModule` 类型（Layer 1，支持 extends 继承）
  - [ ] 1.1.4 `EffectModule` 类型（Layer 2）
  - [ ] 1.1.5 `InstanceModule` 类型（Layer 3）
  - [ ] 1.1.6 `RulesModule` 类型（Layer 4）
  - [ ] 1.1.7 `ViewModule` 类型（Layer 5）
- [ ] 1.2 定义 `SandboxAPI` 基础接口
- [ ] 1.3 创建 GameBundle 存储/加载逻辑

## Phase 2: 编辑器 UI
- [ ] 2.1 Tag 管理界面（增删改查、颜色设置、描述）
- [ ] 2.2 分层模块管理
  - [ ] 2.2.1 Schema 列表与编辑（Player/Card/Zone...）
  - [ ] 2.2.2 Effect 列表与编辑
  - [ ] 2.2.3 Instance 列表与编辑
  - [ ] 2.2.4 Rules 编辑（moves/phases/endIf）
  - [ ] 2.2.5 View 组件编辑
- [ ] 2.3 提示词驱动的导入入口（替代手动代码编辑）
- [ ] 2.4 批量生成导入流程（规则/交互/效果/渲染/数据）
- [ ] 2.5 移除手动代码编辑入口（renderCode/layoutCode 等仅保留粘贴导入）
- [ ] 2.6 资源管理界面（上传图片/音频）
- [ ] 2.7 简单画笔工具（Canvas 绘制）

## Phase 3: AI 辅助（递进式上下文）
- [ ] 3.1 提示词生成器（按层级生成，包含上层上下文）
  - [ ] 3.1.1 Schema 提示词（tags + 需求）
  - [ ] 3.1.2 Effect 提示词（tags + schemas + 需求）
  - [ ] 3.1.3 Instance 提示词（tags + schemas + effects + 需求）
  - [ ] 3.1.4 Rules 提示词（全部上层 + 需求）
  - [ ] 3.1.5 View 提示词（全部上层 + 需求）
- [ ] 3.2 统一导入协议（effects/condition 结构化效果块 + 批量导入）
- [ ] 3.3 移除 code 字段类型与相关提示词/测试
- [ ] 3.4 仅保留“提示词 → 外部AI → 粘贴导入”模式
- [ ] 3.5 基础语法校验

## Phase 4: 执行与预览
- [ ] 4.1 沙箱环境搭建（基础 API 注入）
- [ ] 4.2 分层执行流程（Schema → Effect → Instance → Rules → View）
- [ ] 4.3 游戏预览模式
- [ ] 4.4 错误处理与调试日志

## Phase 5: 清理与迁移
- [ ] 5.1 删除 V1 固定结构实现（src/ugc/builder/）
- [ ] 5.2 迁移/清理 code 字段（映射为 effects 或移除）
- [ ] 5.3 更新路由入口
- [ ] 5.4 更新文档

## 验证标准
- [ ] V1 能创建/编辑自定义 Tag
- [ ] V2 能分层管理 Schema/Effect/Instance/Rules/View
- [ ] V3 AI 提示词包含递进式上下文（每层能看到上层代码）
- [ ] V4 仅支持“提示词 → 外部AI → 粘贴导入”（无手动代码编辑入口）
- [ ] V5 沙箱能按顺序执行各层代码并启动游戏预览
