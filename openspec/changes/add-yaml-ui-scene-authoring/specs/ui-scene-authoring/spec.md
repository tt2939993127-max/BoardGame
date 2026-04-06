## ADDED Requirements

### Requirement: 系统以 YAML 作为 UI Scene 的作者格式
系统 SHALL 以 YAML 作为 UI Scene 的正式作者格式，供 AI 和人工共同编辑。

#### Scenario: 使用 YAML 维护首页 V2 场景
- **GIVEN** 开发者需要维护首页 V2 的图片化 UI
- **WHEN** 系统定义该场景
- **THEN** 系统 MUST 允许使用 `*.ui.yaml` 描述场景结构
- **AND** MUST 允许使用 `*.skin.yaml` 描述皮肤与样式 token

### Requirement: 运行时只消费编译后的类型化制品
系统 SHALL 将作者 YAML 校验并编译为类型化运行时制品，运行时不得把原始 YAML 直接视为最终真源。

#### Scenario: 加载 YAML scene 到正式页面
- **GIVEN** 某个 UI scene 以 YAML 维护
- **WHEN** 正式页面加载该 scene
- **THEN** 系统 MUST 先完成 schema 校验与编译
- **AND** MUST 只让运行时消费编译后的类型化制品

#### Scenario: 浏览器不直接解析原始 YAML
- **GIVEN** 某个 scene 以 YAML 维护
- **WHEN** 首页或其他正式页面在浏览器端加载该 scene
- **THEN** 浏览器运行时 MUST 读取编译后的 artifact
- **AND** MUST NOT 以原始 YAML 作为主解析输入

### Requirement: 作者必须可直接在目标页面进入编辑态
系统 SHALL 允许作者直接打开目标页面进入编辑态，而不是只能在独立编辑器容器中调整布局。

#### Scenario: 进入首页 V2 编辑态
- **GIVEN** 首页 V2 已接入 scene runtime
- **WHEN** 作者通过 route、query 或等价显式模式开关进入编辑态
- **THEN** 系统 MUST 在目标页面本身开启 authoring 能力
- **AND** MUST 让作者在真实页面上直接选中和调整节点

### Requirement: 编辑态主入口必须是显式模式切换
系统 SHALL 以 route、query 或等价显式模式切换作为编辑态主入口，而不是依赖正式页面常驻悬浮入口。

#### Scenario: 使用 query 进入编辑态
- **GIVEN** 某个页面支持 in-page authoring
- **WHEN** 作者访问 `/home-v2?author=1`
- **THEN** 系统 MUST 进入 author mode
- **AND** SHOULD 让该入口可复现、可分享和可调试

#### Scenario: 正式页面不常驻 author 入口
- **GIVEN** 普通用户访问正式页面
- **WHEN** 页面未进入 author mode
- **THEN** 系统 MUST NOT 默认显示进入编辑态的常驻悬浮球或等价 author UI

### Requirement: 悬浮球只作为 author mode 内工具
系统 SHALL 将悬浮球或悬浮工具条限制在 author mode 内，作为作者快捷工具而非主入口。

#### Scenario: author mode 内显示工具球
- **GIVEN** 作者已经进入 author mode
- **WHEN** 页面完成 scene 渲染
- **THEN** 系统 MAY 显示悬浮球或悬浮工具条
- **AND** 该工具仅用于 overlay、保存、YAML、AI patch、R2 上传等作者动作

#### Scenario: 正式模式隐藏工具球
- **GIVEN** 页面处于正式显示态
- **WHEN** 普通用户浏览页面
- **THEN** 系统 MUST 隐藏 author 悬浮球和作者工具条

### Requirement: 场景模型至少包含 artboard、skin 和 node tree
系统 SHALL 以 `artboard + skin + node tree` 作为第一阶段 UI scene 的最小正式模型。

#### Scenario: 定义图片化 UI 的最小真源
- **GIVEN** 开发者需要为首页或活动页建立一套图片化 UI
- **WHEN** 系统描述该界面
- **THEN** `artboard` MUST 描述参考尺寸、背景和命名区域
- **AND** `skin` MUST 描述图片皮肤与样式 token
- **AND** `node tree` MUST 描述受控白名单节点的结构树

### Requirement: Artboard 提供参考尺寸与命名区域
系统 SHALL 将 `artboard` 定义为正式参考坐标系，并允许命名区域进入 schema。

#### Scenario: 首页 V2 定义左右页和书签区域
- **GIVEN** 首页 V2 使用书本式参考底图
- **WHEN** 开发者定义该场景的 artboard
- **THEN** artboard MUST 能定义参考尺寸
- **AND** MUST 能定义左右页内容区、书签槽位和热点区等命名区域

### Requirement: Skin 协议支持图片皮肤与九宫格
系统 SHALL 把图片皮肤作为正式协议能力，并至少支持九宫格、背景图、图标和文本样式 token。

