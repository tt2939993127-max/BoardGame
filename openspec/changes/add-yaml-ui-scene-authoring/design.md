## Context

首页 V2 当前正在逼近一种非常具体的 UI 生产方式：

- UI 高度依赖美术底图与严格对位
- 结构经常需要 AI 先给出初稿
- 人工必须能低成本微调位置、间距、皮肤和区域命名
- 调整后还希望继续让 AI 在同一份真源上迭代

旧提案 `add-ui-scene-authoring-foundation` 提供了更大的愿景，但它把 Builder 扩展、Prefab 体系、UGC 方向和首页 V2 页面推进混在了一起。当前最需要的是一个更小的、作者体验更好的“声明式 UI 真源”：既能描述图片化 UI，又能让 AI 和人工围绕同一份结构协作。

## Goals / Non-Goals

- Goals:
  - 建立 YAML-first 的 UI scene 作者协议，适合 AI 生成和人工微调。
  - 把九宫格、背景图、图标、文本样式等图片皮肤能力纳入正式协议。
  - 让运行时消费编译后的类型化制品，而不是直接消费原始 YAML 或页面源码。
  - 让作者直接打开目标页面进入编辑态，在真实页面上调整布局，并把修改同步回 YAML 真源。
  - 保证编辑态与正式显示态共用同一套渲染结果，避免编辑页与实际页偏差。
  - 让首页 V2 成为首个 adopter，用真实页面验证协议是否正确。
  - 保持协议对未来其他图片化 UI 可复用，而不是绑定首页专用实现。
- Non-Goals:
  - 本次不要求把所有 React 组件都变成低代码节点。
  - 本次不要求开放任意 JSX/任意脚本直接嵌入 YAML。
  - 本次不把另一套独立编辑器壳作为主路径。

## Decisions

### Decision: YAML 是作者格式，运行时制品不是 YAML 直出

系统采用 YAML 作为人和 AI 的主要作者格式，例如：

- `*.ui.yaml`：描述 artboard、节点树、命名区域、绑定和场景结构
- `*.skin.yaml`：描述图片皮肤、九宫格切片、文本样式 token、图标资源

但运行时不直接把 YAML 当成最终消费协议。构建/加载阶段必须把 YAML 校验并编译成类型化运行时制品。这样既保留 YAML 的可读性，也避免运行时被作者格式细节绑死。

### Decision: 收缩为 `artboard + skin + node tree` 三层，而不是第一期上完整 Builder/Prefab 体系

相对旧提案的 `artboard + prefab + scene node`，本 change 第一阶段收缩为：

- `artboard`：参考尺寸、背景、命名区域、安全区、热点区
- `skin`：九宫格、背景图、图标、文本样式等视觉皮肤
- `node tree`：受控白名单节点的结构树

`prefab` 可以作为后续扩展，但不作为首页 V2 第一阶段必须成立的前置抽象。

### Decision: 节点能力必须白名单化，不允许 YAML 直接承载任意 JSX

YAML scene 的目标是低代码和 AI 可编辑，而不是把任意 React 代码搬进配置。因此第一阶段只允许受控白名单节点，例如：

- `panel`
- `stack`
- `grid`
- `text`
- `button`
- `image`
- `slot`

后续可扩展，但每种节点都必须有稳定 schema、明确渲染语义和有限的样式暴露面。

### Decision: 第一阶段节点字段采用“公共字段 + 类型专属字段”结构

为保证 AI 可编辑和编译期校验稳定，第一阶段所有节点共享一组公共字段：

- `id`
- `type`
- `visible`
- `zoneRef`
- `rect`
- `skin`
- `style`
- `children`

同时每种节点只能再暴露少量类型专属字段：

- `stack`: `direction / gap / align / justify`
- `grid`: `columns / rows / gap`
- `text`: `text / textKey / style`
- `button`: `text / textKey / icon / action`
- `image`: `assetRef / contentMode`
- `slot`: `slotId / fallback`

公共字段保证结构统一，类型专属字段保证节点表达力；两者都必须是白名单字段，不允许第一阶段塞入任意自定义 payload。

