## 1. Spec Modeling
- [x] 1.1 新增 `ui-scene-authoring` spec，定义 YAML 作者格式、编译产物与运行时边界。
- [x] 1.2 定义 `artboard + skin + node tree` 的正式数据模型，明确首页 V2 的首批节点白名单。
- [x] 1.3 定义图片皮肤协议，覆盖九宫格、背景图、图标与文本样式 token。
- [x] 1.4 定义资源管理协议，覆盖本地素材、已上传 R2 素材、新素材上传与依赖清单。
- [x] 1.5 裁决 `assetRef` 作为推荐资源引用格式，并定义受控相对路径兼容边界。
- [x] 1.6 定义首批节点 schema：`panel / stack / grid / text / button / image / slot`。
- [x] 1.7 定义节点定位规则：`zoneRef`、显式 `rect`、布局容器子项之间的优先级与互斥关系。
- [x] 1.8 定义 scene 工程目录结构、文件命名和 shared/local registry 组织方式。

## 2. Authoring Workflow
- [x] 2.1 定义 AI 默认编辑 YAML/schema 或 patch，而不是直接长期编辑 React 页面源码。
- [x] 2.2 定义“AI 生成初稿 -> 人工微调 -> AI 二次修改”的协作路径。
- [x] 2.3 定义作者格式到运行时制品的校验、编译与错误报告要求。
- [x] 2.4 定义 scene/skin 对资源的引用方式、编译期校验和预加载/上传门禁。
- [x] 2.5 定义资源注册表、assetRef 解析与依赖清单产出要求。
- [x] 2.6 提供最小 `asset-registry`、`skin.yaml`、`ui.yaml` 示例，作为首页 V2 第一阶段作者样例。
- [x] 2.7 定义 schema 校验失败时的报错粒度与定位信息要求。
- [x] 2.8 裁决 build-time compiler 与 runtime artifact 加载链路。

## 3. Home V2 Adoption
- [x] 3.1 定义首页 V2 作为首个 adopter 的 artboard、命名区域与基础节点组合方式。
- [x] 3.2 明确首页 V2 第一阶段允许手写 YAML 与 runtime renderer，不依赖可视化编辑器先完成。
- [x] 3.3 明确现有 `add-ui-scene-authoring-foundation` 被本 change 取代并删除。
- [x] 3.4 定义 Home V2 按钮 action、文案 key 和宿主事件桥接方式。
- [x] 3.5 定义目标页面内 authoring 模式与 YAML 双向同步原则。
- [x] 3.6 定义 author mode 入口策略：route/query 主入口 + author 内工具球 + 权限门禁。

## 4. Validation
- [x] 4.1 运行 `openspec validate add-yaml-ui-scene-authoring --strict --no-interactive`。

## 5. Implementation Readiness
- [x] 5.1 将已完成的 spec 设计项映射为实现任务：types、zod schema、YAML loader、compiler、runtime renderer、Home V2 接线。
- [x] 5.2 明确第一阶段不做项，避免实现时 scope 回弹到 visual editor / prefab system。

## 6. Implementation
- [x] 6.1 建立 `src/ui-scene/` 类型、schema 和编译目录结构。
- [x] 6.2 实现 YAML loader 与 zod/类型校验，支持 `asset-registry`、`skin`、`scene` 三类输入。
- [x] 6.3 实现 compiler：解析 `assetRef`、校验资源、生成 `assetDependencies` 和 compiled scene artifact。
- [x] 6.4 实现 runtime renderer：先支持 `panel / stack / grid / text / button / image / slot`。
- [x] 6.5 实现 nine-slice skin renderer，并复用现有 AssetLoader / 本地-R2 资源链路。
- [x] 6.6 为 Home V2 接入首个 `asset-registry`、`skin.yaml`、`ui.yaml`，替换现有硬编码布局真源。
- [x] 6.7 为 `actionId` 建立宿主映射层，接通 Home V2 的详情、导航或目录交互。
- [x] 6.8 实现 in-page authoring overlay：选中、拖拽、对齐辅助、zones overlay。
- [x] 6.9 实现页面编辑结果到 YAML 草稿的双向同步与保存链路。
- [x] 6.10 为 Home V2 接入 `?author=1` author mode、权限门禁和 author-only 工具球。
- [x] 6.11 增加编译/校验测试、类型测试和最小运行时渲染测试。