#### Scenario: 定义面板九宫格皮肤
- **GIVEN** 开发者需要用图片素材制作可拉伸面板
- **WHEN** 在 `*.skin.yaml` 中定义该皮肤
- **THEN** 系统 MUST 支持声明图片路径、参考尺寸、切片边距、内容 padding 和拉伸策略
- **AND** MUST 允许该皮肤被 `panel` 或 `button` 等节点复用

### Requirement: Scene 与 Skin 的资源引用必须兼容本地与 R2 素材
系统 SHALL 让 scene 和 skin 同时支持本地素材、已上传到 R2 的素材，以及新增素材上传后继续被引用。

#### Scenario: 引用本地已存在素材
- **GIVEN** 某张 UI 素材已经存在于本地资源目录
- **WHEN** scene 或 skin 引用该素材
- **THEN** 系统 MUST 能通过统一资产链路解析该素材
- **AND** MUST 不要求作者手工拼接最终 CDN URL

#### Scenario: 引用已上传到 R2 的素材
- **GIVEN** 某张 UI 素材已经上传到 R2/CDN
- **WHEN** scene 或 skin 引用该素材
- **THEN** 系统 MUST 继续通过统一资产链路解析
- **AND** MUST 允许运行时直接命中远端资源基座

#### Scenario: 新素材上传后继续被 scene 使用
- **GIVEN** 作者为 scene 新增了一张本地素材并执行上传流程
- **WHEN** 该素材上传到 R2 后被正式页面加载
- **THEN** 系统 MUST 允许 scene/skin 继续使用同一逻辑引用
- **AND** MUST 不要求作者改写 scene 里的业务结构

### Requirement: 作者资源引用以 assetRef 为推荐格式
系统 SHALL 将 `assetRef` 作为 scene 和 skin 的推荐资源引用格式，并对受控相对路径提供兼容。

#### Scenario: 使用 assetRef 引用资源
- **GIVEN** 作者需要在 YAML 中引用一张 UI 图片
- **WHEN** 作者编写 scene 或 skin
- **THEN** 系统 SHOULD 允许作者通过 `assetRef` 引用统一资源注册表中的逻辑标识
- **AND** SHOULD 让该写法成为 AI 和人工协作的默认格式

#### Scenario: 使用受控相对路径兼容现有资源
- **GIVEN** 某些现有资源尚未注册为统一 `assetRef`
- **WHEN** 作者在 YAML 中引用该资源
- **THEN** 系统 MAY 允许使用受控相对路径作为兼容入口
- **AND** MUST 继续遵循现有资源规范

#### Scenario: 禁止直接写最终远端 URL 作为常规写法
- **GIVEN** 作者正在维护 scene 或 skin
- **WHEN** 作者尝试把最终 R2/CDN URL 直接写入 YAML
- **THEN** 系统 MUST 将其视为非推荐常规写法
- **AND** SHOULD 通过校验或 lint 提示作者改用 `assetRef` 或受控相对路径

### Requirement: scene 文件结构必须有稳定目录约定
系统 SHALL 为第一阶段的 scene 作者文件定义稳定目录约定，避免资源、皮肤和场景文件散落。

#### Scenario: 为 Home V2 创建 scene 目录
- **GIVEN** 首页 V2 作为首个 adopter
- **WHEN** 开发者建立该场景的作者文件
- **THEN** 系统 MUST 为该场景提供明确的目录落点
- **AND** MUST 能组织 asset registry、skin 和 ui scene 文件

### Requirement: 编辑态与正式态必须复用同一 renderer
系统 SHALL 让编辑态与正式显示态复用同一 scene renderer，避免双实现偏差。

#### Scenario: 编辑态查看九宫格面板
- **GIVEN** 某个页面节点使用了 nine-slice skin
- **WHEN** 作者在编辑态查看和拖拽该节点
- **THEN** 系统 MUST 使用与正式页面相同的 nine-slice 渲染结果
- **AND** MUST 只在其上叠加作者辅助层，而不是改用另一套编辑器渲染实现

### Requirement: 编辑态入口必须受权限门禁控制
系统 SHALL 对 author mode 入口实施权限门禁，避免普通用户误入编辑态。

#### Scenario: 开发环境启用 author mode
- **GIVEN** 当前环境是开发环境
- **WHEN** 作者访问带有 `author=1` 的页面
- **THEN** 系统 MAY 直接开启 author mode

#### Scenario: 生产环境校验权限
- **GIVEN** 当前环境是生产环境
- **WHEN** 请求尝试进入 author mode
- **THEN** 系统 MUST 先校验管理员、白名单或等价权限
- **AND** 未通过校验时 MUST 拒绝显示 authoring chrome

