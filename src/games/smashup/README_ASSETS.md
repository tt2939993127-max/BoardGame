# Smash Up (大杀四方) 资源录入指南

本文档用于指导通过观察卡牌图片（Atlas）录入卡牌数据。

## 1. 卡牌结构解析

通过观察卡牌图片上的红框标记区域，提取以下关键信息：

### 随从卡 (Minion)
*   **力量 (Power)**: 左上角的大数字。
*   **名称 (Name)**: 顶部的中英文名称。
*   **类型 (Type)**: 图片中部（通常在插画下方或左侧）标记为 **Minion**。
*   **描述 (Text)**: 底部文本框中的文字。
    *   **关键词**: 注意粗体字，如 **特殊 (Special)**, **Talent (天赋)**, **Ongoing (持续)**。
*   **阵营 (Faction)**: 右下角的图标（例如：骷髅旗 = 海盗 Pirates）。

### 行动卡 (Action)
*   **名称 (Name)**: 顶部的中英文名称。
*   **类型 (Type)**: 图片中部标记为 **Action**。
*   **描述 (Text)**: 底部文本框中的文字。
*   **阵营 (Faction)**: 右下角的图标。

## 2. 录入规范 (cards.ts)

在 `src/games/smashup/data/cards.ts` 中录入数据时，请遵循以下映射规则：

| 字段 | 来源位置 | 说明 |
| :--- | :--- | :--- |
| `type` | 中部标签 | `'minion'` 或 `'action'` |
| `faction` | 右下角图标 | 对应阵营ID (如 `'pirates'`, `'aliens'`) |
| `power` | 左上角数字 | 仅随从卡填写 |
| `name` | 顶部中文 | |
| `nameEn` | 顶部英文 | |
| `abilityText` | 底部文本框 | 完整录入中文描述 |
| `abilityTags` | 描述关键词 | `'special'` (特殊), `'ongoing'` (持续), `'onPlay'` (默认/无关键词) |

### 示例 (海盗 - Buccaneer)

```typescript
{
    id: 'pirate_buccaneer',
    type: 'minion',           // 来源：中部标签 "Minion"
    name: '海盗',              // 来源：顶部中文
    nameEn: 'Buccaneer',      // 来源：顶部英文
    faction: 'pirates',       // 来源：右下角骷髅旗
    power: 4,                 // 来源：左上角数字 "4"
    abilityText: '特殊：如果本随从将要被消灭，将其移动到其他基地来代替。', // 来源：底部文本
    abilityTags: ['special'], // 来源：文本中的 "特殊"
    count: 2,                 // 规则：通常每种普通随从 2-4 张，具体参考规则书
    previewRef: { ... }       // 对应 Atlas 中的索引位置
}
```

## 3. 图片资源索引 (Atlas)

*   **文件**: `public/assets/smashup/cards/cards1.png`
*   **顺序**: 从左到右，从上到下。
*   **索引**:
    *   0-10: 外星人 (Aliens)
    *   11-18: 海盗 (Pirates)
    *   ...后续待补充
