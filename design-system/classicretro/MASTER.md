# 设计系统主文件

> **逻辑：** 构建特定页面时，请首先检查 `design-system/pages/[page-name].md`。
> 如果该文件存在，其规则将**覆盖**本主文件。
> 如果不存在，请严格遵守以下规则。

---

**项目：** ClassicRetro (当前系统)
**生成时间：** 2026-01-28
**类别：** 复古/经典桌游

---

## 全局规则

### Color Palette (Parchment Theme)

| Role | Hex | Tailwind Token |
|------|-----|--------------|
| Yellow | `#EBC944` | `parchment.yellow` |
| Cream (Background) | `#F4ECD8` | `parchment.cream` |
| Brown (Text/Border) | `#4A3B2A` | `parchment.brown` |
| Gold (Accent) | `#D4AF37` | `parchment.gold` |
| Green (Success) | `#556B2F` | `parchment.green` |
| Wax (Accent Red) | `#8B0000` | `parchment.wax` |
| Base Bg | `#F4ECD8` | (Body Background) |
| Base Text | `#433422` | (Body Text) |
| Light Text | `#8c7b64` | (Secondary Text) |

**颜色说明：** 温暖、怀旧、具有纸质纹理的感觉。

### 排版字体

- **标题字体：** Inter (或系统 UI 字体)
- **像素字体：** 'Press Start 2P' (用于复古游戏感)
- **衬线字体：** 'Crimson Text' (用于优雅的正文文本)
- **氛围：** 经典、触感好、温暖、友好

### 间距与布局

- **容器：** 最大宽度 7xl，居中。
- **网格：** 游戏列表使用自动填充网格 (180px 卡片)。
- **圆角：**
  - 卡片：`rounded-sm` (稍显锐利)
  - 模态窗：`rounded-lg`

### 阴影深度 (自定义)

- **阴影：** `0 2px 8px rgba(67,52,34,0.04)` (微妙的棕色阴影)
- **悬停阴影：** `0 4px 16px rgba(67,52,34,0.1)`

---

## 组件规范

### 按钮

```css
/* 主按钮 (渐变或纯色) */
.btn-banana {
  background: var(--color-banana-yellow); /* #FFE135 */
  color: var(--color-banana-brown); /* #5D4037 */
  font-weight: bold;
  border-radius: 4px; /* 经典感觉 */
}
```

### 卡片 (游戏项目)

- **背景：** `#fcfbf9`
- **边框：** 交互式角落边框 (角落线条)
- **悬停效果：** Y 轴位移 -1，阴影增加。
- **缩略图：** 4:3 宽高比。

### 模态窗

- **遮罩层：** `backdrop-blur-sm bg-black/40`
- **面板：** `bg-[#fcfbf9]`, `text-[#433422]`, `border-[#8c7b64]/30`

---

## 设计模式 (推荐/Do's)

- ✅ **使用暖色调：** 始终优先使用 `#f3f0e6` 或 `#FEF9E7` 而非纯白。
- ✅ **正文使用衬线体：** Crimson Text 营造“规则书”的感觉。
- ✅ **使用像素艺术作为点缀：** 在适当的地方 (Logo, 图标)。
- ✅ **角落装饰：** 使用角落边框等样式元素模仿实体卡片。

## 反模式 (禁止/Don'ts)

- ❌ **无冷灰色：** 避免使用标准的 `gray-100` 等。使用暖米色。
- ❌ **无重度渐变：** 保持相对扁平和类似印刷品的感觉。
- ❌ **无过度模糊：** 将毛玻璃效果保持在最低限度 (仅用于简单的遮罩)。