### Decision: 节点定位采用三类来源，并要求明确优先级

第一阶段节点位置只允许来自三类来源：

1. `zoneRef`
2. 显式 `rect`
3. 来自父级布局容器（如 `stack` / `grid`）的自动排布

优先级裁决如下：

- 节点若声明 `zoneRef`，则其基础矩形来自 artboard 命名区域
- 节点若声明显式 `rect`，则用于独立定位节点
- 节点若作为布局容器子项，则位置由父级布局系统决定

系统必须禁止让同一节点同时依赖多个互相冲突的位置真源。例如：

- 不能既在 `stack` 中自动排布，又要求一个会覆盖布局结果的自由 `rect`
- 不能引用不存在的 `zoneRef`

### Decision: 编译错误必须可定位到 scene 路径和字段名

YAML-first authoring 的成败很大程度取决于报错质量。编译/校验阶段不能只返回“schema invalid”，而必须至少包含：

- scene 文件
- 节点路径
- 字段名
- 错误原因
- 可行修复建议

例如：

- `scene.root.children[1].zoneRef` 引用了不存在的命名区域
- `skins.home_v2.gold_panel.slice.left` 缺失
- `button` 同时声明 `text` 和不兼容的富文本 payload

这样 AI 和人工都能围绕同一份报错继续修补，而不会重新退回源码试错。

### Decision: 图片皮肤是一等能力，九宫格必须进入正式协议

该能力的核心不是“再写一个通用 div 容器”，而是把图片驱动的 UI 皮肤变成正式系统能力。第一阶段至少应支持：

- `nineSlice`
- `backgroundImage`
- `icon`
- `textStyle`

九宫格配置必须进入 `skin` 协议，至少包含：

- 图片路径
- 参考尺寸
- `top/right/bottom/left` 切片
- 内容 padding
- 拉伸/平铺策略

### Decision: 资源管理必须复用现有统一资产链路，并同时支持本地与 R2 素材

该能力不能再发明第二套资源系统。`scene` 和 `skin` 对图片资源的引用，必须复用项目现有的统一资产链路，包括：

- 本地 `/assets` 解析
- `i18n/<locale>/` 路径约定
- `compressed/` 压缩资源
- 内容 hash / 版本参数
- R2 / CDN 资源基座

同时，作者协议必须支持三类资源来源：

- 本地已存在但尚未上传的素材
- 本地已存在且已经上传到 R2 的素材
- 通过 authoring 工作流新增并上传到 R2 的素材

系统需要显式区分“资源逻辑引用”和“底层 URL 解析”，避免 YAML 到处散写裸路径。

### Decision: Scene/Skin 使用逻辑资源引用，编译阶段展开为运行时依赖

YAML 作者格式中，场景和皮肤不直接散写最终运行时 URL，而是引用逻辑资源标识或受控路径。编译阶段负责：

- 解析逻辑引用到统一资产链路
- 校验资源是否存在
- 生成运行时依赖清单
- 标记关键预加载资源
- 为发布链路提供上传检查依据

这样才能同时支持“本地先开发”和“R2 正式交付”，并让 AI 修改 scene 时不需要理解底层 CDN 细节。

### Decision: 第一阶段采用 `assetRef` 优先，受控相对路径作为兼容入口

为避免作者格式过早分裂，第一阶段裁决如下：

- 推荐写法是 `assetRef`
- 兼容写法允许受控相对路径
- 禁止在 YAML 中直接写最终 R2/CDN URL 作为常规路径

`assetRef` 应指向统一资源注册表中的逻辑标识，例如：

- `home_v2.book.cover`
- `home_v2.skin.gold_panel`
- `common.ui.arrow_right`

受控相对路径仅作为迁移和快速落地兼容入口，必须满足现有资源规范，例如：

- 不带 `/assets/` 前缀
- 不手写 `compressed/`
- 不手写版本参数

编译阶段需要把这两种作者写法统一收敛到同一套运行时资源解析结果。

### Decision: AI 默认修改 YAML/schema 或 patch，不默认长期直接改 React 页面

