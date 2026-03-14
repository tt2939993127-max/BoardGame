# Android App 构建自动化

## 命令

- `npm run mobile:android:doctor`
- `npm run mobile:android:assets`
- `npm run mobile:android:prepare-release`
- `npm run mobile:android:init`
- `npm run mobile:android:sync`
- `npm run mobile:android:build:debug`
- `npm run mobile:android:build:release`
- `npm run mobile:android:build:bundle`

## WebView 模式（强制约定）

通过环境变量 `ANDROID_WEBVIEW_MODE` 控制 Android 壳加载方式：

- `remote`：默认模式（未显式指定时生效）
  - 通过 `Capacitor server.url` 加载线上 HTTPS 页面
  - 不把完整前端静态资源打进 APK
  - 适合“只要壳子”的场景
- `embedded`：仅在明确指定时启用
  - 将 `dist/` 同步到 `android/app/src/main/assets/public/`
  - APK 内置完整前端资源
  - 适合离线/弱网兜底需求

`remote` 模式必须配置：

```env
ANDROID_WEBVIEW_MODE=remote
ANDROID_REMOTE_WEB_URL=https://your-domain.com
```

## 默认策略

- 除非明确指定，否则一律按 `remote` 构建。
- 只有在你明确提出“要内置前端资源”时，才切换为 `embedded`。

## 关键约束

- 不要直接在 Android Studio 里只跑 `assembleRelease` / `bundleRelease`，应先执行构建脚本。
- `embedded` 模式下，构建前会校验 `dist/android-build-meta.json` 与
  `android/app/src/main/assets/public/android-build-meta.json` 一致性，不一致将阻断打包。
- `remote` 模式下，构建链会走 `cap update android` + `cap copy android`，并清理
  `android/app/src/main/assets/public/`，避免把完整前端资源误打进 APK。

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
