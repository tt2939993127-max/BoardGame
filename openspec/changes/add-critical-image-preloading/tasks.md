## 1. 实现
- [ ] 1.1 扩展 `GameAssets`，新增 `criticalImages` / `warmImages` 字段并更新生成流程
- [ ] 1.2 新增关键图片解析器注册表与类型（基于对局状态解析）
- [ ] 1.3 AssetLoader 增加 `preloadCriticalImages` / `preloadWarmImages` API（失败容忍 + 后台预取 + 5s 超时放行）
- [ ] 1.4 实现 SmashUp 动态解析器并补充单测
- [ ] 1.5 接入 MatchRoom/LocalMatchRoom 门禁（仅内置游戏）与暖加载触发
- [ ] 1.6 补充 AssetLoader 单测与门禁相关测试

## 2. 验证
- [ ] 2.1 运行相关 Vitest 用例
- [ ] 2.2 手动验证进入对局无首屏白屏/闪烁