AI 协作的真源必须是声明式 scene。裁决如下：

- AI 生成初稿时，默认产出 YAML scene / skin
- AI 二次修改时，默认修改 YAML 或生成 patch
- React 渲染器只作为消费层，不再充当长期真源

这样才能让“AI 建立 -> 人工微调 -> AI 再改”形成闭环，而不是每轮都重写一大片页面代码。

### Decision: 首页 V2 是首个 adopter，但第一阶段不依赖可视化编辑器

首页 V2 需要尽快验证这一协议，因此允许：

- 手写 YAML scene
- 手写 skin 配置
- 通过 runtime renderer 直接落地页面

可视化编辑器、Builder 模式扩展和更重的 authoring UX 作为后续能力，不作为首页 V2 的收口前置条件。

### Decision: 作者入口是目标页面本身，采用 in-page WYSIWYG authoring

本次作者体验的裁决不是“先进入独立编辑器画布，再切到预览页”，而是：

- 直接打开目标页面
- 通过 route、query 或等价显式模式开关进入编辑态
- 在页面上直接选中、拖拽、调整布局
- 编辑结果实时反映到 scene 草稿和 YAML 真源

作者面对的就是最终页面本身，而不是另一套近似页面的编辑器容器。

### Decision: 编辑态主入口采用 route/query，悬浮球只作为 author mode 内工具

为了让编辑态切换显式、可复现、可分享、可做权限门禁，第一阶段裁决如下：

- 主入口采用 route 或 query，例如 `?author=1`
- 正式页面默认不显示 author UI
- 悬浮球或悬浮工具条只在 author mode 内显示
- 悬浮球用于快捷切换 overlay、YAML 面板、保存、AI patch、R2 上传等作者动作

系统不应把“正式页面常驻一个悬浮球，再点进去切编辑态”作为主路径，因为这会污染正式页面并增加误触成本。

### Decision: 编辑态入口必须受权限门禁控制

编辑态不是普通用户能力。第一阶段要求：

- 开发环境可直接通过 query/route 进入
- 生产环境必须经过管理员、白名单或等价权限门禁
- 未通过权限校验时，即使带有 `author=1` 也不得显示 authoring chrome

### Decision: 编辑态与正式态必须复用同一 renderer，而不是双实现

为了保证“页面和实际显示的页面一致”，系统必须避免编辑态和正式态各写一套渲染器。裁决如下：

- 正式页面和编辑态页面共用同一套 scene runtime renderer
- 编辑态只是在该 renderer 之上叠加选框、吸附线、可拖拽手柄、命名区域 overlay 和属性面板
- 任何节点的最终排版、九宫格渲染、文本渲染、资源解析，都必须由同一条运行时链路产出

### Decision: 页面调整与 YAML 之间采用双向同步

作者工作流必须支持双向同步：

- 在页面上拖拽/调整节点 -> 内存 scene 立即更新 -> YAML 草稿同步更新
- 修改 YAML 草稿 -> 页面重新编译并立即反映到当前页面

第一阶段允许“保存时再落盘文件”，但编辑会话中的 YAML 文本视图必须能看到最新结构；不能只存在一份页面内状态而不回写 schema。

### Decision: 第一阶段采用 build-time compilation，浏览器运行时不直接解析 YAML

为降低运行时复杂度并让错误更早暴露，第一阶段裁决如下：

- YAML 在构建期或开发期预编译
- 浏览器运行时只加载编译后的 scene artifact
- 浏览器端不以原始 YAML 作为主解析输入

这意味着第一阶段至少要有一条明确的编译链：

1. 读取 `asset registry`
2. 读取 `skin yaml`
3. 读取 `ui yaml`
4. 做 schema 校验和资源校验
5. 输出编译产物供 runtime renderer 消费

### Decision: scene 文件采用“场景目录 + 三件套”组织

第一阶段为避免内容分散，推荐按场景目录组织：

- `asset-registry.yaml`
- `<scene-id>.skin.yaml`
- `<scene-id>.ui.yaml`

