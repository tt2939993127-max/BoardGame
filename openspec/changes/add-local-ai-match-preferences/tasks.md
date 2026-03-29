## 1. Spec
- [ ] 1.1 新增 `local-ai-match-settings` spec，定义创建房间内 AI 开关、字段来源与房主托管规则
- [ ] 1.2 更新 `manage-user-settings` spec，定义本地 AI 开局偏好的游客本地存储与登录态账号存储

## 2. Frontend
- [ ] 2.1 移除 `GameDetailsModal` 中独立的“对战 AI”入口，只保留创建房间主流程
- [ ] 2.2 扩展 `CreateRoomModal`，加入“加入 AI”开关，并在开启后显示 AI 座位设置
- [ ] 2.3 将房间 AI 配置写入 `setupData`，并在 `MatchRoom` 中由房主客户端托管 AI 座位
- [ ] 2.4 在前端加入本地 AI 开局偏好读写：游客本地缓存，登录用户拉取/保存账号设置

## 3. Backend
- [ ] 3.1 扩展用户设置 schema / service / controller，支持按 `gameId` 保存 AI 开局偏好
- [ ] 3.2 调整 claim-seat 逻辑，允许 AI 座位使用显式配置名

## 4. Verification
- [ ] 4.1 补前端测试：创建房间入口、AI 开关、默认值恢复
- [ ] 4.2 补后端测试：登录读取与写回 AI 开局偏好、AI seat claim 名称
- [ ] 4.3 跑通大杀四方典型路径验证：人数、Titans 与房间 AI 托管能实际生效
