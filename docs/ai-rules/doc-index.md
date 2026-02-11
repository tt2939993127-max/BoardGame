# 文档索引与使用时机

> 按场景查找需要阅读的文档。

| 场景 / 行为 | 必须阅读的文档 | 关注重点 |
| :--- | :--- | :--- |
| **处理资源** (图片/音频/图集/清单) | `docs/tools.md` | 压缩指令、扫描参数、清单校验 |
| **修改 DiceThrone** (文案/资源) | `docs/dicethrone-i18n.md` | 翻译 Key 结构、Scheme A 取图函数 |
| **环境配置 / 部署** (端口/同域代理) | `docs/deploy.md` | 端口映射、环境变量、Nginx 参数 |
| **本地联机测试** (单人同步调试) | `docs/test-mode.md` | 测试模式开关及其对视角的影响 |
| **编写或修复测试** (Vitest/Playwright) | `docs/automated-testing.md` | 测试库配置、错误码命名规范 |
| **开发前端 / 新增游戏** (引擎/组件) | `docs/framework/frontend.md` | 系统复用 (Ability/Status)、动画组件、解耦规范 |
| **开发后端 / 数据库** (NestJS/Mongo) | `docs/framework/backend.md` | 模块划分、Socket 网关、存储适配器 |
| **接口调用 / 联调** (REST/WS) | `docs/api/README.md` | 认证方式、分页约定、实时通信事件 |
| **使用 Undo / Fab 功能** | `docs/components/UndoFab.md` | UndoFab 组件的 Props 要求与环境依赖 |
| **新增作弊/调试指令** | `docs/debug-tool-refactor.md` | 游戏专属调试配置的解耦注入方式 |
| **粒子特效开发** (Canvas 2D 引擎) | `docs/particle-engine.md` | API、预设字段、性能优化、视觉质量规则、新增检查清单 |
| **新增棋盘特效** (FX 系统) | `docs/ai-rules/animation-effects.md` § 引擎级 FX 系统 | FxRegistry 注册、FxBus push、FxRenderer 适配器、新增流程 |
| **挑选/查找音效** (音效定位) | `docs/audio/audio-catalog.md` | 语义目录，按关键词搜索定位 registry key |
| **音频不播放 / AudioContext** (浏览器兼容) | `docs/ai-rules/golden-rules.md` § AudioContext | `ctx.resume()` 异步竞态、HTML5 Audio vs WebAudio 区别 |
| **状态同步/存储调优** (16MB 限制) | `docs/mongodb-16mb-fix.md` | 状态裁剪策略、Log 限制、Undo 快照优化 |
| **复杂任务规划** (多文件/长流程) | `.agent/skills/planning-with-files/SKILL.md` | 必须维护 `task_plan.md`，定期转存 `findings.md` |
| **UI/UX 设计** (配色/组件/动效) | `.agent/skills/ui-ux-pro-max/SKILL.md` | 使用 `python3 ... search.py` 生成设计系统与样式 |
| **大规模 UI 改动** (新页面/重做布局/新游戏UI) | 先 Skill `--design-system`，再 `design-system/` | 见 §UI/UX 规范 → §0. 大规模 UI 改动前置流程 |
| **游戏内 UI 交互** (按钮/面板/指示器) | `design-system/game-ui/MASTER.md` | 交互原则、反馈规范、动画时长、状态清晰 |
| **游戏 UI 风格选择** | `design-system/styles/` | arcade-3d（街机立体）、tactical-clean（战术简洁）、classic-parchment（经典羊皮纸） |