例如：

```text
src/ui-scenes/home-v2/
  asset-registry.yaml
  home-v2.skin.yaml
  home-v2.ui.yaml
```

后续若进入多场景或共享皮肤阶段，可再引入 shared registry；但首页 V2 第一阶段先允许“场景局部 registry + 编译期合并共享 registry”的组织方式。

### Decision: 按钮与交互只声明 actionId，不在 YAML 内嵌脚本

第一阶段按钮和交互节点只允许声明受控动作标识，例如：

- `openGameDetails`
- `openLobbyTab`
- `startMatch`

YAML 不允许直接内嵌脚本或任意表达式。运行时由宿主页面提供 `actionId -> handler` 映射。这样可以保持 scene 可审计、可复用，也避免把业务逻辑塞回作者格式。

### Decision: 编辑态 UI 只叠加 authoring chrome，不改变正式内容布局

编辑态允许出现：

- 节点选框
- resize / drag handles
- zones overlay
- 属性侧栏
- YAML 文本面板

但这些 authoring chrome 必须与正式内容布局解耦，不能因为开启编辑态就改变页面真实排版结果。若需要额外 UI，应使用 overlay/portal，而不是把内容区重新包一层不同布局。

### Decision: 文案以 textKey 为推荐写法，裸 text 仅用于草稿或非 i18n 场景

为了与现有 i18n 体系兼容，`text` 节点和 `button` 节点中的文案字段裁决如下：

- 推荐写法：`textKey`
- 兼容写法：`text`

首页 V2 的正式场景默认应以 `textKey` 为主；`text` 只用于草稿、调试或确实不走 i18n 的内容。

### Decision: 第一阶段的实现边界覆盖 loader/compiler/runtime + in-page authoring，不包含独立编辑器壳

为了确保 spec 能直接进入实现，第一阶段范围固定为：

- TypeScript 类型
- YAML schema / validator
- asset registry 解析
- skin 解析
- scene compiler
- runtime renderer
- in-page authoring overlay
- YAML 同步与保存链路
- Home V2 接线

明确不在第一阶段实现：

- prefab registry/editor
- 任意脚本节点
- 通用营销页平台化能力

## Risks / Trade-offs

- 如果继续以页面源码作为真源，短期改得快，但 AI 共编会越来越难维护。
- 如果直接让运行时消费原始 YAML，短期少一层转换，但类型约束、兼容和错误收口会很差。
- 如果第一阶段就开放任意 JSX/script，短期更灵活，但很快会失去“低代码 + 可审计 + 可复用”的边界。
- 如果第一阶段就要求完整可视化编辑器，项目会再次掉回“大平台建设先于真实页面验证”的路径。
- 如果不把资源管理写成正式协议，scene 很快会演变成另一套散装图片路径系统，最终绕开现有 AssetLoader / R2 上传门禁。

## Migration Plan

1. 创建 `add-yaml-ui-scene-authoring` change，替代旧的 `add-ui-scene-authoring-foundation`。
2. 在 spec 层确立 YAML 作者格式、skin 协议、运行时编译产物和 Home V2 adopter 边界。
3. 首页 V2 第一阶段先采用手写 YAML + runtime renderer。
4. 页面跑通后，再决定是否补 visual editor / prefab / Builder 模式扩展。

## Minimal Authoring Examples

以下示例不是最终代码生成结果，而是第一阶段作者格式的目标形态，用来约束实现方向。

### Example: asset registry

```yaml
assets:
  home_v2.book.cover:
    type: image
    path: common/home-v2/book-cover
    preload: critical

  home_v2.skin.gold_panel:
    type: image
    path: common/home-v2/gold-panel

  common.ui.arrow_right:
    type: image
    path: common/ui/arrow-right
```

### Example: skin yaml

