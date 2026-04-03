## 1. Specification
- [x] 1.1 定义 `book-hybrid` v2 为纯 2D 本地素材原型，而不是 3D WebGL 页面。
- [x] 1.2 定义 `/dev/book-hybrid` 为唯一开发入口。
- [x] 1.3 定义书籍数据的本地素材字段与退化行为。

## 2. Implementation
- [ ] 2.1 恢复 `/dev/book-hybrid` 路由，仅指向 2D 页面。
- [ ] 2.2 实现纯 2D 的 `BookUIHybrid` 页面结构。
- [ ] 2.3 将书籍数据扩展为支持 `cover` / `preview` / `background` 等本地素材字段。
- [ ] 2.4 在素材缺失时提供稳定占位与无报错退化。

## 3. Validation
- [ ] 3.1 `openspec validate add-book-hybrid-v2-2d-prototype --strict --no-interactive` 通过。
- [ ] 3.2 `/dev/book-hybrid` 可在开发环境打开且无运行时报错。
- [ ] 3.3 至少完成一次“切书 + 翻页”验证。