### Requirement: 资源引用必须复用统一资产链路
系统 SHALL 让 UI scene 的资源引用复用现有统一资产链路，而不是新建第二套图片解析系统。

#### Scenario: 解析作者资源引用
- **GIVEN** YAML scene 或 skin 中声明了图片资源引用
- **WHEN** 系统编译或运行该 scene
- **THEN** 系统 MUST 复用现有本地化路径、压缩资源、版本参数和资源基座规则
- **AND** MUST 与统一的 AssetLoader/R2 资源流程保持兼容

### Requirement: 编译阶段产出资源依赖清单并执行校验
系统 SHALL 在 scene 编译阶段产出资源依赖清单，并对资源存在性与协议完整性执行校验。

#### Scenario: 编译 scene 时校验九宫格资源
- **GIVEN** 某个 skin 定义了 nine-slice 皮肤
- **WHEN** 系统编译该 scene
- **THEN** 系统 MUST 校验图片资源存在
- **AND** MUST 校验切片参数、参考尺寸和内容 padding 等关键字段完整

#### Scenario: 编译 scene 时收集依赖
- **GIVEN** 某个 scene 引用了背景图、图标和九宫格皮肤
- **WHEN** 系统编译该 scene
- **THEN** 系统 MUST 产出资源依赖清单
- **AND** SHOULD 标记关键预加载资源与待上传资源

#### Scenario: 编译时统一解析 assetRef 与兼容路径
- **GIVEN** 同一个 scene 同时使用了 `assetRef` 和受控相对路径
- **WHEN** 系统编译该 scene
- **THEN** 系统 MUST 将两种作者写法统一解析到同一套运行时资源引用结果
- **AND** MUST 继续兼容本地开发与 R2 发布链路

### Requirement: 节点类型必须受控白名单化
系统 SHALL 将 YAML scene 的节点类型限制在受控白名单内，不允许第一阶段直接内嵌任意 JSX。

#### Scenario: 用白名单节点搭建首页 V2
- **GIVEN** 首页 V2 需要表达标题、面板、按钮、图片区和内容区
- **WHEN** 开发者编写 YAML scene
- **THEN** 系统 MUST 使用白名单节点类型来描述这些结构
- **AND** MUST NOT 要求在 YAML 中直接嵌入任意 React 代码作为常规路径

### Requirement: 第一阶段必须提供稳定的最小节点 schema
系统 SHALL 为第一阶段白名单节点定义稳定的最小 schema，使 AI、人工和编译器共享同一套字段约束。

#### Scenario: 使用 panel 和 text 节点
- **GIVEN** 作者需要在 scene 中放置一个面板和一段标题文字
- **WHEN** 作者编写 YAML
- **THEN** `panel` 和 `text` 节点 MUST 共享统一公共字段结构
- **AND** MUST 只暴露各自白名单专属字段

#### Scenario: 节点字段超出白名单
- **GIVEN** 作者在第一阶段节点上添加了未定义的任意字段
- **WHEN** 系统校验该 scene
- **THEN** 系统 MUST 将其视为 schema 违规
- **AND** SHOULD 返回具体字段路径与修复建议

### Requirement: 文案字段必须兼容 i18n key
系统 SHALL 让文本相关节点以 `textKey` 作为正式场景的推荐写法，并对 `text` 提供兼容。

#### Scenario: 首页 V2 正式文案使用 textKey
- **GIVEN** 首页 V2 的正式 scene 需要接入现有国际化系统
- **WHEN** 作者定义 `text` 或 `button` 节点文案
- **THEN** 系统 SHOULD 优先使用 `textKey`
- **AND** MUST 保持与现有 i18n 体系兼容

#### Scenario: 草稿阶段使用裸 text
- **GIVEN** 作者仍在快速起稿阶段
- **WHEN** 节点暂时使用裸 `text`
- **THEN** 系统 MAY 允许该写法
- **AND** SHOULD 为后续替换成 `textKey` 留出明确路径

### Requirement: 节点定位来源必须有明确边界
系统 SHALL 为节点定位来源定义明确边界，并阻止互相冲突的位置真源同时生效。

#### Scenario: 通过 zoneRef 放置节点
- **GIVEN** 某个节点声明了 `zoneRef`
- **WHEN** 系统编译该 scene
- **THEN** 系统 MUST 以 artboard 中对应命名区域作为该节点的基础定位来源

#### Scenario: zoneRef 引用不存在
- **GIVEN** 某个节点声明了不存在的 `zoneRef`
- **WHEN** 系统校验该 scene
- **THEN** 系统 MUST 返回可定位的校验错误

#### Scenario: 自动布局子项和自由定位冲突
- **GIVEN** 某个节点是 `stack` 或 `grid` 的子项
- **AND** 同时声明了会覆盖布局的自由定位矩形
- **WHEN** 系统校验该 scene
- **THEN** 系统 MUST 阻止这种冲突写法进入运行时制品