```yaml
skins:
  home_v2.gold_panel:
    kind: nineSlice
    assetRef: home_v2.skin.gold_panel
    image:
      width: 128
      height: 128
    slice:
      top: 24
      right: 24
      bottom: 24
      left: 24
    contentPadding:
      top: 20
      right: 24
      bottom: 20
      left: 24
    scaleMode: stretch

  home_v2.book_page_title:
    kind: textStyle
    fontToken: display.book
    fontSize: 36
    lineHeight: 1.2
    color: "#5a4128"
    letterSpacing: 0.02em
```

### Example: ui yaml

```yaml
scene:
  id: home_v2_main
  artboard:
    width: 896
    height: 720
    background:
      assetRef: home_v2.book.cover
    zones:
      left_page:
        x: 74
        y: 92
        width: 312
        height: 512
      right_page:
        x: 510
        y: 92
        width: 312
        height: 512
      bookmark_slot:
        x: 402
        y: 88
        width: 56
        height: 420

  root:
    id: root
    type: stack
    direction: absolute
    children:
      - id: left_panel
        type: panel
        zoneRef: left_page
        skin: home_v2.gold_panel
        children:
          - id: title
            type: text
            textKey: homeV2.featuredGames
            style: home_v2.book_page_title

      - id: details_panel
        type: panel
        zoneRef: right_page
        skin: home_v2.gold_panel
```

### Example: node schema sketch

```yaml
node:
  id: details_panel
  type: panel
  zoneRef: right_page
  skin: home_v2.gold_panel
  visible: true
  children:
    - id: heading
      type: text
      textKey: homeV2.details.title
      style: home_v2.book_page_title
```

### Example: validation error shape

```yaml
errors:
  - file: home-v2.ui.yaml
    path: scene.root.children[1].zoneRef
    code: UNKNOWN_ZONE_REF
    message: zoneRef "right_pag" 不存在
    suggestion: 使用已定义的 zones.right_page
```

### Example: compile output shape

```yaml
compiledScene:
  id: home_v2_main
  artboard:
    width: 896
    height: 720
    background:
      resolvedAsset:
        kind: image
        source: local-or-r2
        path: common/home-v2/book-cover
  nodes:
    - id: left_panel
      type: panel
      rect:
        x: 74
        y: 92
        width: 312
        height: 512
      skin:
        type: nineSlice
        resolvedAsset:
          path: common/home-v2/gold-panel
        slice:
          top: 24
          right: 24
          bottom: 24
          left: 24
  assetDependencies:
    - home_v2.book.cover
    - home_v2.skin.gold_panel
```

### Example: directory layout

```text
src/ui-scenes/
  shared/
    asset-registry.yaml
  home-v2/
    asset-registry.yaml
    home-v2.skin.yaml
    home-v2.ui.yaml

src/ui-scene/
  types.ts
  schema.ts
  compiler/
    compileScene.ts
    resolveAssets.ts
    validateScene.ts
  runtime/
    UISceneRenderer.tsx
    renderers/
      PanelNode.tsx
      TextNode.tsx
      ButtonNode.tsx
  authoring/
    InPageAuthoringOverlay.tsx
    SelectionLayer.tsx
    InspectorPanel.tsx
    YamlSyncPanel.tsx
```

### Example: action binding shape

```yaml
node:
  id: detail_button
  type: button
  textKey: homeV2.details.open
  actionId: openGameDetails
```

```ts
const actionHandlers = {
  openGameDetails: () => openDetailsModal(),
};
```

### Example: in-page authoring flow

```text
/home-v2?author=1
  -> load compiled scene artifact
  -> mount same runtime renderer as production
  -> overlay selection/handles/zones
  -> drag node on page
  -> update in-memory scene
  -> sync yaml draft panel
  -> save -> write back scene yaml
```

## Open Questions

- 首批节点白名单是否需要把 `tabs` / `carousel` / `timeline` 直接纳入，还是先通过组合节点构建。
- `skin` 是否需要从第一天就支持状态变体（default/hover/pressed/disabled），还是先只定义静态皮肤。
- 首页 V2 的书签、目录和游戏详情区域，应作为通用节点组合表达，还是先允许少量首页专用受控节点。
- 资源注册表由通用 UI 层统一维护，还是允许 Home V2 先拥有局部 registry 再逐步提升到共享层。
