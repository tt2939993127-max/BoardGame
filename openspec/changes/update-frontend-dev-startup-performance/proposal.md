# Change: 修复前端开发启动性能

## Why

开发服务每次启动都会删除同端口的 Vite 依赖预构建缓存，并且桌面首页会在首屏静态加载仅供原生移动壳使用的模块。这让正常的本地重启反复回到冷启动，且桌面浏览器为不需要的原生包付出转换和请求成本。

## What Changes

- 默认复用同端口、同工作目录的 Vite 依赖预构建缓存；清理改为显式 opt-in，不改变端口隔离策略。
- 桌面首屏仅在检测到原生移动运行时后才加载移动更新和已安装游戏包初始化模块。
- 移除桌面入口对 Capacitor 的静态依赖；移动方向锁定和移动管理器仍在原生运行时按需加载。
- 不在服务启动期预转换 `App` 等宽入口模块图，避免预热本身阻塞 HTTP 就绪；首屏性能由缓存复用和移动模块按需加载改善。
- 开发与 E2E 共用一份明确的浏览器依赖预构建清单，关闭宽入口下的自动依赖发现。
- 当开发命令关闭 HMR 时，同时关闭 Vite 的轮询 watcher，避免无效扫描阻塞 HTTP 请求。
- 桌面首页不再空闲预取包含原生游戏包的详情弹窗，版本页脚仅在 Android 原生壳中加载 OTA 模块。
- 首页入口改为路由级按需加载，避免配置表和其它路由同步转换首页目录。
- 配置表路由改由共享页面定义驱动；直接访问时使用只含配置表所需鉴权、提示与路由壳的入口，不加载大厅、社交、教程和测试工具。
- Tailwind 样式入口关闭工作区自动检测，只明确扫描 `src` 运行时源码，避免首次 CSS 转换扫描临时证据与工作目录。

## Impact

- Affected specs: `frontend-dev-startup`
- Affected code: `scripts/infra/vite-with-logging.js`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/lib/mobile/mobileRuntime.ts`, `src/components/common/MobileOrientationGuard.tsx`
- Native Android/iOS 运行时和现有移动 E2E 覆盖必须保持可用。
