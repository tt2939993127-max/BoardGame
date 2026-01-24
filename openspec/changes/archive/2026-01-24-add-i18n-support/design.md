# Design: 国际化架构设计

## Context
项目当前有 826 处中文文本分布在 43 个文件中，需要建立可扩展的国际化架构。

**约束条件**：
- React 19 + TypeScript + Vite 7
- 需要支持游戏内容（卡牌、技能）的国际化
- 需要支持动态加载以优化性能

## Goals / Non-Goals

### Goals
- 建立可扩展的 i18n 基础设施
- 支持中文/英文双语切换
- 按命名空间组织翻译文件
- 保持类型安全

### Non-Goals
- 本阶段不实现翻译管理平台集成
- 本阶段不实现 RTL（从右到左）语言支持
- 本阶段不实现复杂的复数/性别变化规则

## Decisions

### 1. 目录结构
```
public/
├── locales/
│   ├── zh-CN/
│   │   ├── common.json        # 通用文本（按钮、标签等）
│   │   ├── lobby.json         # 大厅相关
│   │   ├── game.json          # 游戏通用
│   │   ├── tutorial.json      # 教程 UI 通用文本
│   │   ├── auth.json          # 认证相关
│   │   └── game-<gameId>.json # 游戏专属内容（卡牌/状态/教程步骤）
│   └── en/
│       └── ... (同上)
└── assets/
    ├── common/
    └── games/
        └── <gameId>/

src/
├── games/
│   ├── manifest.ts
│   ├── registry.ts
│   ├── common/
│   └── <gameId>/
│       ├── game.ts
│       ├── Board.tsx
│       ├── data/
│       │   ├── cards.ts
│       │   ├── statusEffects.ts
│       │   └── tutorial.ts
│       ├── ui/
│       │   ├── cards/
│       │   ├── panels/
│       │   └── widgets/
│       └── theme.ts
└── lib/
    └── i18n/
        ├── index.ts         # i18n 初始化配置
        ├── types.ts         # 类型定义
        └── hooks.ts         # 自定义 hooks (可选)
```

**理由**：按功能模块 + 游戏维度划分命名空间，便于按需加载和团队协作；资源统一放置在 public 下便于运行时访问。

### 2. 游戏内容数据化规范
- 卡牌/状态/教程步骤等内容必须定义在 `data/` 中，UI 仅负责渲染。
- 数据结构仅保存 `id` 与 i18n key（`nameKey`/`descKey`/`effectsKeys`），禁止直接写展示文本。
- UI 通过 `t(key)` 渲染文本，支持后续多语言扩展。

**示例**：
```ts
export type CardDefinition = {
  id: string;
  nameKey: string;
  descKey: string;
  effectsKeys: string[];
};
```

### 3. 翻译 Key 命名规范
```json
{
  "page.section.element": "文本内容",
  "action.verb": "动作文本"
}
```

**示例**：
```json
{
  "lobby.createRoom.title": "创建房间",
  "lobby.createRoom.confirm": "确认创建",
  "common.button.cancel": "取消",
  "common.button.confirm": "确认",
  "game.turn.yourTurn": "轮到你了",
  "game.turn.opponentTurn": "对手回合",
  "games.dicethrone.cards.fist-technique.name": "拳术",
  "games.dicethrone.tutorial.steps.welcome": "欢迎来到王权骰铸"
}
```

### 4. i18n 初始化配置
```typescript
// src/lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en'],
    defaultNS: 'common',
    ns: ['common', 'lobby', 'game', 'tutorial', 'auth'],
    interpolation: {
      escapeValue: false, // React 已处理 XSS
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
```

### 5. 组件使用模式

**基础用法**：
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('lobby');
  return <h1>{t('createRoom.title')}</h1>;
}
```

**带插值**：
```tsx
const { t } = useTranslation('game');
return <p>{t('turn.waiting', { player: playerName })}</p>;
// game.json: "turn.waiting": "等待 {{player}} 操作..."
```

**多命名空间**：
```tsx
const { t } = useTranslation(['game', 'common']);
return (
  <>
    <p>{t('game:turn.yourTurn')}</p>
    <button>{t('common:button.confirm')}</button>
  </>
);
```

### 6. 语言切换组件
```tsx
// src/components/common/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 迁移工作量大（43 文件） | 实施周期长 | 分阶段迁移，优先通用组件 |
| 翻译 Key 遗漏 | 运行时显示 Key 而非文本 | 使用 ESLint 插件检测 |
| 翻译文件过大 | 首屏加载慢 | 按命名空间拆分 + 懒加载 |
| 游戏内容翻译复杂 | 卡牌/技能文本量大 | 单独 namespace per game |

## Migration Plan

### 迁移顺序
1. **Week 1**：基础设施 + `common.json` + 语言切换
2. **Week 2**：`lobby.json` + `auth.json` + 页面组件
3. **Week 3**：`game.json` + `tutorial.json` + 游戏组件
4. **Week 4**：游戏特定内容（dicethrone 等）

### 回滚方案
- 所有中文文本保留在翻译文件中作为 fallback
- i18n 初始化失败时降级到硬编码文本

## Open Questions
1. 游戏规则 PDF 是否需要多语言版本？
2. 是否需要集成翻译管理平台（如 Crowdin）？
