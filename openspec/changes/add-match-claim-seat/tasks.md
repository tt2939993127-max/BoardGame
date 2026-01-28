## 1. Implementation
- [ ] 1.1 服务端新增 claim-seat 路由（JWT 校验 + ownerKey 授权 + credentials 重签发）
- [ ] 1.2 游客 ownerKey 创建房间时若存在占用房间则删除旧房间
- [ ] 1.3 前端创建失败（ACTIVE_MATCH_EXISTS）时自动 claim-seat 并回归
- [ ] 1.4 Home/大厅在无本地凭据时自动 claim-seat 回归
- [ ] 1.5 单元测试：claim-seat 授权/拒绝、游客覆盖旧房间
- [ ] 1.6 更新相关文档/注释与日志清理

## 2. Validation
- [ ] 2.1 运行后端测试（含新增用例）
- [ ] 2.2 手动验证：登录用户清缓存后仍可回归；游客清缓存可新建并清旧房
