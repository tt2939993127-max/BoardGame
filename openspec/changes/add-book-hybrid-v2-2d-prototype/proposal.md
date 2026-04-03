# Change: Book Hybrid v2 纯 2D 本地素材原型

## Why
`book-hybrid` 的 3D WebGL 方案已被放弃，继续保留 3D 方向的说明会让后续实现和验收目标失真。需要把目标明确收敛为低风险、可稳定运行的纯 2D 本地素材原型。

## What Changes
- 将 `book-hybrid` v2 的目标定义为纯 2D 页面，不再要求 Three.js / React Three Fiber / WebGL 展示。
- 保留 `/dev/book-hybrid` 作为开发态唯一入口，供后续 2D 原型实现与验证使用。
- 定义书籍数据支持本地素材图字段，如 `cover`、`preview`、`background`。
- 定义素材缺失时的稳定退化要求：页面可正常打开，不白屏、不抛运行时报错。

## Impact
- Affected specs: `book-hybrid-dev-page`
- Affected code: `src/App.tsx`, `src/pages/test-book-ui/BookUIHybrid.tsx`, `src/pages/test-book-ui/index.ts`
