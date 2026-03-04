# Tasks: add-ugc-client-runtime-adapter

## 1. 客户端加载器与配置
- [ ] 新增 UGC_ASSET_BASE_URL 配置
- [ ] 实现 UGC 客户端加载器（manifest -> rules/view URL）
- [ ] 支持 manifest.commandTypes（可选，用于可枚举 moves）

## 2. UGC Client Game/Board 适配
- [ ] 实现 UGC Client Game 异步构建（RuntimeDomainExecutor + createGameAdapter）
- [ ] 实现 UGC Board（iframe + HostBridge + state/moves 适配）

## 3. MatchRoom 集成
- [ ] MatchRoom 动态注入 UGC Game/Board
- [ ] 运行态加载/错误态提示

## 4. 测试与校验
- [ ] Loader 单测
- [ ] MatchRoom UGC 入口联机冒烟测试
- [ ] 预览/运行态一致性回归
