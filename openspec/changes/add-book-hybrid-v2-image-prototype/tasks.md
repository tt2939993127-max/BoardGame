## 1. Specification
- [x] 1.1 为 `book-hybrid` v2 建立纯 2D + 素材图原型方案说明。
- [x] 1.2 定义开发态只保留 `/dev/book-hybrid` 的范围边界。
- [x] 1.3 定义素材图片在该原型页中的使用位置与最低运行要求。

## 2. Implementation
- [x] 2.1 清理 `book-hybrid` 相关多入口，只保留 `/dev/book-hybrid`。
- [x] 2.2 将 `BookUIHybrid` 保持为纯 DOM 可运行版本，不依赖 WebGL / 程序化材质。
- [ ] 2.3 为书籍数据预留本地素材图片字段，并支持页面引用。
- [x] 2.4 在缺少最终素材时，页面仍可稳定展示文本与基础占位。

## 3. Validation
- [x] 3.1 `openspec validate add-book-hybrid-v2-image-prototype --strict --no-interactive` 通过。
- [ ] 3.2 `/dev/book-hybrid` 可在开发环境打开且无运行时报错。
- [ ] 3.3 至少完成一次“切书 + 翻页”手动或自动验证。
