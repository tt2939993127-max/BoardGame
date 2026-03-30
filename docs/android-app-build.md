# Android App 构建自动化

## 命令

- `npm run mobile:android:doctor`
- `npm run mobile:android:assets`
- `npm run mobile:android:prepare-release`
- `npm run mobile:android:init`
- `npm run mobile:android:sync`
- `npm run mobile:android:ota:publish -- --channel stable`
- `npm run mobile:android:build:debug`
- `npm run mobile:android:build:release`
- `npm run mobile:android:build:bundle`

## WebView 模式（强制约定）

通过环境变量 `ANDROID_WEBVIEW_MODE` 控制 Android 壳加载方式：

- `embedded`：默认模式（未显式指定时生效）
  - 将 `dist/` 同步到 `android/app/src/main/assets/public/`
  - APK 内置完整前端资源
  - 这是当前主线发布方案
- `remote`：仅在明确指定时启用
  - 通过 `Capacitor server.url` 加载线上页面
  - 不把完整前端静态资源打进 APK
  - 仅适合调试、兼容或短期灰度，不作为长期主线产品方案

`remote` 模式必须配置：

```env
ANDROID_WEBVIEW_MODE=remote
ANDROID_REMOTE_WEB_URL=https://your-domain.com
```

- 当前实现接受绝对 `HTTP/HTTPS` 地址。
- 若不是在局域网临时调试或短期灰度场景，仍优先使用 `HTTPS`。

## 默认策略

- 除非明确指定，否则一律按 `embedded` 构建。
- 只有在你明确提出“要纯壳远程加载 / 要短期兼容某个上线节奏”时，才切换为 `remote`。

## 热更新主线

- 当前仓库默认发布形态是 `embedded`，默认热更新主线是 **`embedded + OTA/Live Update`**。
- 这条链路已经接入基础 OTA runtime：Android 壳内置 `embedded` bundle，启动后后台检查 OTA manifest；若检测到兼容的新 bundle，则下载并排队为下一次进入后台或重启后生效。
- 这意味着“主页 / 大厅 / 房间 / 游戏 UI”这类 H5 本体以后可以走 OTA，不再把 `remote WebView` 当长期产品方案。
- 依据 Capacitor 官方文档，长期更新 Web 内容的主流方向是 **Live Update / Realtime Updates**：原生壳保持不变，按版本下发新的 Web bundle；不涉及原生二进制能力变更时，这类更新是可行的。
- 仍然需要重新发包的内容包括：原生插件、Java/Kotlin/Swift/Objective-C 代码、权限、Manifest、原生启动逻辑、图标与启动图等二进制侧变更。
- 结论：文档和实现都应以 `embedded` 为默认，以 OTA/Live Update 作为热更新主线；`remote` 仅保留为兼容/调试路径，不再作为产品默认推荐。

## 当前 OTA 实现

- 运行时插件：`@capgo/capacitor-updater`
- 发布源：自托管 manifest + zip bundle，当前约定放在对象存储 `official/app-updates/android/<channel>/...`
- 默认策略：后台检查、后台下载、`next()` 排队、`background` 条件生效，不在当前对局里强制热切换
- 启动确认：App 每次原生启动时尽早调用 `notifyAppReady()`，避免已下载 bundle 被插件自动回滚

当前环境变量：

```env
ANDROID_WEBVIEW_MODE=embedded
VITE_ANDROID_OTA_ENABLED=true
VITE_ANDROID_OTA_MANIFEST_URL=https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json
VITE_ANDROID_OTA_CHANNEL=stable
VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS=15000
```

`doctor` 可直接检查当前 OTA 配置是否生效：

```bash
npm run mobile:android:doctor
```

## OTA 发布流程

推荐顺序：

1. `npm run mobile:android:sync`
2. 确认 `dist/` 和 `android/app/src/main/assets/public/` 已同步
3. 先预演一次发布：

```bash
npm run mobile:android:ota:publish -- --channel stable --dry-run
```

4. 如果只想先上传 bundle 和版本 manifest，不立刻切 `latest.json`：

```bash
npm run mobile:android:ota:publish -- --channel stable --skip-latest
```

5. 确认无误后再正式更新 channel 的 `latest.json`：

```bash
npm run mobile:android:ota:publish -- --channel stable
```

如果走 GitHub Actions 自动化：

- `main` 分支合入影响 H5 bundle 的改动后，会自动发布到非生产 channel，默认是 `edge`
- `stable` / `gray` 通过 Actions `Android OTA Publish` 手动触发
- `stable` 建议绑定 `android-ota-production` Environment 审批，避免误发

推荐发布策略：

1. 日常合并到 `main`：自动发 `edge`
2. 群友 / 测试机验证：手动发 `gray`
3. 确认稳定：手动发 `stable`

可选参数：

- `--channel <name>`：发布 channel，例如 `stable`、`gray`
- `--version <bundleVersion>`：手动指定 bundle 版本号
- `--native-version <version>`：指定兼容的原生版本，默认取 `package.json.version`
- `--notes <text>`：写入 manifest 备注
- `--dry-run`：只打 zip、算 checksum、打印 manifest，不上传
- `--skip-latest`：上传 zip 和版本 manifest，但不覆盖 `<channel>/latest.json`

