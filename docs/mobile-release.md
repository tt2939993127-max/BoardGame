# Android 发布速查

这份文档只保留日常自己发版最短路径。底层细节、manifest 结构和环境变量全集仍看 [android-app-build.md](./android-app-build.md)。

## 结论先说

- OTA：默认不改 `package.json.version`
- `stable` OTA：默认只给当前原生版本或更高版本，旧壳应走原生强更
- 原生 APK：建议发版时用 `--bump patch|minor|major` 自动更新版本
- 游戏包：继续走 `package.json.version + gameId + 时间戳` 的派生版本
- 日常入口统一走新的包装脚本，避免再手打多条命令和 npm 参数透传坑

## 常用命令

如果不需要额外参数，直接用 npm 包装脚本也可以：

```bash
npm run mobile:android:release:ota
```

如果要传 `channel`、`bump`、`game` 这类参数，优先直接用 `node` 调统一脚本，避免 npm 在 PowerShell 下误吞参数。

只发 OTA：

```bash
node scripts/mobile/release-android.mjs ota --channel stable
```

说明：
- 对 `stable`，脚本会默认补 `minNativeVersion=<package.json.version>`，并默认开启 `forceUpdate`
- 也就是旧壳不会继续吃新的 `stable` OTA，而是改走原生 APK 更新链路
- 若确实需要临时放开旧壳，必须显式说明并传兼容参数，不再依赖“默认全放行”

预演 OTA，不上传：

```bash
node scripts/mobile/release-android.mjs ota --channel gray --dry-run
```

发原生 APK 更新，并把版本升一个 patch：

```bash
node scripts/mobile/release-android.mjs native --channel stable --bump patch
```

只发游戏包：

```bash
node scripts/mobile/release-android.mjs packages --channel stable --game dicethrone
```

一次跑完整链路：OTA -> 游戏包（可选）-> 原生 APK：

```bash
node scripts/mobile/release-android.mjs full --channel stable --with-packages --bump patch
```

## 包装脚本实际做了什么

`ota`

- 先跑 `doctor`
- 再跑 `sync`
- 最后直接调用 `publish-android-ota.mjs`

`native`

- 可选先 bump `package.json` / `package-lock.json`
- 跑 `doctor`
- 跑 `build:release`
- 最后直接调用 `publish-android-native-update.mjs`

`packages`

- 直接调用 `publish-android-game-packages.mjs`

`full`

- 固定顺序是 `OTA -> packages(可选) -> native`
- `--with-packages` 或 `--game <gameId>` 才会带上游戏包阶段

## 版本策略

OTA：

- 默认版本形如 `0.5.1-ota-2026-04-05T08-28-06-621Z`
- 这是 bundle 版本，不回写仓库版本文件
- 这样做的目的，是避免每次发一个 H5 热更新都污染原生版本号

原生 APK：

- 原生版本必须继续以 `package.json.version` 为单一真实来源
- 因为 Android `versionName` / `versionCode` 就是从这里推导
- 所以包装脚本只支持 `--bump patch|minor|major`，不支持用 `--version` 单独覆盖原生版本

游戏包：

- 继续走 `package.json.version + gameId + 时间戳`
- 如果你需要和某次 native bump 绑定得更紧，就在 bump 后单独再发一次 packages

## channel 建议

- `edge`：日常自测或刚合并后的快速验证
- `gray`：给测试机、小范围用户先吃
- `stable`：正式渠道；默认口径是“旧壳先升级原生 App，再吃新的 OTA”

## 常见注意点

- `native --bump ...` 会直接改仓库里的 `package.json` 和 `package-lock.json`
- `--dry-run` 不能和 `native --bump` 同时用；预演不会改版本文件
- `--skip-build` 只能在你确认本地 release APK 已经是最新时再用
- 如果只需要发兼容壳的 H5 修复，优先发 OTA，不要顺手 bump 原生版本
- 正式发 `stable` OTA 时，默认假设旧壳应被挡回原生升级链路；不要再把“旧壳继续吃 OTA”当成默认策略
