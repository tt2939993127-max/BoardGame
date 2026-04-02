# Change: Book Hybrid v2 纯 2D 素材图原型

## Why
当前 `book-hybrid` 的目标已经从“3D 书架演示”收敛为“先跑通、再基于素材验证视觉方向”。继续沿用 WebGL / 程序化材质会抬高调试成本，也不利于快速替换和比较真实素材效果。

## What Changes
- 将 `book-hybrid` v2 明确收口为纯 2D DOM 原型页，禁止依赖 WebGL、Three.js 场景或程序化材质生成。
- 开发态只保留 `/dev/book-hybrid` 这一条入口，不再继续维护并行的 `book-2d` / `book-3d` 试验页。
- 页面 SHALL 使用项目内本地素材图片作为封面、预览图或背景图来源，便于快速替换真实美术素材验证版式。
- 交互范围收敛为“选书 -> 查看展开内容 -> 切换页/切换书”，优先保证可运行、可替图、可验证。

## Impact
- Affected specs: `book-hybrid-dev-page`
- Affected code: `src/App.tsx`, `src/pages/test-book-ui/BookUIHybrid.tsx`, `src/pages/test-book-ui/index.ts`
- Affected assets: `public/assets/...` 下供 `book-hybrid` 引用的本地素材图片
