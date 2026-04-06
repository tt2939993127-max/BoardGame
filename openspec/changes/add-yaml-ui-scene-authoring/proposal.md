# Change: YAML 低代码 UI Scene Authoring

## Why
当前首页 V2 已经证明，单靠页面内硬编码 JSX、散落的绝对定位和局部样式微调，无法稳定支撑“AI 先搭稿、人工微调、AI 再持续改”的图片化 UI 工作流。

现有 `add-ui-scene-authoring-foundation` 提案方向是对的，但 scope 过大，混入了 Builder 模式扩展、UGC 方向抽象和更重的 prefab/editor 规划。对首页 V2 当前阶段来说，更需要一套更小、更稳、更适合 AI 共编的作者协议：以 YAML 作为作者格式，以类型化运行时制品作为消费格式，并把图片皮肤（尤其九宫格）纳入正式 UI 皮肤能力。

## What Changes
- 新增 `ui-scene-authoring` 能力，定义 YAML-first 的 UI 场景作者协议。
- 定义 `artboard + skin + node tree` 三层模型，收缩旧提案中的更重 Builder / prefab 方向。
- 明确 `.ui.yaml` / `.skin.yaml` 作为作者格式，运行时只消费编译后的类型化制品。
- 将图片皮肤纳入正式协议，支持九宫格（nine-slice）、背景图、图标和文本样式 token。
- 明确 AI 协作边界：AI 默认编辑 YAML/schema 或 patch，不直接把 React 页面源码当作长期真源。
- 明确作者主入口是直接打开目标页面进入编辑态，在真实页面上调整布局并同步 YAML，而不是维护一套独立编辑器壳。
- 将首页 V2 作为首个 adopter，但保持该能力对未来其他图片化 UI 场景可复用。
- 本 change 显式取代 `add-ui-scene-authoring-foundation`，后者不再继续推进。

## Impact
- Affected specs:
  - `ui-scene-authoring`
- Affected code:
  - `src/ugc/runtime/ui-scene/**`
  - `src/components/home-v2/**`
  - `src/pages/HomeV2Draft.tsx`
  - `src/core/AssetLoader.ts`
  - 后续新增的 YAML loader、validator、scene compiler、skin registry、nine-slice renderer
- Affected assets:
  - `public/assets/common/**`
  - `public/assets/i18n/**`
  - 后续首页 V2 与其他图片化 UI 所需的皮肤素材目录
