## 1. Implementation
- [x] 1.1 新建权威游戏清单（纯数据，含 id/type/enabled），定义类型与读取入口
- [x] 1.2 从权威清单派生前端展示配置（games.config.tsx）并移除重复枚举
- [x] 1.3 从权威清单派生前端实现映射（games/registry.ts）并加入一致性校验
- [x] 1.4 服务端从权威清单派生 GameTransportServer 注册列表
- [x] 1.5 使用 game.onEnd 事件驱动写入 MatchRecord（含胜负与平局）
- [x] 1.6 移除轮询归档任务（harvestMatchResults + setInterval）
- [ ] 1.7 验证：对局结束后战绩落库、排行榜接口正常返回
- [ ] 1.8 更新文档（开发说明与注册规范）
