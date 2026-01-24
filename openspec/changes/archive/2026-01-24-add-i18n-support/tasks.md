# Tasks: 国际化实施任务清单

## 1. 基础设施搭建
- [x] 1.1 安装依赖：`i18next`, `react-i18next`, `i18next-http-backend`, `i18next-browser-languagedetector`
- [x] 1.2 创建 `src/lib/i18n/index.ts` 初始化配置
- [x] 1.3 创建 `src/lib/i18n/types.ts` 类型定义
- [x] 1.4 在 `src/main.tsx` 引入 i18n 初始化
- [x] 1.5 创建翻译文件目录结构 `public/locales/{zh-CN,en}/`

## 2. 通用模块国际化
- [x] 2.1 创建 `common.json` 翻译文件（按钮、标签等通用文本）
- [x] 2.2 创建 `LanguageSwitcher` 语言切换组件
- [x] 2.3 迁移 `src/components/common/` 下组件的硬编码文本
- [x] 2.4 迁移 `src/components/layout/` 下组件的硬编码文本

## 3. 认证模块国际化
- [x] 3.1 创建 `auth.json` 翻译文件
- [x] 3.2 迁移 `src/components/auth/AuthModal.tsx`
- [x] 3.3 迁移 `src/components/auth/EmailBindModal.tsx`

## 4. 大厅模块国际化
- [x] 4.1 创建 `lobby.json` 翻译文件
- [x] 4.2 迁移 `src/pages/Home.tsx`
- [x] 4.3 迁移 `src/components/lobby/GameDetailsModal.tsx`
- [x] 4.4 迁移 `src/pages/MatchRoom.tsx`
- [x] 4.5 迁移 `src/pages/LocalMatchRoom.tsx`

## 5. 游戏核心模块国际化
- [x] 5.1 创建 `game.json` 翻译文件
- [x] 5.2 迁移 `src/components/game/GameControls.tsx`
- [x] 5.3 迁移 `src/components/game/GameHUD.tsx`
- [x] 5.4 迁移 `src/components/GameDebugPanel.tsx`

## 6. 教程系统国际化
- [x] 6.1 创建 `tutorial.json` 翻译文件（仅教程 UI 通用文案）
- [x] 6.2 迁移 `src/components/tutorial/TutorialOverlay.tsx`
- [x] 6.3 迁移 `src/contexts/TutorialContext.tsx` 中的提示文本
- [x] 6.4 迁移 `src/games/default/tutorial.ts` 教程步骤文本（改为游戏命名空间）

## 7. 游戏特定内容国际化
- [x] 7.1 创建 `game-<gameId>.json` 翻译文件（示例：`game-dicethrone.json`）
- [x] 7.2 迁移 `src/games/dicethrone/Board.tsx` 游戏 UI 文本
- [x] 7.3 迁移 `src/games/dicethrone/game.ts` 技能/卡牌名称
- [x] 7.4 迁移 `src/games/default/Board.tsx`

## 8. 后端消息国际化（可选）
- [x] 8.1 迁移 `src/server/auth.ts` 错误消息
- [x] 8.2 迁移 `src/server/email.ts` 邮件模板
- [x] 8.3 迁移 `src/services/lobbySocket.ts` 提示消息

## 9. 验证与测试
- [ ] 9.1 验证中英文切换功能正常
- [ ] 9.2 验证翻译 Key 无遗漏（浏览器控制台检查）
- [ ] 9.3 验证 localStorage 持久化语言偏好
- [ ] 9.4 验证页面刷新后语言保持
- [ ] 9.5 `npm run lint` 通过
- [ ] 9.6 `tsc` 类型检查通过

## 依赖关系
- 任务 2-8 依赖任务 1 完成
- 任务 9 在所有迁移完成后执行
- 任务 8（后端消息）可并行或延后
