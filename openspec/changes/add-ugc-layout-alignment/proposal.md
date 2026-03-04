# Change: 新增 UGC 布局对齐/锚点/吸附能力

## Why
当前 UGC Builder 只支持基于绝对坐标的手工摆放，缺少对齐、锚点与吸附工具，导致布局经常出现“歪”和不一致的视觉节奏。需要引入通用的布局对齐与锚点能力，降低原型搭建成本并让预览与运行时更一致。

## What Changes
- **BREAKING** 布局组件切换为锚点/枢轴/偏移模型，移除旧的纯 `x/y` 绝对定位方式。
- Builder 提供对齐/分布工具栏，支持左/中/右、上/中/下对齐与等距分布。
- Builder 支持网格吸附与组件边缘/中心吸附，并提供可视化参考线。
- Preview/Runtime 使用统一的布局解析器将锚点数据转换为实际坐标，确保预览与运行时一致。
- 导入/导出与草稿持久化保持锚点数据完整保存，并对现有草稿做一次性迁移。
- 补充布局解析与编辑器交互测试。

## Impact
- Affected specs: `ugc-prototype-builder`, `ugc-runtime`
- **BREAKING** 旧布局数据不再兼容，需迁移现有草稿
- Affected code:
  - `src/ugc/builder/schema/types.ts`（布局模型扩展）
  - `src/ugc/builder/ui/SceneCanvas.tsx`（对齐/吸附交互）
  - `src/ugc/builder/ui/RenderPreview.tsx`（布局解析接入）
  - `src/ugc/runtime/previewConfig.ts`（运行时布局解析）
  - `src/ugc/builder/pages/UnifiedBuilder.tsx`（配置持久化）
