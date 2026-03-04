# 设计说明：UGC 布局对齐/锚点/吸附

## 目标
- 提供锚点定位能力，解决布局对齐与自适应问题。
- 对齐/吸附仅作为编辑器辅助，不引入运行时组件间依赖。
- 预览与运行时共用同一套布局解析逻辑，避免“所见即所得”偏差。

## 数据模型
在 layout 组件中新增字段（锚点模型为唯一格式）：

```ts
anchor: { x: number; y: number }     // 0~1，表示锚点在画布中的比例位置
pivot: { x: number; y: number }      // 0~1，表示组件自身参考点
offset: { x: number; y: number }     // 以像素为单位的偏移
```

解析公式：
```
resolvedX = anchor.x * canvasWidth  + offset.x - pivot.x * width
resolvedY = anchor.y * canvasHeight + offset.y - pivot.y * height
```

旧布局处理：
- 旧数据不再支持，必须更新为锚点模型后方可渲染。
- 运行时保存原始布局数据，不写入解析后的坐标，避免漂移。

## 编辑器行为
- 对齐/分布工具直接更新布局中的 `anchor/pivot/offset`。
- 吸附逻辑仅在拖拽/缩放时生效，吸附结果写入布局坐标，不保存“吸附依赖”。
- 网格大小、吸附开关属于编辑器偏好设置（uiLayout 或本地存储），不写入布局组件本身。

## 风险与约束
- 禁止将临时对齐参考线、选择状态等 UI 状态写入 layout 数据。
- 任何新增字段需确保导入/导出与草稿持久化完整保留。
