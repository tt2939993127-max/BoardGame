# Feedback Open Writeback 2026-04-04

## 范围

- 对象：导出批次 `C:\Users\zhuagenbao\GameNotes\不烂\BoardGame反馈导出-2026-04-04T04-52-08-844Z` 中原始 `21` 条 `open` 反馈
- 目标：把已确认修复项回写为 `resolved`，把已确认非 bug / 建议项回写为 `closed`，避免继续堆在 `open`

## 实际写回方式

- 未使用网页域名上的开放反馈 API 直接回写。
- 原因：
  - 本地 `127.0.0.1:3000` 无服务
  - 本地 `127.0.0.1:18001` 虽可访问，但连接的是本地开发库，不是导出所对应的生产数据
  - `https://easyboardgame.top`、`https://api.easyboardgame.top/api` 返回的是 SPA fallback HTML，不是可直接回写的 JSON 接口
- 实际路径：
  - `ssh admin@8.148.71.102`
  - `docker exec -i boardgame-mongodb mongosh boardgame`
  - 直接更新生产库中的 `feedbacks` 集合

## 本轮实际改动

### `open -> resolved`

- `69ce6242094b1acda250f790`
- `69cca762c3e278ba205eb08f`
- `69ce6ca7094b1acda250f831`
- `69ce7167094b1acda250f8a9`
- `69ce7589094b1acda250f8c6`
- `69ce7ac2094b1acda250f933`
- `69ce7bbf094b1acda250f93e`

### `open -> closed`

- `69cbecb1d5dec909a0b74ee9`
- `69ce6dcd094b1acda250f85b`
- `69ce7d74094b1acda250f97c`
- `69ce7fc3094b1acda250f9a3`

## 执行前已非 `open`

这些条目在本轮实际写回前，生产库里就已经被其他流程改过状态，因此本轮没有重复覆盖：

- `69c64529cb50687653b6fa85` `resolved`
- `69c64b20cb50687653b6faae` `resolved`
- `69c7e7bc32bd47a7b57a61fc` `resolved`
- `69c8f2f432bd47a7b57a66f8` `resolved`
- `69c93d9832bd47a7b57a6978` `resolved`

## 最终结果

- 这批原始 `21` 条导出时的 `open`，在 2026-04-04 本轮收口后，生产现态为：
  - `resolved: 12`
  - `closed: 4`
  - `open: 5`

## 当前仍为 `open` 的条目

- `69ce62f3094b1acda250f7a5`
- `69c9436732bd47a7b57a6a10`
- `69cc8633c3e278ba205eb020`
- `69cca643c3e278ba205eb08d`
- `69ce7358094b1acda250f8ab`

## 结论

- 本轮已经把“可直接收口”的项真正写回到生产反馈库，不再停留在仓库内文档阶段。
- 后续只需要继续处理剩余 `5` 条仍为 `open` 的证据不足项。