当前发布脚本会写入：

- `official/app-updates/android/<channel>/bundles/<bundleVersion>.zip`
- `official/app-updates/android/<channel>/manifests/<bundleVersion>.json`
- `official/app-updates/android/<channel>/latest.json`

## OTA Manifest 结构

`latest.json` 与版本 manifest 当前结构如下：

```json
{
  "version": "0.5.0-ota-2026-03-29T20-30-00-000Z",
  "url": "https://assets.easyboardgame.top/official/app-updates/android/stable/bundles/0.5.0-ota-2026-03-29T20-30-00-000Z.zip",
  "checksum": "sha256-hex",
  "channel": "stable",
  "targetNativeVersion": "0.5.0",
  "publishedAt": "2026-03-29T20:30:00.000Z",
  "size": 1234567,
  "notes": "Android embedded OTA bundle"
}
```

兼容性控制支持：

- `targetNativeVersion`：只允许某个原生版本接收该 bundle
- `minNativeVersion` / `maxNativeVersion`：允许一个原生版本区间

## 什么能 OTA，什么仍要发包

可以走 OTA：

- 首页、登录页、大厅、房间页、游戏 UI、前端资源引用、前端逻辑
- `dist/` 里输出的 H5 bundle 与静态资源路径

仍然需要重新发 APK / AAB：

- 新增或修改 Capacitor / Android 原生插件
- `android/` 原生工程、Java/Kotlin 代码、权限、Manifest、签名、图标、启动图
- 需要升级原生 SDK、系统能力或包体结构的变更

一句话：OTA 能更新的是 Web 本体，不是原生二进制。

## 验证口径

- 预演发布先用 `--dry-run`
- 小流量验证建议先发 `gray` 之类独立 channel，再切 `stable`
- App 端当前提示语义是“已在后台准备完成，切到后台或重启 App 后生效”
- 若本次改动涉及原生层，仍必须重新打包安装验证，不能把 OTA 当成原生更新替代品

## GitHub Actions 配置

自动化 OTA workflow 文件：

- `.github/workflows/android-ota-publish.yml`

需要的 GitHub Secrets：

- `ANDROID_VITE_BACKEND_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

可选 GitHub Variables：

- `VITE_ASSETS_BASE_URL`
- `ANDROID_OTA_AUTO_CHANNEL`
- `ANDROID_OTA_APP_READY_TIMEOUT_MS`
- `CAPACITOR_APP_ID`
- `CAPACITOR_APP_NAME`

推荐 Environment：

- `android-ota-nonprod`
- `android-ota-production`

其中 `android-ota-production` 应配置 required reviewers，用于保护 `stable` 发布。

## 关键约束

- 不要直接在 Android Studio 里只跑 `assembleRelease` / `bundleRelease`，应先执行构建脚本。
- `embedded` 模式下，构建前会校验 `dist/android-build-meta.json` 与
  `android/app/src/main/assets/public/android-build-meta.json` 一致性，不一致将阻断打包。
- `remote` 模式下，构建链会走 `cap update android` + `cap copy android`，并清理
  `android/app/src/main/assets/public/`，避免把完整前端资源误打进 APK。

## 文档口径说明

- 以后凡是提到 Android 主线发布方案，默认都指 `embedded`。
- 以后凡是提到 Android 主线热更新方案，默认都指 `embedded + OTA/Live Update`。
- 若文档里仍出现“`remote` 作为默认方案”或“`remote` 作为长期热更新方案”的表述，应视为过时口径并及时修正。

## 图标与启动图

默认素材：

- `public/logos/logo_1_grid.png`

自动生成输出：

- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`
- `android/app/src/main/res/drawable*/splash.png`

可选环境变量：

```env
ANDROID_ICON_SOURCE=public/logos/logo_1_grid.png
ANDROID_SPLASH_SOURCE=public/logos/logo_1_grid.png
ANDROID_ICON_BACKGROUND=#FFFFFF
ANDROID_SPLASH_BACKGROUND=#FFFFFF
ANDROID_ICON_INSET_RATIO=0.68
ANDROID_ADAPTIVE_ICON_INSET_RATIO=0.72
ANDROID_SPLASH_LOGO_RATIO=0.34
```

## Release 签名

支持两种输入：

```env
# 本地文件
ANDROID_KEYSTORE_PATH=C:/secure/release-upload.keystore

# 或 CI / Secret Base64
ANDROID_KEYSTORE_BASE64=

ANDROID_KEYSTORE_PASSWORD=
ANDROID_KEY_ALIAS=
ANDROID_KEY_PASSWORD=
```

`npm run mobile:android:prepare-release` 会：

- 规范化 keystore 到 `android/keystores/release-upload.keystore`
- 生成 `android/keystore.properties`

`npm run mobile:android:build:release` 和 `npm run mobile:android:build:bundle` 会在构建前强制校验签名配置。