### Requirement: 页面上的布局调整必须双向同步 YAML
系统 SHALL 让页面上的作者调整与 YAML 真源之间保持双向同步。

#### Scenario: 在页面上拖拽节点后同步 YAML
- **GIVEN** 作者已进入目标页面编辑态
- **WHEN** 作者在页面上拖拽或调整某个节点
- **THEN** 系统 MUST 立即更新对应 scene 草稿
- **AND** MUST 将该变更同步到 YAML 草稿表示

#### Scenario: 修改 YAML 草稿后同步页面
- **GIVEN** 作者或 AI 修改了 scene 的 YAML 草稿
- **WHEN** 系统重新校验并编译该草稿
- **THEN** 页面 MUST 立即反映最新编译结果
- **AND** MUST 保持与当前目标页面一致的显示效果

### Requirement: AI 默认编辑 scene/schema 或 patch
系统 SHALL 将 scene/schema 作为 AI 协作的默认编辑对象，而不是把页面源码作为长期真源。

#### Scenario: AI 二次修改首页 V2 UI
- **GIVEN** AI 已生成一版首页 V2 场景
- **WHEN** 用户要求继续调整位置、间距、皮肤或结构
- **THEN** 系统 MUST 允许 AI 直接修改 YAML scene 或生成结构化 patch
- **AND** SHOULD 让 React 渲染层继续作为消费层而不是新的真源

### Requirement: 交互节点只声明受控 actionId
系统 SHALL 让第一阶段交互节点只声明受控 `actionId`，并由宿主页面完成动作绑定。

#### Scenario: button 触发首页宿主行为
- **GIVEN** 首页 V2 的某个按钮需要打开详情面板
- **WHEN** 作者在 YAML 中定义该按钮
- **THEN** 节点 MUST 通过 `actionId` 声明动作意图
- **AND** MUST NOT 在 YAML 中直接内嵌脚本实现

#### Scenario: runtime 绑定 action handler
- **GIVEN** 编译后的 scene artifact 包含 `actionId`
- **WHEN** 宿主页面渲染该 scene
- **THEN** 宿主页面 MUST 提供 `actionId -> handler` 映射
- **AND** runtime renderer MUST 通过该映射触发宿主行为

### Requirement: 编辑态只叠加作者辅助层
系统 SHALL 让编辑态通过 overlay 或等价方式叠加作者辅助层，而不改变正式内容布局。

#### Scenario: 开启编辑态时出现选框和侧栏
- **GIVEN** 作者进入目标页面编辑态
- **WHEN** 系统展示选框、吸附线、属性侧栏或 YAML 面板
- **THEN** 这些 authoring UI MUST 与正式内容布局解耦
- **AND** MUST NOT 改变正式内容节点的真实排版结果

### Requirement: 编译与校验错误必须具备可定位性
系统 SHALL 让 scene/skin 的编译与校验错误具备足够的定位信息，供 AI 和人工继续修补。

#### Scenario: 节点字段校验失败
- **GIVEN** scene 中某个节点字段非法
- **WHEN** 系统执行编译或校验
- **THEN** 错误结果 MUST 至少包含文件、字段路径、错误代码和人类可读原因

#### Scenario: 皮肤资源校验失败
- **GIVEN** nine-slice 皮肤缺少必要字段或资源缺失
- **WHEN** 系统执行编译或校验
- **THEN** 错误结果 MUST 能指向具体 skin 条目和具体字段

### Requirement: 首页 V2 可先以手写 YAML 落地
系统 SHALL 允许首页 V2 作为首个 adopter，先以手写 YAML scene 和 runtime renderer 落地，而不依赖可视化编辑器先完成。

#### Scenario: 在 visual editor 之前推进首页 V2
- **GIVEN** 首页 V2 需要先完成真实页面验证
- **AND** 可视化编辑器尚未完成
- **WHEN** 开发者推进首页 V2
- **THEN** 系统 MUST 允许直接使用手写 YAML scene 和 skin 配置
- **AND** MUST NOT 把 visual editor 完成度作为首页 V2 收口前置条件

### Requirement: 第一阶段实现边界必须聚焦 compiler、runtime 与页面内编辑
系统 SHALL 将第一阶段实现边界限定在 loader、compiler、runtime renderer、in-page authoring overlay 和首页接线，不得把独立 visual editor 壳作为前置范围。

#### Scenario: 规划第一阶段开发任务
- **GIVEN** 工程师根据本 spec 开始实施
- **WHEN** 拆分第一阶段任务
- **THEN** 任务范围 MUST 至少覆盖类型、校验、编译、渲染、页面内编辑辅助层和首页接线
- **AND** MUST NOT 把独立 visual editor 壳 / prefab editor 作为首页 V2 落地前置条件
